# TAG2.GG Tracker

Tekken Tag Tournament 2의 RPCS3 온라인 대전을 감지하고, 완료된 경기 결과를
Supabase에 저장한 뒤 TAG2.GG 웹사이트에서 통계로 제공하는 프로젝트입니다.

## 서비스 링크

- 통계 사이트: [https://tag2gg.netlify.app/](https://tag2gg.netlify.app/)
- 최신 Tracker 다운로드: [TAG2GGTracker.zip](../../releases/latest/download/TAG2GGTracker.zip)

## 전체 구조

```text
RPCS3 + Tekken Tag Tournament 2
              │
              │ Windows 프로세스 메모리 읽기
              ▼
       TAG2GGTracker.exe
              │
              │ REST API POST /rest/v1/matches
              ▼
       Supabase `matches` 테이블
              │
              │ REST API GET
              ▼
     TAG2.GG 정적 웹 프론트엔드
```

Tracker는 게임 화면을 OCR하거나 패킷을 분석하지 않습니다. RPCS3 프로세스에
읽기 권한으로 연결한 후, 게임 메모리의 기준 주소에 정의된 오프셋을 읽어
닉네임·점수·캐릭터 ID·대전 상태를 수집합니다.

## 경기 수집 프로세스

1. `gui_launcher.py`가 실행되면 GitHub Releases API에서 최신 버전을 확인합니다.
2. 인터넷 또는 GitHub 확인에 실패하거나 설치 버전이 오래된 경우 Tracker를
   시작하지 않고 안내합니다.
3. Tracker가 `rpcs3.exe` 프로세스를 찾고 읽기 권한으로 연결합니다.
4. RPCS3 메모리에서 P1/P2 닉네임, 대전 상태, 점수, 메인·서브 캐릭터 ID와
   맵 ID를 약 0.3초 간격으로 읽습니다.
5. 유효한 대전 상태가 약 2초 이상 유지되어야 실제 대전으로 확정합니다.
   메뉴나 캐릭터 선택 화면의 잔여 값을 경기로 잘못 기록하지 않기 위한
   안정화 단계입니다.
6. 오프라인 모드 플래그가 확인되면 해당 경기는 기록하지 않습니다.
7. P1 또는 P2의 라운드 승수가 3이 되면 대전 종료로 판단합니다.
8. 시작/종료 시각을 UTC ISO-8601 형식으로 만들고 승자, 점수, 캐릭터 ID와
   함께 Supabase `matches` 테이블에 한 행으로 업로드합니다.
9. 업로드가 끝나면 웹사이트가 다음 조회 시 해당 데이터를 통계에 반영합니다.

대전 중에는 점수 변화를 추적하지만, 한 경기를 여러 번 업로드하지 않도록
완료 후 중복 기록 방지 상태를 유지합니다. 게임이 메뉴나 로비로 돌아가면
추적 상태를 초기화합니다.

## 데이터 모델

Tracker가 `matches`에 저장하는 핵심 필드는 다음과 같습니다.

| 필드 | 설명 |
| --- | --- |
| `p1_name`, `p2_name` | P1, P2 닉네임 |
| `p1_score`, `p2_score` | 최종 라운드 승수 |
| `winner` | 승자 닉네임 |
| `p1_main_character_id`, `p1_sub_character_id` | P1 메인·서브 캐릭터 ID |
| `p2_main_character_id`, `p2_sub_character_id` | P2 메인·서브 캐릭터 ID |
| `map_id` | 대전이 진행된 맵 ID |
| `start_time`, `end_time` | UTC 기준 대전 시작·종료 시각 |
| `created_at` | Supabase가 관리하는 생성 시각 |

캐릭터 ID는 Tracker와 웹 프론트엔드가 공유하는 매핑으로 캐릭터 한글 이름과 캐릭터 이미지
경로로 변환됩니다. 원본 경기 행을 기반으로 대시보드, TOP 10, 최근 대전,
플레이어 프로필, 캐릭터 픽률, 태그 조합, 상대 전적을 클라이언트(사용자의 브라우저)에서 계산합니다.

## 웹사이트 동작 방식

웹사이트는 별도의 서버 애플리케이션(Node.js, Django 등) 없이 `ttt2_web/index.html`을 중심으로
동작하는 정적 프론트엔드입니다.

- Supabase REST API에서 최근 경기 데이터를 조회합니다.
- TOP 10은 총 20전 이상 플레이어만 대상으로 승률순으로 계산합니다.
- 프로필은 닉네임 조건으로 경기 행을 조회해 전적과 조합을 계산합니다.
- HTML/CSS/JavaScript와 캐릭터 WebP 이미지로 데스크톱·모바일 UI를 렌더링합니다.
- `manifest.json`과 서비스 워커를 사용해 PWA 설치를 지원합니다.
- Netlify 같은 정적 호스팅에서 별도 백엔드 없이 배포할 수 있습니다.

## 주요 디렉터리와 파일

```text
C:\1\
├─ README.md
├─ ttt2_tracker\
│  ├─ tracker.py              # RPCS3 메모리 감시와 경기 업로드
│  ├─ gui_launcher.py         # GUI, 버전 확인, Tracker 실행
│  ├─ TTT2TrackerGUI.spec     # 기존 PyInstaller 패키징 설정
│  └─ BUILD_EXE.md            # 빌드·릴리스 절차 가이드 문서
└─ ttt2_web\
   ├─ index.html               # 통계 계산과 화면 렌더링
   ├─ css/main.css             # 반응형 스타일(RWD)
   ├─ assets/characters/       # 캐릭터 이미지
   ├─ manifest.json            # PWA 메타데이터
   └─ sw.js                    # 서비스 워커
```

## 실행 및 배포

일반 사용자는 [Releases](../../releases/latest)에서 `TAG2GGTracker.zip`을
다운로드한 뒤 압축을 풀고, 안에 있는 `TAG2GGTracker.exe`를 실행하면 됩니다.
Tracker는 Windows RPCS3 프로세스에 의존하므로 다른 운영체제나 RPCS3가 아닌
실행 환경에서는 동작하지 않습니다.

개발자가 배포 파일을 다시 만들 때는 `ttt2_tracker/BUILD_EXE.md`의 ZIP 패키징 절차를 따릅니다. 릴리스 태그는 `vMAJOR.MINOR.PATCH` 형식을 사용하며,
Launcher의 현재 버전보다 높은 정식 Release가 있으면 실행을 차단합니다.

웹사이트는 `ttt2_web` 폴더를 정적 사이트로 배포합니다. 데이터베이스 변경이나
새 집계 항목을 추가할 때는 Tracker가 저장하는 필드, Supabase 정책, 프론트엔드
조회·집계 로직을 함께 확인해야 합니다.

## 보안 및 운영 참고

- 웹과 Tracker는 Supabase REST API를 사용하므로 Supabase의 공개 키와 RLS
  정책을 실제 운영 권한에 맞게 관리해야 합니다.
- 서버 권한 키나 비밀 키를 프론트엔드, 저장소, EXE에 포함하면 안 됩니다.
- 경기 데이터는 UTC로 저장하고 웹에서 로컬 시간으로 표시합니다.
- 메모리 오프셋은 RPCS3/게임 빌드에 종속될 수 있으므로 업데이트 후 검증이
  필요합니다.

## 사용자용 사용 방법

1. RPCS3를 실행합니다.
2. Tekken Tag Tournament 2를 실행합니다.
3. [Releases](../../releases/latest)에서 최신 `TAG2GGTracker.zip`을 다운로드합니다.
4. ZIP 파일의 압축을 풉니다.
5. 압축을 푼 폴더의 `TAG2GGTracker.exe`를 실행합니다.
6. Tracker를 실행한 상태로 온라인 대전을 진행합니다.
7. 기록과 통계는 [TAG2.GG](https://tag2gg.netlify.app/)에서 확인합니다.

## 제작자

Developed by legbreaker  
Copyright (C) 2026 legbreaker
