-- 06. 플레이어 순위 RPC
-- 처음 읽는다면 01-start-here.md, 02-data-flow.md, 03-calculation-design.md를 먼저 읽습니다.
-- Supabase SQL Editor에서 이 파일 전체를 실행합니다.
-- BEGIN~COMMIT은 함수와 권한을 변경하고, 뒤의 SELECT들은 읽기 전용 검증입니다.
-- 함수는 최대 10명의 집계 결과만 반환하며 전체 경기 행은 반환하지 않습니다.
BEGIN;

-- 기존 같은 이름의 순위 함수를 새 정의로 교체합니다.
CREATE OR REPLACE FUNCTION public.get_player_rankings()
-- 반환값은 JSON 배열입니다.
RETURNS jsonb
-- 함수 본문이 SQL 쿼리 하나임을 나타냅니다.
LANGUAGE sql
-- 데이터 변경이 없는 읽기 함수입니다.
STABLE
-- View 소유자 권한으로 읽기 위해 함수 소유자 권한으로 실행합니다.
SECURITY DEFINER
-- 객체 탐색 경로를 고정합니다.
SET search_path = pg_catalog, public
-- $function$ 사이가 함수 본문입니다.
AS $function$
-- View의 두 선수 관점 행을 먼저 정리합니다.
WITH player_rows AS MATERIALIZED (
  SELECT
    -- 이름 양끝 공백 제거
    btrim(player_name) AS player_name,
    -- View가 계산한 플레이어 관점 승리 여부
    is_win,
    -- 누락 ID는 0 처리 후 작은 ID부터 태그 조합 정규화
    least(
      coalesce(player_main_character_id, 0)::integer,
      coalesce(player_sub_character_id, 0)::integer
    ) AS character_a_id,
    greatest(
      coalesce(player_main_character_id, 0)::integer,
      coalesce(player_sub_character_id, 0)::integer
    ) AS character_b_id
  FROM public.v_player_match_rows
  WHERE nullif(btrim(player_name), '') IS NOT NULL
    AND nullif(btrim(opponent_name), '') IS NOT NULL
),
-- 플레이어별 총 경기와 승리를 세고 20전 미만을 제거합니다.
player_totals AS (
  SELECT
    player_name,
    count(*) AS games,
    -- TRUE만 승리로 셉니다.
    count(*) FILTER (WHERE is_win IS TRUE) AS wins
  FROM player_rows
  GROUP BY player_name
  HAVING count(*) >= 20
),
-- 플레이어/태그 조합마다 사용 횟수를 셉니다.
team_totals AS (
  SELECT
    player_name,
    character_a_id,
    character_b_id,
    count(*) AS games
  FROM player_rows
  GROUP BY player_name, character_a_id, character_b_id
),
-- 각 플레이어의 조합을 가장 많이 사용한 순서로 매깁니다.
ranked_teams AS (
  SELECT
    player_name,
    character_a_id,
    character_b_id,
    games,
    row_number() OVER (
      PARTITION BY player_name
      -- 사용 횟수 내림차순, 완전 동률이면 ID 오름차순
      ORDER BY games DESC, character_a_id ASC, character_b_id ASC
    ) AS team_rank
  FROM team_totals
),
-- 대표 조합을 붙이고 승률순 상위 10명을 고릅니다.
ranked_players AS (
  SELECT
    totals.player_name,
    totals.games,
    totals.wins,
    -- integer 나눗셈으로 소수점이 사라지지 않도록 numeric으로 승률 계산
    totals.wins::numeric * 100 / totals.games AS rate,
    teams.character_a_id,
    teams.character_b_id,
    teams.games AS team_games
  FROM player_totals AS totals
  JOIN ranked_teams AS teams
    ON teams.player_name = totals.player_name
   AND teams.team_rank = 1
  ORDER BY
    -- 승률 높은 순. 여기서는 비율 비교라 100을 곱하지 않아도 순서는 같습니다.
    totals.wins::numeric / totals.games DESC,
    totals.games DESC,
    -- 동률 순위의 출력 순서를 고정합니다.
    totals.player_name COLLATE "C" ASC
  LIMIT 10
)
-- 최대 10명 배열을 JSON으로 반환합니다.
SELECT coalesce(
  jsonb_agg(
    jsonb_build_object(
      'name', player_name,
      'games', games,
      'wins', wins,
      'rate', rate,
      -- 대표 조합에는 캐릭터 ID 두 개와 사용 경기 수를 넣습니다.
      'team', jsonb_build_object(
        'ids', jsonb_build_array(character_a_id, character_b_id),
        'games', team_games
      )
    )
    ORDER BY
      wins::numeric / games DESC,
      games DESC,
      player_name COLLATE "C" ASC
  ),
  -- 집계 대상이 하나도 없으면 SQL NULL 대신 빈 JSON 배열
  '[]'::jsonb
)
FROM ranked_players;
$function$;

