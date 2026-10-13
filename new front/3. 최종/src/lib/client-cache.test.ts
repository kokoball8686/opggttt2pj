import { describe, expect, it } from "vitest";
import {
  CLIENT_CACHE_FRESH_FOR_MS,
  CLIENT_CACHE_SCHEMA_VERSION,
  CLIENT_CACHE_STALE_AFTER_MS,
  getClientCacheFreshness,
  parseClientCacheRecord,
} from "@/lib/client-cache";

describe("client cache records", () => {
  it("accepts a record only for the expected key and current schema", () => {
    const record = {
      key: "dashboard",
      schemaVersion: CLIENT_CACHE_SCHEMA_VERSION,
      updatedAt: 1_000,
      value: { totalMatches: 42 },
    };

    expect(parseClientCacheRecord(record, "dashboard", 2_000)).toEqual(record);
    expect(parseClientCacheRecord(record, "rankings", 2_000)).toBeNull();
    expect(
      parseClientCacheRecord({ ...record, schemaVersion: CLIENT_CACHE_SCHEMA_VERSION + 1 }, "dashboard", 2_000),
    ).toBeNull();
  });

  it("rejects invalid and future timestamps", () => {
    const record = {
      key: "dashboard",
      schemaVersion: CLIENT_CACHE_SCHEMA_VERSION,
      updatedAt: 1_000,
      value: {},
    };

    expect(parseClientCacheRecord({ ...record, updatedAt: -1 }, "dashboard", 2_000)).toBeNull();
    expect(parseClientCacheRecord({ ...record, updatedAt: 2_001 }, "dashboard", 2_000)).toBeNull();
  });

  it("distinguishes fresh, stale, and old data without treating age as deletion", () => {
    const now = 1_000_000;

    expect(getClientCacheFreshness(now - CLIENT_CACHE_FRESH_FOR_MS, now)).toBe("fresh");
    expect(getClientCacheFreshness(now - CLIENT_CACHE_FRESH_FOR_MS - 1, now)).toBe("stale");
    expect(getClientCacheFreshness(now - CLIENT_CACHE_STALE_AFTER_MS, now)).toBe("stale");
    expect(getClientCacheFreshness(now - CLIENT_CACHE_STALE_AFTER_MS - 1, now)).toBe("old");
  });
});
