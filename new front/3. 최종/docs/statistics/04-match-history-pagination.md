# 04. 전체·개인 경기 기록 페이지 조회

이 문서는 기존의 전체 경기 기록을 최대 1,000건까지 한꺼번에 받아 화면이나 브라우저 코드에서 다루던 경로를 페이지 단위 조회로 바꾼 내용을 설명합니다. 이 기능은 통계 숫자를 집계하는 RPC와는 목적이 다릅니다.

- 통계 화면은 경기 전체를 DB에서 집계해 숫자와 제한된 결과만 전달받습니다. 그 내용은 [03. 집계 설계와 계산 규칙](./03-calculation-design.md)과 SQL 문서 05~07에서 설명합니다.
- 경기 기록 화면은 플레이어 이름, 승자, 점수, 캐릭터, 맵, 시각처럼 실제 경기 행을 보여줘야 하므로 현재 페이지의 경기 행을 받습니다.

이번 개편의 핵심은 “화면에 경기 행이 필요하니 전체를 받는다”가 아니라, **전체/개인 기록 모두에서 현재 페이지 행과 전체 건수만 요청한다**는 점입니다.

## 1. 왜 바꿨나요?

기존 흐름은 전체 경기 기록을 계속 페이지 조회하는 대신 한 번에 최대 1,000건을 가져오는 형태였습니다. 전체 데이터가 그 제한보다 적을 때는 전체처럼 보이지만, 실제 데이터가 1,001건이면 최소 한 건은 응답에서 빠지고, 수만 건이면 요청 한 번으로는 최대 1,000건만 볼 수 있습니다. 제한 뒤에 있는 경기 행은 계산/목록에 포함되지 않으므로 전체인 것처럼 보이는 숫자나 불완전한 목록을 만들 수 있습니다.

페이지네이션으로 바꾼 이유는 “목록은 통계가 아니니 덜 중요하다”가 아닙니다. 실제 경기 목록도 예전 상한에 묶여 일부 이력만 다룰 수 있었기 때문에, 전체 경기 기록을 확인하는 동작 자체를 페이지 RPC로 교체해야 했습니다. 통계의 정확성 문제와 목록의 탐색/전송량 문제는 원인이 같은 상한 조회에 있었고, 해결은 집계 RPC와 페이지 조회 RPC로 나누어 적용했습니다.

페이지 조회는 이 두 문제를 다르게 처리합니다.

1. 사용자가 보는 페이지의 경기 행만 반환합니다.
2. 전체 건수(`total_count`)를 함께 반환해 전체 페이지 수를 표시합니다.
3. 다음 페이지를 요청하면 해당 페이지 행을 별도 요청합니다.
4. 전체 목록 화면이 모든 페이지를 미리 내려받지 않습니다.

예를 들어 페이지 크기가 10이고 기록이 172건이면 각 요청은 최대 10행을 받습니다. 화면은 `ceil(172 / 10) = 18`페이지를 제공하며, 18번째 페이지에는 나머지 2행이 있습니다. 총건수는 행들을 브라우저로 모두 보내지 않고도 페이지 수를 계산하게 해줍니다.

전체 페이지를 사용자가 직접 모두 넘겨보면 결과적으로 각 행을 모두 열람할 수 있습니다. 차이는 첫 화면을 표시하기 위해 전부 전송하고 메모리에 쌓지 않는다는 점입니다. 페이지네이션은 정확한 `total_count`와 올바른 DB 쿼리를 전제로 하므로, DB가 전체 건수를 계산하는 비용까지 공짜로 없애 주는 것은 아닙니다.

## 2. 용어

| 용어 | 뜻 |
|---|---|
| 페이지 번호(`page`) | 사용자가 보고 있는 1부터 시작하는 페이지 번호 |
| 페이지 크기(`page_size`) | 한 요청이 돌려주는 최대 경기 행 수. 현재 10 |
| 전체 건수(`total_count`) | 조건에 맞는 전체 경기 수. 한 페이지에 반환하는 행 수와 다름 |
| OFFSET | 정렬된 결과에서 페이지 앞에 건너뛸 행 수. 1부터 시작하는 페이지 `p`, 페이지 크기 `s`라면 `(p - 1) * s` |
| 페이지네이션 | 큰 결과 전체를 한 번에 주고받지 않고 작은 페이지들로 나누어 이동하는 방식 |
| `match_number` | 플레이어의 시간순 경기 번호. 승리순/패배순 등으로 정렬해도 같은 경기의 번호를 유지 |
| RPC | PostgREST를 통해 Supabase PostgreSQL 함수를 호출하는 방식 |

