#!/usr/bin/env node
// 把 data/*.jsonl 合并成 js/words.js（去重、编号、挂主题）。用法：node scripts/build-words.js
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const TOPICS = [
  { id: "env", name: "环境与气候", emoji: "🌍", color: "#22c55e" },
  { id: "edu", name: "教育与学习", emoji: "🎓", color: "#3b82f6" },
  { id: "tech", name: "科技与互联网", emoji: "💻", color: "#a855f7" },
  { id: "health", name: "健康与医疗", emoji: "🏥", color: "#ef4444" },
  { id: "society", name: "社会问题", emoji: "🏙️", color: "#f59e0b" },
  { id: "work", name: "工作与职业", emoji: "💼", color: "#eab308" },
  { id: "economy", name: "经济与商业", emoji: "💰", color: "#84cc16" },
  { id: "law", name: "政府与法律", emoji: "⚖️", color: "#64748b" },
  { id: "crime", name: "犯罪与安全", emoji: "🚔", color: "#f97316" },
  { id: "culture", name: "文化与艺术", emoji: "🎭", color: "#ec4899" },
  { id: "media", name: "媒体与广告", emoji: "📺", color: "#d946ef" },
  { id: "travel", name: "旅游与交通", emoji: "✈️", color: "#06b6d4" },
  { id: "city", name: "城市与建筑", emoji: "🏗️", color: "#8b5cf6" },
  { id: "family", name: "家庭与人际", emoji: "👨‍👩‍👧", color: "#fb7185" },
  { id: "psych", name: "心理与性格", emoji: "🧠", color: "#c084fc" },
  { id: "science", name: "科学与研究", emoji: "🔬", color: "#2dd4bf" },
  { id: "food", name: "饮食与农业", emoji: "🍎", color: "#f43f5e" },
  { id: "sport", name: "运动与休闲", emoji: "⚽", color: "#4ade80" },
  { id: "language", name: "语言与交流", emoji: "🗣️", color: "#38bdf8" },
  { id: "history", name: "历史与地理", emoji: "🏛️", color: "#a78bfa" },
  { id: "nature", name: "动物与自然", emoji: "🐘", color: "#34d399" },
  { id: "acad_v", name: "学术动词", emoji: "📝", color: "#14b8a6" },
  { id: "acad_adj", name: "学术形容词副词", emoji: "✨", color: "#fbbf24" },
  { id: "acad_n", name: "学术名词短语", emoji: "📚", color: "#60a5fa" }
];
const NEED = ["w", "ipa", "pos", "cn", "pun", "story", "ex", "exCn", "col"];
const seen = new Map(); const words = []; let id = 0; const dupes = [];
for (const t of TOPICS) {
  const f = path.join(ROOT, "data", t.id + ".jsonl");
  if (!fs.existsSync(f)) { console.warn("missing", f); continue; }
  const lines = fs.readFileSync(f, "utf8").split("\n").filter((l) => l.trim());
  let n = 0;
  for (const l of lines) {
    let o; try { o = JSON.parse(l); } catch (e) { console.warn(t.id, "bad json:", l.slice(0, 50)); continue; }
    if (NEED.some((k) => !(k in o))) { console.warn(t.id, "missing field:", o.w); continue; }
    const key = String(o.w).trim().toLowerCase();
    if (seen.has(key)) { dupes.push(key + " (" + t.id + "→" + seen.get(key) + ")"); continue; }
    seen.set(key, t.id);
    if (!Array.isArray(o.col)) o.col = String(o.col).split(/[;,，；]/).map((s) => s.trim()).filter(Boolean);
    words.push({ id: ++id, topic: t.id, w: String(o.w).trim(), ipa: o.ipa, pos: o.pos, cn: o.cn, pun: o.pun, story: o.story, ex: o.ex, exCn: o.exCn, col: o.col });
    n++;
  }
  console.log(t.id.padEnd(9), n);
}
const out = `// 由 scripts/build-words.js 从 data/*.jsonl 自动生成，请勿手改；要加词请改 data/ 下的 jsonl 再重新生成。
window.TOPICS = ${JSON.stringify(TOPICS)};
window.WORDS = ${JSON.stringify(words)};
`;
fs.writeFileSync(path.join(ROOT, "js", "words.js"), out);
console.log("total", words.length, "| removed duplicates", dupes.length, "|", (out.length / 1024).toFixed(0) + " KB");
