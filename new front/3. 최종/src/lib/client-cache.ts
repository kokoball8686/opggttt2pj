export const CLIENT_CACHE_SCHEMA_VERSION = 1;
export const CLIENT_CACHE_FRESH_FOR_MS = 5_000;
export const CLIENT_CACHE_STALE_AFTER_MS = 5 * 60_000;

const DATABASE_NAME = "ttt2-web-client-cache";
const DATABASE_VERSION = 1;
const STORE_NAME = "responses";

export type ClientCacheRecord = {
  key: string;
  schemaVersion: number;
  updatedAt: number;
  value: unknown;
};

let databasePromise: Promise<IDBDatabase> | null = null;
let persistencePromise: Promise<boolean> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseClientCacheRecord(
  value: unknown,
  expectedKey: string,
  now = Date.now(),
): ClientCacheRecord | null {
  if (
    !isRecord(value) ||
    value.key !== expectedKey ||
    value.schemaVersion !== CLIENT_CACHE_SCHEMA_VERSION ||
    typeof value.updatedAt !== "number" ||
    !Number.isSafeInteger(value.updatedAt) ||
    value.updatedAt < 0 ||
    value.updatedAt > now ||
    !("value" in value)
  ) {
    return null;
  }

  return {
    key: expectedKey,
    schemaVersion: CLIENT_CACHE_SCHEMA_VERSION,
    updatedAt: value.updatedAt,
    value: value.value,
  };
}

export function getClientCacheFreshness(
  updatedAt: number,
  now = Date.now(),
): "fresh" | "stale" | "old" {
  const age = Math.max(0, now - updatedAt);
  if (age <= CLIENT_CACHE_FRESH_FOR_MS) return "fresh";
  if (age <= CLIENT_CACHE_STALE_AFTER_MS) return "stale";
  return "old";
}

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;

  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("현재 브라우저에서 IndexedDB를 사용할 수 없습니다."));
      return;
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => {
        database.close();
        databasePromise = null;
      };
      resolve(database);
    };
    request.onerror = () => {
      reject(request.error ?? new Error("IndexedDB를 열지 못했습니다."));
    };
    request.onblocked = () => {
      reject(new Error("IndexedDB 데이터베이스 업그레이드가 다른 탭에서 대기 중입니다."));
    };
  });
  const pending = opening.catch((error: unknown) => {
    databasePromise = null;
    throw error;
  });
  databasePromise = pending;

  return pending;
}

export async function readClientCacheRecord(key: string): Promise<unknown | null> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => {
      reject(request.error ?? new Error("IndexedDB 캐시를 읽지 못했습니다."));
    };
    transaction.onabort = () => {
      reject(transaction.error ?? new Error("IndexedDB 캐시 읽기가 중단됐습니다."));
    };
  });
}

export async function writeClientCacheRecord(record: ClientCacheRecord): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => {
      reject(transaction.error ?? new Error("IndexedDB 캐시를 저장하지 못했습니다."));
    };
    transaction.onabort = () => {
      reject(transaction.error ?? new Error("IndexedDB 캐시 저장이 중단됐습니다."));
    };
  });
}

export async function requestClientStoragePersistence(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return false;
  if (persistencePromise) return persistencePromise;

  persistencePromise = navigator.storage.persist().catch((error: unknown) => {
    console.error("Failed to request persistent browser storage:", error);
    return false;
  });
  return persistencePromise;
}
