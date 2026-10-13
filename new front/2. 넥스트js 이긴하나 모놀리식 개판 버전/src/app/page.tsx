"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { characterNames, isWinner, mapNames, Match, playerNames } from "@/lib/matches";
import PwaControls from "./PwaControls";

const releaseUrl = "https://github.com/opggttt2pj/TAG2.GG-Tracker/releases/latest/download/TAG2GGTracker.zip";
const characterBarColors = ["#35a7ff", "#ff594f", "#b15cff", "#00c9a7", "#ffad24", "#ff3f8e"];
const normalizeTeam = (ids: [number, number]): [number, number] => ids[0] <= ids[1] ? ids : [ids[1], ids[0]];
const winRateGradient = (rate: number) => `conic-gradient(from -90deg, #65e4ff 0%, #528dff ${rate * 0.34}%, #a56bff ${rate * 0.68}%, #fa83c0 ${rate}%, #29384d ${rate}%, #29384d 100%)`;
const formatDate = (value: string) => { const date = new Date(value); return Number.isNaN(date.getTime()) ? "시간 없음" : date.toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" }); };
const formatDuration = (start: string | null, end: string | null) => {
  if (!start || !end) return "시간 없음";
  const seconds = Math.floor((Date.parse(end) - Date.parse(start)) / 1000);
  if (!Number.isFinite(seconds) || seconds < 0) return "시간 없음";
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours}시간 ${minutes % 60}분` : minutes ? `${minutes}분 ${seconds % 60}초` : `${seconds}초`;
};
const formatSeconds = (seconds: number) => {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours}시간 ${minutes % 60}분` : minutes ? `${minutes}분 ${total % 60}초` : `${total}초`;
};
const profileMatches = (matches: Match[], name: string) => matches.filter((match) => match.p1Name.toLowerCase() === name.toLowerCase() || match.p2Name.toLowerCase() === name.toLowerCase());

function CharacterImage({ id, width, height, sizes = `${width}px` }: { id: number; width: number; height: number; sizes?: string }) {
  return <Image
    src={`/characters/${id}.webp`}
    alt=""
    width={width}
    height={height}
    sizes={sizes}
    onError={() => console.error(`Failed to load character image ${id}.webp`)}
  />;
}

function MapImage({ id, width, height, sizes, className }: { id: number; width: number; height: number; sizes: string; className: string }) {
  const [failed, setFailed] = useState(false);
  const name = mapNames[id];
  if (!name || failed) return <span className={`${className} map-image-fallback`} aria-hidden="true">?</span>;
  const src = `/maps/${id}.webp`;
  return <Image
    src={src}
    alt=""
    width={width}
    height={height}
    sizes={sizes}
    className={className}
    onError={() => {
      setFailed(true);
      console.error(`Failed to load map image ${src}`);
    }}
  />;
}

function MapPreviewModal({ id, onClose }: { id: number; onClose: () => void }) {
  const name = mapNames[id];
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  if (!name) return null;
  return <div className="map-preview-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="map-preview-dialog" role="dialog" aria-modal="true" aria-label={`${name} 맵 미리보기`}>
      <button className="map-preview-close" type="button" aria-label="맵 미리보기 닫기" onClick={onClose}>×</button>
      <Image src={`/maps/${id}.webp`} alt={`${name} 맵`} width={640} height={360} sizes="(max-width: 800px) 92vw, 640px" />
      <h2>{name}</h2>
    </section>
  </div>;
}

function getPaginationItems(currentPage: number, pageCount: number): Array<number | "ellipsis"> {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);
  const pages = new Set([1, 2, 3, pageCount - 2, pageCount - 1, pageCount]);
  if (currentPage > 3 && currentPage < pageCount - 2) {
    [currentPage - 1, currentPage, currentPage + 1].forEach((number) => pages.add(number));
  }
  const sortedPages = [...pages].sort((a, b) => a - b);
  const items: Array<number | "ellipsis"> = [];
  sortedPages.forEach((number, index) => {
    const previous = sortedPages[index - 1];
    if (previous !== undefined && number - previous > 2) items.push("ellipsis");
    else if (previous !== undefined && number - previous === 2) items.push(previous + 1);
    items.push(number);
  });
  return items;
}

function Pagination({ currentPage, pageCount, onPageChange, label }: { currentPage: number; pageCount: number; onPageChange: (page: number) => void; label: string }) {
  return <nav className="pagination" aria-label={label}>
    <button className="pagination-arrow" aria-label="이전 페이지" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>‹</button>
    <div className="pagination-pages">{getPaginationItems(currentPage, pageCount).map((item, index) => typeof item === "number"
      ? <button className="pagination-page" aria-current={item === currentPage ? "page" : undefined} key={item} onClick={() => onPageChange(item)}>{item}</button>
      : <span className="pagination-ellipsis" aria-hidden="true" key={`ellipsis-${index}`}>…</span>)}</div>
    <button className="pagination-arrow" aria-label="다음 페이지" disabled={currentPage >= pageCount} onClick={() => onPageChange(currentPage + 1)}>›</button>
  </nav>;
}

