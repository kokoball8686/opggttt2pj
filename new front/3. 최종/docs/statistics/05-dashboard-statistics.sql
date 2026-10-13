-- 05. 대시보드 통계 RPC
-- 처음 읽는다면 01-start-here.md, 02-data-flow.md, 03-calculation-design.md를 먼저 읽습니다.
-- Supabase SQL Editor에서 이 파일 전체를 실행합니다.
-- BEGIN~COMMIT 구간은 함수와 권한을 변경합니다. 그 뒤 SELECT들은 읽기 전용 검증입니다.
-- 함수는 전체 경기 행 대신 집계 JSON 하나를 반환합니다.
BEGIN;

-- 기존 같은 이름의 함수를 새 정의로 교체합니다.
CREATE OR REPLACE FUNCTION public.get_dashboard_statistics()
-- 반환되는 값의 형식은 JSON입니다.
RETURNS jsonb
-- 함수 본문은 SQL 쿼리 한 개입니다.
LANGUAGE sql
-- 데이터를 변경하지 않는 읽기 함수임을 표시합니다.
STABLE
-- 함수 소유자 권한으로 실행합니다. 아래에서 owner를 postgres로 지정합니다.
SECURITY DEFINER
-- 호출 환경과 무관하게 객체 탐색 경로를 고정합니다.
SET search_path = pg_catalog, public
-- $function$ 표식 사이가 함수의 실제 SQL 본문입니다.
AS $function$
WITH
-- 현재 순간과 한국 날짜를 한 번 정해 계산 전체에서 재사용합니다.
clock AS MATERIALIZED (
  SELECT
    statement_timestamp() AS now_at,
    (statement_timestamp() AT TIME ZONE 'Asia/Seoul')::date AS today
),
-- 선수 관점 View에서 정상 이름을 가진 행만 가져옵니다.
-- 누락된 캐릭터 ID는 기존 정규화 규칙에 맞춰 0으로 처리합니다.
valid_player_rows AS MATERIALIZED (
  SELECT
    match_id,
    btrim(player_name) AS player_name,
    btrim(opponent_name) AS opponent_name,
    is_win,
    coalesce(player_main_character_id, 0)::integer AS main_character_id,
    coalesce(player_sub_character_id, 0)::integer AS sub_character_id,
    played_at
  FROM public.v_player_match_rows
  WHERE nullif(btrim(player_name), '') IS NOT NULL
    AND nullif(btrim(opponent_name), '') IS NOT NULL
),
-- View의 양쪽 선수 관점 행을 경기 ID로 묶어 원본 경기 단위로 되돌립니다.
valid_matches AS MATERIALIZED (
  SELECT
    match_id,
    max(played_at) AS played_at
  FROM valid_player_rows
  GROUP BY match_id
),
-- 경기 수, 공백 제거한 고유 플레이어 수, KST 오늘 대전 수를 계산합니다.
summary AS (
  SELECT
    (SELECT count(*) FROM valid_matches) AS total_matches,
    (SELECT count(DISTINCT player_name) FROM valid_player_rows) AS total_players,
    (
      SELECT count(*)
      FROM valid_matches AS m
      CROSS JOIN clock AS c
      WHERE m.played_at >= (c.today::timestamp AT TIME ZONE 'Asia/Seoul')
        AND m.played_at <= c.now_at
    ) AS today_matches
),
-- 플레이어별 메인/서브 두 슬롯을 각각 펼쳐 캐릭터별 픽 수를 셉니다.
character_counts AS (
  SELECT
    character_ids.character_id,
    count(*) AS pick_count
  FROM valid_player_rows AS r
  CROSS JOIN LATERAL (
    -- VALUES 두 행이 메인·서브 캐릭터 슬롯 하나씩을 나타냅니다.
    VALUES (r.main_character_id), (r.sub_character_id)
  ) AS character_ids(character_id)
  GROUP BY character_ids.character_id
),
-- 선수 관점별 캐릭터 조합의 경기 수와 승리 수를 계산합니다.
combo_counts AS (
  SELECT
    -- 캐릭터 ID를 정렬해 태그 순서만 다른 조합을 하나로 합칩니다.
    least(main_character_id, sub_character_id) AS character_a_id,
    greatest(main_character_id, sub_character_id) AS character_b_id,
    count(*) AS games,
    -- TRUE인 승리만 계산합니다. NULL은 승리로 간주하지 않습니다.
    count(*) FILTER (WHERE is_win IS TRUE) AS wins
  FROM valid_player_rows
  GROUP BY
    least(main_character_id, sub_character_id),
    greatest(main_character_id, sub_character_id)
  -- 10전 미만 조합은 고승률 목록 후보에서 제외합니다.
  HAVING count(*) >= 10
),
-- 오늘을 포함한 KST 기준 최근 30일의 날짜 행을 만듭니다.
activity_days AS (
  SELECT c.today - offsets.day_offset AS activity_date
  FROM clock AS c
  CROSS JOIN generate_series(29, 0, -1) AS offsets(day_offset)
),
-- 경기 없는 날도 0으로 출력하기 위해 날짜 목록에서 경기로 LEFT JOIN합니다.
activity_counts AS (
  SELECT
    d.activity_date,
    count(m.match_id) AS match_count
  FROM activity_days AS d
  LEFT JOIN valid_matches AS m
    -- 날짜 시작 시각 이상
    ON m.played_at >= (d.activity_date::timestamp AT TIME ZONE 'Asia/Seoul')
   -- 다음 날 시작 시각 미만(시작 포함·끝 제외)
   AND m.played_at < ((d.activity_date + 1)::timestamp AT TIME ZONE 'Asia/Seoul')
  GROUP BY d.activity_date
),
-- KST 기준 최근 14일에서 직전 7일과 최근 7일을 플레이어별로 나눕니다.
player_periods AS (
  SELECT
    -- 대소문자만 다른 이름을 같은 급상승 후보로 묶습니다.
    lower(r.player_name) AS player_key,
    -- 화면에 보여줄 이름은 가장 최근 경기의 표기를 사용합니다.
    (array_agg(r.player_name ORDER BY r.played_at DESC NULLS LAST, r.match_id DESC))[1] AS player_name,
    count(*) FILTER (
      WHERE r.played_at < ((c.today - 6)::timestamp AT TIME ZONE 'Asia/Seoul')
    ) AS previous_games,
    count(*) FILTER (
      WHERE r.played_at < ((c.today - 6)::timestamp AT TIME ZONE 'Asia/Seoul')
        AND r.is_win IS TRUE
    ) AS previous_wins,
    count(*) FILTER (
      WHERE r.played_at >= ((c.today - 6)::timestamp AT TIME ZONE 'Asia/Seoul')
    ) AS recent_games,
    count(*) FILTER (
      WHERE r.played_at >= ((c.today - 6)::timestamp AT TIME ZONE 'Asia/Seoul')
        AND r.is_win IS TRUE
    ) AS recent_wins
  FROM valid_player_rows AS r
  CROSS JOIN clock AS c
  WHERE r.played_at >= ((c.today - 13)::timestamp AT TIME ZONE 'Asia/Seoul')
    AND r.played_at < ((c.today + 1)::timestamp AT TIME ZONE 'Asia/Seoul')
  GROUP BY lower(r.player_name)
),
-- 두 기간 각각 10전 이상인 사람의 기간별 승률을 계산합니다.
rising_candidates AS (
  SELECT
    player_key,
    player_name,
    previous_games,
    previous_wins,
    recent_games,
    recent_wins,
    previous_wins::numeric * 100 / previous_games AS previous_rate,
    recent_wins::numeric * 100 / recent_games AS recent_rate
  FROM player_periods
  WHERE previous_games >= 10
    AND recent_games >= 10
),
-- 승률이 실제로 상승한 후보 중 상승폭이 가장 큰 한 명을 고릅니다.
rising AS (
  SELECT *
  FROM rising_candidates
  WHERE recent_rate > previous_rate
  ORDER BY
    recent_rate - previous_rate DESC,
    recent_games DESC,
    -- 위 조건까지 완전히 동률일 때 이름 순으로 고정합니다.
    player_key COLLATE "C" ASC
  LIMIT 1
)
-- 앱 API가 사용하는 응답 필드를 한 JSON 객체에 담습니다.
SELECT jsonb_build_object(
  -- 총 경기 수, 고유 플레이어 수, 한국 시간 기준 오늘 경기 수
  'totalMatches', s.total_matches,
  'totalPlayers', s.total_players,
  'todayMatches', s.today_matches,
  -- 캐릭터 배열: ID, 픽 횟수, 전체 캐릭터 슬롯 대비 비율
  'characters', coalesce(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', ranked.character_id,
          'count', ranked.pick_count,
          'rate', ranked.pick_count::numeric * 100 / (s.total_matches * 4)
        )
        -- 픽 횟수 내림차순, 동률은 캐릭터 ID 오름차순
        ORDER BY ranked.pick_count DESC, ranked.character_id ASC
      )
      FROM (
        SELECT character_id, pick_count
        FROM character_counts
        ORDER BY pick_count DESC, character_id ASC
        LIMIT 6
      ) AS ranked
    ),
    -- 데이터가 없으면 SQL NULL 대신 빈 JSON 배열
    '[]'::jsonb
  ),
  -- 태그 조합 배열: ID 2개, 경기/승리 수, 승률
  'combos', coalesce(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'ids', jsonb_build_array(ranked.character_a_id, ranked.character_b_id),
          'games', ranked.games,
          'wins', ranked.wins,
          'rate', ranked.wins::numeric * 100 / ranked.games
        )
        ORDER BY
          ranked.wins::numeric / ranked.games DESC,
          ranked.games DESC,
          ranked.character_a_id ASC,
          ranked.character_b_id ASC
      )
      FROM (
        SELECT character_a_id, character_b_id, games, wins
        FROM combo_counts
        ORDER BY
          wins::numeric / games DESC,
          games DESC,
          character_a_id ASC,
          character_b_id ASC
        LIMIT 6
      ) AS ranked
    ),
    '[]'::jsonb
  ),
  -- 해당자가 없으면 JSON null을 반환
  'rising', coalesce(
    (
      SELECT jsonb_build_object(
        'name', player_name,
        'previous', jsonb_build_object('games', previous_games, 'wins', previous_wins),
        'recent', jsonb_build_object('games', recent_games, 'wins', recent_wins),
        'previousRate', previous_rate,
        'recentRate', recent_rate
      )
      FROM rising
    ),
    'null'::jsonb
  ),
  -- 최근 KST 날짜 30개의 그래프 데이터
  'activity', (
    SELECT jsonb_agg(
      jsonb_build_object(
        -- API 내부에서 안정적으로 처리할 ISO 날짜
        'key', to_char(activity_date, 'YYYY-MM-DD'),
        'label',
          -- 화면에 보여줄 월/일 문자열
          extract(month FROM activity_date)::integer::text
          || '/'
          || extract(day FROM activity_date)::integer::text,
        'count', match_count
      )
      -- 과거에서 오늘 순으로 정렬
      ORDER BY activity_date
    )
    FROM activity_counts
  )
)
FROM summary AS s;
$function$;

