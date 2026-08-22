#!/usr/bin/env bash
set -e

PORT_API=${PORT_API:-3001}
PORT_WEB=${PORT_WEB:-8080}
DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🔧 FiberTap Dev Server"
echo "======================"

# Build widget if needed
if [ ! -f "$DIR/packages/widget/dist/widget.min.js" ]; then
  echo "📦 Building widget..."
  cd "$DIR" && pnpm --filter @fibertap/widget build
fi

# Kill existing processes on our ports
kill_port() {
  local pid=$(lsof -ti :$1 2>/dev/null)
  if [ -n "$pid" ]; then
    echo "⚠️  Killing existing process on port $1"
    kill $pid 2>/dev/null || true
    sleep 1
  fi
}
kill_port $PORT_API
kill_port $PORT_WEB

echo ""
echo "🚀 Starting API server on port $PORT_API..."
cd "$DIR" && pnpm --filter @fibertap/api dev > /tmp/fibertap-api.log 2>&1 &
API_PID=$!
sleep 3

# Verify API is up
if curl -s http://localhost:$PORT_API/health > /dev/null 2>&1; then
  echo "✅ API server ready"
else
  echo "❌ API server failed to start. Check /tmp/fibertap-api.log"
  cat /tmp/fibertap-api.log
  exit 1
fi

echo "🌐 Starting web server on port $PORT_WEB..."
cd "$DIR/packages/widget" && python3 -m http.server $PORT_WEB > /tmp/fibertap-www.log 2>&1 &
WEB_PID=$!
sleep 2

echo ""
echo "═══════════════════════════════════════════"
echo "  🎉 FiberTap is running!"
echo ""
echo "  📄 Playground:   http://localhost:$PORT_WEB/test-page.html"
echo "  🔌 API Health:   http://localhost:$PORT_API/health"
echo "  📦 Widget JS:    http://localhost:$PORT_WEB/dist/widget.min.js"
echo ""
echo "  Press Ctrl+C to stop all servers"
echo "═══════════════════════════════════════════"

# Cleanup on exit
trap "echo ''; echo 'Shutting down...'; kill $API_PID $WEB_PID 2>/dev/null; exit 0" SIGINT SIGTERM

# Keep alive
wait
