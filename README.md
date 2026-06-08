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
- ADB in `$PATH` (or use the one bundled in `backend/tools/linux/`)
- `pip install fastapi uvicorn opencv-python-headless numpy pillow`

### Device
- USB debugging enabled
- For Magisk patching: unlocked bootloader

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
