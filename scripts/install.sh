#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRCPY_VERSION="v4.0"
TOOLS_DIR="$ROOT/backend/tools/linux"
BUILD_DIR="/tmp/candle-install-build"

ICONS_DIR="$HOME/.local/share/icons/hicolor"
APPS_DIR="$HOME/.local/share/applications"
BIN_DIR="$HOME/.local/bin"

info() { echo -e "\033[1;34m[INFO]\033[0m $*"; }
ok()   { echo -e "\033[1;32m[OK]\033[0m $*"; }
err()  { echo -e "\033[1;31m[ERR]\033[0m $*"; }

cleanup() { rm -rf "$BUILD_DIR"; }
trap cleanup EXIT

cd "$ROOT"

# ── 1. Python deps ──────────────────────────────────────────────────
info "Installing Python dependencies..."
pip install fastapi uvicorn opencv-python-headless numpy pillow pyinstaller | tail -1

# ── 2. Download scrcpy + scrcpy-server ─────────────────────────────
mkdir -p "$BUILD_DIR" "$TOOLS_DIR"

if [ ! -x "$TOOLS_DIR/scrcpy" ] || [ ! -f "$TOOLS_DIR/scrcpy-server" ]; then
    ARCH="$(uname -m)"
    case "$ARCH" in
        x86_64)  PKG_ARCH="x86_64" ;;
        aarch64) PKG_ARCH="aarch64" ;;
        *)       err "Unsupported architecture: $ARCH"; exit 1 ;;
    esac

    TARBALL="scrcpy-linux-${PKG_ARCH}-${SCRCPY_VERSION}.tar.gz"
    TARBALL_URL="https://github.com/Genymobile/scrcpy/releases/download/${SCRCPY_VERSION}/${TARBALL}"

    if [ ! -f "$TOOLS_DIR/scrcpy" ]; then
        info "Downloading scrcpy $SCRCPY_VERSION (Linux static binary)..."
        if command -v curl &>/dev/null; then
            curl -sL "$TARBALL_URL" -o "$BUILD_DIR/$TARBALL"
        elif command -v wget &>/dev/null; then
            wget -q "$TARBALL_URL" -O "$BUILD_DIR/$TARBALL"
        else
            err "Need curl or wget"
            exit 1
        fi
        tar xzf "$BUILD_DIR/$TARBALL" -C "$BUILD_DIR"
        cp "$BUILD_DIR/scrcpy-linux-${PKG_ARCH}-${SCRCPY_VERSION}/scrcpy" "$TOOLS_DIR/scrcpy"
        chmod +x "$TOOLS_DIR/scrcpy"
        ok "scrcpy binary downloaded"
    fi

    if [ ! -f "$TOOLS_DIR/scrcpy-server" ]; then
        info "Downloading scrcpy-server..."
        SERVER_URL="https://github.com/Genymobile/scrcpy/releases/download/${SCRCPY_VERSION}/scrcpy-server-${SCRCPY_VERSION}"
        if command -v curl &>/dev/null; then
            curl -sL "$SERVER_URL" -o "$TOOLS_DIR/scrcpy-server"
        elif command -v wget &>/dev/null; then
            wget -q "$SERVER_URL" -O "$TOOLS_DIR/scrcpy-server"
        fi
        if [ -f "$TOOLS_DIR/scrcpy-server" ] && [ -s "$TOOLS_DIR/scrcpy-server" ]; then
            ok "scrcpy-server downloaded"
        else
            err "Failed to download scrcpy-server"
            exit 1
        fi
    fi
else
    ok "scrcpy already present"
fi

# ── 3. Build Python backend ────────────────────────────────────────
info "Building Python backend with PyInstaller..."
pyinstaller main.spec | tail -3

TARGET_TRIPLE="${TARGET_TRIPLE:-x86_64-unknown-linux-gnu}"
mkdir -p "src-tauri/binaries"
cp "dist/main" "src-tauri/binaries/candle-backend-${TARGET_TRIPLE}"
ok "Backend sidecar copied"

# ── 4. Build Tauri app ─────────────────────────────────────────────
info "Building Tauri app..."
npx tauri build
ok "Tauri build complete"

# ── 5. Register icons + desktop entry ──────────────────────────────
info "Installing local desktop integration..."
mkdir -p "$ICONS_DIR" "$APPS_DIR" "$BIN_DIR"

for size in 32x32 128x128; do
    dst="$ICONS_DIR/$size/apps"
    mkdir -p "$dst"
    cp "$ROOT/src-tauri/icons/$size.png" "$dst/candle.png"
done

dst="$ICONS_DIR/256x256/apps"
mkdir -p "$dst"
cp "$ROOT/src-tauri/icons/128x128@2x.png" "$dst/candle.png"

BINARY="$ROOT/src-tauri/target/release/candle"

cat > "$APPS_DIR/candle.desktop" << DESKTOP
[Desktop Entry]
Name=Candle
Comment=Candle Toolkit - Android device management utility
Exec=$BINARY
Icon=candle
Terminal=false
Type=Application
Categories=Utility;
StartupWMClass=candle
DESKTOP

ln -sf "$BINARY" "$BIN_DIR/candle"
gtk-update-icon-cache "$ICONS_DIR" 2>/dev/null || true

ok "Installation complete!"
echo "Run 'candle' from terminal or launch from app menu."
echo "If the dock still shows the generic icon, log out and back in."
