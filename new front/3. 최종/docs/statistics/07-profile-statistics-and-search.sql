-- 07. 플레이어 프로필 통계 및 이름 검색 RPC
-- 처음 읽는다면 01-start-here.md, 02-data-flow.md, 03-calculation-design.md를 먼저 읽습니다.
-- Supabase SQL Editor에서 이 파일 전체를 실행합니다.
-- 파일의 BEGIN~COMMIT 구간은 두 RPC 함수/권한을 변경하고 이후 SELECT는 읽기 전용 검증입니다.
-- 첫 함수는 플레이어 프로필 통계, 두 번째 함수는 prefix 이름 검색을 담당합니다.
BEGIN;

-- 기존 프로필 통계 함수를 이 정의로 교체합니다.
CREATE OR REPLACE FUNCTION public.get_player_statistics(
  -- 필수 프로필 이름
  p_player_name text,
  -- 선택 상대 이름. 생략되면 NULL
  p_opponent_name text DEFAULT NULL
)
-- 반환값은 JSON 객체입니다.
RETURNS jsonb
-- 변수와 조건문을 쓸 수 있는 PL/pgSQL 함수입니다.
LANGUAGE plpgsql
-- 데이터를 변경하지 않는 읽기 함수입니다.
STABLE
-- View를 소유자 권한으로 읽습니다.
SECURITY DEFINER
-- 객체 탐색 경로를 고정합니다.
SET search_path = pg_catalog, public
-- $function$ 표식 사이가 함수 본문입니다.
AS $function$
-- 함수 안에서 쓸 지역 변수와 입력값 정리
DECLARE
  -- 플레이어 이름 양끝 공백 제거
  v_player_name text := btrim(p_player_name);
  -- 빈 상대 이름은 선택하지 않은 것과 같은 NULL로 정리
  v_opponent_name text := nullif(btrim(p_opponent_name), '');
  -- 마지막에 만들어 반환할 JSON
  v_result jsonb;
