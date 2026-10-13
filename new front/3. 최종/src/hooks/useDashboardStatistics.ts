"use client";

import { useCachedApi } from "@/hooks/useCachedApi";
import { dashboardRequest } from "@/lib/client-data-requests";

export function useDashboardStatistics() {
  return useCachedApi(dashboardRequest());
}
