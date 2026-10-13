import { NextResponse } from "next/server";
import { parseDashboardStatistics } from "@/lib/dashboard-statistics";
import {
  callSupabaseRpc,
  SupabaseConfigurationError,
} from "@/lib/server/supabase-rpc";

export async function GET() {
  try {
    const payload = await callSupabaseRpc("get_dashboard_statistics");
    const statistics = parseDashboardStatistics(payload);
    return NextResponse.json(statistics, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      return NextResponse.json({ warning: error.message }, { status: 503 });
    }
    console.error("Supabase dashboard statistics RPC failed:", error);
    return NextResponse.json(
      { warning: "대시보드 통계를 불러오지 못했습니다." },
      { status: 502 },
    );
  }
}
