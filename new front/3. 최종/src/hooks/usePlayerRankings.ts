"use client";

import { useCachedApi } from "@/hooks/useCachedApi";
import { rankingsRequest } from "@/lib/client-data-requests";

export function usePlayerRankings() {
  return useCachedApi(rankingsRequest());
}
