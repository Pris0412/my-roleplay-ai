// 墨夜书房 · 本地后端
// 作用：① 用 Claude Code 的订阅登录（claude 命令）生成剧情，不走 API key；
//       ② 用 SQLite FTS5（trigram 分词）做永久记忆库；
//       ③ 把 index.html 也一起提供出来，手机在同一 Wi-Fi 下打开 http://电脑IP:3939 即可。
// 启动：cd server && npm install && npm start
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { query } from '@anthropic-ai/claude-agent-sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3939);
const INDEX = path.join(__dirname, '..', 'index.html');
const DB_PATH = path.join(__dirname, 'memory.sqlite');

// 可选模型：可通过环境变量 AIRP_MODELS="id:名字,id:名字" 覆盖
const MODELS = (process.env.AIRP_MODELS
  ? process.env.AIRP_MODELS.split(',').map(s => { const [id, label] = s.split(':'); return { id: id.trim(), label: (label || id).trim() }; })
  : [
      { id: 'sonnet', label: 'Sonnet · 均衡' },
      { id: 'opus', label: 'Opus · 最强' },
      { id: 'haiku', label: 'Haiku · 最快' },
    ]);

/* ---------------- SQLite FTS5 永久记忆 ---------------- */
const db = new Database(DB_PATH);
db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS mem USING fts5(
  doc_id UNINDEXED, world_id UNINDEXED, no UNINDEXED, who UNINDEXED, kind UNINDEXED, text,
  tokenize = 'trigram'
);`);
const upsert = db.transaction((rows) => {
  const del = db.prepare('DELETE FROM mem WHERE doc_id = ?');
  const ins = db.prepare('INSERT INTO mem (doc_id, world_id, no, who, kind, text) VALUES (?,?,?,?,?,?)');
  for (const r of rows) { del.run(r.id); ins.run(r.id, r.worldId, r.no, r.who, r.kind, r.text); }
});
function memSearch(worldId, q, limit = 10) {
  const safe = q.replace(/["*]/g, ' ').trim();
  if (safe.length < 3) return []; // trigram 需要至少 3 个字符
  return db.prepare(`SELECT doc_id AS id, world_id AS worldId, no, who, kind,
      snippet(mem, 5, '[', ']', '…', 24) AS snippet, bm25(mem) AS score
    FROM mem WHERE mem MATCH ? AND world_id = ? ORDER BY rank LIMIT ?`)
    .all(`"${safe}"`, worldId, Math.min(limit, 10));
}
function memStats() {
  return db.prepare('SELECT world_id AS worldId, COUNT(*) AS n FROM mem GROUP BY world_id').all();
}

/* ---------------- Claude（订阅额度） ---------------- */
async function* generate({ messages, model, json }) {
  // 第一条 user 消息是指令（预设+角色卡+世界书+记忆），其余是楼层对话
  const [head, ...rest] = messages;
  const transcript = rest.map(m => m.content).join('\n\n');
  const prompt = (transcript || '（开始）') + (json ? '\n\n只输出 JSON，不要任何解释。' : '');
  const q = query({
    prompt,
    options: {
      model: model || MODELS[0].id,
      systemPrompt: head?.content || '',
      maxTurns: 1,
      allowedTools: [],
      permissionMode: 'default',
      includePartialMessages: true,
    },
  });
  let streamed = '';
  for await (const msg of q) {
    if (msg.type === 'stream_event') {
      const ev = msg.event;
      if (ev?.type === 'content_block_delta' && ev.delta?.type === 'text_delta') { streamed += ev.delta.text; yield ev.delta.text; }
    } else if (msg.type === 'result') {
      if (!streamed && typeof msg.result === 'string') yield msg.result;
      if (msg.is_error) throw new Error(msg.result || 'claude 返回错误');
    }
  }
}

/* ---------------- HTTP ---------------- */
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
function send(res, code, body, type = 'application/json') { res.writeHead(code, { ...CORS, 'content-type': type + '; charset=utf-8' }); res.end(typeof body === 'string' ? body : JSON.stringify(body)); }
function readJSON(req) { return new Promise((ok, no) => { let b = ''; req.on('data', c => b += c); req.on('end', () => { try { ok(JSON.parse(b || '{}')); } catch (e) { no(e); } }); }); }

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
  try {
    if (url.pathname === '/' || url.pathname === '/index.html') return send(res, 200, fs.readFileSync(INDEX, 'utf8'), 'text/html');
    if (url.pathname === '/api/health') return send(res, 200, { ok: true, models: MODELS, fts5: true, memory: memStats() });
    if (url.pathname === '/api/generate' && req.method === 'POST') {
      const body = await readJSON(req);
      res.writeHead(200, { ...CORS, 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache' });
      const abort = () => { /* 客户端断开时 for-await 会随连接结束 */ };
      req.on('close', abort);
      try { for await (const delta of generate(body)) res.write(`data: ${JSON.stringify({ delta })}\n\n`); }
      catch (e) { res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`); }
      res.write('data: {"done":true}\n\n'); return res.end();
    }
    if (url.pathname === '/api/memory/sync' && req.method === 'POST') { const { rows = [] } = await readJSON(req); upsert(rows); return send(res, 200, { ok: true, count: rows.length }); }
    if (url.pathname === '/api/memory/search') return send(res, 200, { results: memSearch(url.searchParams.get('world') || '', url.searchParams.get('q') || '', Number(url.searchParams.get('limit') || 10)) });
    send(res, 404, { error: 'not found' });
  } catch (e) { send(res, 500, { error: e.message }); }
});
server.listen(PORT, () => {
  const ips = Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal).map(i => i.address);
  console.log(`墨夜书房后端已启动：http://localhost:${PORT}`);
  for (const ip of ips) console.log(`手机同一 Wi-Fi 打开：http://${ip}:${PORT}`);
  console.log('生成走 Claude Code 订阅登录（先在终端跑一次 `claude` 完成登录）。');
});
