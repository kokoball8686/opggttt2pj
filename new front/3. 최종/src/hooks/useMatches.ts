"use client";

import { useMemo } from "react";
import { useCachedApi } from "@/hooks/useCachedApi";
import type { Match } from "@/lib/matches";
import { matchPageRequest } from "@/lib/client-data-requests";
import { findAddedMatchIds } from "@/lib/match-pages";

const NO_MATCHES: Match[] = [];

// The legacy Supabase data source is intentionally disconnected during the statistics rebuild.
export function useMatches() {
  return { matches: NO_MATCHES, loading: false, error: null };
}

export function usePlayerMatches(_name: string) {
  void _name;
  return { matches: NO_MATCHES, loading: false, error: null };
}

function useFetchedMatchPage(url: string, requireMatchNumbers = false) {
  const request = useMemo(
    () => matchPageRequest(url, requireMatchNumbers),
    [url, requireMatchNumbers],
  );
  const {
    data: page,
    previousData: previousPage,
    loading,
    error,
  } = useCachedApi(request);
  const newMatchIds = findAddedMatchIds(previousPage, page);

  return {
    matches: page?.matches ?? NO_MATCHES,
    matchNumbers: page?.matchNumbers ?? new Map<string, number>(),
    totalCount: page?.totalCount ?? 0,
    hasData: page !== null,
    newMatchIds,
    loading,
    error,
  };
}

export function useMatchPage(page: number) {
  return useFetchedMatchPage(`/api/matches?page=${page}`);
}

export function usePlayerMatchPage(
  name: string,
  page: number,
  sort: "time" | "wins" | "losses",
) {
  const params = new URLSearchParams({
    name,
    page: String(page),
    sort,
  });
  return useFetchedMatchPage(`/api/matches/player?${params.toString()}`, true);
}
