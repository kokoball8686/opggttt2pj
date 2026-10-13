import { describe, expect, it } from "vitest";
import { parsePlayerRankings } from "@/lib/player-rankings";

function ranking(games = 20) {
  return {
    name: "Alice",
    games,
    wins: 14,
    rate: 70,
    team: { ids: [0, 64], games: 12 },
  };
}

describe("parsePlayerRankings", () => {
  it("accepts a valid bounded ranking list", () => {
    expect(parsePlayerRankings([ranking()])).toEqual([
      {
        name: "Alice",
        games: 20,
        wins: 14,
        rate: 70,
        team: { ids: [0, 64], games: 12 },
      },
    ]);
  });

  it("rejects players below the 20-match minimum", () => {
    expect(() => parsePlayerRankings([ranking(19)])).toThrow(/경기·승리·승률/);
  });

  it("rejects responses over the ten-player cap", () => {
    expect(() => parsePlayerRankings(Array.from({ length: 11 }, () => ranking()))).toThrow(
      /최대 10명/,
    );
  });

  it("rejects invalid win counts and malformed teams", () => {
    expect(() => parsePlayerRankings([{ ...ranking(), wins: 21 }])).toThrow(/경기·승리·승률/);
    expect(() =>
      parsePlayerRankings([{ ...ranking(), team: { ids: [1], games: 3 } }]),
    ).toThrow(/대표 조합/);
  });
});
