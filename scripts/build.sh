#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

info() { echo -e "\033[1;34m[INFO]\033[0m $*"; }
ok()   { echo -e "\033[1;32m[OK]\033[0m $*"; }
err()  { echo -e "\033[1;31m[ERR]\033[0m $*"; }

# 1. Install Python deps
info "Installing Python dependencies..."
pip install fastapi uvicorn opencv-python-headless numpy pillow pyinstaller 2>&1 | tail -1

# 2. Set up scrcpy (downloads prebuilt binary + server)
info "Setting up scrcpy..."
bash scripts/build-scrcpy.sh

# 3. Build Python backend with PyInstaller
info "Building Python backend with PyInstaller..."
pyinstaller main.spec 2>&1 | tail -3

# 4. Copy sidecar binary (Tauri appends target triple)
TARGET_TRIPLE="${TARGET_TRIPLE:-x86_64-unknown-linux-gnu}"
mkdir -p "src-tauri/binaries"
cp "dist/main" "src-tauri/binaries/candle-backend-${TARGET_TRIPLE}"
ok "Backend sidecar copied to src-tauri/binaries/"

# 5. Build Tauri app
info "Building Tauri app (this will take a while)..."
npx tauri build 2>&1
ok "Build complete! Bundle at src-tauri/target/release/bundle/"
