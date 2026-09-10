# TAG2.GG 분야별 기술 문서

이 폴더는 [TAG2GG_FINAL_PROJECT_DOCUMENTATION.md](../TAG2GG_FINAL_PROJECT_DOCUMENTATION.md)를 분야별로 더 깊게 나눈 문서 모음이다. 기존 최종 문서는 그대로 보존하고, 이 폴더의 문서는 각 영역의 구현 세부사항과 실제 코드 발췌를 중심으로 설명한다.

## 문서 목록

| 문서 | 범위 |
|---|---|
| `01_ARCHITECTURE_AND_DATAFLOW.md` | 전체 구조, 실행 흐름, 데이터 이동 |
| `02_PYTHON_TRACKER_DETAILED.md` | `tracker.py` 실제 코드, 메모리 읽기, 상태 머신, 업로드 |
| `03_FRONTEND_DETAILED.md` | `index.html`, JavaScript 집계, HTML 화면, 검색·프로필 |
| `04_BACKEND_SUPABASE_DETAILED.md` | Supabase REST, `matches` 데이터 모델, 중복 제거, 권한 |
| `05_WEB_UI_PWA_DETAILED.md` | CSS 반응형, 모바일, PWA, 서비스 워커 |
| `06_PACKAGING_RELEASE_OPERATIONS.md` | Tkinter 런처, PyInstaller, 버전 검사, 배포·검증 |
| `07_HISTORY_SECURITY_LIMITATIONS.md` | 개발 연대기, 개인정보, 백신, 한계와 향후 과제 |

## 읽는 순서

처음 읽는 사람은 `01` → `02` → `04` → `03` → `05` → `06` 순서가 가장 이해하기 쉽다. 운영이나 배포만 확인하려면 `06`과 `07`을 먼저 읽으면 된다.

## 문서 작성 기준

- 실제 현재 파일을 기준으로 작성했다.
- 소스 인용은 설명에 필요한 부분만 발췌했다.
- 공개 publishable key, 프로젝트 URL처럼 이미 코드에 공개되어 있는 값도 이 문서에는 반복해서 노출하지 않았다.
- 관리자 키·개인키·비밀번호는 기록하지 않는다.
- 코드가 변경되면 해당 분야 문서도 함께 갱신해야 한다.

