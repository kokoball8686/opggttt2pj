# TTT2 RPCS3 Match Tracker & OP.GG Stats Website Implementation Plan

RPCS3 사설 서버 태그2 유저를 위한 **자동 전적 감지 트래커 클라이언트** 및 **OP.GG 스타일 전적 통계 웹사이트** 구축 계획입니다.

## User Review Required

> [!IMPORTANT]
> - 모든 메모리 주소(1P 닉네임, 2P 닉네임, 라운드 승수 포인터)가 RPCS3 재시작 시에도 100% 정상 작동함을 검증했습니다.
> - 클라이언트 배포 앱은 사용자 유저명 입력이나 회원가입 없이 무인(Zero-config)으로 실행되며, 중앙 통합 DB에서 30초 윈도우 중복 제거(De-duplication) 알고리즘으로 대전 기록을 하나로 병합합니다.

## Proposed Changes

### 1. Tracker Client (Python Local Service)
위치: `C:\1\ttt2_tracker\`

#### [NEW] [tracker.py](file:///C:/1/ttt2_tracker/tracker.py)
- `ctypes` (ReadProcessMemory/VirtualQueryEx API)를 사용해 `rpcs3.exe` 프로세스를 자동 감지하고 실제 게스트 RAM 매핑을 찾아 메모리를 주기적으로 뷰어링합니다.
- 닉네임·포인터 주소는 특정 PC의 `0x3...` 절대 주소가 아니라, 탐색된 게스트 RAM 기준 상대 오프셋으로 계산합니다.
- `1P/2P 라운드 승수` (`[RAM base + 0x100D2ABC] + 0xB` / `+ 0xD4`) 읽기.
- RPCS3가 재시작되어 RAM 매핑이 바뀌면 프로세스 메모리 영역을 다시 검색하고 새 base를 자동 적용합니다.
- 대전 시작(0:0) 및 대전 종료(3승) 상태 머신 감지 후 대전 결과를 콘솔 출력 및 백엔드 API로 POST 전송.

### 2. Backend & Database (Supabase PostgreSQL)
- `matches` 테이블 스키마 정의 (id, p1_name, p2_name, p1_score, p2_score, winner, start_time, end_time, created_at).
- 30초 이내 동일 대전(P1, P2, 스코어 조건) 중복 입력 방지 Upsert / De-duplication 로직 구현.

### 3. Frontend Web Application (Next.js / Vercel)
위치: `C:\1\ttt2_web\`

#### [NEW] OP.GG Style Stats UI
- 검색창 (닉네임 검색).
- 유저 프로필 페이지 (총 승/패, 승률 %, 대전 횟수).
- 최근 대전 전적 카드 리스트 (승/패 배지, 상대방, 라운드 스코어, 경기 시각).

## Verification Plan

### Automated & Local Verification
- `tracker.py` 실행 후 RPCS3에서 태그2 오프라인/온라인 대전 진행.
- 대전이 3승으로 종료되는 순간 콘솔에 대전 결과 데이터(JSON)가 정상 생성되는지 검증.
- Supabase DB 및 Web UI 연동 후 웹 브라우저에서 대전 카드가 실시간 업데이트되는지 확인.








