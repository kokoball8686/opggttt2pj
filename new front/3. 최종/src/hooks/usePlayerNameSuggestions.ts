"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchCachedApi, readCachedApi } from "@/lib/cached-api";
import { playerNameSuggestionsRequest } from "@/lib/client-data-requests";

type NameSuggestionsResult = {
  key: string;
  names: string[];
  loading: boolean;
  error: string | null;
};

export function usePlayerNameSuggestions(query: string, excludeName: string) {
  const normalizedQuery = query.trim();
  const normalizedExclude = excludeName.trim();
  const request = useMemo(
    () => playerNameSuggestionsRequest(normalizedQuery, normalizedExclude),
    [normalizedQuery, normalizedExclude],
  );
  const preserveOnUnmount = useRef(false);
  const [result, setResult] = useState<NameSuggestionsResult>({
    key: "",
    names: [],
    loading: false,
    error: null,
  });
  const preservePendingSearch = useCallback(() => {
    preserveOnUnmount.current = true;
  }, []);
  const cancelPendingSearchOnNextChange = useCallback(() => {
    preserveOnUnmount.current = false;
  }, []);

  useEffect(() => {
    if (!normalizedQuery) return;

    preserveOnUnmount.current = false;
    let active = true;
    let serverCompleted = false;
    let serverSucceeded = false;
    const controller = new AbortController();

    void readCachedApi(request.key, request.parse).then((cached) => {
      if (!active || !cached || serverSucceeded) return;
      setResult((current) => ({
        key: request.key,
        names: cached.data,
        loading: !serverCompleted,
        error: serverCompleted && current.key === request.key ? current.error : null,
      }));
    });

    void fetchCachedApi({ ...request, signal: controller.signal })
      .then((fresh) => {
        serverCompleted = true;
        serverSucceeded = true;
        if (active) {
          setResult({
            key: request.key,
            names: fresh.data,
            loading: false,
            error: null,
          });
        }
      })
      .catch((loadError: unknown) => {
        serverCompleted = true;
        if (controller.signal.aborted) return;
        const message =
          loadError instanceof Error
            ? loadError.message
            : request.errorMessage;
        if (active) {
          setResult((current) => ({
            key: request.key,
            names: current.key === request.key ? current.names : [],
            loading: false,
            error: message,
          }));
          console.error("Failed to search player names:", loadError);
        }
      });

    return () => {
      active = false;
      if (!preserveOnUnmount.current) controller.abort();
    };
  }, [normalizedQuery, request]);

  const current = result.key === request.key;
  return {
    names: current ? result.names : [],
    loading: current ? result.loading : Boolean(normalizedQuery),
    error: current ? result.error : null,
    preservePendingSearch,
    cancelPendingSearchOnNextChange,
  };
}
