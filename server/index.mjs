// 墨间 Inkroom 本地后端
// - POST /api/chat        用 Claude Agent SDK（Claude Code 登录 → 订阅额度）调用指定型号，SSE 流式返回
// - POST /api/fts/index   把一个世界的全部楼层写进 SQLite FTS5（含隐藏楼层）
// - POST /api/fts/search  BM25 检索，返回最相关的 k 楼
// - GET/POST /api/state   存档读写（server/data/state.json）
// - GET /                 直接提供 ../inkroom.html，手机连同一 Wi-Fi 访问 http://<电脑IP>:8787
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { query } from '@anthropic-ai/claude-agent-sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8787);
const DATA = path.join(__dirname, 'data');
fs.mkdirSync(DATA, { recursive: true });
const STATE_FILE = path.join(DATA, 'state.json');
const HTML = path.join(__dirname, '..', 'inkroom.html');

const MODELS = ['claude-opus-5', 'claude-sonnet-5', 'claude-haiku-4-5', 'claude-opus-4-8', 'claude-opus-4-7', 'claude-opus-4-6', 'claude-sonnet-4-6'];

// ---------- SQLite FTS5 ----------
// 中文用二元切分（与前端的浏览器内索引同一思路），存进 tok 列，交给 FTS5 的 unicode61 分词 + bm25 排序。
const db = new Database(path.join(DATA, 'memory.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS floors (world TEXT, id TEXT, n INTEGER, role TEXT, text TEXT, PRIMARY KEY (world, id));
  CREATE VIRTUAL TABLE IF NOT EXISTS floors_fts USING fts5(world UNINDEXED, id UNINDEXED, tok, tokenize = 'unicode61');
`);
let fts5ok = true;
try { db.prepare("SELECT bm25(floors_fts) FROM floors_fts LIMIT 1").get(); } catch (e) { fts5ok = /no such table|bm25/.test(String(e)) ? true : false; }

function tokenize(s) {
  const out = [];
  const re = /[一-鿿㐀-䶿]+|[a-z0-9]+/gi;
  let m;
  const low = String(s || '').toLowerCase();
  while ((m = re.exec(low))) {
    const t = m[0];
    if (/[一-鿿㐀-䶿]/.test(t)) {
      if (t.length === 1) out.push('c' + t.codePointAt(0).toString(16));
      for (let i = 0; i < t.length - 1; i++) out.push('c' + t.codePointAt(i).toString(16) + '_' + t.codePointAt(i + 1).toString(16));
    } else out.push(t);
  }
  return out;
}
const insFloor = db.prepare('INSERT OR REPLACE INTO floors (world, id, n, role, text) VALUES (?, ?, ?, ?, ?)');
const insFts = db.prepare('INSERT INTO floors_fts (world, id, tok) VALUES (?, ?, ?)');
const delWorld = db.transaction((world) => {
  db.prepare('DELETE FROM floors WHERE world = ?').run(world);
  db.prepare('DELETE FROM floors_fts WHERE world = ?').run(world);
});
const indexWorld = db.transaction((world, floors) => {
  delWorld(world);
  for (const f of floors) {
    insFloor.run(world, f.id, f.n, f.role, f.text);
    insFts.run(world, f.id, tokenize(f.text).join(' '));
  }
});
function search(world, q, k, exclude) {
  const toks = [...new Set(tokenize(q))].slice(0, 60);
  if (!toks.length) return [];
  const match = toks.map((t) => `"${t}"`).join(' OR ');
  const rows = db.prepare(`SELECT id, bm25(floors_fts) AS score FROM floors_fts WHERE floors_fts MATCH ? AND world = ? ORDER BY score LIMIT ?`).all(match, world, k + (exclude?.length || 0));
  const ex = new Set(exclude || []);
  return rows.filter((r) => !ex.has(r.id)).slice(0, k).map((r) => ({ id: r.id, score: -r.score }));
}

// ---------- Claude ----------
function toPrompt(messages) {
  // 第一条 user 消息是规则与设定，作为 system prompt；其余对话按角色拼成正文。
  const sys = messages[0]?.content || '';
  const rest = messages.slice(1);
  const body = rest.map((m) => (m.role === 'assistant' ? '【AI 上一楼】\n' : '【用户】\n') + m.content).join('\n\n');
  return { sys, prompt: body || '（开始）' };
}
async function streamChat({ model, messages }, res, signal) {
  const { sys, prompt } = toPrompt(messages);
  let text = '', usedModel = model, truncated = false;
  const send = (o) => res.write('data: ' + JSON.stringify(o) + '\n\n');
  try {
    for await (const msg of query({
      prompt,
      options: {
        model,
        systemPrompt: sys,
        maxTurns: 1,
        includePartialMessages: true,
        permissionMode: 'default',
        disallowedTools: ['Bash', 'Read', 'Write', 'Edit', 'MultiEdit', 'Glob', 'Grep', 'WebFetch', 'WebSearch', 'Task', 'NotebookEdit', 'TodoWrite', 'Agent'],
        abortController: signal,
      },
    })) {
      if (msg.type === 'stream_event') {
        const ev = msg.event;
        if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') { text += ev.delta.text; send({ t: ev.delta.text }); }
        if (ev.type === 'message_delta' && ev.delta?.stop_reason === 'max_tokens') truncated = true;
      } else if (msg.type === 'assistant') {
        if (msg.message?.model) usedModel = msg.message.model;
        const blocks = msg.message?.content || [];
        const full = blocks.filter((b) => b.type === 'text').map((b) => b.text).join('');
        if (full && full.length > text.length) text = full;
      } else if (msg.type === 'result') {
        if (msg.is_error) send({ error: msg.result || msg.subtype || '生成失败' });
      }
    }
    send({ done: true, text, model: usedModel, truncated });
  } catch (e) {
    send({ error: String(e?.message || e) });
  } finally { res.end(); }
}

// ---------- HTTP ----------
function json(res, code, obj) { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' }); res.end(JSON.stringify(obj)); }
function readBody(req) { return new Promise((r) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => r(b ? JSON.parse(b) : {})); }); }

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET,POST,OPTIONS' }); return res.end(); }
  try {
    if (url.pathname === '/' || url.pathname === '/inkroom.html') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return fs.createReadStream(HTML).pipe(res); }
    if (url.pathname === '/api/health') return json(res, 200, { ok: true, models: MODELS, fts5: fts5ok, version: '0.1.0' });
    if (url.pathname === '/api/models') return json(res, 200, { models: MODELS });
    if (url.pathname === '/api/state' && req.method === 'GET') return json(res, 200, { state: fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : null });
    if (url.pathname === '/api/state' && req.method === 'POST') { const b = await readBody(req); fs.writeFileSync(STATE_FILE, JSON.stringify(b.state)); return json(res, 200, { ok: true }); }
    if (url.pathname === '/api/fts/index') { const b = await readBody(req); indexWorld(String(b.worldId), b.floors || []); return json(res, 200, { ok: true, indexed: (b.floors || []).length }); }
    if (url.pathname === '/api/fts/search') { const b = await readBody(req); return json(res, 200, { hits: search(String(b.worldId), String(b.q || ''), Number(b.k) || 15, b.exclude || []) }); }
    if (url.pathname === '/api/chat' && req.method === 'POST') {
      const b = await readBody(req);
      const model = MODELS.includes(b.model) ? b.model : 'claude-opus-5';
      res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache', 'access-control-allow-origin': '*', connection: 'keep-alive' });
      const ac = new AbortController(); req.on('close', () => ac.abort());
      return streamChat({ model, messages: b.messages || [] }, res, ac);
    }
    json(res, 404, { error: 'not found' });
  } catch (e) { json(res, 500, { error: String(e?.message || e) }); }
}).listen(PORT, '0.0.0.0', () => {
  console.log(`墨间 Inkroom 后端已启动：http://localhost:${PORT}\n手机（同一 Wi-Fi）可访问 http://<本机IP>:${PORT}\nFTS5：${fts5ok ? '就绪' : '不可用'}`);
});
