# 墨间 · 本地后端（指定型号 + SQLite FTS5）

在 claude.ai 里打开的页面只能选「快速 / 标准 / 深思」三档，平台不开放型号名。
**要按型号选（Opus 5 / Sonnet 5 / Haiku 4.5 / Opus 4.8 / 4.7 / 4.6 / Sonnet 4.6，或任何新的 claude-* ID），就用这个本地后端。**
它通过 Claude Code 的登录走你的订阅额度，不需要 API key。

## 三步启动

1. 装好 Node.js（https://nodejs.org ，LTS 即可）和 Claude Code，并在终端里运行一次 `claude` 完成登录。
2. 双击 `server/start.command`（macOS）或 `server/start.bat`（Windows）；Linux 用 `./start.sh`。首次会自动安装依赖。
3. 浏览器会自动打开 http://localhost:8787 。输入框旁的下拉框此时就是型号列表；每一楼的署名旁会写实际用的型号 ID。

手机：连同一个 Wi-Fi，访问 `http://<电脑的局域网 IP>:8787`。

也可以直接双击仓库根目录的 `inkroom.html`，它会自动连接 `http://localhost:8787`。

## 接口

| 路径 | 说明 |
|---|---|
| `POST /api/chat` | `{model, messages:[{role, content}]}` → SSE 流式文本；第一条 user 消息作为 system prompt；`model` 接受任何 `claude-*` ID |
| `POST /api/fts/index` | `{worldId, floors:[{id, n, role, text}]}` 重建该世界的 FTS5 索引（含隐藏楼层） |
| `POST /api/fts/search` | `{worldId, q, k, exclude:[id]}` → `{hits:[{id, score}]}`，bm25 排序 |
| `GET/POST /api/state` | 读写存档 `server/data/state.json` |
| `GET /api/health` | `{ok, models, fts5}` |

数据都在 `server/data/` 里，备份时整个目录拷走即可。
