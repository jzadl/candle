import os
import sys
import shutil
from .adb import run_cmd, is_tool_installed
from .commands import log_message

def _tools_dir() -> str:
    if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
        return os.path.join(sys._MEIPASS, "tools", "linux")
    return os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "tools", "linux")

def get_magiskboot_path() -> str:
    tool = shutil.which("magiskboot")
    if tool:
        return tool
    local_path = os.path.join(_tools_dir(), "magiskboot")
    if os.path.exists(local_path):
        return local_path
    return None

def patch_boot_image(boot_path: str, output_path: str) -> bool:
    if not os.path.exists(boot_path):
        log_message(f"Error: Boot image {boot_path} not found.")
        return False
        
    magiskboot = get_magiskboot_path()
    if not magiskboot:
        log_message("Error: 'magiskboot' binary not found.")
        return False
        
    try:
        work_dir = os.path.dirname(output_path)
        temp_boot = os.path.join(work_dir, "boot.img")
        shutil.copy(boot_path, temp_boot)
        
        orig_cwd = os.getcwd()
        os.chdir(work_dir)
        
        code, out, err = run_cmd([magiskboot, "unpack", "boot.img"])
        if code not in (0, 2, 3):
            log_message(f"Unpack failed: {err}")
            os.chdir(orig_cwd)
            return False
            
        ramdisk = None
        for r_file in ["ramdisk.cpio", "vendor_ramdisk/init_boot.cpio", "vendor_ramdisk/ramdisk.cpio"]:
            if os.path.exists(r_file):
                ramdisk = r_file
                break
                
        if ramdisk:
            run_cmd([magiskboot, "cpio", ramdisk, "patch"])
            
        for dt in ["dtb", "kernel_dtb", "extra"]:
            if os.path.exists(dt):
                run_cmd([magiskboot, "dtb", dt, "patch"])
                
        if os.path.exists("kernel"):
            run_cmd([magiskboot, "hexpatch", "kernel", "49010054011440B93FA00F71E9000054010840B93FA00F7189000054001840B91FA00F7188010054", "A1020054011440B93FA00F7140020054010840B93FA00F71E0010054001840B91FA00F7181010054"])
            run_cmd([magiskboot, "hexpatch", "kernel", "821B8012", "E2FF8F12"])
            run_cmd([magiskboot, "hexpatch", "kernel", "70726F63615F636F6E66696700", "70726F63615F6D616769736B00"])
            
        code, out, err = run_cmd([magiskboot, "repack", "boot.img", "new-boot.img"])
        if code != 0:
            log_message(f"Repack failed: {err}")
            os.chdir(orig_cwd)
            return False
            
        shutil.move("new-boot.img", output_path)
        
        for f in ["boot.img", "kernel", "ramdisk.cpio", "second", "dtb", "extra", "recovery_dtbo", "ramdisk.cpio.orig"]:
            if os.path.exists(f):
                os.remove(f)
                
        os.chdir(orig_cwd)
        log_message(f"Boot image successfully patched: {output_path}")
        return True
    except Exception as e:
        log_message(f"Magisk patch error: {str(e)}")
        if 'orig_cwd' in locals():
            os.chdir(orig_cwd)
        return False
