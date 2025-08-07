# utils/logging.py
from datetime import datetime
import threading

# Global cache
process_log_entries = []
# Thread lock for log operations
log_lock = threading.Lock()


def log_process_detail(message: str):
    """Appends a message to the process log buffer. Thread-safe."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")
    with log_lock:
        process_log_entries.append(f"[{timestamp}] {message}")
        print(message)  # Print in real-time if needed 