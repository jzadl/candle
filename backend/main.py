from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel
import os
import asyncio

from modules.adb import get_connected_devices, run_cmd
from modules.debloater import COMMON_BLOATWARE, get_installed_packages, uninstall_package, disable_package
from modules.commands import execute_generic_cmd, get_logs, clear_logs, log_message

from modules.mtk import run_brom_action, detect_mtk_chipset
from modules.bootanim import create_boot_animation
from modules.magisk import patch_boot_image
from modules.scrcpy import (
    start_scrcpy, stop_scrcpy, connect_wireless, get_scrcpy_status,
    get_device_resolution, tap_device, keyevent_device
)

app = FastAPI(title="Candle Toolkit API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class UninstallRequest(BaseModel):
    serial: str
    package: str

class DisableRequest(BaseModel):
    serial: str
    package: str

class RebootRequest(BaseModel):
    serial: str
    mode: str

class SideloadRequest(BaseModel):
    serial: str
    filepath: str

class FlashRequest(BaseModel):
    serial: str
    partition: str
    filepath: str

class ShellRequest(BaseModel):
    serial: str
    command: str

class CustomCommandRequest(BaseModel):
    command: str

class MtkActionRequest(BaseModel):
    action: str
    serial: str | None = None

class BootAnimRequest(BaseModel):
    output_zip: str
    frames_source: str
    width: int = 1080
    height: int = 2400
    fps: int = 30

class MagiskRequest(BaseModel):
    boot_path: str
    output_path: str

class ScrcpyStartRequest(BaseModel):
    serial: str
    max_size: int = 1024
    bitrate: int = 4
    fps: int = 60
    record_path: str | None = None

class ScrcpyWirelessRequest(BaseModel):
    serial: str
    ip_address: str

class TapRequest(BaseModel):
    serial: str
    x: int
    y: int

class KeyRequest(BaseModel):
    serial: str
    keycode: int

@app.get("/api/devices")
def read_devices():
    return get_connected_devices()

@app.get("/api/debloater/packages")
def read_packages(serial: str = Query(...)):
    all_packages = get_installed_packages(serial)
    if not all_packages:
        return {"all": [], "bloat": []}
    
    _, man_out, _ = run_cmd(["adb", "-s", serial, "shell", "getprop", "ro.product.manufacturer"])
    manufacturer = man_out.strip().lower()
    
    bloat_recommendations = []
    bloat_recommendations.extend(COMMON_BLOATWARE.get("generic", []))
    for key, items in COMMON_BLOATWARE.items():
        if key in manufacturer:
            bloat_recommendations.extend(items)
            break
            
    installed_bloat = []
    all_packages_set = set(all_packages)
    for item in bloat_recommendations:
        if item["package"] in all_packages_set:
            installed_bloat.append(item)
            
    return {
        "all": all_packages,
        "bloat": installed_bloat,
        "manufacturer": manufacturer
    }

@app.post("/api/debloater/uninstall")
def post_uninstall(req: UninstallRequest):
    success = uninstall_package(req.serial, req.package)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to uninstall")
    return {"status": "success", "package": req.package}

@app.post("/api/debloater/disable")
def post_disable(req: DisableRequest):
    success = disable_package(req.serial, req.package)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to disable")
    return {"status": "success", "package": req.package}

@app.post("/api/commands/reboot")
def post_reboot(req: RebootRequest):
    if req.mode == "normal":
        args = ["adb", "-s", req.serial, "reboot"]
    elif req.mode == "recovery":
        args = ["adb", "-s", req.serial, "reboot", "recovery"]
    elif req.mode == "bootloader":
        args = ["adb", "-s", req.serial, "reboot", "bootloader"]
    elif req.mode == "fastboot-reboot":
        args = ["fastboot", "-s", req.serial, "reboot"]
    elif req.mode == "fastboot-recovery":
        args = ["fastboot", "-s", req.serial, "reboot", "recovery"]
    elif req.mode == "fastboot-fastboot":
        args = ["fastboot", "-s", req.serial, "reboot", "fastboot"]
    else:
        raise HTTPException(status_code=400, detail="Invalid mode")
    execute_generic_cmd(args, "Reboot")
    return {"status": "success", "message": f"Reboot command '{req.mode}' sent"}

@app.post("/api/commands/sideload")
def post_sideload(req: SideloadRequest):
    if not os.path.exists(req.filepath):
        raise HTTPException(status_code=404, detail="File not found")
    args = ["adb", "-s", req.serial, "sideload", req.filepath]
    execute_generic_cmd(args, "Sideload")
    return {"status": "success", "message": "Sideload started"}

@app.post("/api/commands/flash")
def post_flash(req: FlashRequest):
    if not os.path.exists(req.filepath):
        raise HTTPException(status_code=404, detail="File not found")
    args = ["fastboot", "-s", req.serial, "flash", req.partition, req.filepath]
    execute_generic_cmd(args, "Flash")
    return {"status": "success", "message": "Flashing started"}

@app.post("/api/commands/shell")
def post_shell(req: ShellRequest):
    args = ["adb", "-s", req.serial, "shell", req.command]
    code, stdout, stderr = run_cmd(args)
    return {"exit_code": code, "stdout": stdout, "stderr": stderr}

@app.post("/api/commands/custom")
def post_custom(req: CustomCommandRequest):
    cmd_parts = req.command.strip().split()
    if not cmd_parts:
        raise HTTPException(status_code=400, detail="Empty command")
    binary = cmd_parts[0]
    if binary not in ("adb", "fastboot"):
        raise HTTPException(status_code=400, detail="Only adb and fastboot commands allowed")
    execute_generic_cmd(cmd_parts, "Custom Runner")
    return {"status": "success", "message": "Command executed"}

@app.get("/api/commands/logs")
def read_logs():
    return {"logs": get_logs()}

@app.post("/api/commands/logs/clear")
def post_clear_logs():
    clear_logs()
    return {"status": "success"}

@app.post("/api/mtk/action")
def post_mtk_action(req: MtkActionRequest):
    return run_brom_action(req.action, req.serial)

@app.get("/api/mtk/detect")
def get_mtk_detect(serial: str = Query(...)):
    platform = detect_mtk_chipset(serial)
    return {"platform": platform, "is_mtk": "mt" in platform or "mediatek" in platform}


@app.post("/api/bootanim/build")
def post_bootanim_build(req: BootAnimRequest):
    success = create_boot_animation(req.output_zip, req.frames_source, req.width, req.height, req.fps)
    if not success:
        raise HTTPException(status_code=400, detail="Compilation failed")
    return {"status": "success"}

@app.post("/api/magisk/patch")
def post_magisk_patch(req: MagiskRequest):
    success = patch_boot_image(req.boot_path, req.output_path)
    if not success:
        raise HTTPException(status_code=400, detail="Patching failed")
    return {"status": "success"}

@app.post("/api/scrcpy/start")
def post_scrcpy_start(req: ScrcpyStartRequest):
    return start_scrcpy(req.serial, req.max_size, req.bitrate, req.fps, req.record_path)

@app.post("/api/scrcpy/stop")
def post_scrcpy_stop():
    return stop_scrcpy()

@app.get("/api/scrcpy/status")
def get_scrcpy_status_endpoint():
    return get_scrcpy_status()

@app.post("/api/scrcpy/wireless")
def post_scrcpy_wireless(req: ScrcpyWirelessRequest):
    return connect_wireless(req.serial, req.ip_address)

@app.get("/api/utils/explore")
def explore_dir(path: str = Query(None)):
    if not path:
        path = os.path.expanduser("~")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Directory not found")
    try:
        items = os.listdir(path)
        folders = []
        files = []
        for item in items:
            if item.startswith("."):
                continue
            full_path = os.path.join(path, item)
            try:
                if os.path.isdir(full_path):
                    folders.append(item)
                else:
                    files.append(item)
            except Exception:
                continue
        return {
            "current_path": os.path.abspath(path),
            "folders": sorted(folders),
            "files": sorted(files)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/mirror/resolution")
def get_resolution(serial: str = Query(...)):
    w, h = get_device_resolution(serial)
    return {"width": w, "height": h}

@app.post("/api/mirror/tap")
def post_mirror_tap(req: TapRequest):
    tap_device(req.serial, req.x, req.y)
    return {"status": "success"}

@app.post("/api/mirror/key")
def post_mirror_key(req: KeyRequest):
    keyevent_device(req.serial, req.keycode)
    return {"status": "success"}

@app.get("/api/mirror/stream")
async def get_mirror_stream(serial: str = Query(...)):
    async def frame_generator():
        while True:
            proc = await asyncio.create_subprocess_exec(
                "adb", "-s", serial, "exec-out", "screencap", "-p",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.DEVNULL
            )
            stdout, _ = await proc.communicate()
            if stdout:
                yield (b'--frame\r\n'
                       b'Content-Type: image/png\r\n\r\n' + stdout + b'\r\n')
            await asyncio.sleep(0.06)
    return StreamingResponse(frame_generator(), media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/api/utils/image-preview")
def get_image_preview(path: str = Query(...)):
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
