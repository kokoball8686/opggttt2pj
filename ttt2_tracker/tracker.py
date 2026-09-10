import ctypes
import ctypes.wintypes
import json
import os
import subprocess
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

# Win32 API Constants
PROCESS_VM_READ = 0x0010
PROCESS_QUERY_INFORMATION = 0x0400

kernel32 = ctypes.windll.kernel32

kernel32.OpenProcess.argtypes = [ctypes.wintypes.DWORD, ctypes.wintypes.BOOL, ctypes.wintypes.DWORD]
kernel32.OpenProcess.restype = ctypes.wintypes.HANDLE
kernel32.CloseHandle.argtypes = [ctypes.wintypes.HANDLE]
kernel32.CloseHandle.restype = ctypes.wintypes.BOOL
kernel32.ReadProcessMemory.argtypes = [
    ctypes.wintypes.HANDLE,
    ctypes.c_void_p,
    ctypes.c_void_p,
    ctypes.c_size_t,
    ctypes.POINTER(ctypes.c_size_t),
]
kernel32.ReadProcessMemory.restype = ctypes.wintypes.BOOL

# Supabase API Credentials
SUPABASE_URL = "https://hnmwidamrbcslnaykaem.supabase.co"
SUPABASE_KEY = os.environ.get(
    "TAG2_SUPABASE_KEY",
    "sb_publishable_D4XcdQKUZh7EMCoFNx7YWA_K0PWiKkl",
)

REFERENCE_RAM_BASE = 0x300000000
NICKNAME_LAYOUTS = {
    "playing_as_p1": {
        "p1_offset": 0x167D118,
        "p2_offset": 0x167F3B8,
    },
    "playing_as_p2": {
        "p1_offset": 0x167D140,
        "p2_offset": 0x167F390,
    },
}
BATTLE_POINTER_OFFSET = 0x100D2ABC
BATTLE_STATE_OFFSET = 0x168172F
OFFLINE_MODE_FLAG_OFFSET = 0x193190C
P1_SCORE_OFFSET = 0xB
P2_SCORE_OFFSET = 0xB + 0xD4
P1_MAIN_CHARACTER_OFFSET = 0x1B3
P2_MAIN_CHARACTER_OFFSET = 0x1B7
P1_SUB_CHARACTER_OFFSET = 0x1BB
P2_SUB_CHARACTER_OFFSET = 0x1BF
CHARACTER_NAMES = {
    88: "Unknown",
    112: "Doctor",
    92: "Slim Bob",
    108: "Ancient Ogre",
    90: "Kunimitsu",
    94: "Forest Law",
    104: "P. Jack",
    116: "Tiger",
    106: "Alex",
    100: "Angel",
    102: "Michelle",
    114: "Sebastian",
    96: "Miharu",
    110: "Violet",
    42: "Roger Jr.",
    58: "Raven",
    52: "Bruce",
    34: "Steve",
    0: "Paul",
    68: "Bob",
    10: "Nina",
    46: "Wang",
    50: "Asuka",
    30: "Kazuya",
    84: "Jun",
    28: "Heihachi",
    20: "Jin",
    56: "Devil",
    6: "King",
    36: "Marduk",
    74: "Leo",
    12: "Hwoarang",
    18: "Eddy",
    32: "Lee",
    4: "Lei",
    24: "Kuma",
    38: "Mokujin",
    8: "Yoshimitsu",
    40: "Jack",
    26: "Bryan",
    2: "Marshall Law",
    72: "Miguel",
    44: "Anna",
    14: "Xiaoyu",
    64: "Lili",
    76: "Lars",
    82: "True Ogre",
    80: "Jinpachi",
    78: "Alisa",
    22: "Jaycee",
    62: "Armor King",
    48: "Ganryu",
    70: "Zafina",
    54: "Baek",
    16: "Christie",
    66: "Dragunov",
    60: "Feng",
    86: "Panda",
}


