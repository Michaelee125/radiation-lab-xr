#!/bin/zsh
set -e

PACKAGE_DIR="$(cd "$(dirname "$0")" && pwd)"
NODE_BIN="$(command -v node || true)"
PYTHON_BIN="$(command -v python3 || true)"

if [[ -n "$NODE_BIN" ]]; then
  SERVER_COMMAND=("$NODE_BIN" "../mac-test-server.mjs")
elif [[ -n "$PYTHON_BIN" ]]; then
  SERVER_COMMAND=("$PYTHON_BIN" "-m" "http.server" "4173" "--bind" "127.0.0.1")
else
  echo "未找到 Node.js 或 Python 3。请先安装 Node.js 20 或更高版本，然后重新运行。"
  echo "按任意键关闭此窗口。"
  read -k 1
  exit 1
fi

cd "$PACKAGE_DIR/client"
"${SERVER_COMMAND[@]}" &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT INT TERM

sleep 1
open "http://127.0.0.1:4173"

echo "Radiation Lab XR 已在 http://127.0.0.1:4173 启动。"
echo "测试结束后，请在此窗口按 Control + C 停止服务器。"
wait "$SERVER_PID"
