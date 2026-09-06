# 墨间 · 本地后端

用 Claude Code 登录的订阅额度调用**指定型号**（Opus 5 / Sonnet 5 / Haiku 4.5 / Opus 4.8 / 4.7 / 4.6 / Sonnet 4.6），并提供 SQLite FTS5 记忆检索与存档。

## 启动

```bash
# 1. 先确认电脑上已登录 Claude Code（终端里运行一次 `claude` 并登录即可）
# 2. 安装并启动
cd server
npm install
npm start
```

然后在浏览器打开 http://localhost:8787 ，页面会自动连上后端；手机连同一个 Wi-Fi，访问 `http://<电脑的局域网 IP>:8787` 即可。

也可以直接双击 `inkroom.html`，它会自动尝试连接 `http://localhost:8787`；或在「设置 → AI 来源」里填地址后点「连接」。

## 接口

| 路径 | 说明 |
|---|---|
| `POST /api/chat` | `{model, messages:[{role, content}]}` → SSE 流式文本；第一条 user 消息作为 system prompt |
| `POST /api/fts/index` | `{worldId, floors:[{id, n, role, text}]}` 重建该世界的 FTS5 索引（含隐藏楼层） |
| `POST /api/fts/search` | `{worldId, q, k, exclude:[id]}` → `{hits:[{id, score}]}`，bm25 排序 |
| `GET/POST /api/state` | 读写存档 `server/data/state.json` |
| `GET /api/health` | `{ok, models, fts5}` |

数据都在 `server/data/` 里，备份时整个目录拷走即可。
