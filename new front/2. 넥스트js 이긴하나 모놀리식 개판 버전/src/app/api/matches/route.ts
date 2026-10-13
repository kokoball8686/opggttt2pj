import { NextResponse } from "next/server";
import { Match, normalizeMatch } from "@/lib/matches";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ matches: [], warning: "Supabase 환경변수가 설정되지 않았습니다." }, { status: 503 });
  try {
    const response = await fetch(`${url}/rest/v1/matches?select=*&order=created_at.desc&limit=1000`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, next: { revalidate: 30 }, signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error(String(response.status));
    const rows = await response.json() as Record<string, unknown>[];
    const matches = rows.map(normalizeMatch).filter((match): match is Match => Boolean(match));
    return NextResponse.json({ matches, source: "supabase" });
  } catch (error) { console.error("Supabase matches query failed:", error); return NextResponse.json({ matches: [], warning: "데이터베이스에 연결할 수 없습니다." }, { status: 502 }); }
}
