import {
  Match,
  isWinner,
  normalizeTeamOrder,
  playerNames,
} from "@/lib/matches";

export function todayMatchCount(matches: Match[], now: number) {
  const koreaOffset = 9 * 60 * 60 * 1000;
  const koreaTodayStart = new Date(now + koreaOffset);
  koreaTodayStart.setUTCHours(0, 0, 0, 0);
  const cutoff = koreaTodayStart.getTime() - koreaOffset;
  return matches.filter((match) => {
    const playedAt = Date.parse(match.playedAt);
    return Number.isFinite(playedAt) && playedAt >= cutoff && playedAt <= now;
  }).length;
}

export function topTenPlayers(matches: Match[]) {
  const byName = new Map<
    string,
    { games: number; wins: number; teams: Map<string, { ids: [number, number]; games: number }> }
  >();

  matches.forEach((match) => {
    [
      { name: match.p1Name, ids: match.p1Characters },
      { name: match.p2Name, ids: match.p2Characters },
    ].forEach(({ name, ids }) => {
      const item =
        byName.get(name) ?? {
          games: 0,
          wins: 0,
          teams: new Map<string, { ids: [number, number]; games: number }>(),
        };
      item.games += 1;
      if (isWinner(match, name)) item.wins += 1;
      const normalizedIds = normalizeTeamOrder(ids);
      const key = normalizedIds.join("/");
      const team = item.teams.get(key) ?? { ids: normalizedIds, games: 0 };
      team.games += 1;
      item.teams.set(key, team);
      byName.set(name, item);
    });
  });

  return [...byName.entries()]
    .map(([name, value]) => ({
      name,
      games: value.games,
      wins: value.wins,
      rate: (value.wins / value.games) * 100,
      team: [...value.teams.values()].sort((a, b) => b.games - a.games)[0],
    }))
    .filter((item) => item.games >= 20)
    .sort((a, b) => b.rate - a.rate || b.games - a.games)
    .slice(0, 10);
}

export function topCharacters(matches: Match[], limit = 6) {
  const counts = new Map<number, number>();
  matches.forEach((match) => {
    [...match.p1Characters, ...match.p2Characters].forEach((id) => {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    });
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, count]) => ({
      id,
      count,
      rate: matches.length ? (count / (matches.length * 4)) * 100 : 0,
    }));
}

export function topCombos(matches: Match[], limit = 6) {
  const combos = new Map<string, { ids: [number, number]; games: number; wins: number }>();
  matches.forEach((match) => {
    [
      { name: match.p1Name, ids: match.p1Characters },
      { name: match.p2Name, ids: match.p2Characters },
    ].forEach((team) => {
      const ids = normalizeTeamOrder(team.ids);
      const key = ids.join("/");
      const combo = combos.get(key) ?? { ids, games: 0, wins: 0 };
      combo.games += 1;
      if (isWinner(match, team.name)) combo.wins += 1;
      combos.set(key, combo);
    });
  });

  return [...combos.values()]
    .filter((combo) => combo.games >= 10)
    .map((combo) => ({ ...combo, rate: (combo.wins / combo.games) * 100 }))
    .sort((a, b) => b.rate - a.rate || b.games - a.games)
    .slice(0, limit);
}

export function activityDays(matches: Match[], now: number) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - 29 + index);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return { date, key, label: `${date.getMonth() + 1}/${date.getDate()}`, count: 0 };
  });
  const byDay = new Map(days.map((day) => [day.key, day]));

  matches.forEach((match) => {
    const playedAt = new Date(match.playedAt);
    if (Number.isNaN(playedAt.getTime())) return;
    const key = `${playedAt.getFullYear()}-${String(playedAt.getMonth() + 1).padStart(2, "0")}-${String(playedAt.getDate()).padStart(2, "0")}`;
    const day = byDay.get(key);
    if (day) day.count += 1;
  });

  return days;
}

