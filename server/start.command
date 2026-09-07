#!/bin/bash
# macOS：双击运行。零安装：没有 Node 就自动下载一份便携版到 server/.node，不需要管理员权限。
cd "$(dirname "$0")"
NODE_VER="v22.23.2"
if command -v node >/dev/null 2>&1; then NODE=node; NPM=npm
elif [ -x ".node/bin/node" ]; then NODE="$PWD/.node/bin/node"; NPM="$PWD/.node/bin/npm"
else
  ARCH=$(uname -m); [ "$ARCH" = "arm64" ] && A=arm64 || A=x64
  echo "第一次运行：正在下载 Node.js（约 50MB）……"
  curl -# -L "https://nodejs.org/dist/${NODE_VER}/node-${NODE_VER}-darwin-${A}.tar.gz" -o /tmp/inkroom-node.tgz || { echo "下载失败，请检查网络后重试"; read -n 1 -s -r -p "按任意键退出"; exit 1; }
  mkdir -p .node && tar -xzf /tmp/inkroom-node.tgz -C .node --strip-components=1 && rm -f /tmp/inkroom-node.tgz
  NODE="$PWD/.node/bin/node"; NPM="$PWD/.node/bin/npm"
fi
export PATH="$(dirname "$NODE"):$PATH"
[ -d node_modules ] || { echo "正在安装依赖……"; "$NPM" install --no-audit --no-fund || { echo "安装失败"; read -n 1 -s -r -p "按任意键退出"; exit 1; }; }
mkdir -p data
if [ ! -f data/.logged-in ]; then
  echo ""
  echo "=============================================="
  echo "  第一次需要登录 Claude（用你的订阅账号）。"
  echo "  接下来会打开 Claude Code 的界面："
  echo "  1) 输入  /login  然后回车"
  echo "  2) 按提示在浏览器里登录，把授权码粘贴回来"
  echo "  3) 看到登录成功后，按 Ctrl+C 两次退出，脚本会继续"
  echo "=============================================="
  read -n 1 -s -r -p "按任意键开始登录……"; echo
  "$NODE" node_modules/@anthropic-ai/claude-agent-sdk/cli.js
  touch data/.logged-in
fi
( sleep 2; open "http://localhost:${PORT:-8787}" ) &
echo "后端启动中，关闭这个窗口就会停止。要重新登录：删除 server/data/.logged-in 再双击。"
"$NODE" index.mjs
