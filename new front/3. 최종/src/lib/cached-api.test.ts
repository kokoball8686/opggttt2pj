import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCachedApi, loadCachedApi } from "@/lib/cached-api";

type Payload = { value: string };

function parsePayload(value: unknown): Payload {
  if (
    typeof value !== "object" ||
    value === null ||
    !("value" in value) ||
    typeof value.value !== "string"
  ) {
    throw new Error("Invalid payload");
  }
  return { value: value.value };
}

const request = {
  key: "cached-api-test",
  url: "/api/test",
  parse: parsePayload,
  errorMessage: "Request failed",
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("cached API requests", () => {
  it("deduplicates concurrent requests and reuses a fresh response", async () => {
    vi.stubGlobal("indexedDB", undefined);
    vi.spyOn(console, "error").mockImplementation(() => {});

    let resolveFetch!: (response: Response) => void;
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const firstRequest = fetchCachedApi(request);
    const secondRequest = fetchCachedApi(request);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch(new Response(JSON.stringify({ value: "saved" }), { status: 200 }));
    const [first, second] = await Promise.all([firstRequest, secondRequest]);

    expect(first.data).toEqual({ value: "saved" });
    expect(second.data).toEqual(first.data);
    await expect(loadCachedApi(request)).resolves.toMatchObject({
      data: { value: "saved" },
      error: null,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps a usable response when browser storage is unavailable", async () => {
    vi.stubGlobal("indexedDB", undefined);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ value: "available" }), { status: 200 })),
    );

    await expect(
      fetchCachedApi({ ...request, key: "storage-fallback-test" }),
    ).resolves.toMatchObject({ data: { value: "available" }, error: null });
  });

  it("serves stale data while revalidating and retains it on a network failure", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-02T00:00:00.000Z"));
    vi.stubGlobal("indexedDB", undefined);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ value: "cached" }), { status: 200 }))
      .mockRejectedValueOnce(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);

    const options = { ...request, key: "stale-network-failure-test" };
    await fetchCachedApi(options);
    vi.setSystemTime(new Date("2026-10-02T00:00:06.000Z"));

    const onCached = vi.fn();
    const result = await loadCachedApi(options, onCached);

    expect(onCached).toHaveBeenCalledWith(
      expect.objectContaining({ data: { value: "cached" }, error: null }),
    );
    expect(result).toMatchObject({
      data: { value: "cached" },
      error: "offline",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps a deduplicated request alive while another consumer still needs it", async () => {
    vi.stubGlobal("indexedDB", undefined);
    vi.spyOn(console, "error").mockImplementation(() => {});
    let resolveFetch!: (response: Response) => void;
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const firstController = new AbortController();
    const secondController = new AbortController();
    const options = { ...request, key: "shared-abort-test" };
    const firstRequest = fetchCachedApi({ ...options, signal: firstController.signal });
    const secondRequest = fetchCachedApi({ ...options, signal: secondController.signal });

    firstController.abort();
    resolveFetch(new Response(JSON.stringify({ value: "still-needed" }), { status: 200 }));

    await expect(firstRequest).rejects.toThrow("aborted");
    await expect(secondRequest).resolves.toMatchObject({
      data: { value: "still-needed" },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