## 3. 전체 기록과 개인 기록은 다른 API입니다

### 전체 경기 기록

```text
MatchesDirectory
  → useMatchPage(page)
  → GET /api/matches?page={page}
  → get_all_matches_by_page(p_page, p_page_size=10)
  → 현재 페이지의 경기 행 + total_count
  → normalizeMatchPage()
  → MatchList와 Pagination
```

### 플레이어별 경기 기록

```text
ProfileView
  → usePlayerMatchPage(name, page, sort)
  → GET /api/matches/player?name=...&page=...&sort=...
  → get_player_matches_by_page(name, page, 10, sort)
  → 현재 페이지의 경기 행 + total_count + match_number
  → normalizeMatchPage(requireMatchNumbers=true)
  → MatchList와 Pagination
```

두 API는 별도 필터와 정렬이 있습니다. 프로필 통계 API가 프로필 경기 목록까지 함께 돌려주는 구조가 아닙니다.

## 4. 요청부터 화면까지 계층별 역할

### 4.1 화면 컴포넌트

- [`MatchesDirectory.tsx`](../../src/components/matches/MatchesDirectory.tsx)는 전체 기록 페이지 번호를 보관하고, 현재 페이지를 Hook에 전달합니다.
- [`ProfileView.tsx`](../../src/components/profile/ProfileView.tsx)는 플레이어 기록의 페이지와 정렬 상태를 관리합니다.
- [`MatchList.tsx`](../../src/components/matches/MatchList.tsx)는 현재 페이지 행을 렌더링하고, 전달된 `matchNumbers`가 있으면 경기 번호를 함께 표시합니다.
- [`Pagination.tsx`](../../src/components/matches/Pagination.tsx)는 현재 페이지와 전체 페이지 수로 페이지 이동 UI를 표시합니다.

전체/개인 화면은 모두 페이지 크기 10을 사용합니다. 화면은 `totalCount / 10`을 올림해 페이지 수를 구합니다.

### 4.2 React Hook

[`useMatches.ts`](../../src/hooks/useMatches.ts)는 `useMatchPage(page)`와 `usePlayerMatchPage(name, page, sort)`를 제공합니다.

두 Hook은 공통 `useFetchedMatchPage()` 경로를 사용합니다.

1. URL을 요청합니다.
2. 페이지나 이름/정렬이 바뀌면 이전 요청을 취소하고 새 요청을 시작합니다.
3. HTTP 오류 응답이면 서버가 보낸 `warning`을 사용자에게 보여줄 오류로 사용합니다.
4. 성공 응답을 [`normalizeMatchPage()`](../../src/lib/match-pages.ts)에 전달해 형식과 행을 확인합니다.
5. 실패 시 오류를 기록하고, 성공한 빈 페이지와 혼동하지 않도록 오류 상태를 유지합니다.

파일에 있는 `useMatches()`와 `usePlayerMatches()`는 예전 호출부 호환용이며 빈 결과를 반환합니다. 현재 페이지 목록 화면은 페이지 전용 Hook을 사용합니다. 이 두 레거시 함수가 전체 경기 데이터를 내려받는 네트워크 요청을 수행하지는 않습니다.

### 4.3 Next.js API Route Handler

전체 기록 경로는 [`src/app/api/matches/route.ts`](../../src/app/api/matches/route.ts), 개인 기록 경로는 [`src/app/api/matches/player/route.ts`](../../src/app/api/matches/player/route.ts)에 있습니다.

두 Route는 쿼리 문자열을 검증하고, 허용된 RPC와 인자만 서버 코드에서 지정합니다. 페이지 크기는 클라이언트가 마음대로 지정하는 값이 아니라 서버가 10으로 넘깁니다.

전체 기록 API:

- `page`가 생략되면 1페이지를 사용합니다.
- 페이지는 양의 정수여야 합니다.
- `get_all_matches_by_page`에 `p_page`, `p_page_size: 10`을 전달합니다.
- RPC 응답을 정규화 함수로 검사하고, 응답의 `page`와 `page_size`가 요청과 맞는지 확인합니다.

개인 기록 API:

