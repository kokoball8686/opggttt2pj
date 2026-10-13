export type DashboardStatistics = {
  totalMatches: number;
  totalPlayers: number;
  todayMatches: number;
  characters: Array<{ id: number; count: number; rate: number }>;
  combos: Array<{ ids: [number, number]; games: number; wins: number; rate: number }>;
  rising: {
    name: string;
    previous: { games: number; wins: number };
    recent: { games: number; wins: number };
    previousRate: number;
    recentRate: number;
  } | null;
  activity: Array<{ key: string; label: string; count: number }>;
};

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("대시보드 통계 응답 형식이 올바르지 않습니다.");
  }
  return value as Record<string, unknown>;
}

function nonnegativeInteger(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error("대시보드 통계의 정수 값이 올바르지 않습니다.");
  }
  return value;
}

function rate(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error("대시보드 통계의 승률 값이 올바르지 않습니다.");
  }
  return value;
}

function parseRecord(recordValue: unknown) {
  const value = record(recordValue);
  const games = nonnegativeInteger(value.games);
  const wins = nonnegativeInteger(value.wins);
  if (wins > games) throw new Error("대시보드 통계의 승수가 경기 수보다 큽니다.");
  return { games, wins };
}

export function parseDashboardStatistics(value: unknown): DashboardStatistics {
  const payload = record(value);
  const totalMatches = nonnegativeInteger(payload.totalMatches);
  const totalPlayers = nonnegativeInteger(payload.totalPlayers);
  const todayMatches = nonnegativeInteger(payload.todayMatches);
  if (todayMatches > totalMatches) {
    throw new Error("오늘 대전 수가 전체 대전 수보다 큽니다.");
  }

  if (!Array.isArray(payload.characters) || payload.characters.length > 6) {
    throw new Error("대시보드 캐릭터 통계 응답 상한을 초과했습니다.");
  }
  const characters = payload.characters.map((entry) => {
    const item = record(entry);
    const id = nonnegativeInteger(item.id);
    const count = nonnegativeInteger(item.count);
    if (count > totalMatches * 4) {
      throw new Error("캐릭터 픽 횟수가 전체 슬롯 수보다 큽니다.");
    }
    return { id, count, rate: rate(item.rate) };
  });

  if (!Array.isArray(payload.combos) || payload.combos.length > 6) {
    throw new Error("대시보드 조합 통계 응답 상한을 초과했습니다.");
  }
  const combos = payload.combos.map((entry) => {
    const item = record(entry);
    if (!Array.isArray(item.ids) || item.ids.length !== 2) {
      throw new Error("대시보드 조합 캐릭터 값이 올바르지 않습니다.");
    }
    const ids: [number, number] = [
      nonnegativeInteger(item.ids[0]),
      nonnegativeInteger(item.ids[1]),
    ];
    const games = nonnegativeInteger(item.games);
    const wins = nonnegativeInteger(item.wins);
    if (games < 10 || wins > games) {
      throw new Error("대시보드 조합 집계 값이 올바르지 않습니다.");
    }
    return { ids, games, wins, rate: rate(item.rate) };
  });

  let rising: DashboardStatistics["rising"] = null;
  if (payload.rising !== null) {
    const item = record(payload.rising);
    if (typeof item.name !== "string" || !item.name.trim()) {
      throw new Error("급상승 플레이어 이름이 올바르지 않습니다.");
    }
    const previous = parseRecord(item.previous);
    const recent = parseRecord(item.recent);
    if (previous.games < 10 || recent.games < 10) {
      throw new Error("급상승 플레이어의 기간별 경기 수가 부족합니다.");
    }
    const previousRate = rate(item.previousRate);
    const recentRate = rate(item.recentRate);
    if (recentRate <= previousRate) {
      throw new Error("급상승 플레이어의 승률 변화가 올바르지 않습니다.");
    }
    rising = { name: item.name, previous, recent, previousRate, recentRate };
  }

  if (!Array.isArray(payload.activity) || payload.activity.length !== 30) {
    throw new Error("대시보드 활동 통계는 정확히 30일이어야 합니다.");
  }
  const activity = payload.activity.map((entry) => {
    const item = record(entry);
    if (
      typeof item.key !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(item.key) ||
      typeof item.label !== "string" ||
      !item.label
    ) {
      throw new Error("대시보드 활동 날짜 값이 올바르지 않습니다.");
    }
    const count = nonnegativeInteger(item.count);
    if (count > totalMatches) {
      throw new Error("하루 대전 수가 전체 대전 수보다 큽니다.");
    }
    return { key: item.key, label: item.label, count };
  });

  return {
    totalMatches,
    totalPlayers,
    todayMatches,
    characters,
    combos,
    rising,
    activity,
  };
}
