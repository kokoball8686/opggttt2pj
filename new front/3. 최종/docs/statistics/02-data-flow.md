# 02. 통계·대전 데이터 흐름과 화면 연결

이 문서는 현재 통계 및 대전 기록 기능의 요청 경로를 화면부터 데이터베이스까지 따라갑니다. 통계 수식과 필터는 [03. 집계 설계와 계산 규칙](./03-calculation-design.md), 대전 기록 페이지 조회의 전체 계약은 [04. 전체·개인 경기 기록 페이지 조회](./04-match-history-pagination.md), 통계 SQL 함수 본문은 번호 05~07, 페이지 RPC SQL은 [08. 전체·개인 경기 페이지 RPC SQL](./08-match-page-rpcs.sql)을 보세요.

통계 시스템 개편 문서의 전체 순서는 [01. 문서 읽기 안내](./01-start-here.md)에서 확인할 수 있습니다.

## 1. 먼저 알아둘 단어

| 용어 | 쉬운 뜻 |
|---|---|
| 경기 행(row) | `matches` 테이블에 저장된 한 경기 기록 |
| 집계 | 여러 경기에서 경기 수·승리 수·승률 등을 계산하는 것 |
| API | 브라우저와 서버 사이에서 요청/응답을 주고받는 주소 |
| Route Handler | Next.js 서버에서 API 요청을 처리하는 코드 |
| RPC | 이름과 입력값으로 데이터베이스 함수를 호출하는 방식 |
| View | 여러 테이블 행을 정해진 모양으로 읽도록 만든 DB 조회 정의. 일반 View 자체는 결과를 저장하는 캐시가 아님 |
| Hook | React 화면에서 데이터를 요청하고 로딩/오류/갱신 상태를 관리하는 함수 |
| 상한(cap) | 결과 배열이 너무 커지지 않도록 DB 함수가 강제하는 최대 항목 수 |
| `anon` | 로그인하지 않은 웹 방문자에게 사용하는 Supabase API 역할 |
| `authenticated` | Supabase 인증 사용자가 사용하는 역할 |
| `SECURITY DEFINER` | 호출한 사람 대신 함수 소유자의 권한으로 실행하는 PostgreSQL 함수 옵션. 권한·소유자·`search_path`를 엄격히 고정해야 함 |

## 2. 전체 구조 한눈에 보기

통계 요청의 기본 경로는 다음과 같습니다.

```text
화면 컴포넌트
  → React Hook
  → Next.js API Route Handler
  → Supabase RPC 함수
  → public.v_player_match_rows View / public.matches 테이블
  → 집계 결과(JSON)
  → API와 Hook의 형식 검사
  → 화면 표시
```

브라우저는 통계 계산을 위해 모든 경기 행을 받지 않습니다. Supabase가 집계를 마친 결과만 반환합니다. 반면 대전 기록 화면은 사용자가 현재 보고 있는 페이지의 경기 행만 받습니다.

따라서 이번 데이터 개편은 서로 보완하는 두 경로를 갖습니다.

| 사용자에게 필요한 것 | DB 작업 | 브라우저 응답 |
|---|---|---|
| 통계 숫자·상위 목록 | 여러 경기 전체를 DB에서 집계 | 집계 JSON과 제한된 통계 목록 |
| 경기 기록 화면 | 요청된 정렬·페이지의 경기 행 조회 | 현재 페이지 최대 10경기 및 전체 건수 |

### 클라이언트 응답 캐시와 첫 화면 준비

화면 Hook은 공용 [`useCachedApi.ts`](../../src/hooks/useCachedApi.ts)와 [`cached-api.ts`](../../src/lib/cached-api.ts)를 통해 API 응답을 사용합니다. 브라우저의 IndexedDB 저장소 구현은 [`client-cache.ts`](../../src/lib/client-cache.ts)에 있습니다. 캐시 키는 API와 입력 의미별로 구분하며, 저장된 JSON도 기존 응답 파서를 다시 통과해야 화면에 쓸 수 있습니다.

대시보드, TOP 10, 전체 경기 기록 1페이지는 `AppShell`에서 병렬로 준비합니다. 현재 열린 화면의 Hook은 같은 키의 진행 중 요청을 공유하므로 준비가 끝나길 기다리지 않습니다. 화면에 필요한 API 응답이 먼저 도착하면 해당 화면부터 렌더링하고, 아직 보지 않은 다른 경기 페이지나 모든 프로필을 미리 가져오지는 않습니다.

일반 화면 응답은 저장 시점부터 5초까지 신선한 캐시로 사용합니다. 5초보다 오래된 값은 화면에 먼저 유지하고, 페이지를 열거나 다시 사용하거나 브라우저 탭으로 돌아올 때 서버에서 재검증합니다. 5분보다 오래된 응답은 더 오래된 값으로 분류하지만 자동 삭제하지 않습니다. 주기적인 폴링도 하지 않습니다. 갱신 실패 시 기존 값과 오류를 함께 보여줍니다.

