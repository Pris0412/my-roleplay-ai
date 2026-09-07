#!/bin/bash
# Linux：./start.sh
cd "$(dirname "$0")"
command -v node >/dev/null 2>&1 || { echo "请先安装 Node.js（https://nodejs.org）"; exit 1; }
[ -d node_modules ] || npm install --no-audit --no-fund
( sleep 2; xdg-open "http://localhost:${PORT:-8787}" 2>/dev/null ) &
node index.mjs
