@echo off
chcp 65001 >nul
REM Windows：双击运行。首次会自动安装依赖，然后启动后端并打开浏览器。
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 没有找到 Node.js，请先到 https://nodejs.org 安装 LTS 版本，再双击本文件。
  pause
  exit /b 1
)
where claude >nul 2>nul
if errorlevel 1 (
  echo 提示：没有找到 claude 命令。请先安装 Claude Code 并登录一次：npm install -g @anthropic-ai/claude-code  然后运行 claude
  echo 如果已经登录过，本提示可以忽略。
)
if not exist node_modules (
  call npm install --no-audit --no-fund
)
start "" "http://localhost:8787"
node index.mjs
pause
