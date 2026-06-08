import subprocess
import threading
import queue
import time
from .adb import run_cmd, is_tool_installed

# Thread-safe queue to keep command logs
command_logs = []

def log_message(msg: str):
    """Adds a log message with a timestamp."""
    timestamp = time.strftime("%H:%M:%S")
    command_logs.append(f"[{timestamp}] {msg}")
    # Keep the log buffer size reasonable (e.g. 500 lines)
    if len(command_logs) > 500:
        command_logs.pop(0)

def get_logs() -> list[str]:
    """Returns all logs."""
    return command_logs

def clear_logs():
    """Cleans up the log buffer."""
    command_logs.clear()

def execute_generic_cmd(args: list[str], log_prefix: str = "Command"):
    """
    Executes a command in a separate thread to avoid blocking the main server thread,
    writing stdout and stderr to the log buffer.
    """
    log_message(f"Running: {' '.join(args)}")
    
    def target():
        try:
            # We run subprocess.Popen to capture output line-by-line if needed
            process = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            
            # Read stdout and stderr
            stdout, stderr = process.communicate()
            
            if stdout:
                for line in stdout.strip().split("\n"):
                    if line.strip():
                        log_message(f"STDOUT: {line}")
            if stderr:
                for line in stderr.strip().split("\n"):
                    if line.strip():
                        log_message(f"STDERR: {line}")
            
            log_message(f"Process finished with code {process.returncode}")
        except Exception as e:
            log_message(f"Execution Error: {str(e)}")
            
    thread = threading.Thread(target=target)
    thread.daemon = True
    thread.start()
    return True