앱은 `navigator.storage.persist()`로 브라우저에 저장소 보존을 요청하지만, 허용이나 공간 예약을 보장하지 않습니다. IndexedDB가 없거나 quota 등으로 쓰기가 실패해도 응답을 현재 화면/세션에서 사용할 수 있고 서버 요청은 계속됩니다. 앱은 저장 용량 확보를 위해 다른 사이트 데이터를 지우거나 자체 캐시를 자동 만료·삭제하지 않습니다. 브라우저 또는 사용자가 사이트 데이터를 지울 수는 있습니다.

## 3. 대시보드 통계 흐름

1. [`DashboardHome.tsx`](../../src/components/dashboard/DashboardHome.tsx)가 [`useDashboardStatistics.ts`](../../src/hooks/useDashboardStatistics.ts)를 사용합니다.
2. Hook은 공용 캐시에서 검증된 응답을 먼저 읽고, 없거나 5초보다 오래됐으면 `/api/statistics/dashboard`를 요청합니다. 화면 재진입/브라우저 탭 복귀 때만 신선도를 다시 확인하며 주기적 폴링은 하지 않습니다.
3. [`route.ts`](../../src/app/api/statistics/dashboard/route.ts)는 Supabase의 `get_dashboard_statistics()` RPC를 호출합니다.
4. [`dashboard-statistics.ts`](../../src/lib/dashboard-statistics.ts)는 JSON의 필드, 수치 범위, 배열 상한을 검사합니다.
5. 화면은 전체 건수와 제한된 차트/랭킹 데이터를 표시합니다. 전체 경기 배열은 브라우저에 오지 않습니다.

대시보드 결과에는 전체 경기/플레이어/KST 오늘 경기 수, 캐릭터 픽 통계 최대 6개, 조합 최대 6개, 급상승 플레이어 최대 1명, 활동 날짜 30개가 들어갑니다.

## 4. 플레이어 순위 흐름

1. [`PlayersRanking.tsx`](../../src/components/players/PlayersRanking.tsx)가 [`usePlayerRankings.ts`](../../src/hooks/usePlayerRankings.ts)를 사용합니다.
2. Hook은 공용 캐시를 먼저 확인하고, 필요할 때 `/api/statistics/rankings`를 재검증합니다. 저장된 순위가 있으면 갱신 중에도 화면에 유지합니다.
3. [`route.ts`](../../src/app/api/statistics/rankings/route.ts)는 `get_player_rankings()` RPC를 부릅니다.
4. [`player-rankings.ts`](../../src/lib/player-rankings.ts)가 결과 형식과 최대 10명 상한, 최소 경기 수 및 대표 조합을 검사합니다.
5. 화면에는 검증된 순위만 렌더링합니다.

현재 규칙은 20전 이상인 플레이어만 포함하고 승률 내림차순, 경기 수 내림차순으로 정렬합니다. 표본 전체가 완전히 동률일 때는 이름 순으로 순서를 결정합니다.

## 5. 플레이어 프로필 통계와 이름 제안

### 프로필 통계

1. [`ProfileView.tsx`](../../src/components/profile/ProfileView.tsx)는 프로필 이름과 선택된 상대 이름을 사용합니다.
2. [`useProfileStatistics.ts`](../../src/hooks/useProfileStatistics.ts)는 `/api/statistics/profile`을 요청합니다.
3. [`route.ts`](../../src/app/api/statistics/profile/route.ts)는 `get_player_statistics(p_player_name, p_opponent_name)`을 부릅니다.
4. [`profile-statistics.ts`](../../src/lib/profile-statistics.ts)가 요약·조합·맵·상대 배열과 상한을 확인합니다.
5. 화면은 요약, 주력 조합 최대 5개, 맵 최대 50개, 최근 상대 최대 5명, 선택 상대 전적을 표시합니다.

프로필 화면에 경기 목록이 함께 있어도 그 목록은 프로필 통계 JSON에 포함되지 않습니다. 이 문서 묶음에서는 독립된 페이지 RPC 경로를 [04. 전체·개인 경기 기록 페이지 조회](./04-match-history-pagination.md)에서 자세히 설명합니다.

### 플레이어 이름 제안

상대 입력, 상단 검색, PWA의 저장 프로필 추가 검색은 [`usePlayerNameSuggestions.ts`](../../src/hooks/usePlayerNameSuggestions.ts)를 공유합니다. 현재 자동완성 UI는 이 세 곳이며, 각각 같은 Hook을 사용합니다.

