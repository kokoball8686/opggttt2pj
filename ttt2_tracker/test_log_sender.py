import json
import os
import platform
import socket
import urllib.error
import urllib.request
from datetime import datetime, timezone
from uuid import uuid4


SUPABASE_URL = "https://hnmwidamrbcslnaykaem.supabase.co"
SUPABASE_KEY = os.environ.get(
    "TAG2_SUPABASE_KEY",
    "sb_publishable_D4XcdQKUZh7EMCoFNx7YWA_K0PWiKkl",
)


def send_test_log():
    payload = {
        "app_version": "0.1.0-log-test",
        "install_id": f"log-test-{uuid4()}",
        "hostname": socket.gethostname(),
        "username": os.environ.get("USERNAME") or os.environ.get("USER") or "",
        "windows_version": platform.platform(),
        "rpcs3_version": "",
        "log_level": "info",
        "event_name": "log_delivery_test",
        "message": "Test log sent successfully from the standalone log test client.",
        "traceback": "",
        "context": {
            "test": True,
            "sent_at_utc": datetime.now(timezone.utc).isoformat(),
        },
    }
    request = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/tracker_logs",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            print(f"LOG_TEST_SUCCESS status={response.status}")
            print("Check the tracker_logs table in Supabase.")
            return 0
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, OSError) as error:
        print(f"LOG_TEST_FAILED {error}")
        return 1


if __name__ == "__main__":
    raise SystemExit(send_test_log())