- 이름은 trim 후 비어 있지 않아야 합니다.
- `page`가 생략되면 1페이지이며, 양의 정수여야 합니다.
- 허용 정렬은 `time`, `wins`, `losses`뿐입니다. 생략 시 `time`입니다.
- `get_player_matches_by_page`에 이름, 페이지, 페이지 크기 10, 정렬값을 전달합니다.
- `match_number`가 필수인 응답 모드로 정규화합니다.

두 API는 `Cache-Control: no-store`로 응답합니다. 설정이 없으면 HTTP 503, 입력 오류는 HTTP 400, Supabase 호출 실패나 응답 계약 오류는 HTTP 502로 처리합니다. 오류를 성공한 빈 목록으로 감추지 않습니다.

### 4.4 서버 RPC 호출

[`src/lib/server/match-pages.ts`](../../src/lib/server/match-pages.ts)는 호출 가능한 RPC를 두 개의 명시적 타입으로 제한합니다.

- `get_all_matches_by_page`: 페이지 번호와 페이지 크기만 받습니다.
- `get_player_matches_by_page`: 플레이어 이름, 페이지, 페이지 크기, 세 가지 허용 정렬값만 받습니다.

둘 다 공통 [`callSupabaseRpc()`](../../src/lib/server/supabase-rpc.ts)를 재사용합니다. 이 구조로 Route Handler는 임의 함수명이나 임의 인자 객체를 조립하지 않습니다. 브라우저에는 Supabase 서비스 롤 키를 노출하지 않습니다.

### 4.5 응답 검사 및 정규화

[`normalizeMatchPage()`](../../src/lib/match-pages.ts)는 외부에서 온 값을 `unknown`으로 받아 다음을 검사합니다.

1. 최상위 값이 JSON 객체인지 확인합니다.
2. `page`와 `page_size`가 안전한 양의 정수인지 확인합니다.
3. `total_count`가 안전한 0 이상의 정수인지 확인합니다.
4. `matches`가 배열인지 확인합니다.
5. 각 배열 항목이 객체인지 확인합니다.
6. 각 경기 행을 [`normalizeMatch()`](../../src/lib/matches.ts)로 변환합니다. 변환 불가능한 행은 조용히 버리지 않고 오류를 냅니다.
7. 배열 길이가 `page_size`를 넘지 않는지 확인합니다.
8. 전체 기록은 페이지 내 각 행의 표시 번호를 `total_count - (page - 1) * page_size - index`로 계산합니다.
9. 개인 기록은 DB의 `match_number`를 양의 안전한 정수로 검증합니다. 필수 번호가 빠졌으면 오류를 냅니다.

DB의 `id`는 JavaScript 정수 정밀도 손실을 막기 위해 문자열로 보존합니다. `normalizeMatch()`가 DB 열 이름(`p1_name`, `start_time`)을 화면 객체 이름(`p1Name`, `startAt`)으로 변환합니다. 상세 필드 정규화 규칙은 [`matches.ts`](../../src/lib/matches.ts)와 [02. 데이터 흐름](./02-data-flow.md)을 참고하세요.

## 5. 정렬과 `match_number`

개인 기록 API는 다음 정렬을 허용합니다.

| 값 | 의미 |
|---|---|
| `time` | 시간순 최신 경기부터 |
| `wins` | 승리 경기를 우선하고, 같은 그룹 안에서는 최신 경기부터 |
| `losses` | 패배 경기를 우선하고, 같은 그룹 안에서는 최신 경기부터 |

일반 화면 행 번호를 사용하면 정렬을 바꿀 때 같은 경기에 붙는 번호도 달라집니다. 하지만 개인 프로필에서 경기 번호는 그 플레이어가 가진 경기 이력의 시간순 위치를 나타내야 합니다. 그래서 RPC가 페이지 정렬과 별도로 각 경기의 `match_number`를 반환하고, 클라이언트는 그 값을 검증해 유지합니다.

전체 기록 페이지는 `total_count`와 페이지 위치를 이용해 목록의 번호를 표시합니다. 그 번호는 DB의 경기 ID가 아닙니다.

## 6. DB RPC에 대한 적용/문서화 경계

두 페이지 RPC의 SQL은 [08. 전체·개인 경기 페이지 RPC SQL](./08-match-page-rpcs.sql)에 있습니다. 이 문서는 사용자가 제공한 과거 대화의 원문을 바탕으로 정리했으며, 전체 경기 페이지 함수는 현재 사용 중인 이름 `get_all_matches_by_page`로 기록합니다. DB 정의를 변경하면 이 문서와 동기화하세요.