ALTER FUNCTION public.get_player_rankings() OWNER TO postgres;

-- PUBLIC, anon, authenticated에 있을 수 있는 권한을 먼저 모두 제거합니다.
REVOKE ALL PRIVILEGES
  ON FUNCTION public.get_player_rankings()
  FROM PUBLIC, anon, authenticated;

-- 웹에서 필요한 두 API 역할에 RPC 실행만 허용합니다.
GRANT EXECUTE
  ON FUNCTION public.get_player_rankings()
  TO anon, authenticated;

-- PostgREST 함수 캐시를 새로고침합니다.
NOTIFY pgrst, 'reload schema';

-- 정의와 권한을 확정합니다.
COMMIT;

-- 검증 1: owner/security/search_path 및 anon/authenticated 실행 권한을 확인합니다.
SELECT
  -- 함수 이름
  p.proname AS function_name,
  -- 내부 owner ID를 사람이 읽을 수 있는 역할 이름으로 변환
  pg_get_userbyid(p.proowner) AS owner_name,
  -- true이면 SECURITY DEFINER 설정
  p.prosecdef AS is_security_definer,
  -- 함수에 고정한 search_path 등 실행 설정
  p.proconfig AS function_settings,
  -- anon 역할의 EXECUTE 권한 여부
  has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute,
  -- authenticated 역할의 EXECUTE 권한 여부
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute
-- PostgreSQL이 함수 정의/속성을 저장하는 시스템 카탈로그
FROM pg_proc AS p
-- 함수가 public 스키마에 있는지 이름으로 찾기 위해 스키마 카탈로그와 연결
JOIN pg_namespace AS n ON n.oid = p.pronamespace
-- public 스키마 안에서 대상 함수 하나만 검사
WHERE n.nspname = 'public'
  AND p.proname = 'get_player_rankings';

-- 검증 2: 실제 응답 JSON을 읽고 순위 인원 및 행 계약을 검사합니다.
-- 함수 응답을 payload라는 이름의 한 행 결과로 준비
WITH result AS (
  SELECT public.get_player_rankings() AS payload
)
SELECT
  -- JSON 전체를 출력해 육안으로도 응답을 확인
  payload,
  -- 결과 배열 길이: 최대 10이어야 합니다.
  jsonb_array_length(payload) AS ranking_count,
  coalesce(
    bool_and(
      -- 각 플레이어는 20전 이상이며
      (entry ->> 'games')::integer >= 20
      -- 대표 조합 ID 배열에는 캐릭터 ID가 정확히 두 개 있어야 합니다.
      AND jsonb_array_length(entry -> 'team' -> 'ids') = 2
    ),
    -- 빈 배열이면 검사할 선수가 없으므로 행 조건은 참으로 처리
    true
  ) AS rows_are_valid
-- 배열 항목을 행으로 펼치며 빈 배열이면 왼쪽 payload 행은 보존
FROM result
-- entry는 각 선수 객체 하나
LEFT JOIN LATERAL jsonb_array_elements(payload) AS entries(entry) ON true
-- 집계 결과를 원래 payload 단위 한 행으로 묶음
GROUP BY payload;
