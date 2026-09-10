# 02. Python 트래커 상세 문서

대상 파일: `C:\1\ttt2_tracker\tracker.py`

## 1. 책임

`tracker.py`는 다음 다섯 가지를 담당한다.

1. `rpcs3.exe` 찾기
2. RPCS3 프로세스 메모리 읽기
3. 유효한 온라인 경기 상태 만들기
4. 0:0 시작과 3승 종료를 상태 머신으로 판정하기
5. 경기 결과를 Supabase에 POST하기

## 2. Win32 API 선언

실제 코드의 핵심 선언은 다음과 같다.

```python
PROCESS_VM_READ = 0x0010
PROCESS_QUERY_INFORMATION = 0x0400

kernel32 = ctypes.windll.kernel32

kernel32.OpenProcess.argtypes = [
    ctypes.wintypes.DWORD,
    ctypes.wintypes.BOOL,
    ctypes.wintypes.DWORD,
]
kernel32.OpenProcess.restype = ctypes.wintypes.HANDLE

kernel32.ReadProcessMemory.argtypes = [
    ctypes.wintypes.HANDLE,
    ctypes.c_void_p,
    ctypes.c_void_p,
    ctypes.c_size_t,
    ctypes.POINTER(ctypes.c_size_t),
]
kernel32.ReadProcessMemory.restype = ctypes.wintypes.BOOL
```

이 코드는 Python에서 Windows DLL의 `OpenProcess`와 `ReadProcessMemory`를 호출할 수 있게 한다. 따라서 이 구현은 Windows 전용이다.

## 3. 상대 오프셋 설계

```python
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
```

고정된 PC 절대 주소를 사용하지 않고 `ram_base + offset`을 사용한다. RPCS3가 재시작되거나 다른 컴퓨터에서 실행되어 게스트 RAM 매핑 위치가 달라져도 기준점만 올바르면 같은 상대 구조를 읽을 수 있다.

## 4. RPCS3 PID 탐색

```python
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
```

프로세스를 찾지 못하면 `None`을 반환하고, 메인 루프가 약 2초 뒤 다시 시도한다.

## 5. 메모리 읽기 공통 함수

```python
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
```

상위 함수는 읽기 실패를 유효한 게임 상태로 취급하지 않는다. 닉네임은 null 종료 바이트를 기준으로 자르고 UTF-8로 디코드한다.

## 6. 닉네임·점수·캐릭터

```python
def read_player_names(self):
    for layout_name, layout in NICKNAME_LAYOUTS.items():
        p1_name = self.read_string(self.ram_base + layout["p1_offset"])
        p2_name = self.read_string(self.ram_base + layout["p2_offset"])
        if p1_name and p2_name:
            return p1_name, p2_name
    return None, None
```

전투 구조체 포인터는 Big-Endian으로 읽는다.

```python
guest_address = int.from_bytes(raw, "big")
battle_base = self.ram_base + guest_address
```

캐릭터 ID는 4바이트 little-endian으로 읽는다. P1/P2의 메인·서브 캐릭터 네 값을 데이터베이스에 함께 저장한다.

## 7. `poll_state()`가 유효 상태를 만드는 과정

```python
def poll_state(self):
    try:
        p1_name, p2_name = self.read_player_names()
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
```

뒤이어 캐릭터 ID를 읽고 점수가 3을 초과하지 않는지 검사한다. 어느 조건이든 실패하면 `None`이다. 이 `None`이 메인 루프에서 로비 복귀·상태 초기화 판단으로 연결된다.

## 8. 시작·종료 상태 머신

경기 후보가 처음 보이면 `battle_candidate_since`를 기록한다. 후보가 2초 이상 계속될 때 온라인 플래그를 확인한다.

```python
if not self.in_match:
    if self.battle_candidate_since is None:
        self.battle_candidate_since = datetime.now(timezone.utc)
        self.pending_start_time = self.battle_candidate_since
    elif (datetime.now(timezone.utc) - self.battle_candidate_since).total_seconds() >= 2:
        offline_mode_flag = self.read_byte(
            self.ram_base + OFFLINE_MODE_FLAG_OFFSET
        )
        if offline_mode_flag == 1:
            self.offline_match_ignored = True
            self.battle_candidate_since = None
            self.pending_start_time = None
            continue
        self.in_match = True
        self.match_start_time = self.pending_start_time
```

경기 종료는 다음 조건이다.

```python
if (p1_wins == 3 or p2_wins == 3) \
        and not self.has_logged_match and self.in_match:
    self.has_logged_match = True
    self.in_match = False
    end_time = datetime.now(timezone.utc)
    send_match_to_supabase(...)
```

`has_logged_match`는 한 경기의 반복 업로드를 막고, 로비 복귀가 일정 시간 이어지면 초기화된다.

## 9. Supabase 업로드 함수

```python
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
    "start_time": start_time.isoformat(),
    "end_time": end_time.isoformat(),
}
request = urllib.request.Request(
    url,
    data=json.dumps(payload).encode("utf-8"),
    headers=headers,
    method="POST",
)
```

성공하면 업로드 성공을 출력하고, 실패하면 오류를 출력한다. 현재는 자동 재전송 큐가 없으므로 네트워크 실패 경기는 자동 복구되지 않는다.

## 10. 메인 루프

메인 루프는 RPCS3 연결 → 0.3초 폴링 → 상태 변화 처리 → 대기 순서다.

```python
while True:
    if not self.is_connected:
        while not self.connect():
            time.sleep(2)

    data = self.poll_state()
    if not data:
        self.none_counter += 1
        if self.none_counter >= 5:
            self.in_match = False
            self.has_logged_match = False
    else:
        # 후보 경기 확정, 점수 변화 출력, 3승 종료 처리
        ...
    time.sleep(0.3)
```

## 11. 유지보수 주의

- RPCS3/게임 빌드 변경 시 오프셋을 다시 검증해야 한다.
- `ReadProcessMemory` 실패를 정상 상태로 처리하면 가짜 경기 감지가 생긴다.
- 새 DB 컬럼을 추가하면 payload와 프론트엔드 조회 필드를 동시에 바꿔야 한다.
- 공개 EXE에는 관리자 Supabase 키를 넣으면 안 된다.
- Python EXE는 역분석 가능하므로 비밀 알고리즘이나 비밀키를 보호하는 수단으로 생각하면 안 된다.