export function risingPlayer(matches: Match[], now: number) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const recentStart = new Date(today);
  recentStart.setDate(today.getDate() - 6);
  const previousStart = new Date(today);
  previousStart.setDate(today.getDate() - 13);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const periods = new Map<
    string,
    { name: string; previous: { games: number; wins: number }; recent: { games: number; wins: number } }
  >();

  matches.forEach((match) => {
    const playedAt = new Date(match.playedAt);
    if (Number.isNaN(playedAt.getTime()) || playedAt < previousStart || playedAt >= tomorrow) return;
    const period = playedAt >= recentStart ? "recent" : "previous";
    [match.p1Name, match.p2Name].forEach((name) => {
      const key = name.toLowerCase();
      const player =
        periods.get(key) ?? {
          name,
          previous: { games: 0, wins: 0 },
          recent: { games: 0, wins: 0 },
        };
      player[period].games += 1;
      if (isWinner(match, name)) player[period].wins += 1;
      periods.set(key, player);
    });
  });

  const ranked = [...periods.values()]
    .filter((player) => player.previous.games >= 10 && player.recent.games >= 10)
    .map((player) => ({
      ...player,
      previousRate: (player.previous.wins / player.previous.games) * 100,
      recentRate: (player.recent.wins / player.recent.games) * 100,
    }))
    .sort(
      (a, b) =>
        b.recentRate - b.previousRate - (a.recentRate - a.previousRate) ||
        b.recent.games - a.recent.games,
    );

  const top = ranked[0] ?? null;
  if (!top || top.recentRate <= top.previousRate) return null;
  return top;
}

export function profileTeams(matches: Match[], profile: string, limit = 5) {
  const teams = new Map<string, { ids: [number, number]; games: number; wins: number }>();
  matches.forEach((match) => {
    const isP1 = match.p1Name.toLowerCase() === profile.toLowerCase();
    const ids = isP1 ? match.p1Characters : match.p2Characters;
    const normalizedIds = normalizeTeamOrder(ids);
    const key = normalizedIds.join("/");
    const team = teams.get(key) ?? { ids: normalizedIds, games: 0, wins: 0 };
    team.games += 1;
    if (isWinner(match, profile)) team.wins += 1;
    teams.set(key, team);
  });
  return [...teams.values()]
    .map((team) => ({ ...team, rate: team.games ? (team.wins / team.games) * 100 : 0 }))
    .sort((a, b) => b.games - a.games)
    .slice(0, limit);
}

export function profileMaps(matches: Match[], profile: string) {
  const maps = new Map<number, { games: number; wins: number }>();
  matches.forEach((match) => {
    if (match.mapId === null) return;
    const map = maps.get(match.mapId) ?? { games: 0, wins: 0 };
    map.games += 1;
    if (isWinner(match, profile)) map.wins += 1;
    maps.set(match.mapId, map);
  });
  return [...maps.entries()]
    .map(([id, stats]) => ({
      id,
      ...stats,
      rate: (stats.wins / stats.games) * 100,
    }))
    .sort((a, b) => b.games - a.games || a.id - b.id);
}

export function recentRivals(matches: Match[], profile: string, limit = 5) {
  const rivals = new Map<string, { name: string; games: number; wins: number; latest: number }>();
  matches.forEach((match) => {
    const opponentName =
      match.p1Name.toLowerCase() === profile.toLowerCase() ? match.p2Name : match.p1Name;
    const key = opponentName.toLowerCase();
    const rival = rivals.get(key) ?? { name: opponentName, games: 0, wins: 0, latest: 0 };
    rival.games += 1;
    if (isWinner(match, profile)) rival.wins += 1;
    rival.latest = Math.max(rival.latest, Date.parse(match.endAt ?? match.playedAt) || 0);
    rivals.set(key, rival);
  });
  return [...rivals.values()].sort((a, b) => b.latest - a.latest).slice(0, limit);
}

export function matchNumbers(matches: Match[]) {
  const chronological = [...matches].sort(
    (a, b) => Date.parse(a.createdAt ?? a.playedAt) - Date.parse(b.createdAt ?? b.playedAt),
  );
  return new Map(chronological.map((match, index) => [match.id, index + 1]));
}

export function searchSuggestions(names: string[], query: string, limit = 6) {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];
  return names.filter((name) => name.toLowerCase().startsWith(trimmed)).slice(0, limit);
}

export function dashboardSummary(matches: Match[], now: number) {
  return {
    totalMatches: matches.length,
    totalPlayers: playerNames(matches).length,
    todayMatches: todayMatchCount(matches, now),
    characters: topCharacters(matches),
    combos: topCombos(matches),
    rising: risingPlayer(matches, now),
    activity: activityDays(matches, now),
  };
}