def get_rpcs3_pid():
    cmd = 'tasklist /FI "IMAGENAME eq rpcs3.exe" /FO CSV /NH'
    try:
        output = subprocess.check_output(cmd, shell=True, stderr=subprocess.STDOUT)
    except (OSError, subprocess.CalledProcessError):
        return None
    for line in output.decode("utf-8", errors="ignore").splitlines():
        fields = [field.strip('"') for field in line.split(",")]
        if len(fields) >= 2 and fields[0].lower() == "rpcs3.exe" and fields[1].isdigit():
            return int(fields[1])
    return None


def send_match_to_supabase(
    p1_name,
    p2_name,
    p1_wins,
    p2_wins,
    p1_main_character_id,
    p2_main_character_id,
    p1_sub_character_id,
    p2_sub_character_id,
    start_time,
    end_time,
):
    url = f"{SUPABASE_URL}/rest/v1/matches"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    winner = p1_name if p1_wins == 3 else p2_name
    payload = {
        "p1_name": p1_name,
        "p2_name": p2_name,
        "p1_score": p1_wins,
        "p2_score": p2_wins,
        "p1_main_character_id": p1_main_character_id,
        "p2_main_character_id": p2_main_character_id,
        "p1_sub_character_id": p1_sub_character_id,
        "p2_sub_character_id": p2_sub_character_id,
        "winner": winner,
        "start_time": start_time.isoformat() if start_time else datetime.now(timezone.utc).isoformat(),
        "end_time": end_time.isoformat(),
    }
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=10):
            print("🚀 [SUPABASE DB] Match result successfully uploaded to Cloud DB!")
            return True
    except Exception as e:
        print(f"❌ [SUPABASE UPLOAD ERROR] {e}")
        return False


