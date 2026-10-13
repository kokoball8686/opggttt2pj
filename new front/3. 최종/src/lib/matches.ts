export type Match = {
  id: string;
  p1Name: string;
  p2Name: string;
  winner: string;
  p1Score: number;
  p2Score: number;
  p1Characters: [number, number];
  p2Characters: [number, number];
  mapId: number | null;
  playedAt: string;
  startAt: string | null;
  endAt: string | null;
  createdAt: string | null;
};

export function normalizeMatch(row: Record<string, unknown>, index: number): Match | null {
  const p1Name = String(row.p1_name ?? row.player1 ?? row.player_1 ?? "").trim();
  const p2Name = String(row.p2_name ?? row.player2 ?? row.player_2 ?? "").trim();
  if (!p1Name || !p2Name) return null;

  const winner = String(row.winner ?? row.winner_name ?? "").trim();
  const asNumber = (value: unknown, fallback: number) =>
    Number.isFinite(Number(value)) ? Number(value) : fallback;
  const asTimestamp = (value: unknown) =>
    typeof value === "string" && value.length ? value : null;

  const startAt = asTimestamp(row.start_time);
  const endAt = asTimestamp(row.end_time);
  const createdAt = asTimestamp(row.created_at);
  const playedAt = endAt ?? createdAt ?? asTimestamp(row.played_at) ?? "";
  const mapValue = row.map_id ?? row.stage_id;
  const mapId =
    mapValue === null || mapValue === undefined || mapValue === ""
      ? null
      : asNumber(mapValue, -1);

  return {
    id: String(row.id ?? row.match_id ?? `remote-${index}`),
    p1Name,
    p2Name,
    winner,
    p1Score: asNumber(row.p1_score ?? row.player1_score, 0),
    p2Score: asNumber(row.p2_score ?? row.player2_score, 0),
    p1Characters: [
      asNumber(row.p1_main_character_id, 0),
      asNumber(row.p1_sub_character_id, 0),
    ],
    p2Characters: [
      asNumber(row.p2_main_character_id, 0),
      asNumber(row.p2_sub_character_id, 0),
    ],
    mapId: mapId === -1 ? null : mapId,
    playedAt,
    startAt,
    endAt,
    createdAt,
  };
}

export function playerNames(matches: Match[]) {
  return [...new Set(matches.flatMap((match) => [match.p1Name, match.p2Name]))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export function isWinner(match: Match, name: string) {
  return match.winner.toLowerCase() === name.toLowerCase();
}

/** Same-character tags collapse to one portrait. */
export function uniqueCharacterIds(ids: [number, number]): number[] {
  return ids[0] === ids[1] ? [ids[0]] : [...ids];
}

export function normalizeTeamOrder(ids: [number, number]): [number, number] {
  return ids[0] <= ids[1] ? ids : [ids[1], ids[0]];
}

export const characterNames: Record<number, string> = {
  88: "언노운",
  112: "닥터",
  92: "슬림 밥",
  108: "방패 오거",
  90: "쿠니미츠",
  94: "포레스트 로우",
  104: "피잭",
  116: "타이거",
  106: "알렉스",
  100: "엔젤",
  102: "미셸",
  114: "세바스찬",
  96: "미하루",
  110: "바이올렛",
  42: "로저",
  58: "레이븐",
  52: "브루스",
  34: "스티브",
  0: "폴",
  68: "밥",
  10: "니나",
  46: "왕 진레이",
  50: "아스카",
  30: "카즈야",
  84: "준",
  28: "헤이하치",
  20: "진",
  56: "데빌진",
  6: "킹",
  36: "머덕",
  74: "레오",
  12: "화랑",
  18: "에디",
  32: "리",
  4: "레이",
  24: "쿠마",
  38: "모쿠진",
  8: "요시미츠",
  40: "잭",
  26: "브라이언",
  2: "로우",
  72: "미겔",
  44: "안나",
  14: "샤오유",
  64: "리리",
  76: "라스",
  82: "트루오거",
  80: "진파치",
  78: "알리사",
  22: "제이씨",
  62: "아머킹",
  48: "간류",
  70: "자피나",
  54: "백두산",
  16: "크리스티",
  66: "드라구노프",
  60: "펭",
  86: "팬더",
};

export const mapNames: Record<number, string> = {
  0: "Arena",
  1: "Festive Parade",
  2: "Eternal Paradise",
  3: "Historic Town Square",
  4: "Condor Canyon",
  5: "Arctic Dream",
  6: "Dusk after the Rain",
  7: "Bountiful Sea",
  8: "Moonlit Wilderness",
  9: "Wayang Kulit",
  10: "Fontana di Trevi",
  11: "Sakura Schoolyard",
  12: "Tempest",
  13: "Winter Palace",
  14: "Hall of Judgement",
  15: "Naraku",
  16: "Heavenly Garden",
  17: "Fallen Garden",
  25: "Strategic Space",
  40: "Fireworks Over Barcelona",
  41: "Coastline Sunset",
  42: "Riverside Promenade",
  43: "Tropical Rainforest",
  44: "Moai Excavation",
  45: "Extravagant Underground",
  46: "Tulip Festival",
  47: "Modern Oasis",
  48: "Snoop Dogg",
  50: "Odeum of Illusions",
};

export function characterLabel(id: number) {
  return characterNames[id] ?? "알 수 없는 캐릭터";
}

export function mapLabel(id: number | null) {
  if (id === null) return "Map unavailable";
  return mapNames[id] ?? `Unknown Map (${id})`;
}