BEGIN
  -- 필수 플레이어 이름이 없으면 잘못된 입력 SQLSTATE 22023으로 명시적 오류
  IF v_player_name IS NULL OR v_player_name = '' THEN
    RAISE EXCEPTION 'Player name must not be empty'
      USING ERRCODE = '22023';
  END IF;

  -- 두 이름 모두 최대 100자를 허용합니다.
  IF length(v_player_name) > 100 OR length(v_opponent_name) > 100 THEN
    RAISE EXCEPTION 'Player names must not exceed 100 characters'
      USING ERRCODE = '22023';
  END IF;

  WITH
  -- 요청 플레이어에게 해당하는 View 행만 가져와 이름과 캐릭터 값을 정규화합니다.
  -- MATERIALIZED는 이 함수의 여러 집계 단계가 같은 범위의 행을 재사용함을 나타냅니다.
  profile_rows AS MATERIALIZED (
    SELECT
      match_id,
      btrim(player_name) AS player_name,
      btrim(opponent_name) AS opponent_name,
      is_win,
      -- NULL 캐릭터 ID는 기존 규칙대로 0으로 보고 integer로 변환합니다.
      coalesce(player_main_character_id, 0)::integer AS main_character_id,
      coalesce(player_sub_character_id, 0)::integer AS sub_character_id,
      map_id,
      start_time,
      end_time,
      played_at
    FROM public.v_player_match_rows
    WHERE lower(btrim(player_name)) = lower(v_player_name)
      -- 상대 이름이 없는 불완전한 행은 집계에서 제외합니다.
      AND nullif(btrim(opponent_name), '') IS NOT NULL
  ),
  -- 프로필 총 경기/승리/시간/마지막 접속을 계산합니다.
  profile_summary AS (
    SELECT
      count(*) AS games,
      -- TRUE 승리만 셉니다.
      count(*) FILTER (WHERE is_win IS TRUE) AS wins,
      -- 시작과 종료가 모두 있고 음수가 아닌 경기 시간만 초 단위로 합칩니다.
      coalesce(
        sum(extract(epoch FROM (end_time - start_time)))
          FILTER (
            WHERE start_time IS NOT NULL
              AND end_time IS NOT NULL
              AND end_time >= start_time
          ),
        0
      ) AS play_seconds,
      -- 종료 시각 우선, 없으면 played_at으로 가장 최근 활동을 정합니다.
      max(coalesce(end_time, played_at)) AS last_access
    FROM profile_rows
  ),
  -- 태그 캐릭터 ID 순서를 정규화해 조합별 경기/승리 수를 계산합니다.
  team_totals AS (
    SELECT
      least(main_character_id, sub_character_id) AS character_a_id,
      greatest(main_character_id, sub_character_id) AS character_b_id,
      count(*) AS games,
      count(*) FILTER (WHERE is_win IS TRUE) AS wins
    FROM profile_rows
    GROUP BY
      least(main_character_id, sub_character_id),
      greatest(main_character_id, sub_character_id)
  ),
  -- 사용 횟수 상위 조합 최대 5개
  top_teams AS (
    SELECT character_a_id, character_b_id, games, wins
    FROM team_totals
    ORDER BY games DESC, character_a_id ASC, character_b_id ASC
    LIMIT 5
  ),
  -- 맵 ID가 있는 기록만 맵별 경기/승리 수로 집계합니다.
  map_totals AS (
    SELECT
      map_id::integer AS map_id,
      count(*) AS games,
      count(*) FILTER (WHERE is_win IS TRUE) AS wins
    FROM profile_rows
    WHERE map_id IS NOT NULL
    GROUP BY map_id
  ),
  -- 경기 수 상위 맵 최대 50개. 동률은 맵 ID 오름차순
  top_maps AS (
    SELECT map_id, games, wins
    FROM map_totals
    ORDER BY games DESC, map_id ASC
    LIMIT 50
  ),
  -- 상대 이름은 lower 키로 묶고 가장 최근 표기를 함께 고릅니다.
  rival_totals AS (
    SELECT
      lower(opponent_name) AS opponent_key,
      (array_agg(opponent_name ORDER BY played_at DESC NULLS LAST, match_id DESC))[1] AS opponent_name,
      count(*) AS games,
      count(*) FILTER (WHERE is_win IS TRUE) AS wins,
      max(coalesce(end_time, played_at)) AS last_played
    FROM profile_rows
    GROUP BY lower(opponent_name)
  ),
  -- 최근에 만난 상대 최대 5명
  recent_rivals AS (
    SELECT opponent_key, opponent_name, games, wins, last_played
    FROM rival_totals
    ORDER BY last_played DESC NULLS LAST, opponent_key COLLATE "C" ASC
    LIMIT 5
  ),
  -- 사용자가 지정한 특정 상대와의 경기 및 승리 수
  selected_rival AS (
    SELECT
      count(*) AS games,
      count(*) FILTER (WHERE is_win IS TRUE) AS wins
    FROM profile_rows
    WHERE v_opponent_name IS NOT NULL
      AND lower(opponent_name) = lower(v_opponent_name)
  )
  -- 각 통계 CTE 결과를 API 계약에 맞는 JSON 객체로 조립합니다.
  SELECT jsonb_build_object(
    'name', v_player_name,
    'summary', jsonb_build_object(
      'games', s.games,
      'wins', s.wins,
      -- 유효한 승리 외 나머지 경기를 패배로 계산합니다.
      'losses', s.games - s.wins,
      'rate', CASE WHEN s.games = 0 THEN 0 ELSE s.wins::numeric * 100 / s.games END,
      'playSeconds', s.play_seconds,
      'lastAccess', s.last_access
    ),
    'teams', coalesce(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'ids', jsonb_build_array(t.character_a_id, t.character_b_id),
            'games', t.games,
            'wins', t.wins,
            -- numeric 변환으로 정수 나눗셈을 방지한 승률
            'rate', t.wins::numeric * 100 / t.games
          )
          ORDER BY t.games DESC, t.character_a_id ASC, t.character_b_id ASC
        )
        FROM top_teams AS t
      ),
      '[]'::jsonb
    ),
    'maps', coalesce(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', m.map_id,
            'games', m.games,
            'wins', m.wins,
            'rate', m.wins::numeric * 100 / m.games
          )
          ORDER BY m.games DESC, m.map_id ASC
        )
        FROM top_maps AS m
      ),
      '[]'::jsonb
    ),
    'rivals', coalesce(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'name', r.opponent_name,
            'games', r.games,
            'wins', r.wins,
            'lastPlayed', r.last_played
          )
          ORDER BY r.last_played DESC NULLS LAST, r.opponent_key COLLATE "C" ASC
        )
        FROM recent_rivals AS r
      ),
      '[]'::jsonb
    ),
    -- 상대를 지정하지 않으면 JSON null, 지정하면 상대 전적 객체
    'selectedRival', CASE
      WHEN v_opponent_name IS NULL THEN NULL
      ELSE (
        SELECT jsonb_build_object(
          'name', v_opponent_name,
          'games', sr.games,
          'wins', sr.wins,
          'rate', CASE WHEN sr.games = 0 THEN 0 ELSE sr.wins::numeric * 100 / sr.games END
        )
        FROM selected_rival AS sr
      )
    END
  )
  INTO v_result
  FROM profile_summary AS s;

  RETURN v_result;
