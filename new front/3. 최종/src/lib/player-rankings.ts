export type PlayerRanking = {
  name: string;
  games: number;
  wins: number;
  rate: number;
  team: {
    ids: [number, number];
    games: number;
  };
};

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("플레이어 순위 응답 형식이 올바르지 않습니다.");
  }
  return value as Record<string, unknown>;
}

function nonnegativeInteger(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error("플레이어 순위의 정수 값이 올바르지 않습니다.");
  }
  return value;
}

export function parsePlayerRankings(value: unknown): PlayerRanking[] {
  if (!Array.isArray(value) || value.length > 10) {
    throw new Error("플레이어 순위는 최대 10명이어야 합니다.");
  }

  return value.map((entry) => {
    const item = record(entry);
    if (typeof item.name !== "string" || !item.name.trim()) {
      throw new Error("플레이어 순위의 이름이 올바르지 않습니다.");
    }
    const games = nonnegativeInteger(item.games);
    const wins = nonnegativeInteger(item.wins);
    const rate = item.rate;
    if (
      games < 20 ||
      wins > games ||
      typeof rate !== "number" ||
      !Number.isFinite(rate) ||
      rate < 0 ||
      rate > 100
    ) {
      throw new Error("플레이어 순위의 경기·승리·승률 값이 올바르지 않습니다.");
    }

    const team = record(item.team);
    if (!Array.isArray(team.ids) || team.ids.length !== 2) {
      throw new Error("플레이어 대표 조합의 캐릭터 값이 올바르지 않습니다.");
    }
    const ids: [number, number] = [
      nonnegativeInteger(team.ids[0]),
      nonnegativeInteger(team.ids[1]),
    ];
    const teamGames = nonnegativeInteger(team.games);
    if (teamGames < 1 || teamGames > games) {
      throw new Error("플레이어 대표 조합의 경기 수가 올바르지 않습니다.");
    }

    return { name: item.name, games, wins, rate, team: { ids, games: teamGames } };
  });
}
