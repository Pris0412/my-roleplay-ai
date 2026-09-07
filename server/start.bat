@echo off
chcp 65001 >nul
setlocal
REM Windows：双击运行。零安装：没有 Node 就自动下载一份便携版到 server\.node，不需要管理员权限。
cd /d "%~dp0"
set NODE_VER=v22.23.2
set NODE=node
set NPM=npm
where node >nul 2>nul
if not errorlevel 1 goto :haveNode
if exist ".node\node.exe" (
  set NODE=%CD%\.node\node.exe
  set NPM=%CD%\.node\npm.cmd
  goto :haveNode
)
echo 第一次运行：正在下载 Node.js（约 30MB）……
curl.exe -# -L "https://nodejs.org/dist/%NODE_VER%/node-%NODE_VER%-win-x64.zip" -o "%TEMP%\inkroom-node.zip"
if errorlevel 1 ( echo 下载失败，请检查网络后重试 & pause & exit /b 1 )
mkdir .node >nul 2>nul
tar.exe -xf "%TEMP%\inkroom-node.zip" -C .node --strip-components=1
del "%TEMP%\inkroom-node.zip" >nul 2>nul
set NODE=%CD%\.node\node.exe
set NPM=%CD%\.node\npm.cmd
:haveNode
for %%I in ("%NODE%") do set "PATH=%%~dpI;%PATH%"
if not exist node_modules (
  echo 正在安装依赖……
  call "%NPM%" install --no-audit --no-fund
  if errorlevel 1 ( echo 安装失败 & pause & exit /b 1 )
)
if not exist data mkdir data
if not exist data\.logged-in (
  echo.
  echo ==============================================
  echo   第一次需要登录 Claude（用你的订阅账号）。
  echo   接下来会打开 Claude Code 的界面：
  echo   1^) 输入  /login  然后回车
  echo   2^) 按提示在浏览器里登录，把授权码粘贴回来
  echo   3^) 看到登录成功后，按 Ctrl+C 两次退出，脚本会继续
  echo ==============================================
  pause
  "%NODE%" node_modules\@anthropic-ai\claude-agent-sdk\cli.js
  type nul > data\.logged-in
)
start "" "http://localhost:8787"
echo 后端启动中，关闭这个窗口就会停止。要重新登录：删除 server\data\.logged-in 再双击。
"%NODE%" index.mjs
pause
