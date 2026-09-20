# 06. 패키징·Release·운영 상세 문서

## 1. 구성 파일

- `gui_launcher.py`: 사용자에게 보이는 Tkinter 런처
- `tracker.py`: 백그라운드 트래커
- `TTT2TrackerGUI.spec`: 기존 PyInstaller 설정
- `version_info.txt`: Windows 파일 메타데이터
- `BUILD_EXE.md`: 재빌드 절차

## 2. 런처 실행 순서

1. GUI 창 생성
2. 아이콘과 안내 문구 표시
3. 백그라운드 스레드에서 GitHub 최신 Release 조회
4. 현재 버전보다 높은 Release면 실행 차단
5. 연결 실패면 실행 차단
6. 통과하면 별도 스레드에서 `tracker.TTT2Tracker().run()` 시작

주요 버전 비교 코드는 다음과 같다.

```python
@classmethod
def _version_tuple(cls, version):
    clean_version = version.strip().lstrip("vV")
    parts = clean_version.split(".")
    if len(parts) != 3 or not all(part.isdigit() for part in parts):
        raise ValueError(f"Invalid version: {version}")
    return tuple(int(part) for part in parts)
```

## 3. Nuitka 빌드와 ZIP 배포

현재 공식 빌드는 Python 3.12, Nuitka, Zig 컴파일러를 사용한다. `gui_launcher.py`를
단일 실행 파일로 만든 뒤 ZIP으로 묶어 배포하며, 콘솔창은 표시하지 않는다.

```powershell
py -3.12 -m nuitka --onefile --zig --enable-plugin=tk-inter `
  --windows-console-mode=disable `
  --output-filename=TAG2GGTracker.exe .\gui_launcher.py
```

빌드한 `TAG2GGTracker.exe`를 `TAG2GGTracker.zip`으로 압축해 Release asset으로
업로드한다. 사용자는 ZIP 압축을 푼 뒤 EXE를 실행한다.

## 4. Release 정책

- 태그 형식: `vMAJOR.MINOR.PATCH`
- `/releases/latest`는 정식 공개 Release 대상
- Draft Release는 최신 Release 조회에 포함되지 않음
- 새 버전이 올라가면 이전 버전은 런처에서 실행 차단
- Release asset에는 직접 만든 `TAG2GGTracker.zip`만 올리고 ZIP 안에
  `TAG2GGTracker.exe`가 포함되었는지와 빌드 버전을 확인

## 5. 사용자 PC 요구사항

사용자에게 Python이나 Nuitka는 필요 없다. 다만 다음은 설치되어 있어야 한다.

- Windows
- RPCS3
- Tekken Tag Tournament 2
- 온라인 대전을 수행할 수 있는 환경
- Release 확인과 Supabase 업로드를 위한 인터넷

## 6. 운영 실패 지점

- RPCS3가 실행되지 않음: tracker가 대기
- 메모리 읽기 실패: 유효 상태가 되지 않음
- 오프라인 경기: 의도적으로 무시
- Supabase 업로드 실패: 콘솔 오류만 표시, 자동 재전송 없음
- GitHub 연결 실패: 최신 버전 검증 실패로 실행 차단

## 7. 재배포 전 검증

- 버전 세 값 일치
- EXE 빌드 성공
- RPCS3 연결
- 온라인 경기 1회
- 오프라인 경기 무시
- 3승 종료 업로드
- 같은 경기 중복 제거
- 웹사이트에서 새 기록 표시
- 최신 버전 차단

## 8. 코드 서명

현재 spec에는 코드 서명이 적용되어 있지 않다. Windows 코드 서명 인증서는 EXE 제작자와 파일 무결성을 확인하는 수단이지만, 서명만으로 SmartScreen 경고가 항상 사라지는 것은 아니다. 자체 서명은 무료지만 일반 사용자 PC에서 자동 신뢰되지 않는다.
