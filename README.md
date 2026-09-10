# TAG2.GG

RPCS3용 **Tekken Tag Tournament 2 온라인 전적 트래커와 통계 웹사이트**입니다.

RPCS3에서 진행한 온라인 대전을 자동으로 감지해 Supabase에 저장하고, [TAG2.GG](https://tag2gg.netlify.app/)에서 플레이어 전적과 다양한 통계를 확인할 수 있습니다.

## 주요 기능

- RPCS3 프로세스 자동 감지
- 온라인 경기 자동 기록
- 닉네임, 점수, 승자, 캐릭터 조합 저장
- 캐릭터 픽률 및 태그 조합 통계
- TOP 10 플레이어
- 플레이어 프로필과 최근 대전 기록
- 상대 전적 검색
- 최근 30일 활동 차트
- PC·모바일 반응형 화면
- Android 홈 화면 설치를 지원하는 PWA
- Windows 단일 실행 파일(EXE) 배포

## 동작 구조

```text
RPCS3
  ↓ 메모리 읽기
TAG2.GG Tracker (Windows EXE)
  ↓ Supabase REST API
Supabase PostgreSQL
  ↓ 조회
TAG2.GG 웹사이트
```

- 트래커: Python, Win32 API, PyInstaller
- 백엔드: Supabase PostgreSQL 및 REST API
- 프론트엔드: HTML, CSS, JavaScript
- 웹 호스팅: Netlify

## 실행 방법

### 사용자

1. RPCS3와 Tekken Tag Tournament 2를 실행합니다.
2. 최신 Release의 `TAG2GGTracker.exe`를 실행합니다.
3. 온라인 대전을 진행합니다.
4. 경기 종료 후 [TAG2.GG](https://tag2gg.netlify.app/)에서 기록을 확인합니다.

오프라인 대전은 기록하지 않습니다. 트래커는 Windows용이며 RPCS3가 실행 중이어야 합니다.

### 개발자

Python을 직접 실행하려면:

```powershell
cd C:\1\ttt2_tracker
python tracker.py
```

GUI EXE를 빌드하려면 [BUILD_EXE.md](ttt2_tracker/BUILD_EXE.md)를 참고하세요.

## 프로젝트 구조

```text
C:\1
├─ ttt2_tracker
│  ├─ tracker.py              # RPCS3 감시 및 경기 업로드
│  ├─ gui_launcher.py         # GUI 런처와 버전 확인
│  ├─ TTT2TrackerGUI.spec    # PyInstaller 설정
│  └─ BUILD_EXE.md            # EXE 빌드·Release 안내
├─ ttt2_web
│  ├─ index.html              # 웹 앱과 통계 로직
│  ├─ css/                    # 화면 스타일
│  ├─ assets/                 # 아이콘과 캐릭터 이미지
│  ├─ manifest.json           # PWA 설정
│  └─ sw.js                   # 서비스 워커
└─ Documents
   └─ TAG2GG_PROJECT_DOCS/    # 분야별 상세 기술 문서
```

## 데이터와 개인정보

트래커는 경기 통계를 위해 RPCS3 프로세스에서 다음 정보를 읽습니다.

- 플레이어 닉네임
- 경기 점수와 승자
- 사용 캐릭터 ID
- 경기 시작·종료 시각

파일, 브라우저 기록, 비밀번호, 화면 캡처 등은 수집하지 않습니다. 프로그램은 경기 데이터를 Supabase로 전송하므로, 배포 전 [개인정보 및 보안 상세 문서](Documents/TAG2GG_PROJECT_DOCS/07_HISTORY_SECURITY_LIMITATIONS.md)를 확인하세요.

## 알려진 제한사항

- RPCS3 또는 게임 빌드가 변경되면 메모리 오프셋을 다시 검증해야 합니다.
- 현재 대시보드는 한 번에 최대 1,000개의 경기 행을 조회합니다.
- 업로드 실패 경기의 자동 재전송 큐는 아직 없습니다.
- 계급/랭크 시스템은 아직 구현되지 않았습니다.
- Windows 코드 서명은 적용되지 않았습니다.

## 문서

- [전체 최종 기술 문서](Documents/TAG2GG_FINAL_PROJECT_DOCUMENTATION.md)
- [분야별 기술 문서 모음](Documents/TAG2GG_PROJECT_DOCS/README.md)
- [Python 트래커 상세 문서](Documents/TAG2GG_PROJECT_DOCS/02_PYTHON_TRACKER_DETAILED.md)
- [프론트엔드 상세 문서](Documents/TAG2GG_PROJECT_DOCS/03_FRONTEND_DETAILED.md)
- [Supabase 백엔드 상세 문서](Documents/TAG2GG_PROJECT_DOCS/04_BACKEND_SUPABASE_DETAILED.md)
- [EXE 빌드 및 Release 안내](ttt2_tracker/BUILD_EXE.md)
- [Android PWA 설치 가이드](Documents/TAG2GG_PWA_설치_가이드.html)

## 라이선스

현재 저장소에는 별도의 오픈소스 라이선스가 지정되어 있지 않습니다. 코드와 배포 파일의 사용·수정·재배포가 필요하다면 제작자에게 먼저 문의하세요.

