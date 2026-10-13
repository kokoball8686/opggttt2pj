"use client";

import { useCachedApi } from "@/hooks/useCachedApi";
import { profileStatisticsRequest } from "@/lib/client-data-requests";

export function useProfileStatistics(name: string, opponent: string | null) {
  return useCachedApi({
    ...profileStatisticsRequest(name, opponent),
    keepPreviousData: true,
  });
}
