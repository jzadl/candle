import os
import sys
import subprocess
import shutil
from .adb import run_cmd
from .commands import log_message

scrcpy_process = None

def is_scrcpy_running() -> bool:
    global scrcpy_process
    return scrcpy_process is not None and scrcpy_process.poll() is None

def _tools_dir() -> str:
    if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
        return os.path.join(sys._MEIPASS, "tools", "linux")
    return os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "tools", "linux")

def get_scrcpy_path() -> str:
    local_path = os.path.join(_tools_dir(), "scrcpy")
    if os.path.exists(local_path):
        return local_path
    return shutil.which("scrcpy")

def start_scrcpy(serial: str, max_size: int = 1024, bitrate: int = 4, fps: int = 60, record_path: str = None) -> dict:
    global scrcpy_process
    scrcpy_bin = get_scrcpy_path()
    if not scrcpy_bin:
        return {"status": "error", "message": "'scrcpy' tool is not installed."}
    if scrcpy_process and scrcpy_process.poll() is None:
        return {"status": "error", "message": "Mirror stream is already running."}
    args = [
        scrcpy_bin, "-s", serial,
        "--max-size", str(max_size),
        "--video-bit-rate", f"{bitrate}M",
        "--max-fps", str(fps)
    ]
    if record_path:
        args.extend(["--record", record_path])
    try:
        env = os.environ.copy()
        local_dir = _tools_dir()
        server_path = os.path.join(local_dir, "scrcpy-server")
        if os.path.exists(server_path):
            env["SCRCPY_SERVER_PATH"] = server_path
        adb_path = os.path.join(local_dir, "adb")
        if os.path.exists(adb_path):
            env["ADB"] = adb_path
        scrcpy_process = subprocess.Popen(args, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return {"status": "success", "message": "Mirror streaming started."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def stop_scrcpy() -> dict:
    global scrcpy_process
    if is_scrcpy_running():
        scrcpy_process.terminate()
        scrcpy_process.wait()
        scrcpy_process = None
        return {"status": "success", "message": "Mirror streaming stopped."}
    scrcpy_process = None
    return {"status": "error", "message": "No active stream to stop."}

def get_scrcpy_status() -> dict:
    return {"running": is_scrcpy_running()}

def connect_wireless(serial: str, ip_address: str) -> dict:
    code, out, err = run_cmd(["adb", "-s", serial, "tcpip", "5555"])
    if code != 0:
        return {"status": "error", "message": err}
    import time
    time.sleep(2)
    code, out, err = run_cmd(["adb", "connect", f"{ip_address}:5555"])
    if "connected" in out.lower():
        return {"status": "success", "message": f"Connected to {ip_address}."}
    return {"status": "error", "message": out}

def get_device_resolution(serial: str) -> tuple[int, int]:
    code, out, _ = run_cmd(["adb", "-s", serial, "shell", "wm", "size"])
    if code == 0 and "size:" in out.lower():
        parts = out.split(":")[-1].strip().split("x")
        if len(parts) == 2:
            try:
                return int(parts[0]), int(parts[1])
            except ValueError:
                pass
    return 1080, 2400

def tap_device(serial: str, x: int, y: int):
    run_cmd(["adb", "-s", serial, "shell", "input", "tap", str(x), str(y)])

def keyevent_device(serial: str, keycode: int):
    run_cmd(["adb", "-s", serial, "shell", "input", "keyevent", str(keycode)])