END;
$function$;

ALTER FUNCTION public.get_player_statistics(text, text) OWNER TO postgres;

-- PUBLIC/API 역할의 기존 권한을 먼저 모두 회수합니다.
REVOKE ALL PRIVILEGES
  ON FUNCTION public.get_player_statistics(text, text)
  FROM PUBLIC, anon, authenticated;

-- anon/authenticated가 제한된 프로필 집계 함수를 호출하게 허용합니다.
GRANT EXECUTE
  ON FUNCTION public.get_player_statistics(text, text)
  TO anon, authenticated;

-- 기존 이름 검색 함수를 이 정의로 교체합니다.
CREATE OR REPLACE FUNCTION public.search_player_names(
  -- 이름의 시작 부분과 비교할 검색어
  p_query text,
  -- 자동완성 결과에서 제외할 현재 플레이어(선택)
  p_exclude_name text DEFAULT NULL
)
-- 반환값은 JSON 배열입니다.
RETURNS jsonb
-- 함수 본문은 SQL 한 문장입니다.
LANGUAGE sql
-- 데이터 변경이 없는 읽기 함수
STABLE
-- 공개 역할에게 View 직접 권한 없이 함수 소유자 권한으로 검색
SECURITY DEFINER
-- 객체 탐색 경로 고정
SET search_path = pg_catalog, public
AS $function$
-- 검색어/제외 이름을 trim하고 소문자로 바꿉니다.
WITH query AS (
  SELECT
    lower(btrim(coalesce(p_query, ''))) AS query_text,
    lower(btrim(coalesce(p_exclude_name, ''))) AS excluded_name
),
-- View에서 표시 가능한 이름을 정리하고 소문자 비교 키를 만듭니다.
name_rows AS MATERIALIZED (
  SELECT
    lower(btrim(player_name)) AS player_key,
    btrim(player_name) AS player_name,
    played_at,
    match_id
  FROM public.v_player_match_rows
  WHERE nullif(btrim(player_name), '') IS NOT NULL
    AND nullif(btrim(opponent_name), '') IS NOT NULL
),
-- 같은 대소문자 무시 키에 여러 표기가 있으면 가장 최근 표기를 하나 고릅니다.
canonical_names AS (
  SELECT DISTINCT ON (player_key)
    player_key,
    player_name
  FROM name_rows
  ORDER BY player_key, played_at DESC NULLS LAST, match_id DESC
),
-- prefix가 일치하고 제외 대상이 아닌 이름을 정렬해 최대 10개로 제한합니다.
results AS (
  SELECT names.player_key, names.player_name
  FROM canonical_names AS names
  CROSS JOIN query AS q
  WHERE q.query_text <> ''
    AND length(q.query_text) <= 100
    -- 이름 시작부분의 길이가 검색어와 일치하는지 비교합니다.
    AND left(names.player_key, char_length(q.query_text)) = q.query_text
    AND (q.excluded_name = '' OR names.player_key <> q.excluded_name)
  ORDER BY names.player_key COLLATE "C" ASC
  LIMIT 10
)
-- 검색 결과를 JSON 배열로 반환하고, 결과가 없으면 빈 배열을 반환합니다.
SELECT coalesce(jsonb_agg(player_name ORDER BY player_key COLLATE "C" ASC), '[]'::jsonb)
FROM results;
$function$;

