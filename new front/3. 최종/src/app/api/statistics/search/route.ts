import { NextResponse } from "next/server";
import { parsePlayerNameSuggestions } from "@/lib/profile-statistics";
import {
  callSupabaseRpc,
  SupabaseConfigurationError,
} from "@/lib/server/supabase-rpc";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  const excludeName = url.searchParams.get("exclude")?.trim() ?? "";
  if (query.length > 100 || excludeName.length > 100) {
    return NextResponse.json(
      { warning: "검색어와 제외할 이름은 각각 100자 이하여야 합니다." },
      { status: 400 },
    );
  }
  if (!query) return NextResponse.json([]);

  try {
    const payload = await callSupabaseRpc("search_player_names", {
      p_query: query,
      p_exclude_name: excludeName || null,
    });
    const names = parsePlayerNameSuggestions(payload);
    return NextResponse.json(names, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      return NextResponse.json({ warning: error.message }, { status: 503 });
    }
    console.error("Supabase player name search RPC failed:", error);
    return NextResponse.json(
      { warning: "플레이어 이름을 검색하지 못했습니다." },
      { status: 502 },
    );
  }
}
