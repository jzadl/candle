import subprocess
import shutil

def is_tool_installed(name: str) -> bool:
    return shutil.which(name) is not None

def run_cmd(args: list[str]) -> tuple[int, str, str]:
    try:
        res = subprocess.run(args, capture_output=True, text=True, timeout=10)
        return res.returncode, res.stdout, res.stderr
    except subprocess.TimeoutExpired:
        return -1, "", "Timeout"
    except Exception as e:
        return -1, "", str(e)

def get_connected_devices() -> list[dict]:
    devices = []
    
    if is_tool_installed("adb"):
        code, stdout, _ = run_cmd(["adb", "devices"])
        if code == 0:
            lines = stdout.strip().split("\n")[1:]
            for line in lines:
                if not line.strip():
                    continue
                parts = line.split()
                if len(parts) >= 2:
                    serial = parts[0]
                    state = parts[1]
                    mode = "normal" if state == "device" else state
                    
                    model = "Unknown"
                    android_version = "Unknown"
                    manufacturer = "Unknown"
                    bootloader_locked = "Unknown"
                    
                    if state in ("device", "recovery", "sideload"):
                        _, m_out, _ = run_cmd(["adb", "-s", serial, "shell", "getprop", "ro.product.model"])
                        _, a_out, _ = run_cmd(["adb", "-s", serial, "shell", "getprop", "ro.build.version.release"])
                        _, man_out, _ = run_cmd(["adb", "-s", serial, "shell", "getprop", "ro.product.manufacturer"])
                        _, lock_out, _ = run_cmd(["adb", "-s", serial, "shell", "getprop", "ro.boot.flash.locked"])
                        
                        model = m_out.strip() if m_out.strip() else "Unknown"
                        android_version = a_out.strip() if a_out.strip() else "Unknown"
                        manufacturer = man_out.strip() if man_out.strip() else "Unknown"
                        
                        lock_val = lock_out.strip()
                        if lock_val == "1":
                            bootloader_locked = "Locked"
                        elif lock_val == "0":
                            bootloader_locked = "Unlocked"
                        else:
                            bootloader_locked = "Unknown"
                            
                    devices.append({
                        "serial": serial,
                        "mode": mode,
                        "state": state,
                        "model": model,
                        "android_version": android_version,
                        "manufacturer": manufacturer,
                        "bootloader_locked": bootloader_locked
                    })

    if is_tool_installed("fastboot"):
        code, stdout, _ = run_cmd(["fastboot", "devices"])
        if code == 0:
            lines = stdout.strip().split("\n")
            for line in lines:
                if not line.strip():
                    continue
                parts = line.split()
                if len(parts) >= 2:
                    serial = parts[0]
                    state = parts[1]
                    
                    product = "Unknown"
                    locked = "Unknown"
                    
                    _, var_out, var_err = run_cmd(["fastboot", "-s", serial, "getvar", "product", "secure"])
                    out_text = var_out + "\n" + var_err
                    for var_line in out_text.split("\n"):
                        if "product:" in var_line:
                            product = var_line.split("product:")[1].strip()
                        if "secure:" in var_line:
                            sec_val = var_line.split("secure:")[1].strip()
                            locked = "Locked" if sec_val.lower() == "yes" else "Unlocked"
                            
                    devices.append({
                        "serial": serial,
                        "mode": "fastboot",
                        "state": state,
                        "model": product,
                        "android_version": "N/A",
                        "manufacturer": "Unknown",
                        "bootloader_locked": locked
                    })
                    
    return devices
