#!/bin/bash
cd "$(dirname "$0")"
if command -v node >/dev/null 2>&1; then
  exec node server.mjs
elif [ -x /Users/bytedance/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ]; then
  exec /Users/bytedance/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node server.mjs
else
  echo '请先安装 Node.js 22 或更新版本，再打开作者工作台。'
  read -r
fi
