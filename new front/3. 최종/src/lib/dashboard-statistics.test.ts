import { describe, expect, it } from "vitest";
import { parseDashboardStatistics } from "@/lib/dashboard-statistics";

function payload() {
  return {
    totalMatches: 20,
    totalPlayers: 3,
    todayMatches: 0,
    characters: [{ id: 0, count: 20, rate: 25 }],
    combos: [{ ids: [0, 64], games: 10, wins: 7, rate: 70 }],
    rising: null,
    activity: Array.from({ length: 30 }, (_, index) => ({
      key: `2026-09-${String(index + 1).padStart(2, "0")}`,
      label: `9/${index + 1}`,
      count: index === 0 ? 20 : 0,
    })),
  };
}

describe("parseDashboardStatistics", () => {
  it("accepts the bounded dashboard response", () => {
    expect(parseDashboardStatistics(payload())).toMatchObject({
      totalMatches: 20,
      totalPlayers: 3,
      todayMatches: 0,
      characters: [{ id: 0, count: 20, rate: 25 }],
      combos: [{ ids: [0, 64], games: 10, wins: 7, rate: 70 }],
      activity: expect.arrayContaining([{ key: "2026-09-01", label: "9/1", count: 20 }]),
    });
  });

  it("rejects responses that exceed the character cap", () => {
    const value = payload();
    value.characters = Array.from({ length: 7 }, (_, id) => ({ id, count: 1, rate: 1 }));
    expect(() => parseDashboardStatistics(value)).toThrow(/상한/);
  });

  it("rejects incomplete activity windows", () => {
    const value = payload();
    value.activity.pop();
    expect(() => parseDashboardStatistics(value)).toThrow(/30일/);
  });

  it("rejects invalid win totals", () => {
    const value = payload();
    value.combos[0].wins = 11;
    expect(() => parseDashboardStatistics(value)).toThrow(/집계 값/);
  });
});
