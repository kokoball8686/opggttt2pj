import { afterEach, describe, expect, it, vi } from "vitest";
import {
  playerNameSuggestionsRequest,
  prefetchInitialClientData,
  prefetchSelectedProfileStatistics,
  profileStatisticsRequest,
} from "@/lib/client-data-requests";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("initial client data preparation", () => {
  it("starts dashboard, rankings, and the first match page without waiting on each other", async () => {
    vi.stubGlobal("indexedDB", undefined);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const requestedUrls: string[] = [];
    const pendingResponses: Array<(response: Response) => void> = [];
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      requestedUrls.push(String(input));
      return new Promise<Response>((resolve) => pendingResponses.push(resolve));
    });
    vi.stubGlobal("fetch", fetchMock);

    const preparing = prefetchInitialClientData();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(requestedUrls.sort()).toEqual([
      "/api/matches?page=1",
      "/api/statistics/dashboard",
      "/api/statistics/rankings",
    ]);
    expect(pendingResponses).toHaveLength(3);

    for (const resolve of pendingResponses) {
      resolve(new Response(JSON.stringify({ warning: "offline" }), { status: 503 }));
    }
    await preparing;
  });

  it("scopes opponent statistics and suggestions caches to their complete search keys", () => {
    expect(profileStatisticsRequest("Ada", "Bob").key).not.toBe(
      profileStatisticsRequest("Ada", "Cal").key,
    );
    expect(playerNameSuggestionsRequest("Bo", "Ada").key).not.toBe(
      playerNameSuggestionsRequest("Bo", "Bob").key,
    );
  });

  it("prefetches only the selected opponent through the profile statistics API", async () => {
    vi.stubGlobal("indexedDB", undefined);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const requestedUrls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        requestedUrls.push(String(input));
        return Promise.resolve(
          new Response(JSON.stringify({ warning: "offline" }), { status: 503 }),
        );
      }),
    );

    await prefetchSelectedProfileStatistics("Ada", "Bob");

    expect(requestedUrls).toEqual([
      "/api/statistics/profile?name=Ada&opponent=Bob",
    ]);
  });
});
