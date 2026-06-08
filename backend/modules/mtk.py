from .adb import run_cmd, is_tool_installed
from .commands import execute_generic_cmd, log_message

def detect_mtk_chipset(serial: str) -> str:
    code, out, _ = run_cmd(["adb", "-s", serial, "shell", "getprop", "ro.board.platform"])
    platform = out.strip().lower()
    if not platform:
        code, out, _ = run_cmd(["adb", "-s", serial, "shell", "getprop", "ro.mediatek.platform"])
        platform = out.strip().lower()
    return platform if platform else "unknown"

def run_brom_action(action: str, serial: str = None) -> dict:
    if not is_tool_installed("mtk"):
        log_message("Warning: 'mtk' command-line utility (mtkclient) not found in system PATH.")
    
    if action == "unlock":
        args = ["mtk", "oem", "unlock"]
    elif action == "lock":
        args = ["mtk", "oem", "lock"]
    elif action == "dump_boot":
        args = ["mtk", "r", "boot", "boot.img"]
    elif action == "flash_payload":
        args = ["mtk", "w", "boot", "payload.bin"]
    else:
        return {"status": "error", "message": f"Unsupported BROM action: {action}"}
        
    execute_generic_cmd(args, f"BROM {action.upper()}")
    return {"status": "success", "message": f"Started BROM action: {action}"}
