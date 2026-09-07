#!/bin/bash
# macOS：双击运行。首次会自动安装依赖，然后启动后端并打开浏览器。
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "没有找到 Node.js，请先到 https://nodejs.org 安装 LTS 版本，再双击本文件。"; read -n 1 -s -r -p "按任意键退出"; exit 1
fi
if ! command -v claude >/dev/null 2>&1; then
  echo "提示：没有找到 claude 命令。请先安装 Claude Code 并登录一次（npm install -g @anthropic-ai/claude-code && claude）。"
  echo "如果已经登录过，本提示可以忽略。"
fi
[ -d node_modules ] || npm install --no-audit --no-fund
( sleep 2; open "http://localhost:${PORT:-8787}" ) &
node index.mjs
