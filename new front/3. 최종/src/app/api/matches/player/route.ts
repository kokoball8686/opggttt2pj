import { NextResponse } from "next/server";
import { normalizeMatchPage } from "@/lib/match-pages";
import {
  callMatchPageRpc,
  SupabaseConfigurationError,
} from "@/lib/server/match-pages";

type MatchSort = "time" | "wins" | "losses";

function isMatchSort(value: string): value is MatchSort {
  return value === "time" || value === "wins" || value === "losses";
}

function parsePage(value: string | null) {
  if (value === null) return 1;
  if (!/^\d+$/.test(value)) return null;
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const name = url.searchParams.get("name")?.trim() ?? "";
  if (!name) {
    return NextResponse.json(
      { warning: "플레이어 닉네임이 필요합니다." },
      { status: 400 },
    );
  }

  const page = parsePage(url.searchParams.get("page"));
  if (page === null) {
    return NextResponse.json(
      { warning: "페이지 번호는 1 이상의 정수여야 합니다." },
      { status: 400 },
    );
  }

  const sortValue = url.searchParams.get("sort") ?? "time";
  if (!isMatchSort(sortValue)) {
    return NextResponse.json(
      { warning: "정렬 기준은 time, wins, losses 중 하나여야 합니다." },
      { status: 400 },
    );
  }
  const sort = sortValue;

  try {
    const payload = await callMatchPageRpc({
      name: "get_player_matches_by_page",
      args: {
        p_player_name: name,
        p_page: page,
        p_page_size: 10,
        p_sort: sort,
      },
    });
    const result = normalizeMatchPage(payload, true);
    if (result.page !== page || result.pageSize !== 10) {
      throw new Error("플레이어 대전 데이터의 페이지 정보가 요청과 일치하지 않습니다.");
    }
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      return NextResponse.json({ warning: error.message }, { status: 503 });
    }
    console.error("Supabase player matches RPC failed:", error);
    return NextResponse.json(
      { warning: "플레이어 대전 기록을 불러오지 못했습니다." },
      { status: 502 },
    );
  }
}