비어 있지 않은 검색어가 바뀌면 250ms 디바운스 없이 `/api/statistics/search?q=...&exclude=...` 요청을 즉시 시작하고, 동시에 같은 검색어/제외 이름의 IndexedDB 캐시를 읽습니다. 캐시 후보는 서버 응답 전에 임시로 보여주며, 사용자는 곧바로 선택할 수 있습니다. 캐시가 비어 있거나 빈 배열이어도 서버 검색은 매번 실행하므로 신규 플레이어를 캐시가 가리는 일이 없습니다.

요청은 `usePlayerNameSuggestions`가 API를 부르고, [`src/app/api/statistics/search/route.ts`](../../src/app/api/statistics/search/route.ts)가 입력을 확인한 다음 `search_player_names` RPC를 실행하는 흐름입니다. RPC는 이름의 **앞부분(prefix)** 이 검색어와 일치하는 결과를 최대 10개 반환합니다. 화면은 상단 검색과 PWA에서 제안 일부를 표시하고, 상대 전적 입력에서는 최대 5개를 표시합니다. 서버 성공 응답은 임시 캐시 후보를 교체하고 IndexedDB에 저장합니다. 새 검색어는 이전 브라우저 요청을 취소하고, 같은 검색 키의 동시 요청은 공유합니다. 단, 브라우저 요청을 취소해도 이미 DB에서 시작된 작업까지 취소된다고 보장하지는 않습니다.

빈 검색어는 플레이어 전체 목록을 뜻하지 않습니다. API는 빈 입력에 빈 배열을 돌려주므로, 사용자가 검색어를 입력하기 전에는 전체 이름 디렉터리를 받지 않습니다.

자동완성에서 이름을 선택한 뒤의 동작은 화면마다 다릅니다.

- 상단 검색창과 PWA 프로필 추가는 제안 이름을 선택해 해당 프로필로 이동하거나 저장합니다.
- 프로필의 상대 전적 검색은 제안 이름을 입력창에 채우고 그 한 명의 `get_player_statistics` 조회를 미리 시작합니다. 제출 전까지 현재 화면에는 적용하지 않으며, 검색 버튼 또는 Enter를 누르면 진행 중 요청이나 완료된 캐시 결과를 재사용합니다. 선택하지 않은 제안들의 전적은 미리 조회하지 않습니다.

### 프로필 상대 전적 검색 중 화면 깜빡임 보완

상대 닉네임을 제출하면 [`useProfileStatistics.ts`](../../src/hooks/useProfileStatistics.ts)의 요청 키가 `프로필 이름 + 상대 이름`으로 바뀝니다. 기존 구현은 새 키의 응답이 오기 전까지 이전 키의 데이터를 반환하지 않고 `data: null`을 반환했습니다. [`ProfileView.tsx`](../../src/components/profile/ProfileView.tsx)는 프로필 요약·조합·맵 통계를 `profileStatistics`가 있을 때만 렌더링하므로, 응답 대기 중 해당 UI가 통째로 사라지고 새 데이터 도착 후 다시 나타났습니다. URL 이동이나 브라우저 전체 새로고침이 아니라, 클라이언트 화면이 기존 데이터를 지우고 로딩 상태로 교체한 현상이었습니다.

현재는 이전에 성공한 프로필 통계를 새 요청이 끝날 때까지 Hook 반환값에 유지합니다. 그 결과 요약·조합·맵 같은 프로필 본문은 화면에 남고, 상대 전적 영역에만 로딩 상태를 표시합니다. 새 요청이 성공하면 새 상대 통계로 교체하며, 조회 결과가 없으면 “상대 전적이 없습니다”를 표시합니다. 요청이 실패하면 기존 통계를 보존하면서 오류를 별도로 표시하고, 로딩이 끝난 뒤 이전 상대 결과를 새 상대의 결과인 것처럼 목록에 보여주지 않습니다.

또한 상대 검색 입력을 수정할 때마다 현재 선택 상대를 즉시 해제하던 동작을 바꿨습니다. 이제 입력을 지우면 선택 상대를 해제하지만, 다른 이름을 입력하는 동안에는 기존 선택을 유지하고 실제 제출 때 새 선택 상대를 적용합니다. 자동완성 제안 선택은 한 명의 전적 선조회를 시작하지만 제출 전에는 새 상대의 통계를 기존 화면에 적용하지 않습니다.

이 보완은 기존 데이터를 다시 보여주며 새 데이터를 가져오는 방식이며, **페이지 첫 진입에서 아직 데이터가 한 번도 없을 때**의 최초 로딩 표시는 그대로 유지됩니다.

## 6. 실제 경기 기록 페이지 요청

통계 응답이 아니라 개별 경기 행이 필요한 화면은 전용 API와 페이지 RPC를 사용합니다. 페이지 RPC의 정의 SQL은 [08. 전체·개인 경기 페이지 RPC SQL](./08-match-page-rpcs.sql)에 있습니다.

