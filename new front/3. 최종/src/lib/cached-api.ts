import {
  CLIENT_CACHE_SCHEMA_VERSION,
  getClientCacheFreshness,
  parseClientCacheRecord,
  readClientCacheRecord,
  writeClientCacheRecord,
} from "@/lib/client-cache";

type RawCacheEntry = {
  value: unknown;
  updatedAt: number;
};

type PendingRequest = {
  controller: AbortController;
  promise: Promise<RawCacheEntry>;
  subscribers: Set<symbol>;
  settled: boolean;
};

export type CachedApiResult<T> = {
  data: T;
  updatedAt: number;
  error: string | null;
};

type ApiOptions<T> = {
  key: string;
  url: string;
  parse: (value: unknown) => T;
  errorMessage: string;
  signal?: AbortSignal;
};

const memoryCache = new Map<string, RawCacheEntry>();
const pendingRequests = new Map<string, PendingRequest>();

function getApiError(payload: unknown, fallback: string): Error {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "warning" in payload &&
    typeof payload.warning === "string"
  ) {
    return new Error(payload.warning);
  }
  return new Error(fallback);
}

export async function readCachedApi<T>(
  key: string,
  parse: (value: unknown) => T,
): Promise<CachedApiResult<T> | null> {
  let rawRecord: unknown;

  try {
    const memoryEntry = memoryCache.get(key);
    rawRecord = memoryEntry
      ? {
          key,
          schemaVersion: CLIENT_CACHE_SCHEMA_VERSION,
          updatedAt: memoryEntry.updatedAt,
          value: memoryEntry.value,
        }
      : await readClientCacheRecord(key);
  } catch (error) {
    console.error("Failed to read IndexedDB API cache; continuing with network:", error);
    return null;
  }

  if (rawRecord === null) return null;

  const record = parseClientCacheRecord(rawRecord, key);
  if (!record) {
    console.warn("Ignoring an invalid IndexedDB API cache record; it will not be deleted.");
    return null;
  }

  try {
    const data = parse(record.value);
    memoryCache.set(key, { value: record.value, updatedAt: record.updatedAt });
    return { data, updatedAt: record.updatedAt, error: null };
  } catch (error) {
    console.error("Failed to validate IndexedDB API cache; continuing with network:", error);
    return null;
  }
}

async function fetchRawResponse<T>(options: ApiOptions<T>): Promise<RawCacheEntry> {
  const response = await fetch(options.url, {
    cache: "no-store",
    ...(options.signal ? { signal: options.signal } : {}),
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new Error(options.errorMessage, { cause: error });
  }
  if (!response.ok) throw getApiError(payload, options.errorMessage);

  options.parse(payload);
  if (options.signal?.aborted) throw new Error("The request was aborted.");
  const entry = { value: payload, updatedAt: Date.now() };
  memoryCache.set(options.key, entry);

  void writeClientCacheRecord({
    key: options.key,
    schemaVersion: CLIENT_CACHE_SCHEMA_VERSION,
    updatedAt: entry.updatedAt,
    value: payload,
  }).catch((error: unknown) => {
    console.error("Failed to persist API response in IndexedDB; using it for this session:", error);
  });

  return entry;
}

export async function fetchCachedApi<T>(
  options: ApiOptions<T>,
): Promise<CachedApiResult<T>> {
  if (options.signal?.aborted) throw new Error("The request was aborted.");

  let request = pendingRequests.get(options.key);
  if (!request) {
    const controller = new AbortController();
    const created: PendingRequest = {
      controller,
      promise: fetchRawResponse({ ...options, signal: controller.signal }),
      subscribers: new Set(),
      settled: false,
    };
    request = created;
    pendingRequests.set(options.key, created);
    void created.promise.then(
      () => {
        created.settled = true;
        if (pendingRequests.get(options.key) === created) {
          pendingRequests.delete(options.key);
        }
      },
      () => {
        created.settled = true;
        if (pendingRequests.get(options.key) === created) {
          pendingRequests.delete(options.key);
        }
      },
    );
  }

  const subscriber = Symbol(options.key);
  request.subscribers.add(subscriber);
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    request.subscribers.delete(subscriber);
    if (!request.settled && request.subscribers.size === 0) {
      if (pendingRequests.get(options.key) === request) {
        pendingRequests.delete(options.key);
      }
      request.controller.abort();
    }
  };
  const abort = () => release();
  if (options.signal?.aborted) {
    release();
    throw new Error("The request was aborted.");
  }
  options.signal?.addEventListener("abort", abort, { once: true });

  try {
    const entry = await request.promise;
    if (options.signal?.aborted) throw new Error("The request was aborted.");
    const data = options.parse(entry.value);
    return { data, updatedAt: entry.updatedAt, error: null };
  } finally {
    options.signal?.removeEventListener("abort", abort);
    release();
  }
}

export async function loadCachedApi<T>(
  options: ApiOptions<T>,
  onCached?: (cached: CachedApiResult<T>) => void,
): Promise<CachedApiResult<T>> {
  let cached = await readCachedApi(options.key, options.parse);
  if (!cached) {
    cached = readMemoryCachedApi(options.key, options.parse);
  }
  if (cached) onCached?.(cached);
  if (cached && getClientCacheFreshness(cached.updatedAt) === "fresh") return cached;

  try {
    return await fetchCachedApi(options);
  } catch (error) {
    if (!cached) throw error;
    const message = error instanceof Error ? error.message : options.errorMessage;
    return { ...cached, error: message };
  }
}

export async function prefetchCachedApi<T>(
  options: ApiOptions<T>,
): Promise<void> {
  try {
    const result = await loadCachedApi(options);
    if (result.error) {
      console.error("Background API refresh failed; cached data remains available:", result.error);
    }
  } catch (error) {
    console.error("Failed to prepare API data in the background:", error);
  }
}

function readMemoryCachedApi<T>(
  key: string,
  parse: (value: unknown) => T,
): CachedApiResult<T> | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;

  try {
    return {
      data: parse(entry.value),
      updatedAt: entry.updatedAt,
      error: null,
    };
  } catch (error) {
    console.error("Failed to validate in-memory API cache; continuing with network:", error);
    return null;
  }
}