현재 앱이 요구하는 응답 계약은 다음과 같습니다.

```json
{
  "page": 2,
  "page_size": 10,
  "total_count": 172,
  "matches": [
    {
      "id": "163",
      "p1_name": "Player A",
      "p2_name": "Player B",
      "winner": "Player A",
      "p1_score": 3,
      "p2_score": 1,
      "p1_main_character_id": 0,
      "p1_sub_character_id": 64,
      "p2_main_character_id": 20,
      "p2_sub_character_id": 30,
      "map_id": 4
    }
  ]
}
```

예시는 구조만 보여줍니다. 행 예시는 한 페이지에서 반환할 수 있는 경기 중 일부이며, 운영 데이터 또는 실제 SQL 결과로 취급하지 마세요. 개인 응답은 같은 페이지 메타데이터에 각 경기 행의 `match_number`를 요구합니다.

DB 함수 정의를 수정할 때는 08 SQL과 현재 DB 정의를 먼저 비교하세요. 페이지 크기 상한, 정렬의 동률 처리, 총건수와 반환 행의 동일 필터 적용, 번호 의미, 권한과 API 계약도 함께 보존해야 합니다. DB에 적용한 정의가 바뀌면 08 SQL을 같은 변경에서 갱신하고 페이지 API 및 전체 완전성 검증을 다시 실행합니다.

## 7. 완전성 및 동작 검증

페이지 한두 개가 정상이라고 전체 기록이 다 조회된 것은 아닙니다. 완전성을 확인하려면 DB/응답의 `total_count`에 맞춰 마지막 페이지까지 요청하고, 반환된 행 수와 고유 ID 수를 확인해야 합니다.

2026-10-01 확인 내용:

- 전체 경기 `total_count`는 172였습니다.
- 페이지 크기 10으로 첫 페이지부터 마지막 페이지까지 확인해 전체 172행을 받았습니다.
- 반환된 경기 ID의 고유 개수도 172로, 중복 없이 전체 표본이 포함됐습니다.
- 프로필 Trakeas 최신순·승리순·패배순 화면과 정렬을 바꿔도 유지되는 `match_number`를 확인했습니다.
- 전체 목록, 프로필 목록의 요청/정규화 관련 테스트와 타입 검사, ESLint, production build가 당시 통과했습니다.

저장소의 [`match-pages.test.ts`](../../src/lib/match-pages.test.ts)는 페이지 JSON 정규화, 문자열 ID 보존, 잘못된 행의 명시적 거부, 유효하지 않은 `total_count` 거부, 개인 기록 번호 검증을 다룹니다.

이 검증은 당시 172경기 표본의 완전성을 확인한 것입니다. 이는 앞으로도 모든 데이터 크기에서 비용이 일정하다는 뜻이 아니며, `OFFSET` 기반 페이지 이동과 매 요청의 정확한 전체 건수 계산은 데이터가 커지면 성능을 다시 측정해야 합니다.

당시 172건은 1,000건보다 적으므로, 이 검증은 1,001건 제한 문제를 직접 재현한 스트레스 테스트가 아닙니다. 이 확인으로 증명한 것은 그 시점의 전체 기록을 마지막 페이지까지 빠짐없이 조회할 수 있었다는 점과 개인 기록 정렬/번호가 화면 계약을 지켰다는 점입니다. 상한을 넘어설 때 생기는 누락은 이전 조회 방식의 구조에서 도출되는 문제입니다.

## 8. 변경 시 함께 확인할 것

페이지 크기나 응답 형태를 바꾸면 아래 계층이 같은 계약을 사용하는지 확인합니다.

1. DB RPC 입력, 반환값, 정렬과 권한
2. [`src/lib/server/match-pages.ts`](../../src/lib/server/match-pages.ts)의 함수/인자 타입
3. 두 API Route의 입력 검증과 페이지 크기
4. [`src/lib/match-pages.ts`](../../src/lib/match-pages.ts)의 런타임 응답 검증 및 번호 계산
5. [`src/hooks/useMatches.ts`](../../src/hooks/useMatches.ts)의 URL, 취소, 오류 처리
6. 전체 및 프로필 화면의 페이지 수, 정렬, 번호 표시
7. [`match-pages.test.ts`](../../src/lib/match-pages.test.ts)와 API 경계/완전성 테스트
8. 이 문서와 [02. 데이터 흐름](./02-data-flow.md)의 요청 흐름
