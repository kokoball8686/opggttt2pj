import { prefetchCachedApi } from "@/lib/cached-api";
import { parseDashboardStatistics } from "@/lib/dashboard-statistics";
import { normalizeMatchPage } from "@/lib/match-pages";
import { parsePlayerRankings } from "@/lib/player-rankings";
import {
  parsePlayerNameSuggestions,
  parseProfileStatistics,
} from "@/lib/profile-statistics";

function key(namespace: string, parts: string[] = []) {
  return `${namespace}:${JSON.stringify(parts)}`;
}

export function dashboardRequest() {
  return {
    key: key("dashboard"),
    url: "/api/statistics/dashboard",
    parse: parseDashboardStatistics,
    errorMessage: "대시보드 통계를 불러오지 못했습니다.",
  };
}

export function rankingsRequest() {
  return {
    key: key("rankings"),
    url: "/api/statistics/rankings",
    parse: parsePlayerRankings,
    errorMessage: "플레이어 순위를 불러오지 못했습니다.",
  };
}

export function matchPageRequest(url: string, requireMatchNumbers = false) {
  return {
    key: key("match-page", [url]),
    url,
    parse: (value: unknown) => normalizeMatchPage(value, requireMatchNumbers),
    errorMessage: "대전 기록을 불러오지 못했습니다.",
  };
}

export function profileStatisticsRequest(name: string, opponent: string | null) {
  const params = new URLSearchParams({ name });
  if (opponent) params.set("opponent", opponent);

  return {
    key: key("profile-statistics", [name, opponent ?? ""]),
    url: `/api/statistics/profile?${params.toString()}`,
    parse: parseProfileStatistics,
    errorMessage: "플레이어 통계를 불러오지 못했습니다.",
  };
}

export function playerNameSuggestionsRequest(query: string, excludeName: string) {
  const params = new URLSearchParams({ q: query, exclude: excludeName });

  return {
    key: key("player-name-suggestions", [query, excludeName]),
    url: `/api/statistics/search?${params.toString()}`,
    parse: parsePlayerNameSuggestions,
    errorMessage: "플레이어 이름을 검색하지 못했습니다.",
  };
}

export async function prefetchSelectedProfileStatistics(
  name: string,
  opponent: string,
) {
  await prefetchCachedApi(profileStatisticsRequest(name, opponent));
}

export async function prefetchInitialClientData() {
  await Promise.all([
    prefetchCachedApi(dashboardRequest()),
    prefetchCachedApi(rankingsRequest()),
    prefetchCachedApi(matchPageRequest("/api/matches?page=1")),
  ]);
}