function MatchList({ matches, matchNumbers, onMapClick }: { matches: Match[]; profile?: string; matchNumbers?: Map<string, number>; onMapClick: (id: number) => void }) {
  return <div className="match-list">{matches.length ? matches.map((match) => {
    const p1Won = isWinner(match, match.p1Name);
    const p2Won = isWinner(match, match.p2Name);
    const sides = [
      { name: match.p1Name, ids: match.p1Characters, seat: "1P", score: match.p1Score, won: p1Won },
      { name: match.p2Name, ids: match.p2Characters, seat: "2P", score: match.p2Score, won: p2Won },
    ];
    const hasKnownWinner = sides.some((side) => side.won);
    const renderSide = (side: typeof sides[number]) => (
      <div className={`match-side ${side.won ? "is-winner" : ""}`} key={side.seat}>
        <div className="match-player-heading">
          <span className="player-seat">{side.seat}</span>
          <a href={`#profile/${encodeURIComponent(side.name)}`}>{side.name}</a>
          <span className={`match-result ${side.won ? "is-winner" : hasKnownWinner ? "is-loser" : "is-unknown"}`}>
            <svg viewBox="0 0 24 24" aria-hidden="true">{side.won ? <path d="m5 12 4.5 4.5L19 7" /> : hasKnownWinner ? <path d="m7 7 10 10M17 7 7 17" /> : <><circle cx="12" cy="12" r="8" /><path d="M12 8v5m0 3h.01" /></>}</svg>
            {side.won ? "승리" : hasKnownWinner ? "패배" : "결과 미상"}
          </span>
        </div>
        <div className="match-team">
          {side.ids.map((id, index) => (
            <span className="match-character" key={`${side.name}-${id}-${index}`}>
              <CharacterImage id={id} width={100} height={100} sizes="(max-width: 380px) 68px, (max-width: 1100px) 80px, 100px" />
              <small>{characterNames[id] ?? "알 수 없는 캐릭터"}</small>
            </span>
          ))}
        </div>
      </div>
    );
    return <div className="match-row" key={match.id}>
      <small className="match-number">{matchNumbers ? `#${matchNumbers.get(match.id) ?? "-"}` : ""}</small>
      <div className="match-sides">
        {renderSide(sides[0])}
        <strong className="match-score" aria-label={`1P ${sides[0].score}점 대 2P ${sides[1].score}점`}>
          <span>{sides[0].score}</span><small>VS</small><span>{sides[1].score}</span>
        </strong>
        {renderSide(sides[1])}
      </div>
      <span className="match-map">{match.mapId === null ? <><span className="map-thumbnail unknown">?</span><span className="map-title"><strong>Map unavailable</strong></span></> : <button type="button" className="map-preview-trigger match-map-trigger" onClick={() => { if (match.mapId !== null) onMapClick(match.mapId); }} aria-label={`${mapNames[match.mapId] ?? `Unknown Map (${match.mapId})`} 맵 크게 보기`}><MapImage id={match.mapId} width={640} height={360} sizes="208px" className="map-thumbnail-image" /><span className="map-title"><strong>{mapNames[match.mapId] ?? `Unknown Map (${match.mapId})`}</strong></span></button>}</span>
      <time><strong>{formatDuration(match.startAt, match.endAt)}</strong><span>시작 {match.startAt ? formatDate(match.startAt) : "시간 없음"}</span><span>종료 {formatDate(match.endAt ?? match.playedAt)}</span></time>
    </div>;
  }) : <p className="muted empty-state">표시할 대전 기록이 없습니다.</p>}</div>;
}

function MenuIcon({ name }: { name: "home" | "players" | "matches" | "download" }) {
  const paths = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9" /><path d="M9 20v-6h6v6" /></>,
    players: <><circle cx="9" cy="8" r="4" /><path d="M2 20a7 7 0 0 1 14 0" /><path d="M17 4a4 4 0 0 1 0 8" /><path d="M18 14a6 6 0 0 1 4 6" /></>,
    matches: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
    download: <><path d="M12 3v12" /><path d="m7 11 5 5 5-5" /><path d="M4 20h16" /></>,
  };
  return <svg className="menu-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function PageIcon({ section }: { section: string }) {
  const icon = section === "home" ? "home" : section === "players" ? "players" : section === "matches" ? "matches" : section === "download" ? "download" : "players";
  return <MenuIcon name={icon} />;
}

