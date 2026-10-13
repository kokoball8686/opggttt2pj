"use client";

import { useEffect, useRef, useState } from "react";
import { loadCachedApi } from "@/lib/cached-api";

type CachedApiState<T> = {
  key: string;
  dataKey: string | null;
  data: T | null;
  previousData: T | null;
  loading: boolean;
  error: string | null;
};

type CachedApiOptions<T> = {
  key: string;
  url: string;
  parse: (value: unknown) => T;
  errorMessage: string;
  keepPreviousData?: boolean;
};

export function useCachedApi<T>({
  key,
  url,
  parse,
  errorMessage,
  keepPreviousData = false,
}: CachedApiOptions<T>) {
  const [refreshVersion, setRefreshVersion] = useState(0);
  const lastAnimatedUpdate = useRef<string | null>(null);
  const [result, setResult] = useState<CachedApiState<T>>({
    key: "",
    dataKey: null,
    data: null,
    previousData: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      let cachedUpdatedAt: number | null = null;
      let cachedData: T | null = null;
      try {
        const next = await loadCachedApi(
          { key, url, parse, errorMessage },
          (cached) => {
            cachedUpdatedAt = cached.updatedAt;
            cachedData = cached.data;
            if (active) {
              setResult((current) => ({
                key,
                dataKey: key,
                data: cached.data,
                previousData: current.key === key ? current.previousData : null,
                loading: false,
                error: current.key === key ? current.error : null,
              }));
            }
          },
        );
        if (active) {
          if (cachedUpdatedAt !== null && next.updatedAt > cachedUpdatedAt) {
            const updateMarker = `${key}:${next.updatedAt}`;
            if (lastAnimatedUpdate.current !== updateMarker) {
              lastAnimatedUpdate.current = updateMarker;
              setRefreshVersion((current) => current + 1);
            }
          }
          const replacedCachedData =
            cachedUpdatedAt !== null && next.updatedAt > cachedUpdatedAt;
          setResult((current) => ({
            key,
            dataKey: key,
            data: next.data,
            previousData: replacedCachedData
              ? cachedData
              : current.key === key
                ? current.previousData
                : null,
            loading: false,
            error: next.error,
          }));
        }
      } catch (loadError) {
        if (!active) return;
        const message =
          loadError instanceof Error ? loadError.message : errorMessage;
        setResult((current) => ({
          key,
          dataKey: current.key === key ? current.dataKey : null,
          data: current.key === key || keepPreviousData ? current.data : null,
          previousData: current.key === key ? current.previousData : null,
          loading: false,
          error: message,
        }));
        console.error("Failed to load cached API data:", loadError);
      }
    };

    const revalidateWhenVisible = () => {
      if (document.visibilityState === "visible") void load();
    };

    void load();
    window.addEventListener("focus", revalidateWhenVisible);
    document.addEventListener("visibilitychange", revalidateWhenVisible);
    return () => {
      active = false;
      window.removeEventListener("focus", revalidateWhenVisible);
      document.removeEventListener("visibilitychange", revalidateWhenVisible);
    };
  }, [key, url, parse, errorMessage, keepPreviousData]);

  if (result.key === key) return { ...result, refreshVersion };
  return {
    key,
    dataKey: keepPreviousData ? result.dataKey : null,
    data: keepPreviousData ? result.data : null,
    previousData: null,
    loading: true,
    error: null,
    refreshVersion,
  };
}
