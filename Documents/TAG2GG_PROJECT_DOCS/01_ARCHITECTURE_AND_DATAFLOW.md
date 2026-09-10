# 01. TAG2.GG 전체 아키텍처와 데이터 흐름

## 1. 목적

TAG2.GG는 RPCS3에서 플레이되는 Tekken Tag Tournament 2 온라인 경기 결과를 자동 수집하고, 커뮤니티 전적 사이트에서 통계로 보여주는 프로젝트다.

## 2. 세 영역

### Python 클라이언트

위치: `C:\1\ttt2_tracker\`

사용자의 Windows PC에서 RPCS3 프로세스를 감시한다. 경기 관련 메모리를 읽고 온라인 경기 종료를 감지한 뒤 Supabase REST API에 결과를 POST한다.

### Supabase 백엔드

경기 데이터를 PostgreSQL에 저장하고 REST API로 제공한다. 트래커와 웹사이트가 공통으로 사용하는 중앙 데이터 저장소다.

### 프론트엔드

위치: `C:\1\ttt2_web\`

정적 HTML/CSS/JavaScript 사이트다. Netlify가 파일을 제공하고, 브라우저 JavaScript가 Supabase에서 경기 행을 읽어 통계를 계산한다.

## 3. 전체 흐름

```text
RPCS3 실행
  -> tracker.py가 rpcs3.exe PID 탐색
  -> OpenProcess로 읽기 핸들 획득
  -> 게스트 RAM 기준 주소와 상대 오프셋으로 닉네임/점수/캐릭터 읽기
  -> 온라인 경기 시작과 3승 종료 판정
  -> JSON POST /rest/v1/matches
  -> Supabase matches 저장 및 중복 방지
  -> 브라우저가 REST GET으로 경기 행 조회
  -> JavaScript가 승률·픽률·TOP 10·프로필 계산
  -> TAG2.GG 화면 렌더링
```

## 4. 왜 서버만으로 처리하지 않았는가

현재 사설 서버가 클라이언트의 닉네임·점수·캐릭터·경기 종료 이벤트를 모두 제공한다는 보장이 없다. 따라서 서버가 직접 RPCS3 메모리를 읽을 수 없고, 사용자 PC에 설치된 tracker가 필요한 데이터를 읽는다. Rust로 바꾸더라도 데이터가 클라이언트 메모리에만 있다면 별도 클라이언트는 여전히 필요하다.

## 5. 시간과 기준

- 트래커는 UTC로 `start_time`, `end_time`을 저장한다.
- 프론트엔드는 KST로 표시한다.
- 최신 경기 정렬과 번호 계산은 `created_at`을 기준으로 한다.
- 대시보드 요청은 현재 최대 1,000개 행을 가져온 뒤 브라우저에서 계산한다.

## 6. 보안 경계

웹사이트와 EXE에는 공개용 Supabase 키가 들어갈 수 있다. 이 키를 비밀로 취급하는 구조가 아니므로, 실제 보안은 Supabase RLS와 API 권한에서 확보해야 한다. 관리자 키는 절대 클라이언트에 포함하면 안 된다.