ALTER FUNCTION public.search_player_names(text, text) OWNER TO postgres;

-- 이름 검색도 공개 역할의 기본 권한을 회수한 뒤
REVOKE ALL PRIVILEGES
  ON FUNCTION public.search_player_names(text, text)
  FROM PUBLIC, anon, authenticated;

-- 웹 API 역할에 함수 실행 권한만 허용합니다.
GRANT EXECUTE
  ON FUNCTION public.search_player_names(text, text)
  TO anon, authenticated;

-- 두 함수 변경을 PostgREST가 다시 읽게 합니다.
NOTIFY pgrst, 'reload schema';

-- 두 함수와 권한 설정을 함께 확정합니다.
COMMIT;

-- 검증 1: 두 함수 각각 owner/security/search_path/역할별 실행 권한을 확인합니다.
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
-- public 스키마의 두 대상 함수만 검사
WHERE n.nspname = 'public'
  AND p.proname IN ('get_player_statistics', 'search_player_names')
-- 함수 이름 순서로 결과 행을 정렬
ORDER BY p.proname;

-- 검증 2: Trakeas 전체 프로필 통계
-- 상대 필터에 NULL을 주어 전체 프로필 집계를 확인
SELECT public.get_player_statistics('Trakeas', NULL) AS profile_payload;
-- 검증 3: Trakeas와 Feira_Practice의 맞대결 요약
-- 두 번째 인자로 상대 이름을 주어 맞대결 집계를 확인
SELECT public.get_player_statistics('Trakeas', 'Feira_Practice') AS head_to_head_payload;
-- 검증 4: tra로 시작하는 이름 중 Trakeas를 제외해 검색
-- 검색어와 제외 이름을 주어 자동완성 RPC를 확인
SELECT public.search_player_names('tra', 'Trakeas') AS name_suggestions;

-- 검증 5: 결과 배열 상한과 승/패 합계가 맞는지 한 행으로 확인합니다.
-- 맞대결 응답을 profile이라는 이름으로 보관
WITH profile AS (
  SELECT public.get_player_statistics('Trakeas', 'Feira_Practice') AS payload
),
-- 검색 결과를 suggestions라는 이름으로 보관
suggestions AS (
  SELECT public.search_player_names('tra', 'Trakeas') AS payload
)
SELECT
  -- 프로필 응답의 조합/맵/최근 상대 배열 길이
  jsonb_array_length(profile.payload -> 'teams') AS team_count,
  jsonb_array_length(profile.payload -> 'maps') AS map_count,
  jsonb_array_length(profile.payload -> 'rivals') AS rival_count,
  -- 상대를 지정했으므로 JSON object여야 합니다.
  jsonb_typeof(profile.payload -> 'selectedRival') AS selected_rival_type,
  -- 테스트 검색어가 제외 이름만 매치하면 0일 수 있으며 이 데이터에서는 정상입니다.
  jsonb_array_length(suggestions.payload) AS suggestion_count,
  coalesce(
    -- summary에서 games, wins, losses 문자열을 정수로 바꿔 합계를 비교
    (profile.payload -> 'summary' ->> 'games')::integer
      = (profile.payload -> 'summary' ->> 'wins')::integer
        + (profile.payload -> 'summary' ->> 'losses')::integer,
    false
    -- 응답 값이 없거나 NULL이어도 검증 결과를 참으로 위장하지 않음
  ) AS summary_totals_match
-- 두 CTE의 각각 한 행을 나란히 놓고 검증 결과 하나를 만듦
FROM profile
CROSS JOIN suggestions;
