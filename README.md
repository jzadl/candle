# 🕯️ Candle Toolkit

A self-contained Android device toolkit with a modern desktop UI. Built with Tauri, React and FastAPI.

---

## Features

| Module | Description |
|---|---|
| **Device Status** | Real-time device info via ADB: model, manufacturer, Android version and bootloader state |
| **System Debloater** | Browse installed packages, uninstall or disable bloatware with one click |
| **ADB & Fastboot Console** | Run arbitrary ADB/Fastboot commands and view a persistent command log |
| **MediaTek BROM** | MediaTek bootrom actions: detect chipset and enter/exit BROM mode |
| **Boot Animation Creator** | Compile MP4 videos or image sequences into a valid `bootanimation.zip` *(experimental, untested)* |
| **Magisk Patcher** | Patch a stock `boot.img` or `init_boot.img` using a native `magiskboot` binary *(untested)* |
| **Screen Mirroring** | Mirror the connected device screen via integrated `scrcpy` in an external window |

---

## Requirements

### Host (Linux x86_64)
- Python 3.11+
- Node.js 18+ & npm
- Rust nightly (for Tauri) — `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- System libraries: `sudo dnf install gcc-c++ webkit2gtk4.0-devel openssl-devel libsoup3-devel javascriptcoregtk4.0-devel` (Fedora) or equivalent for your distro
- ADB in `$PATH` (or use the one bundled in `backend/tools/linux/`)

### Device
- USB debugging enabled
- For Magisk patching: unlocked bootloader

---

## Building from Source

### Quick — one-shot

```bash
git clone https://github.com/jzadl/candle.git
cd candle
bash scripts/install.sh
```

This installs Python deps, downloads prebuilt scrcpy, builds the PyInstaller sidecar, compiles the Tauri app, and registers a desktop entry. Run `candle` (or launch from the app menu) after it completes.

### Step-by-step

```bash
# 1. Install dependencies
pip install fastapi uvicorn opencv-python-headless numpy pillow pyinstaller
npm install

# 2. Download scrcpy binary + server (prebuilt, no system deps needed)
curl -sL https://github.com/Genymobile/scrcpy/releases/download/v4.0/scrcpy-linux-x86_64-v4.0.tar.gz \
  | tar xz -C /tmp && cp /tmp/scrcpy-linux-x86_64-v4.0/scrcpy backend/tools/linux/
curl -sL https://github.com/Genymobile/scrcpy/releases/download/v4.0/scrcpy-server-v4.0 \
  -o backend/tools/linux/scrcpy-server

# 3. Build Python backend into a standalone sidecar binary
pyinstaller main.spec

# 4. Copy the sidecar where Tauri expects it
cp dist/main src-tauri/binaries/candle-backend-x86_64-unknown-linux-gnu

# 5. Build the Tauri app
npx tauri build

# 6. (Optional) Register icons and desktop entry
size=256; dst="$HOME/.local/share/icons/hicolor/${size}x${size}/apps"
mkdir -p "$dst" ~/.local/share/applications ~/.local/bin
cp src-tauri/icons/128x128@2x.png "$dst/candle.png"
ln -sf "$PWD/src-tauri/target/release/candle" ~/.local/bin/candle
cat > ~/.local/share/applications/candle.desktop << EOF
[Desktop Entry]
Name=Candle
Exec=$PWD/src-tauri/target/release/candle
Icon=candle
Terminal=false
Type=Application
Categories=Utility;
EOF
```

The final binary is at `src-tauri/target/release/candle` and bundles are available at `src-tauri/target/release/bundle/`.

> **Note:** scrcpy is downloaded as a prebuilt Linux static binary from GitHub releases — no SDL2, ffmpeg, meson, or ninja required on your system.

---

## Project Structure

```
Candle/
├── backend/
│   ├── main.py               # FastAPI app, all REST endpoints
│   └── modules/
│       ├── adb.py            # ADB/Fastboot wrappers
│       ├── bootanim.py       # Boot animation builder (MP4 or image dir to ZIP)
│       ├── commands.py       # Generic command execution and log store
│       ├── debloater.py      # Package list and uninstall/disable helpers
│       ├── magisk.py         # magiskboot patch pipeline
│       ├── mtk.py            # MediaTek BROM helpers
│       └── scrcpy.py         # scrcpy process manager
│   └── tools/linux/
│       ├── adb               # Bundled ADB binary
│       ├── magiskboot        # Native x86_64 magiskboot binary
│       ├── scrcpy            # scrcpy binary
│       └── scrcpy-server     # scrcpy server JAR
├── src/
│   ├── pages/                # React page components (one per feature)
│   └── components/           # Shared UI components (FilePicker, etc.)
├── icons/                    # App icons
├── scratch/
│   └── Magisk/scripts/       # Reference Magisk shell scripts
├── index.html
└── README.md
```

---

## Running Locally

**1. Start the backend API:**
```bash
python3 backend/main.py
# Listens on http://127.0.0.1:8000
```

**2. Start the frontend dev server:**
```bash
npm install
npm run dev
# Opens on http://localhost:1420
```

---

## Module Details

### Boot Animation Creator
Accepts either an `.mp4` video file or a directory of sequentially-named images. If a video is provided, frames are extracted automatically via OpenCV and resized to the target resolution. The output is a zero-compression ZIP (`bootanimation.zip`) compatible with Android's boot animation system.

> ⚠️ **Untested.** Results may vary across OEM devices and Android versions.

**Install on device:**
```bash
adb push bootanimation.zip /data/local/bootanimation.zip
```

### Magisk Patcher
Uses the native `magiskboot` binary (x86_64) to unpack the stock boot image, patch the ramdisk to embed the Magisk init stub, and repack a patched image ready to flash.

> ⚠️ **Untested.** Verify on a non-production device before flashing anything permanent.

**Flash patched image:**
```bash
adb reboot bootloader
fastboot flash boot patched_boot.img
fastboot reboot
```

### Screen Mirroring
Launches `scrcpy` using the bundled binary. Opens a native external window. The device must be connected via USB with ADB debugging active.

---

## API

The backend exposes a REST API at `http://127.0.0.1:8000`. Interactive docs available at:
```
http://127.0.0.1:8000/docs
```

---

## License

For personal use. Magisk is property of topjohnwu. scrcpy is property of Genymobile.