ALTER FUNCTION public.get_dashboard_statistics() OWNER TO postgres;

-- 예상치 못한 기본/기존 실행 권한을 회수합니다.
REVOKE ALL PRIVILEGES
  ON FUNCTION public.get_dashboard_statistics()
  FROM PUBLIC, anon, authenticated;

-- 브라우저 경로의 anon/authenticated만 RPC를 실행할 수 있게 합니다.
GRANT EXECUTE
  ON FUNCTION public.get_dashboard_statistics()
  TO anon, authenticated;

-- PostgREST가 함수 정의를 다시 읽도록 알립니다.
NOTIFY pgrst, 'reload schema';

-- 함수와 권한 변경을 확정합니다.
COMMIT;

-- 검증 1: DB 카탈로그에서 owner/security/search_path/실행 권한을 읽습니다.
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
  AND p.proname = 'get_dashboard_statistics';

-- 검증 2: 실제 반환 JSON과 배열 상한을 검사합니다.
-- 함수 응답을 payload라는 이름의 한 행 결과로 준비
WITH result AS (
  SELECT public.get_dashboard_statistics() AS payload
)
SELECT
  -- JSON 전체를 출력해 육안으로도 응답을 확인
  payload,
  -- 한국 시간 기준 오늘 경기 수
  (payload ->> 'todayMatches')::bigint AS today_matches,
  -- 활동 날짜는 정확히 30개
  jsonb_array_length(payload -> 'activity') AS activity_days,
  -- 캐릭터 배열은 최대 6개
  jsonb_array_length(payload -> 'characters') AS character_count,
  -- 조합 배열은 최대 6개
  jsonb_array_length(payload -> 'combos') AS combo_count,
  -- rising은 JSON object 또는 null
  jsonb_typeof(payload -> 'rising') AS rising_type
-- 위에서 준비한 단일 결과를 검사
FROM result;