```text
전체 기록 화면                         프로필 기록 영역
MatchesDirectory                      ProfileView
  → useMatchPage(page)                  → usePlayerMatchPage(name, page, sort)
  → GET /api/matches?page=N             → GET /api/matches/player?...
  → get_all_matches_by_page             → get_player_matches_by_page
  → 현재 페이지 행 + total_count       → 현재 페이지 행 + total_count + match_number
```

두 경로 모두 현재 페이지를 조회하고 `total_count`로 전체 페이지 수를 계산합니다. 프로필은 최신순·승리순·패배순 정렬을 제공하며, 정렬과 상관없이 시간순 번호를 보존하기 위해 각 행에 `match_number`를 요구합니다. 전체 경기 기록의 기존 1,000건 일괄 수신을 대체한 상세 설계와 오류 처리는 [04. 전체·개인 경기 기록 페이지 조회](./04-match-history-pagination.md)를 보세요.

## 7. 각 계층이 검증하는 것

DB RPC가 집계 JSON을 만든 뒤에도 서버와 브라우저 경계에서 응답을 다시 검사합니다. 각 단계는 같은 검사를 중복하는 것이 아니라 서로 다른 책임을 갖습니다.

| 계층 | 확인 책임 | 관련 코드 |
|---|---|---|
| Route Handler | 입력값·필수 매개변수·Supabase 오류를 HTTP 오류로 변환 | [`src/app/api/statistics/`](../../src/app/api/statistics/) |
| 서버 RPC 호출 | 정해진 Supabase 함수만 호출하고 DB 오류를 표준화 | [`src/lib/server/supabase-rpc.ts`](../../src/lib/server/supabase-rpc.ts) |
| 응답 파서 | JSON 필드의 타입·범위·배열 상한과 필수 조합을 확인 | [`dashboard-statistics.ts`](../../src/lib/dashboard-statistics.ts), [`player-rankings.ts`](../../src/lib/player-rankings.ts), [`profile-statistics.ts`](../../src/lib/profile-statistics.ts) |
| Hook·클라이언트 캐시 | HTTP 요청, 기존 응답 파서 재검증, IndexedDB 저장/읽기, 중복 요청 공유, 로딩/오류 상태와 이전 데이터 유지 | [`src/hooks/useCachedApi.ts`](../../src/hooks/useCachedApi.ts), [`src/lib/cached-api.ts`](../../src/lib/cached-api.ts), [`src/lib/client-cache.ts`](../../src/lib/client-cache.ts) |
| 화면 | 검증된 결과를 실제 UI에 표시 | 위 3~5절의 화면 컴포넌트 |

이 다층 검증 덕분에 잘못된 응답을 빈 배열이나 0으로 바꾸어 정상처럼 보이게 하지 않습니다.

## 8. 오류는 빈 성공값으로 숨기지 않음

잘못된 입력은 보통 HTTP `400`, 서버 Supabase 설정 누락은 `503`, Supabase 응답 또는 데이터 계약 오류는 `502`로 처리합니다. 각 Hook/API는 오류 메시지를 화면에 표시하거나 기록합니다. “요청 실패”를 “데이터가 0건”인 것처럼 위장하지 않는 것이 원칙입니다. 캐시 갱신에 실패하면 검증된 이전 데이터는 유지하면서 오류를 함께 알리고, 저장소 읽기/쓰기 실패는 진단 로그에 남기되 네트워크 결과의 사용을 막지 않습니다.

## 9. 현재 확인된 표본 상태

2026-10-01 확인 시 전체 경기는 172건입니다. 페이지 API로 172행 전부를 확인했고 중복 ID는 없었습니다.

- 변경 전 rolling 24시간 기준에서 대시보드 RPC와 기존 계산은 전체 수, 플레이어 수, 최근 대전 수, 조합 수치, KST 활동, 급상승 기록이 일치했습니다.
- 캐릭터별 횟수와 승률은 일치합니다. 동률인 ID 6과 62의 표시 순서만 tie-break 기준 차이로 다릅니다.
- 캐릭터 ID 누락/미등록, 맵 ID 미등록, 경기 시각 누락/오류는 표본에서 발견되지 않았습니다.
- `map_id`가 NULL인 경기 108건은 두 계산 모두 맵 통계에서 제외합니다.
- 시간대 표준은 사이트 공통 KST입니다. 예전 브라우저 계산은 방문자 기기의 현지 시간대를 따랐으므로 KST 외 지역에서는 날짜 경계 결과가 달라질 수 있습니다. 사이트 방문자 모두가 같은 경기 날짜를 보도록 KST를 선택했습니다.

실행 시간 수치와 EXPLAIN 결과의 한계는 [03. 집계 설계와 계산 규칙](./03-calculation-design.md#11-db-실행-시간과-한계)에 정리했습니다.
