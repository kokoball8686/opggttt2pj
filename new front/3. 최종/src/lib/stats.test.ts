import { describe, expect, it } from "vitest";
import type { Match } from "@/lib/matches";
import { normalizeMatch, uniqueCharacterIds } from "@/lib/matches";
import {
  profileMaps,
  searchSuggestions,
  todayMatchCount,
  topCombos,
  topTenPlayers,
} from "@/lib/stats";

function match(partial: Partial<Match> & Pick<Match, "id" | "p1Name" | "p2Name" | "winner">): Match {
  return {
    p1Score: 3,
    p2Score: 1,
    p1Characters: [0, 64],
    p2Characters: [20, 30],
    mapId: 0,
    playedAt: "2026-09-01T00:00:00.000Z",
    startAt: "2026-09-01T00:00:00.000Z",
    endAt: "2026-09-01T00:05:00.000Z",
    createdAt: "2026-09-01T00:05:00.000Z",
    ...partial,
  };
}

describe("normalizeMatch", () => {
  it("normalizes supabase rows", () => {
    const result = normalizeMatch(
      {
        id: 1,
        p1_name: "Alice",
        p2_name: "Bob",
        winner: "Alice",
        p1_score: 3,
        p2_score: 0,
        p1_main_character_id: 0,
        p1_sub_character_id: 0,
        p2_main_character_id: 20,
        p2_sub_character_id: 30,
        map_id: 0,
        start_time: "2026-09-01T00:00:00.000Z",
        end_time: "2026-09-01T00:05:00.000Z",
        created_at: "2026-09-01T00:05:00.000Z",
      },
      0,
    );
    expect(result?.p1Name).toBe("Alice");
    expect(result?.mapId).toBe(0);
    expect(result?.p1Characters).toEqual([0, 0]);
  });
});

describe("uniqueCharacterIds", () => {
  it("collapses solo tags", () => {
    expect(uniqueCharacterIds([64, 64])).toEqual([64]);
    expect(uniqueCharacterIds([0, 64])).toEqual([0, 64]);
  });
});

describe("todayMatchCount", () => {
  it("counts matches from KST midnight through now, excluding earlier and future matches", () => {
    const now = Date.parse("2026-10-03T02:00:00.000Z");
    const matches = [
      match({ id: "before-midnight", p1Name: "A", p2Name: "B", winner: "A", playedAt: "2026-10-02T14:59:59.999Z" }),
      match({ id: "at-midnight", p1Name: "A", p2Name: "B", winner: "A", playedAt: "2026-10-02T15:00:00.000Z" }),
      match({ id: "at-now", p1Name: "A", p2Name: "B", winner: "A", playedAt: "2026-10-03T02:00:00.000Z" }),
      match({ id: "future", p1Name: "A", p2Name: "B", winner: "A", playedAt: "2026-10-03T02:00:00.001Z" }),
    ];

    expect(todayMatchCount(matches, now)).toBe(2);
  });
});

describe("searchSuggestions", () => {
  it("uses startsWith", () => {
    expect(searchSuggestions(["legbreaker76", "alice", "legacy"], "le")).toEqual([
      "legbreaker76",
      "legacy",
    ]);
  });
});

describe("topTenPlayers", () => {
  it("requires at least 20 games", () => {
    const matches = Array.from({ length: 19 }, (_, index) =>
      match({
        id: String(index),
        p1Name: "Alice",
        p2Name: "Bob",
        winner: "Alice",
      }),
    );
    expect(topTenPlayers(matches)).toHaveLength(0);
  });
});

describe("topCombos", () => {
  it("requires at least 10 games", () => {
    const matches = Array.from({ length: 9 }, (_, index) =>
      match({
        id: String(index),
        p1Name: "Alice",
        p2Name: "Bob",
        winner: "Alice",
        p1Characters: [0, 64],
      }),
    );
    expect(topCombos(matches)).toHaveLength(0);
  });
});

describe("profileMaps", () => {
  it("returns all played maps ordered by match count", () => {
    const matches = [
      match({ id: "1", p1Name: "Alice", p2Name: "Bob", winner: "Alice", mapId: 4 }),
      match({ id: "2", p1Name: "Alice", p2Name: "Bob", winner: "Bob", mapId: 4 }),
      match({ id: "3", p1Name: "Alice", p2Name: "Bob", winner: "Alice", mapId: 1 }),
      match({ id: "4", p1Name: "Alice", p2Name: "Bob", winner: "Bob", mapId: 2 }),
      match({ id: "5", p1Name: "Alice", p2Name: "Bob", winner: "Alice", mapId: null }),
    ];

    expect(profileMaps(matches, "Alice")).toEqual([
      { id: 4, games: 2, wins: 1, rate: 50 },
      { id: 1, games: 1, wins: 1, rate: 100 },
      { id: 2, games: 1, wins: 0, rate: 0 },
    ]);
  });
});