export default function Home() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(0);
  const [hash, setHash] = useState("home");
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [opponent, setOpponent] = useState("");
  const [opponentSuggestionsOpen, setOpponentSuggestionsOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [profilePage, setProfilePage] = useState(1);
  const [profileSort, setProfileSort] = useState<"time" | "wins" | "losses">("time");
  const [hoveredActivityKey, setHoveredActivityKey] = useState<string | null>(null);
  const [selectedActivityKey, setSelectedActivityKey] = useState<string | null>(null);
  const [selectedMapId, setSelectedMapId] = useState<number | null>(null);

  const loadMatches = useCallback(async (signal?: AbortSignal, isActive: () => boolean = () => true) => {
    setLoading(true);
    try {
      const response = await fetch("/api/matches", { signal });
      const data = await response.json() as { matches?: Match[]; warning?: string };
      if (!response.ok) throw new Error(data.warning ?? "경기 데이터를 불러오지 못했습니다.");
      if (!Array.isArray(data.matches)) throw new Error("경기 데이터 응답 형식이 올바르지 않습니다.");
      if (data.warning) throw new Error(data.warning);
      if (isActive()) setMatches(data.matches);
    } catch (loadError: unknown) {
      if (!(loadError instanceof DOMException && loadError.name === "AbortError") && isActive()) {
        console.error("Failed to load match data:", loadError);
      }
    } finally {
      if (isActive()) setLoading(false);
    }
  }, []);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    const start = window.setTimeout(() => {
      void loadMatches(controller.signal, () => active).finally(() => window.clearTimeout(timeout));
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(start);
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [loadMatches]);
  useEffect(() => { const updateTime = () => setNow(Date.now()); updateTime(); const interval = window.setInterval(updateTime, 60_000); return () => window.clearInterval(interval); }, []);
  useEffect(() => {
    let currentHash = window.location.hash;
    const scrollToTop = () => requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    const updateRoute = () => {
      const nextHash = window.location.hash;
      setHash(nextHash.slice(1) || "home");
      if (nextHash !== currentHash) {
        setQuery("");
        setOpponent("");
        setOpponentSuggestionsOpen(false);
        scrollToTop();
      }
      currentHash = nextHash;
    };
    const navigateToHash = (nextHash: string) => {
      setQuery("");
      setOpponent("");
      setOpponentSuggestionsOpen(false);
      setMenuOpen(false);
      if (nextHash === currentHash) {
        scrollToTop();
        return;
      }
      window.history.pushState(null, "", nextHash);
      currentHash = nextHash;
      setHash(nextHash.slice(1) || "home");
      scrollToTop();
    };
    const navigateFromLink = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!(event.target instanceof Element)) return;
      if (event.target.closest(".opponent-form .suggestions button")) return;
      const link = event.target.closest<HTMLAnchorElement>("a[href^='#']");
      if (!link) return;
      event.preventDefault();
      event.stopPropagation();
      navigateToHash(link.hash);
    };
    updateRoute();
    document.addEventListener("click", navigateFromLink, true);
    addEventListener("hashchange", updateRoute);
    addEventListener("popstate", updateRoute);
    return () => {
      document.removeEventListener("click", navigateFromLink, true);
      removeEventListener("hashchange", updateRoute);
      removeEventListener("popstate", updateRoute);
    };
  }, []);
  const names = useMemo(() => playerNames(matches), [matches]);
  const recentDayMatches = useMemo(() => {
    if (!now) return 0;
    const cutoff = now - 24 * 60 * 60 * 1000;
    return matches.filter((match) => {
      const playedAt = Date.parse(match.playedAt);
      return Number.isFinite(playedAt) && playedAt >= cutoff;
    }).length;
  }, [matches, now]);
  const currentProfile = hash.startsWith("profile/") ? decodeURIComponent(hash.slice(8)) : "";
  const section = currentProfile ? "profile" : hash.split("/")[0];
  const stats = useMemo(() => {
    const byName = new Map<string, { games: number; wins: number; teams: Map<string, { ids: [number, number]; games: number }> }>();
    matches.forEach((match) => [
      { name: match.p1Name, ids: match.p1Characters },
      { name: match.p2Name, ids: match.p2Characters },
    ].forEach(({ name, ids }) => {
      const item = byName.get(name) ?? { games: 0, wins: 0, teams: new Map<string, { ids: [number, number]; games: number }>() };
      item.games += 1;
      if (isWinner(match, name)) item.wins += 1;
      const normalizedIds = normalizeTeam(ids);
      const key = normalizedIds.join("/");
      const team = item.teams.get(key) ?? { ids: normalizedIds, games: 0 };
      team.games += 1;
      item.teams.set(key, team);
      byName.set(name, item);
    }));
    return [...byName.entries()].map(([name, value]) => ({
      name,
      games: value.games,
      wins: value.wins,
      rate: value.wins / value.games * 100,
      team: [...value.teams.values()].sort((a, b) => b.games - a.games)[0],
    })).filter((item) => item.games >= 20).sort((a, b) => b.rate - a.rate || b.games - a.games).slice(0, 10);
  }, [matches]);
  const topCharacters = useMemo(() => { const counts = new Map<number, number>(); matches.forEach((match) => [...match.p1Characters, ...match.p2Characters].forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1))); return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6); }, [matches]);
  const topCombos = useMemo(() => {
    const combos = new Map<string, { ids: [number, number]; games: number; wins: number }>();
    matches.forEach((match) => [
      { name: match.p1Name, ids: match.p1Characters },
      { name: match.p2Name, ids: match.p2Characters },
    ].forEach((team) => {
      const ids = normalizeTeam(team.ids);
      const key = ids.join("/");
      const combo = combos.get(key) ?? { ids, games: 0, wins: 0 };
      combo.games += 1;
      if (isWinner(match, team.name)) combo.wins += 1;
      combos.set(key, combo);
    }));
    return [...combos.values()].filter((combo) => combo.games >= 10)
      .map((combo) => ({ ...combo, rate: combo.wins / combo.games * 100 }))
      .sort((a, b) => b.rate - a.rate || b.games - a.games)
      .slice(0, 6);
  }, [matches]);
  const activityDays = useMemo(() => {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const days = Array.from({ length: 30 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - 29 + index);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      return { date, key, count: 0 };
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
  }, [matches, now]);
  const risingPlayer = useMemo(() => {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const recentStart = new Date(today);
    recentStart.setDate(today.getDate() - 6);
    const previousStart = new Date(today);
    previousStart.setDate(today.getDate() - 13);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const periods = new Map<string, { name: string; previous: { games: number; wins: number }; recent: { games: number; wins: number } }>();
    matches.forEach((match) => {
      const playedAt = new Date(match.playedAt);
      if (Number.isNaN(playedAt.getTime()) || playedAt < previousStart || playedAt >= tomorrow) return;
      const period = playedAt >= recentStart ? "recent" : "previous";
      [match.p1Name, match.p2Name].forEach((name) => {
        const key = name.toLowerCase();
        const player = periods.get(key) ?? { name, previous: { games: 0, wins: 0 }, recent: { games: 0, wins: 0 } };
        player[period].games += 1;
        if (isWinner(match, name)) player[period].wins += 1;
        periods.set(key, player);
      });
    });
    return [...periods.values()]
      .filter((player) => player.previous.games >= 10 && player.recent.games >= 10)
      .map((player) => ({
        ...player,
        previousRate: player.previous.wins / player.previous.games * 100,
        recentRate: player.recent.wins / player.recent.games * 100,
      }))
      .sort((a, b) => (b.recentRate - b.previousRate) - (a.recentRate - a.previousRate) || b.recent.games - a.recent.games)[0] ?? null;
  }, [matches, now]);
  const monthlyMatchCount = activityDays.reduce((total, day) => total + day.count, 0);
  const maxActivityCount = Math.max(1, ...activityDays.map((day) => day.count));
  const activityChartBars = activityDays.map((day, index) => ({
    ...day,
    x: 16 + index * (568 / activityDays.length) + 2.5,
    y: 126 - day.count / maxActivityCount * 100,
    height: day.count ? Math.max(2, day.count / maxActivityCount * 100) : 0,
  }));
  const suggestions = names.filter((name) => name.toLowerCase().includes(query.toLowerCase())).slice(0, 6);
  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const player = query.trim();
    if (!player) return;
    const profileHash = `#profile/${encodeURIComponent(player)}`;
    setQuery("");
    if (window.location.hash === profileHash) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    window.location.hash = profileHash;
  };
  const title = section === "players" ? "TOP 10" : section === "matches" ? "최근 대전 기록" : section === "download" ? "Tracker 다운로드" : section === "profile" ? "플레이어 프로필" : "홈";
  const description = section === "download" ? "Tekken Tag Tournament 2 대전 기록 프로그램을 다운로드합니다." : section === "players" ? "서버 전체 플레이어 상위 목록입니다." : section === "matches" ? "최근 등록된 대전 결과를 확인합니다." : section === "profile" ? "" : "커뮤니티 전체 대전 데이터를 한눈에 확인하세요.";
  const profileRows = useMemo(() => currentProfile ? profileMatches(matches, currentProfile) : [], [matches, currentProfile]);
  const profileWins = profileRows.filter((match) => isWinner(match, currentProfile)).length;
  const profileTotalSeconds = profileRows.reduce((total, match) => {
    if (!match.startAt || !match.endAt) return total;
    const seconds = (Date.parse(match.endAt) - Date.parse(match.startAt)) / 1000;
    return Number.isFinite(seconds) && seconds >= 0 ? total + seconds : total;
  }, 0);
  const profileLastAccess = profileRows.map((match) => match.endAt ?? match.playedAt)
    .filter((value) => Number.isFinite(Date.parse(value)))
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0];
  const profileTeams = useMemo(() => {
    const teams = new Map<string, { ids: [number, number]; games: number; wins: number }>();
    profileRows.forEach((match) => {
      const isP1 = match.p1Name.toLowerCase() === currentProfile.toLowerCase();
      const ids = isP1 ? match.p1Characters : match.p2Characters;
      const normalizedIds = normalizeTeam(ids);
      const key = normalizedIds.join("/");
      const team = teams.get(key) ?? { ids: normalizedIds, games: 0, wins: 0 };
      team.games += 1;
      if (isWinner(match, currentProfile)) team.wins += 1;
      teams.set(key, team);
    });
    return [...teams.values()].sort((a, b) => b.games - a.games).slice(0, 5);
  }, [profileRows, currentProfile]);
  const profileMaps = useMemo(() => {
    const maps = new Map<number, { games: number; wins: number }>();
    profileRows.forEach((match) => {
      if (match.mapId === null) return;
      const map = maps.get(match.mapId) ?? { games: 0, wins: 0 };
      map.games += 1;
      if (isWinner(match, currentProfile)) map.wins += 1;
      maps.set(match.mapId, map);
    });
    return [...maps.entries()]
      .map(([id, stats]) => ({ id, ...stats, rate: stats.wins / stats.games * 100 }))
      .sort((a, b) => b.rate - a.rate || b.games - a.games)
      .slice(0, 5);
  }, [profileRows, currentProfile]);
  const recentRivals = useMemo(() => {
    const rivals = new Map<string, { name: string; games: number; wins: number; latest: number }>();
    profileRows.forEach((match) => {
      const opponentName = match.p1Name.toLowerCase() === currentProfile.toLowerCase() ? match.p2Name : match.p1Name;
      const key = opponentName.toLowerCase();
      const rival = rivals.get(key) ?? { name: opponentName, games: 0, wins: 0, latest: 0 };
      rival.games += 1;
      if (isWinner(match, currentProfile)) rival.wins += 1;
      rival.latest = Math.max(rival.latest, Date.parse(match.endAt ?? match.playedAt) || 0);
      rivals.set(key, rival);
    });
    return [...rivals.values()].sort((a, b) => b.latest - a.latest).slice(0, 5);
  }, [profileRows, currentProfile]);
  const sortedProfileRows = useMemo(() => [...profileRows].sort((a, b) => {
    if (profileSort !== "time") {
      const aWon = isWinner(a, currentProfile);
      const bWon = isWinner(b, currentProfile);
      if (aWon !== bWon) return profileSort === "wins" ? Number(bWon) - Number(aWon) : Number(aWon) - Number(bWon);
    }
    return Date.parse(b.createdAt ?? b.playedAt) - Date.parse(a.createdAt ?? a.playedAt);
  }), [profileRows, profileSort, currentProfile]);
  const profilePageCount = Math.max(1, Math.ceil(sortedProfileRows.length / 10));
  const effectiveProfilePage = Math.min(profilePage, profilePageCount);
  const matchPageCount = Math.max(1, Math.ceil(matches.length / 10));
  const effectiveMatchPage = Math.min(page, matchPageCount);
  const chronologicalMatches = useMemo(() => [...matches].sort((a, b) => Date.parse(a.createdAt ?? a.playedAt) - Date.parse(b.createdAt ?? b.playedAt)), [matches]);
  const matchNumbers = useMemo(() => new Map(chronologicalMatches.map((match, index) => [match.id, index + 1])), [chronologicalMatches]);
  const filteredOpponents = currentProfile ? names.filter((name) => name.toLowerCase().includes(opponent.toLowerCase()) && name.toLowerCase() !== currentProfile.toLowerCase()).slice(0, 5) : [];
  const rivalRows = currentProfile && opponent ? profileRows.filter((match) => [match.p1Name, match.p2Name].some((name) => name.toLowerCase() === opponent.toLowerCase())) : [];
  const selectedRival = opponent ? {
    name: opponent,
    games: rivalRows.length,
    wins: rivalRows.filter((match) => isWinner(match, currentProfile)).length,
  } : null;
  const activeActivityBar = activityChartBars.find((bar) => bar.key === hoveredActivityKey || bar.key === selectedActivityKey);

  return <main className="site-shell">
    <header className="topbar"><button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="메뉴 열기">☰</button><a className="brand" href="#home">TAG2<span>.GG</span></a><PwaControls /><form className="global-search" onSubmit={submitSearch}><label className="sr-only" htmlFor="player-search">플레이어 닉네임 검색</label><input id="player-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="플레이어 닉네임 입력..." role="combobox" aria-autocomplete="list" aria-controls="player-suggestions" aria-expanded={Boolean(query)} /> <button aria-label="플레이어 검색">⌕</button>{query && <div className="suggestions" id="player-suggestions">{suggestions.map((name) => <a key={name} href={`#profile/${encodeURIComponent(name)}`}>{name}</a>)}</div>}</form></header>
    {menuOpen && <button type="button" className="sidebar-backdrop" aria-label="사이드바 닫기" onClick={() => setMenuOpen(false)} />}
    <div className="app-shell"><aside className={`sidebar ${menuOpen ? "open" : ""}`}><p className="sidebar-title">STATISTICS</p><nav aria-label="통계 메뉴"><a className={`nav-item ${section === "home" ? "active" : ""}`} href="#home" onClick={() => setMenuOpen(false)}><MenuIcon name="home" /><span>홈</span></a><a className={`nav-item ${section === "players" ? "active" : ""}`} href="#players" onClick={() => setMenuOpen(false)}><MenuIcon name="players" /><span>TOP 10</span></a><a className={`nav-item ${section === "matches" ? "active" : ""}`} href="#matches" onClick={() => setMenuOpen(false)}><MenuIcon name="matches" /><span>최근 대전 기록</span></a><a className={`nav-item ${section === "download" ? "active" : ""}`} href="#download" onClick={() => setMenuOpen(false)}><MenuIcon name="download" /><span>Tracker 다운로드</span></a></nav><div className="sidebar-footer">RPCS3 COMMUNITY<br /><strong>TEKKEN TAG 2</strong></div></aside>
      <div className="content"><section className="page-heading"><div><p className="eyebrow">RPCS3 / TEKKEN TAG TOURNAMENT 2</p><h1><PageIcon section={section} />{title}</h1>{description && <p>{description}</p>}</div><div className="live-status" title="Supabase 실시간 데이터"><i /> LIVE DATA</div></section>
        {selectedMapId !== null && <MapPreviewModal id={selectedMapId} onClose={() => setSelectedMapId(null)} />}
        {section === "home" && (loading ? <section className="loading-dashboard" aria-live="polite" aria-busy="true"><section className="stat-grid">{["전체 대전", "등록 플레이어", "최근 24시간 대전"].map((label) => <article className="stat-card loading-card" key={label}><span>{label}</span><strong>—</strong><small>데이터 연결 중</small></article>)}</section><div className="panel loading-state"><span className="loading-spinner" aria-hidden="true" />Supabase 데이터를 불러오는 중입니다...</div></section> : <><section className="stat-grid">{[[matches.length.toLocaleString(), "전체 대전", "전체 기록"], [names.length.toLocaleString(), "등록 플레이어", "활동 플레이어"], [recentDayMatches.toLocaleString(), "최근 24시간 대전", "실제 경기 시각 기준"]].map(([value, label, note]) => <article className="stat-card" key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>)}</section><section className="dashboard-grid"><article className="panel"><div className="panel-top"><div><p className="eyebrow">META</p><h3>캐릭터 픽률</h3><p className="panel-description">전체 경기에서 각 캐릭터가 차지한 출전 비율입니다.</p></div><span>TOP 6</span></div>{topCharacters.map(([id, count], index) => <div className="bar-item character-bar-item" key={id}><div className="bar-character"><CharacterImage id={id} width={108} height={108} sizes="(max-width: 1100px) 54px, 108px" /><span>{characterNames[id] ?? "알 수 없는 캐릭터"}</span></div><div className="bar-track"><i style={{ width: `${Math.min(100, count / (matches.length * 4) * 100 * 2)}%`, backgroundColor: characterBarColors[index % characterBarColors.length], animationDelay: `${index * 110}ms` }} /></div><strong className="meta-rate" style={{ color: characterBarColors[index % characterBarColors.length] }}>{(count / (matches.length * 4) * 100).toFixed(1)}%</strong></div>)}        </article><article className="panel combo-panel"><div className="panel-top"><div><p className="eyebrow">TEAM META</p><h3>고승률 태그 조합</h3><p className="panel-description">10전 이상 기록된 조합을 승률 순으로 표시합니다.</p></div><span>10전 이상 · TOP 6</span></div>{Array.from({ length: 6 }, (_, index) => topCombos[index] ?? null).map((combo, index) => combo ? <div className="combo-row" key={combo.ids.join("/")}>
          <div className="combo-identity">{combo.ids.map((id) => <CharacterImage key={id} id={id} width={96} height={108} sizes="(max-width: 1100px) 48px, 96px" />)}<span>{combo.ids.map((id) => characterNames[id] ?? "알 수 없는 캐릭터").join(" / ")}</span></div>
          <div className="combo-rate-track"><i style={{ width: `${combo.rate / Math.max(1, ...topCombos.map((entry) => entry.rate)) * 100}%`, backgroundColor: characterBarColors[index % characterBarColors.length], animationDelay: `${index * 110}ms` }} /></div><strong className="meta-rate" style={{ color: characterBarColors[index % characterBarColors.length] }}>{combo.rate.toFixed(1)}%</strong>
        </div> : null)}</article><article className="panel rising-panel"><div className="panel-top"><div><p className="eyebrow">RISING STAR</p><h3>이번 주 급상승 플레이어</h3></div><span>최근 7일 · 최소 10전</span></div>{risingPlayer && risingPlayer.recentRate > risingPlayer.previousRate ? <>
          <div className="rising-summary"><a href={`#profile/${encodeURIComponent(risingPlayer.name)}`}>{risingPlayer.name}</a><strong>+{(risingPlayer.recentRate - risingPlayer.previousRate).toFixed(1)}<small>%p</small></strong></div>
          <p className="rising-record">직전 7일 {risingPlayer.previous.games}전 {risingPlayer.previous.wins}승 → 최근 7일 {risingPlayer.recent.games}전 {risingPlayer.recent.wins}승</p>
          <div className="rising-rates"><span>직전 7일</span><div><i style={{ width: `${risingPlayer.previousRate}%` }} /></div><b>{risingPlayer.previousRate.toFixed(1)}%</b><span>최근 7일</span><div><i className="current" style={{ width: `${risingPlayer.recentRate}%` }} /></div><b>{risingPlayer.recentRate.toFixed(1)}%</b></div>
        </> : <p className="muted empty-state">최근 7일과 직전 7일을 각각 10전 이상 기록한 상승 플레이어가 아직 없습니다.</p>}</article><article className="panel activity-panel"><div className="panel-top"><div><p className="eyebrow">ACTIVITY</p><h3>월간 대전 횟수</h3><p className="panel-description">날짜별 경기량 · 막대에 마우스를 올리면 해당 날짜 기록을 확인할 수 있습니다.</p></div><span>최근 30일</span></div><div className="activity-summary"><strong>{monthlyMatchCount.toLocaleString()}</strong><span>경기</span></div>
          <div className="activity-chart-layout"><span className="activity-y-axis">경기 수</span><div className="activity-chart-wrap"><svg className="activity-chart" viewBox="0 0 600 166" role="img" aria-label={`최근 30일 총 ${monthlyMatchCount}경기`}>
            <defs><linearGradient id="activity-bar-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#79d3ff" /><stop offset="100%" stopColor="#3279c5" /></linearGradient></defs>
            {[26, 76, 126].map((y) => <line className="activity-gridline" key={y} x1="16" x2="584" y1={y} y2={y} />)}
            {activityChartBars.map((bar) => <g className="activity-bar-group" key={bar.key} tabIndex={0} role="button" aria-label={`${bar.date.toLocaleDateString("ko-KR")} ${bar.count}전`} aria-pressed={selectedActivityKey === bar.key} onPointerEnter={() => setHoveredActivityKey(bar.key)} onPointerLeave={() => setHoveredActivityKey(null)} onFocus={() => setHoveredActivityKey(bar.key)} onBlur={() => setHoveredActivityKey(null)} onClick={() => setSelectedActivityKey((current) => current === bar.key ? null : bar.key)}><rect className={`activity-bar${bar.count ? " has-games" : ""}`} x={bar.x} y={bar.y} width="14" height={bar.height} rx="3" /><rect className="activity-hit-area" x={bar.x - 2} y="26" width="18" height="100" /><title>{bar.date.toLocaleDateString("ko-KR")} · {bar.count}전</title></g>)}
            {activeActivityBar && <g className="activity-tooltip" transform={`translate(${Math.min(512, Math.max(16, activeActivityBar.x + 7 - 44))} ${Math.max(3, activeActivityBar.y - 38)})`} aria-hidden="true"><rect width="88" height="31" rx="5" /><text x="44" y="12" textAnchor="middle">{activeActivityBar.date.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}</text><text className="activity-tooltip-count" x="44" y="25" textAnchor="middle">{activeActivityBar.count}경기</text></g>}
            {activityChartBars.filter((bar) => bar.date.getDate() % 5 === 0 || bar === activityChartBars[activityChartBars.length - 1]).map((bar) => <text className="activity-date" key={`${bar.key}-label`} x={bar.x + 7} y="154" textAnchor="middle">{bar.date.getDate()}</text>)}
          </svg><span className="activity-x-axis">일</span></div></div></article><article className="panel wide">          <div className="panel-top"><div><p className="eyebrow">COMMUNITY FEED</p><h3>최근 대전 기록</h3><p className="panel-description">데이터베이스에 최근 등록된 경기 3건입니다.</p></div><a href="#matches">전체 보기 →</a></div><MatchList matches={matches.slice(0, 3)} onMapClick={setSelectedMapId} /></article></section></>)}
        {section === "players" && <article className="panel directory"><div className="ranking-warning"><span className="ranking-warning-icon" aria-hidden="true">⚠</span><div><strong>실전 기록을 바탕으로 한 플레이어 랭킹</strong><p>현재 순위는 계급이 아닌 승률을 기준으로 산정됩니다. 객관적인 비교를 위해 총 20전 이상 기록된 플레이어만 집계하며, 승률이 같을 경우 더 많은 경기 수를 기록한 플레이어가 우선됩니다.</p></div></div><div className="rank-table">{stats.map((item, index) => <a className="rank-row" href={`#profile/${encodeURIComponent(item.name)}`} key={item.name}><b>{String(index + 1).padStart(2, "0")}</b><div className="rank-identity"><strong>{item.name}</strong><span className="rank-team">{item.team && item.team.ids.map((id) => <CharacterImage key={id} id={id} width={112} height={128} sizes="(max-width: 500px) 56px, (max-width: 760px) 72px, 112px" />)}{item.team && <small>{item.team.ids.map((id) => characterNames[id] ?? "알 수 없는 캐릭터").join(" / ")}</small>}</span></div><span className="rank-record">{item.games}전 {item.wins}승 {item.games - item.wins}패</span><em>{item.rate.toFixed(1)}%</em></a>)}</div>{!stats.length && <p className="empty-state">20전 이상인 플레이어가 없습니다.</p>}</article>}
        {section === "matches" && <article className="panel directory"><div className="panel-top"><div><p className="eyebrow">MATCH DIRECTORY</p><h2>최근 대전 기록</h2><p className="panel-description">경기별 승자, 1P·2P 점수, 사용 캐릭터, 맵과 경기 시간을 확인할 수 있습니다.</p></div></div><MatchList matches={matches.slice((effectiveMatchPage - 1) * 10, effectiveMatchPage * 10)} matchNumbers={matchNumbers} onMapClick={setSelectedMapId} /><Pagination currentPage={effectiveMatchPage} pageCount={matchPageCount} onPageChange={setPage} label="대전 기록 페이지" /></article>}
        {section === "download" && <article className="panel download-panel"><p>Tracker를 실행해 두면 RPCS3에서 진행한 온라인 대전이 자동으로 기록됩니다. 기록된 경기부터 TAG2.GG에서 전적과 통계를 확인할 수 있습니다.</p><div className="download-notice"><strong>PC에서 다운로드해 주세요.</strong><span>Windows PC에서 Tracker가 실행 중일 때 진행한 온라인 대전만 기록됩니다. 실행하기 전의 과거 경기는 자동으로 추가되지 않습니다.</span></div><a className="download-button" href={releaseUrl}>다운로드</a></article>}
        {section === "profile" && <><article className="panel profile-hero"><div><p className="eyebrow">플레이어 프로필</p><h2>{currentProfile}</h2><p>{profileRows.length}전 {profileWins}승 {profileRows.length - profileWins}패</p></div><div className="profile-metrics"><div><strong>{profileRows.length ? (profileWins / profileRows.length * 100).toFixed(1) : "0.0"}%</strong><span>승률</span></div><div><strong>{formatSeconds(profileTotalSeconds)}</strong><span>총 플레이 시간</span></div><div><strong>{profileLastAccess ? formatDate(profileLastAccess) : "-"}</strong><span>마지막 접속</span></div></div></article><section className="profile-top-grid"><article className="panel"><div className="panel-top"><div><p className="eyebrow">MOST PLAYED TEAMS</p><h3>주력 태그 조합</h3><p className="panel-description">가장 자주 사용한 조합과 해당 조합의 승률입니다.</p></div><span>TOP 5</span></div>{profileTeams.length ? profileTeams.map((team) => { const rate = team.games ? team.wins / team.games * 100 : 0; const gradient = winRateGradient(rate); const [primaryName, secondaryName] = team.ids.map((id) => characterNames[id] ?? "알 수 없는 캐릭터"); return <div className="profile-team-row" key={team.ids.join("/")}><div className="profile-team-identity">{team.ids.map((id) => <CharacterImage key={id} id={id} width={132} height={148} sizes="(max-width: 640px) 96px, (max-width: 1100px) 104px, 132px" />)}<span className="desktop-team-name">{primaryName} / {secondaryName}</span><span className="mobile-team-name">{primaryName}/<br />{secondaryName}</span></div><div className="profile-team-stats"><div className="team-winrate" style={{ "--rate": rate, "--rate-gradient": gradient } as React.CSSProperties}><strong>{rate.toFixed(1)}%</strong></div><div><b>{team.games}전 {team.wins}승 {team.games - team.wins}패</b></div></div></div>; }) : <p className="muted empty-state">태그 조합 기록이 없습니다.</p>}</article><article className="panel profile-maps-panel">
  <div className="panel-top"><div><p className="eyebrow">STAGE RECORD</p><h3>맵별 승률</h3><p className="panel-description">이 플레이어가 실제로 대전한 맵을 승률 순으로 보여줍니다.</p></div><span>TOP 5</span></div>
  {profileMaps.length ? <div className="profile-map-list">{profileMaps.map((map, index) => <div className="profile-map-card" key={map.id}>
    <button className="map-preview-trigger profile-map-art" type="button" onClick={() => setSelectedMapId(map.id)} aria-label={`${mapNames[map.id] ?? "맵"} 맵 크게 보기`}><MapImage id={map.id} width={640} height={360} sizes="(max-width: 640px) 184px, 240px" className="profile-map-image" /><span>{String(index + 1).padStart(2, "0")}</span></button>
    <div className="profile-map-copy"><button className="map-preview-name" type="button" onClick={() => setSelectedMapId(map.id)}>{mapNames[map.id] ?? `Unknown Map (${map.id})`}</button><small>{map.games}전 {map.wins}승 {map.games - map.wins}패</small></div>
    <div className="profile-map-rate team-winrate" style={{ "--rate": map.rate, "--rate-gradient": winRateGradient(map.rate) } as React.CSSProperties}><strong>{map.rate.toFixed(1)}%</strong></div>
  </div>)}</div> : <p className="muted empty-state">맵 대전 기록이 없습니다.</p>}
  </article><article className="panel opponent-panel"><div className="panel-top"><div><p className="eyebrow">HEAD TO HEAD</p><h3>상대 전적</h3><p className="panel-description">최근 대전 상대 5명의 전적을 표시합니다.</p></div></div><form className="opponent-form" onSubmit={(event) => { event.preventDefault(); setOpponent(opponent.trim()); setOpponentSuggestionsOpen(false); }}><label className="sr-only" htmlFor="opponent">상대 닉네임</label><input id="opponent" value={opponent} onChange={(event) => { setOpponent(event.target.value); setOpponentSuggestionsOpen(true); }} onFocus={() => setOpponentSuggestionsOpen(true)} placeholder="상대 닉네임 입력..." /><button type="submit" aria-label="상대 전적 검색"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></svg></button>{opponent && opponentSuggestionsOpen && <div className="suggestions inline">{filteredOpponents.map((name) => <button type="button" key={name} onClick={() => { setOpponent(name); setOpponentSuggestionsOpen(false); }}>{name}</button>)}</div>}</form><div className="recent-rivals">{(selectedRival ? [selectedRival] : recentRivals).map((rival) => {
  const row = <><strong>{rival.name}</strong><span>{rival.games}전 {rival.wins}승 {rival.games - rival.wins}패</span><b>{(rival.games ? rival.wins / rival.games * 100 : 0).toFixed(1)}%</b></>;
  return selectedRival
    ? <div className="rival-entry" key={rival.name}>{row}</div>
    : <a href={`#profile/${encodeURIComponent(rival.name)}`} key={rival.name}>{row}</a>;
})}</div></article></section><article className="panel"><div className="panel-top"><div><p className="eyebrow">RECENT MATCHES</p><h3>최근 대전 결과</h3><p className="panel-description">승자와 1P·2P 점수, 맵, 경기 시간 정보를 확인할 수 있습니다.</p></div><label className="sort-control"><span>정렬</span><select value={profileSort} onChange={(event) => { setProfileSort(event.target.value as "time" | "wins" | "losses"); setProfilePage(1); }}><option value="time">최신 순</option><option value="wins">승리 순</option><option value="losses">패배 순</option></select></label></div><MatchList matches={sortedProfileRows.slice((effectiveProfilePage - 1) * 10, effectiveProfilePage * 10)} profile={currentProfile} matchNumbers={matchNumbers} onMapClick={setSelectedMapId} /><Pagination currentPage={effectiveProfilePage} pageCount={profilePageCount} onPageChange={setProfilePage} label={"\uD504\uB85C\uD544 \uB300\uC804 \uAE30\uB85D \uD398\uC774\uC9C0"} /></article></>}
      </div></div>
  </main>;
}
