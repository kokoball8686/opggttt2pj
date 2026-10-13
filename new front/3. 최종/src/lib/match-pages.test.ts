import { describe, expect, it } from "vitest";
import { findAddedMatchIds, normalizeMatchPage } from "@/lib/match-pages";

function matchRow(id: string) {
  return {
    id,
    p1_name: "Player 1",
    p2_name: "Player 2",
    winner: "Player 1",
  };
}

describe("normalizeMatchPage", () => {
  it("normalizes the RPC JSON page response and preserves string IDs", () => {
    const result = normalizeMatchPage({
      page: 1,
      page_size: 10,
      total_count: 172,
      matches: [
        {
          id: "515",
          p1_name: "Trakeas",
          p2_name: "Feira_Practice",
          p1_score: 3,
          p2_score: 0,
          winner: "Trakeas",
          start_time: "2026-09-28T04:58:08.235067+00:00",
          end_time: "2026-09-28T05:02:48.392095+00:00",
          created_at: "2026-09-28T05:02:48.059514+00:00",
          p1_main_character_id: 36,
          p1_sub_character_id: 62,
          p2_main_character_id: 80,
          p2_sub_character_id: 72,
          map_id: 45,
        },
      ],
    });

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(10);
    expect(result.totalCount).toBe(172);
    expect(result.matchNumbers.get("515")).toBe(172);
    expect(result.matches[0]).toMatchObject({
      id: "515",
      p1Name: "Trakeas",
      p2Name: "Feira_Practice",
      p1Characters: [36, 62],
      mapId: 45,
    });
  });

  it("does not silently discard malformed rows", () => {
    expect(() =>
      normalizeMatchPage({
        page: 1,
        page_size: 10,
        total_count: 1,
        matches: [{ id: "1", p1_name: "", p2_name: "Bob" }],
      }),
    ).toThrow("변환할 수 없습니다");
  });

  it("rejects a response without a valid total count", () => {
    expect(() =>
      normalizeMatchPage({ page: 1, page_size: 10, total_count: "172", matches: [] }),
    ).toThrow("total_count");
  });

  it("requires chronology numbers when the page is ordered by result", () => {
    expect(() =>
      normalizeMatchPage(
        {
          page: 1,
          page_size: 10,
          total_count: 1,
          matches: [
            {
              id: "515",
              match_number: 172,
              p1_name: "Trakeas",
              p2_name: "Feira_Practice",
              winner: "Trakeas",
            },
          ],
        },
        true,
      ),
    ).not.toThrow();
  });
});

describe("findAddedMatchIds", () => {
  it("returns only IDs added between cached and refreshed pages", () => {
    const previousPage = normalizeMatchPage({
      page: 1,
      page_size: 10,
      total_count: 2,
      matches: [matchRow("old-2"), matchRow("old-1")],
    });
    const currentPage = normalizeMatchPage({
      page: 1,
      page_size: 10,
      total_count: 3,
      matches: [matchRow("new-3"), matchRow("old-2"), matchRow("old-1")],
    });

    expect(findAddedMatchIds(previousPage, currentPage)).toEqual(["new-3"]);
  });

  it("does not flag the initial page load", () => {
    const page = normalizeMatchPage({
      page: 1,
      page_size: 10,
      total_count: 1,
      matches: [matchRow("initial")],
    });

    expect(findAddedMatchIds(null, page)).toEqual([]);
  });

  it("returns no IDs when the refreshed page contains no new matches", () => {
    const page = normalizeMatchPage({
      page: 1,
      page_size: 10,
      total_count: 2,
      matches: [matchRow("existing-2"), matchRow("existing-1")],
    });

    expect(findAddedMatchIds(page, page)).toEqual([]);
  });
});
