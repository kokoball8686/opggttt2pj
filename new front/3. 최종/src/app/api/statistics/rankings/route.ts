import { NextResponse } from "next/server";
import { parsePlayerRankings } from "@/lib/player-rankings";
import {
  callSupabaseRpc,
  SupabaseConfigurationError,
} from "@/lib/server/supabase-rpc";

export async function GET() {
  try {
    const payload = await callSupabaseRpc("get_player_rankings");
    const rankings = parsePlayerRankings(payload);
    return NextResponse.json(rankings, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      return NextResponse.json({ warning: error.message }, { status: 503 });
    }
    console.error("Supabase player rankings RPC failed:", error);
    return NextResponse.json(
      { warning: "플레이어 순위를 불러오지 못했습니다." },
      { status: 502 },
    );
  }
}
