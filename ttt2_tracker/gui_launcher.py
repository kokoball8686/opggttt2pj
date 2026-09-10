import os
import sys
import threading
import tkinter as tk
import json
import socket
import urllib.error
import urllib.request
import webbrowser
from tkinter import messagebox

import tracker


BG = "#0c0a18"
PANEL = "#17152b"
PANEL_ALT = "#201d3a"
TEXT = "#f4f0ff"
MUTED = "#aaa4c7"
ACCENT = "#5b8cff"
PINK = "#ff3f73"
VERSION = "0.1.0"
RELEASES_URL = "https://github.com/opggttt2pj/TAG2GG-Tracker/releases/latest"
LATEST_RELEASE_API = "https://api.github.com/repos/opggttt2pj/TAG2GG-Tracker/releases/latest"


def resource_path(filename):
    base_path = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base_path, filename)


class TrackerWindow:
    def __init__(self, root):
        self.root = root
        self.root.title("TAG2.GG Tracker")
        self.root.geometry("640x430")
        self.root.resizable(False, False)
        self.root.configure(bg=BG)

        try:
            self.root.iconphoto(
                True, tk.PhotoImage(file=resource_path("app-icon-192.png"))
            )
        except tk.TclError:
            pass

        self._build_layout()
        threading.Thread(target=self._check_version_and_start, daemon=True).start()
        self.root.protocol("WM_DELETE_WINDOW", self.root.destroy)

    @staticmethod
    def _version_tuple(version):
        clean_version = version.strip().lstrip("vV")
        parts = clean_version.split(".")
        if len(parts) != 3 or not all(part.isdigit() for part in parts):
            raise ValueError(f"Invalid version: {version}")
        return tuple(int(part) for part in parts)

    @classmethod
    def _get_latest_version(cls):
        with socket.create_connection(("api.github.com", 443), timeout=5):
            pass
        request = urllib.request.Request(
            LATEST_RELEASE_API,
            headers={
                "Accept": "application/vnd.github+json",
                "Cache-Control": "no-cache",
                "User-Agent": "TAG2GG-Tracker",
            },
        )
        with urllib.request.urlopen(request, timeout=5) as response:
            payload = json.load(response)
        tag_name = payload.get("tag_name")
        if not isinstance(tag_name, str):
            raise ValueError("GitHub release did not include a tag name")
        return tag_name

    def _check_version_and_start(self):
        try:
            latest_version = self._get_latest_version()
            update_available = self._version_tuple(latest_version) > self._version_tuple(VERSION)
        except (OSError, urllib.error.URLError, TimeoutError) as error:
            self.root.after(
                0,
                lambda error_message=str(error): self._show_connection_required(error_message),
            )
            return
        except (ValueError, json.JSONDecodeError) as error:
            self.root.after(
                0,
                lambda error_message=str(error): self._show_connection_required(error_message),
            )
            return

        if update_available:
            self.root.after(0, lambda: self._show_update_required(latest_version))
            return
        self.root.after(0, lambda: threading.Thread(target=self._run_tracker, daemon=True).start())

    def _show_connection_required(self, reason):
        message = (
            "TAG2.GG Tracker를 시작하기 전에 GitHub 연결이 필요합니다.\n\n"
            "인터넷 연결 또는 GitHub 서버 상태를 확인한 후 다시 실행해 주세요.\n\n"
            "최신 버전 확인에 실패했습니다.\n"
            f"확인 주소: {RELEASES_URL}"
        )
        self.root.update_idletasks()
        self.root.deiconify()
        self.root.lift()
        self.root.attributes("-topmost", True)
        self.root.focus_force()
        messagebox.showerror(
            "최신 버전 확인 실패",
            message,
            parent=self.root,
        )
        self.root.attributes("-topmost", False)
        self.root.destroy()

    def _show_update_required(self, latest_version):
        message = (
            "현재 사용 중인 TAG2.GG Tracker는 구버전이라 실행할 수 없습니다.\n"
            "최신 버전을 다운로드해 주세요.\n\n"
            f"현재 버전: {VERSION}\n"
            f"최신 버전: {latest_version}\n\n"
            "다운로드 페이지:\n"
            f"{RELEASES_URL}"
        )
        self.root.update_idletasks()
        self.root.deiconify()
        self.root.lift()
        self.root.attributes("-topmost", True)
        self.root.focus_force()
        should_open = messagebox.askyesno(
            "TAG2.GG Tracker 업데이트 필요",
            message + "\n\n지금 최신 버전 다운로드 페이지를 여시겠습니까?",
            parent=self.root,
        )
        self.root.attributes("-topmost", False)
        if should_open:
            webbrowser.open(RELEASES_URL)
        self.root.destroy()

    def _build_layout(self):
        header = tk.Frame(self.root, bg=BG)
        header.pack(fill="x", padx=28, pady=(24, 18))

        tk.Label(
            header,
            text="TAG2.GG",
            bg=BG,
            fg=PINK,
            font=("Segoe UI", 24, "bold"),
        ).pack(side="left")
        tk.Label(
            header,
            text=" Tracker",
            bg=BG,
            fg=TEXT,
            font=("Segoe UI", 22, "bold"),
        ).pack(side="left")

        instructions = tk.Frame(self.root, bg=PANEL)
        instructions.pack(fill="x", padx=28, pady=(0, 14))

        self._section(
            instructions,
            "⚙  사용법",
            [
                "1. RPCS3를 먼저 실행하세요.",
                "2. Tekken Tag Tournament 2를 실행하세요.",
                "3. 이 프로그램을 실행한 상태로 온라인 대전을 진행하세요.",
            ],
            ACCENT,
        )
        self._section(
            instructions,
            "⚠  주의사항",
            [
                "온라인 대전만 기록됩니다.",
                "오프라인 대전은 자동으로 무시됩니다.",
            ],
            PINK,
        )

        footer = tk.Frame(self.root, bg=PANEL_ALT)
        footer.pack(fill="x", padx=28, pady=(0, 20))
        tk.Label(
            footer,
            text="●  프로그램이 실행 중입니다",
            bg=PANEL_ALT,
            fg=ACCENT,
            font=("Segoe UI", 10, "bold"),
            padx=14,
            pady=10,
        ).pack(side="left", anchor="w")
        tk.Label(
            footer,
            text=f"Version {VERSION}\nDeveloped by legbreaker\nCopyright © 2026 legbreaker",
            justify="right",
            anchor="e",
            bg=PANEL_ALT,
            fg=MUTED,
            font=("Segoe UI", 9),
            padx=14,
            pady=8,
        ).pack(side="right", anchor="e")

    @staticmethod
    def _section(parent, heading, lines, color):
        block = tk.Frame(parent, bg=PANEL)
        block.pack(fill="x", padx=20, pady=(16, 2))
        tk.Label(
            block,
            text=heading,
            bg=PANEL,
            fg=color,
            font=("Segoe UI", 13, "bold"),
            anchor="w",
        ).pack(fill="x")
        tk.Label(
            block,
            text="\n".join(lines),
            justify="left",
            anchor="w",
            bg=PANEL,
            fg=TEXT,
            font=("Segoe UI", 11),
            padx=4,
            pady=8,
        ).pack(fill="x")

    @staticmethod
    def _run_tracker():
        original_stdout = sys.stdout
        original_stderr = sys.stderr
        try:
            with open(os.devnull, "w", encoding="utf-8") as sink:
                sys.stdout = sink
                sys.stderr = sink
                tracker.TTT2Tracker().run()
        finally:
            sys.stdout = original_stdout
            sys.stderr = original_stderr


if __name__ == "__main__":
    root = tk.Tk()
    TrackerWindow(root)
    root.mainloop()
