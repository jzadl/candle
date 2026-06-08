import subprocess
from .adb import run_cmd

# Curated list of common bloatware packages by manufacturer
COMMON_BLOATWARE = {
    "generic": [
        {"package": "com.android.chrome", "name": "Google Chrome", "description": "Default Google Browser"},
        {"package": "com.google.android.apps.docs", "name": "Google Drive", "description": "Cloud storage app"},
        {"package": "com.google.android.apps.photos", "name": "Google Photos", "description": "Photo backup and gallery"},
        {"package": "com.google.android.youtube", "name": "YouTube", "description": "Official YouTube client"},
        {"package": "com.google.android.apps.youtube.music", "name": "YouTube Music", "description": "Music streaming client"},
        {"package": "com.google.android.videos", "name": "Google Play Movies", "description": "Legacy video rental app"},
        {"package": "com.google.android.music", "name": "Google Play Music", "description": "Legacy music player"},
        {"package": "com.google.android.feedback", "name": "Market Feedback Agent", "description": "Submits crash reports to Google"},
        {"package": "com.google.android.tts", "name": "Google Speech Services", "description": "Text-to-speech engine"},
    ],
    "xiaomi": [
        {"package": "com.miui.analytics", "name": "MIUI Daemon/Analytics", "description": "Collects telemetry and usage statistics"},
        {"package": "com.miui.msa.global", "name": "MIUI System Ads (MSA)", "description": "Serves advertisements in system apps"},
        {"package": "com.miui.hybrid", "name": "Quick Apps", "description": "Runs web apps without installing them"},
        {"package": "com.xiaomi.discover", "name": "Xiaomi Discover", "description": "Ad/content discovery feed"},
        {"package": "com.miui.bugreport", "name": "Mi Feedback", "description": "Mi Bug reporter"},
        {"package": "com.miui.cleanmaster", "name": "Cleaner", "description": "MIUI cleaning tool"},
        {"package": "com.miui.videoplayer", "name": "Mi Video", "description": "Default video player with ads"},
        {"package": "com.miui.player", "name": "Mi Music", "description": "Default music player with ads"},
        {"package": "com.xiaomi.mipicks", "name": "GetApps", "description": "Xiaomi's secondary app store"},
        {"package": "com.xiaomi.glance.internet", "name": "Glance", "description": "Lock screen ads and wallpapers"},
    ],
    "samsung": [
        {"package": "com.samsung.android.bixby.agent", "name": "Bixby Voice Agent", "description": "Voice recognition service"},
        {"package": "com.samsung.android.app.spage", "name": "Bixby Home / Samsung Daily", "description": "Leftmost panel on home screen"},
        {"package": "com.samsung.android.bixby.wakeup", "name": "Bixby Wakeup", "description": "Bixby hotword detection"},
        {"package": "com.sec.android.app.sbrowser", "name": "Samsung Internet", "description": "Samsung web browser"},
        {"package": "com.samsung.android.game.gamehome", "name": "Game Launcher", "description": "Gaming hub app"},
        {"package": "com.samsung.android.game.gamelab", "name": "Game Tools", "description": "Gaming overlay tool"},
        {"package": "com.samsung.android.kidsinstaller", "name": "Samsung Kids", "description": "Child-friendly sandboxed mode"},
        {"package": "com.samsung.android.app.watchmanager", "name": "Galaxy Wearable", "description": "Companion app for Samsung wearables"},
        {"package": "com.sec.android.easyMover", "name": "Smart Switch", "description": "Data transfer tool"},
    ],
    "huawei": [
        {"package": "com.huawei.android.hwpay", "name": "Huawei Wallet", "description": "Payment and wallet app"},
        {"package": "com.huawei.hwid", "name": "Huawei Mobile Services (HMS)", "description": "Account manager"},
        {"package": "com.huawei.himovie.overseas", "name": "Huawei Video", "description": "Video player and service"},
        {"package": "com.huawei.music", "name": "Huawei Music", "description": "Music player and service"},
    ]
}

def get_installed_packages(serial: str) -> list[str]:
    """Retrieves all installed system packages on the device."""
    code, stdout, stderr = run_cmd(["adb", "-s", serial, "shell", "pm", "list", "packages", "-s"])
    if code != 0:
        return []
    
    packages = []
    for line in stdout.strip().split("\n"):
        if line.startswith("package:"):
            packages.append(line.replace("package:", "").strip())
    return sorted(packages)

def uninstall_package(serial: str, package: str) -> bool:
    """Uninstalls a package for user 0."""
    code, stdout, stderr = run_cmd(["adb", "-s", serial, "shell", "pm", "uninstall", "--user", "0", package])
    return code == 0 and "success" in stdout.lower()

def disable_package(serial: str, package: str) -> bool:
    """Disables a package for user 0."""
    code, stdout, stderr = run_cmd(["adb", "-s", serial, "shell", "pm", "disable-user", package])
    return code == 0 and "disabled" in stdout.lower()