class TTT2Tracker:
    def __init__(self):
        self.pid = None
        self.process_handle = None
        self.ram_base = REFERENCE_RAM_BASE
        
        self.is_connected = False
        self.in_match = False
        self.has_logged_match = False
        self.match_start_time = None
        self.pending_start_time = None
        self.pending_signature = None
        self.pending_samples = 0
        self.last_p1_wins = None
        self.last_p2_wins = None
        self.none_counter = 0
        self.battle_candidate_since = None
        self.offline_match_ignored = False

    def connect(self):
        pid = get_rpcs3_pid()
        if not pid:
            self.is_connected = False
            return False
        self.process_handle = kernel32.OpenProcess(
            PROCESS_VM_READ | PROCESS_QUERY_INFORMATION, False, pid
        )
        self.pid = pid
        self.is_connected = bool(self.process_handle)
        return self.is_connected

    def read_bytes(self, address, length):
        if not self.process_handle:
            return None
        buffer = ctypes.create_string_buffer(length)
        bytes_read = ctypes.c_size_t(0)
        success = kernel32.ReadProcessMemory(
            self.process_handle,
            ctypes.c_void_p(address),
            buffer,
            length,
            ctypes.byref(bytes_read),
        )
        if success and bytes_read.value == length:
            return buffer.raw
        return None

    def read_string(self, address, max_len=32):
        raw = self.read_bytes(address, max_len)
        if not raw:
            return ""
        null_pos = raw.find(b"\x00")
        if null_pos != -1:
            raw = raw[:null_pos]
        try:
            return raw.decode("utf-8", errors="ignore").strip()
        except:
            return ""

    def read_player_names(self):
        for layout_name, layout in NICKNAME_LAYOUTS.items():
            p1_name = self.read_string(self.ram_base + layout["p1_offset"])
            p2_name = self.read_string(self.ram_base + layout["p2_offset"])
            if p1_name and p2_name:
                return p1_name, p2_name
        return None, None

    def read_byte(self, address):
        raw = self.read_bytes(address, 1)
        return raw[0] if raw and len(raw) > 0 else None

    def read_character_id(self, address):
        raw = self.read_bytes(address, 4)
        if not raw or len(raw) != 4:
            return None
        return int.from_bytes(raw, "little")

    def read_character_ids(self, battle_base):
        offsets = (
            P1_MAIN_CHARACTER_OFFSET,
            P2_MAIN_CHARACTER_OFFSET,
            P1_SUB_CHARACTER_OFFSET,
            P2_SUB_CHARACTER_OFFSET,
        )
        character_ids = tuple(
            self.read_character_id(battle_base + offset) for offset in offsets
        )
        if any(character_id is None for character_id in character_ids):
            return None
        return character_ids

    @staticmethod
    def character_name(character_id):
        return CHARACTER_NAMES.get(character_id, f"Unknown ID ({character_id})")

    def format_team(self, main_character_id, sub_character_id):
        return (
            f"{self.character_name(main_character_id)}"
            f"/{self.character_name(sub_character_id)}"
        )

    def get_battle_struct_base(self):
        raw = self.read_bytes(self.ram_base + BATTLE_POINTER_OFFSET, 4)
        if not raw or len(raw) < 4:
            return None
        guest_address = int.from_bytes(raw, "big")
        if guest_address == 0:
            return None
            
        battle_base = self.ram_base + guest_address
        
        return battle_base

    def poll_state(self):
        try:
            p1_name, p2_name = self.read_player_names()
            
            # Require valid non-empty nicknames
            if p1_name is None or p2_name is None:
                return None

            battle_state = self.read_byte(self.ram_base + BATTLE_STATE_OFFSET)
            if battle_state != 1:
                return None
                
            battle_base = self.get_battle_struct_base()
            if not battle_base:
                return None
                
            p1_wins = self.read_byte(battle_base + P1_SCORE_OFFSET)
            p2_wins = self.read_byte(battle_base + P2_SCORE_OFFSET)
            if p1_wins is None or p2_wins is None:
                return None

            character_ids = self.read_character_ids(battle_base)
            if character_ids is None:
                return None
                
            # Score sanity check: round wins cannot exceed 3
            if p1_wins > 3 or p2_wins > 3:
                return None
                
            return {
                "p1_name": p1_name,
                "p2_name": p2_name,
                "p1_wins": p1_wins,
                "p2_wins": p2_wins,
                "p1_main_character_id": character_ids[0],
                "p2_main_character_id": character_ids[1],
                "p1_sub_character_id": character_ids[2],
                "p2_sub_character_id": character_ids[3],
                "battle_state": battle_state,
            }
        except:
            self.is_connected = False
            return None

    def run(self):
        print("==================================================")
        print("🎮 TTT2 RPCS3 Match Tracker Client Starting...")
        print(f"☁️ Connected Supabase Cloud DB: {SUPABASE_URL.replace('https://', '', 1)}")
        print("🛡️ Stale Nickname Guard Active: Character Select Residual Filter Enabled")
        print("==================================================")

        while True:
            if not self.is_connected:
                print("⌛ Waiting for RPCS3 process (rpcs3.exe)...")
                self.in_match = False
                self.has_logged_match = False
                self.last_p1_wins = None
                self.last_p2_wins = None
                self.match_start_time = None
                self.pending_start_time = None
                self.pending_signature = None
                self.pending_samples = 0
                self.none_counter = 0
                self.battle_candidate_since = None
                self.offline_match_ignored = False
                while not self.connect():
                    time.sleep(2)
                print(f"✅ Successfully attached to rpcs3.exe (PID: {self.pid})!")
                print("🔍 Monitoring match state in background...\n")

            data = self.poll_state()

            # A non-battle state ends the completed match and clears stale state.
            if not data:
                self.none_counter += 1
                if self.none_counter >= 5:  # ~1.5 seconds outside active battle
                    if self.in_match or self.has_logged_match or self.offline_match_ignored:
                        print("⚠️ [LOBBY RETURNED] 메뉴/로비 복귀 감지 - 트래커 상태 완전히 초기화.")
                        self.in_match = False
                        self.has_logged_match = False
                        self.last_p1_wins = None
                        self.last_p2_wins = None
                        self.match_start_time = None
                        self.pending_start_time = None
                        self.pending_signature = None
                        self.pending_samples = 0
                        self.battle_candidate_since = None
                        self.offline_match_ignored = False
            else:
                self.none_counter = 0
                if self.offline_match_ignored:
                    time.sleep(0.3)
                    continue

                p1_name = data["p1_name"]
                p2_name = data["p2_name"]
                p1_wins = data["p1_wins"]
                p2_wins = data["p2_wins"]
                p1_main_character_id = data["p1_main_character_id"]
                p2_main_character_id = data["p2_main_character_id"]
                p1_sub_character_id = data["p1_sub_character_id"]
                p2_sub_character_id = data["p2_sub_character_id"]

                if self.has_logged_match:
                    time.sleep(0.3)
                    continue

                if not self.in_match:
                    if self.battle_candidate_since is None:
                        self.battle_candidate_since = datetime.now(timezone.utc)
                        self.pending_start_time = self.battle_candidate_since
                    elif (datetime.now(timezone.utc) - self.battle_candidate_since).total_seconds() >= 2:
                        offline_mode_flag = self.read_byte(
                            self.ram_base + OFFLINE_MODE_FLAG_OFFSET
                        )
                        if offline_mode_flag == 1:
                            if not self.offline_match_ignored:
                                print(
                                    "⏭️ [OFFLINE MATCH IGNORED] "
                                    "오프라인 대전이므로 해당 대전 기록을 취소합니다."
                                )
                                self.offline_match_ignored = True
                            self.battle_candidate_since = None
                            self.pending_start_time = None
                            continue

                        self.in_match = True
                        self.match_start_time = self.pending_start_time
                        self.last_p1_wins = p1_wins
                        self.last_p2_wins = p2_wins
                        print(
                            f"🥊 [NEW MATCH DETECTED] {p1_name} vs {p2_name} | "
                            f"Start: {self.match_start_time:%H:%M:%S}"
                        )
                        print(f"📊 [SCORE] {p1_name} {p1_wins} : {p2_wins} {p2_name}")
                        print(
                            f"🎮 [CHARACTERS] "
                            f"P1 {self.format_team(p1_main_character_id, p1_sub_character_id)} | "
                            f"P2 {self.format_team(p2_main_character_id, p2_sub_character_id)}"
                        )
                elif (p1_wins, p2_wins) != (self.last_p1_wins, self.last_p2_wins):
                    self.last_p1_wins = p1_wins
                    self.last_p2_wins = p2_wins
                    print(f"📊 [SCORE] {p1_name} {p1_wins} : {p2_wins} {p2_name}")

                # Detect match end (3 wins by either player)
                if (p1_wins == 3 or p2_wins == 3) and not self.has_logged_match and self.in_match:
                    self.has_logged_match = True
                    self.in_match = False
                    end_time = datetime.now(timezone.utc)
                    duration = int((end_time - self.match_start_time).total_seconds()) if self.match_start_time else 0
                    winner = p1_name if p1_wins == 3 else p2_name

                    print("==================================================")
                    print(f"🏆 [MATCH RESULT LOGGED]")
                    print(f"  • P1 (1P): {p1_name} ({p1_wins} Rounds)")
                    print(f"  • P2 (2P): {p2_name} ({p2_wins} Rounds)")
                    print(
                        f"  • Characters: "
                        f"P1 {self.format_team(p1_main_character_id, p1_sub_character_id)} | "
                        f"P2 {self.format_team(p2_main_character_id, p2_sub_character_id)}"
                    )
                    print(f"  • Winner : {winner}")
                    print(f"  • Time   : {end_time.strftime('%Y-%m-%d %H:%M:%S')} ({duration}s)")
                    print("==================================================")

                    # Upload to Supabase Cloud DB
                    send_match_to_supabase(
                        p1_name,
                        p2_name,
                        p1_wins,
                        p2_wins,
                        p1_main_character_id,
                        p2_main_character_id,
                        p1_sub_character_id,
                        p2_sub_character_id,
                        self.match_start_time,
                        end_time,
                    )
                    print()

            time.sleep(0.3)


if __name__ == "__main__":
    TTT2Tracker().run()
