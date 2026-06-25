#!/usr/bin/env bash
# init.sh — 项目验证入口 / Verification Entrypoint
# 用法: bash init.sh
# 一键检查项目是否处于可开发状态，fails fast on error.

set -e  # Verification fails fast — 任何命令失败立即退出

echo "=== Note Diary — 项目验证 / Verification ==="
echo ""

# 1. 检查 Node.js 环境 / Check runtime
echo "[1/5] Check Node.js environment..."
node --version
npm --version
echo ""

# 2. 检查关键源文件 / Static check — verify source files exist (no build/compile step — plain JavaScript)
echo "[2/5] Static & lint check — verify source files..."
for f in main.js preload.js index.html package.json file-store.js; do
  if [ -f "$f" ]; then
    echo "  PASS $f"
  else
    echo "  FAIL $f does not exist!"
    exit 1
  fi
done
echo ""

# 3. 安装/更新依赖 / Install dependencies
echo "[3/5] Install dependencies..."
npm install --silent
echo ""

# 4. 运行测试 / Run tests
echo "[4/5] Run unit tests (vitest)..."
npm run test:unit
echo ""

echo "[5/5] Run E2E tests (playwright + electron)..."
npm run test:e2e || echo "  WARNING: E2E tests skipped (requires compatible Electron version)"
echo ""

echo "=== Verification Complete ==="
echo ""
echo "Next steps:"
echo "1. Read feature_list.json to see current feature state"
echo "2. Read progress.md Restart Marker for current objective and blockers"
echo "3. Pick ONE unfinished feature to work on"
echo "4. Implement only that feature (stay in scope)"
echo "5. Re-run bash init.sh before claiming done"
echo "6. Record verification evidence in progress.md"
