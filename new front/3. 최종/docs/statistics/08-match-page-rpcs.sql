-- 전체 경기 페이지 RPC입니다.
CREATE OR REPLACE FUNCTION public.get_all_matches_by_page(
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_total_count bigint;
  v_offset bigint;
  v_matches jsonb;
BEGIN
  IF p_page IS NULL OR p_page < 1 THEN
    RAISE EXCEPTION 'p_page must be greater than or equal to 1'
      USING ERRCODE = '22023';
  END IF;

  IF p_page_size IS NULL OR p_page_size < 1 OR p_page_size > 100 THEN
    RAISE EXCEPTION 'p_page_size must be between 1 and 100'
      USING ERRCODE = '22023';
  END IF;

  v_offset := (p_page::bigint - 1) * p_page_size;

  SELECT count(*)
  INTO v_total_count
  FROM public.matches;

  SELECT coalesce(
    jsonb_agg(page_rows.match_json ORDER BY page_rows.id DESC),
    '[]'::jsonb
  )
  INTO v_matches
  FROM (
    SELECT
      id,
      jsonb_build_object(
        'id', id::text,
        'p1_name', p1_name,
        'p2_name', p2_name,
        'p1_score', p1_score,
        'p2_score', p2_score,
        'winner', winner,
        'start_time', start_time,
        'end_time', end_time,
        'created_at', created_at,
        'p1_main_character_id', p1_main_character_id,
        'p1_sub_character_id', p1_sub_character_id,
        'p2_main_character_id', p2_main_character_id,
        'p2_sub_character_id', p2_sub_character_id,
        'map_id', map_id
      ) AS match_json
    FROM public.matches
    ORDER BY id DESC
    LIMIT p_page_size
    OFFSET v_offset
  ) AS page_rows;

  RETURN jsonb_build_object(
    'page', p_page,
    'page_size', p_page_size,
    'total_count', v_total_count,
    'matches', v_matches
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_all_matches_by_page(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_all_matches_by_page(integer, integer)
  TO anon, authenticated;

-- 개인별 대전 기록 페이지 RPC를 생성할 때 실행한 SQL입니다.
CREATE OR REPLACE FUNCTION public.get_player_matches_by_page(
  p_player_name text,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 10,
  p_sort text DEFAULT 'time'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_total_count bigint;
  v_offset bigint;
  v_matches jsonb;
BEGIN
  IF p_player_name IS NULL OR btrim(p_player_name) = '' THEN
    RAISE EXCEPTION 'p_player_name is required'
      USING ERRCODE = '22023';
  END IF;

  IF p_page IS NULL OR p_page < 1 THEN
    RAISE EXCEPTION 'p_page must be greater than or equal to 1'
      USING ERRCODE = '22023';
  END IF;

  IF p_page_size IS NULL OR p_page_size < 1 OR p_page_size > 100 THEN
    RAISE EXCEPTION 'p_page_size must be between 1 and 100'
      USING ERRCODE = '22023';
  END IF;

  IF p_sort IS NULL OR p_sort NOT IN ('time', 'wins', 'losses') THEN
    RAISE EXCEPTION 'p_sort must be time, wins, or losses'
      USING ERRCODE = '22023';
  END IF;

  v_offset := (p_page::bigint - 1) * p_page_size;

  SELECT count(*)
  INTO v_total_count
  FROM public.matches
  WHERE p1_name = p_player_name
     OR p2_name = p_player_name;

  WITH filtered_matches AS (
    SELECT
      id,
      p1_name,
      p2_name,
      p1_score,
      p2_score,
      winner,
      start_time,
      end_time,
      created_at,
      p1_main_character_id,
      p1_sub_character_id,
      p2_main_character_id,
      p2_sub_character_id,
      map_id
    FROM public.matches
    WHERE p1_name = p_player_name
       OR p2_name = p_player_name
  ),
  numbered_matches AS (
    SELECT
      row_number() OVER (ORDER BY id ASC) AS match_number,
      filtered_matches.*
    FROM filtered_matches
  ),
  page_rows AS (
    SELECT
      numbered_matches.*,
      CASE
        WHEN p_sort = 'wins' AND winner = p_player_name THEN 0
        WHEN p_sort = 'losses' AND winner IS DISTINCT FROM p_player_name THEN 0
        ELSE 1
      END AS sort_group
    FROM numbered_matches
    ORDER BY sort_group, id DESC
    LIMIT p_page_size
    OFFSET v_offset
  )
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', id::text,
        'match_number', match_number,
        'p1_name', p1_name,
        'p2_name', p2_name,
        'p1_score', p1_score,
        'p2_score', p2_score,
        'winner', winner,
        'start_time', start_time,
        'end_time', end_time,
        'created_at', created_at,
        'p1_main_character_id', p1_main_character_id,
        'p1_sub_character_id', p1_sub_character_id,
        'p2_main_character_id', p2_main_character_id,
        'p2_sub_character_id', p2_sub_character_id,
        'map_id', map_id
      )
      ORDER BY sort_group, id DESC
    ),
    '[]'::jsonb
  )
  INTO v_matches
  FROM page_rows;

  RETURN jsonb_build_object(
    'page', p_page,
    'page_size', p_page_size,
    'total_count', v_total_count,
    'matches', v_matches
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_player_matches_by_page(text, integer, integer, text)
  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_player_matches_by_page(text, integer, integer, text)
  TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
