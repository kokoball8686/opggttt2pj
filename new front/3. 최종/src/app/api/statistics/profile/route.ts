import { NextResponse } from "next/server";
import { parseProfileStatistics } from "@/lib/profile-statistics";
import {
  callSupabaseRpc,
  SupabaseConfigurationError,
} from "@/lib/server/supabase-rpc";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const playerName = url.searchParams.get("name")?.trim() ?? "";
  const opponentName = url.searchParams.get("opponent")?.trim() ?? "";
  if (!playerName || playerName.length > 100 || opponentName.length > 100) {
    return NextResponse.json(
      { warning: "플레이어 이름은 1~100자여야 합니다." },
      { status: 400 },
    );
  }

  try {
    const payload = await callSupabaseRpc("get_player_statistics", {
      p_player_name: playerName,
      p_opponent_name: opponentName || null,
    });
    const statistics = parseProfileStatistics(payload);
    return NextResponse.json(statistics, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      return NextResponse.json({ warning: error.message }, { status: 503 });
    }
    console.error("Supabase player statistics RPC failed:", error);
    return NextResponse.json(
      { warning: "플레이어 통계를 불러오지 못했습니다." },
      { status: 502 },
    );
  }
}
