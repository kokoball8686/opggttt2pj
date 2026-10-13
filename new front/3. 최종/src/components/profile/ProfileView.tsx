"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  characterLabel,
  mapLabel,
  uniqueCharacterIds,
} from "@/lib/matches";
import { formatDate, formatSeconds } from "@/lib/format";
import { usePlayerMatchPage } from "@/hooks/useMatches";
import { usePlayerNameSuggestions } from "@/hooks/usePlayerNameSuggestions";
import { useProfileStatistics } from "@/hooks/useProfileStatistics";
import { prefetchSelectedProfileStatistics } from "@/lib/client-data-requests";
import { AppShell } from "@/components/layout/AppShell";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { StatusBlock } from "@/components/ui/StatusBlock";
import { MatchList } from "@/components/matches/MatchList";
import { Pagination } from "@/components/matches/Pagination";
import { CharacterImage } from "@/components/matches/CharacterImage";
import { CharacterName } from "@/components/matches/CharacterName";
import { MapImage, MapPreviewModal } from "@/components/matches/MapImage";
import { WinRateGauge } from "@/components/charts/Charts";
import { MapPickerModal } from "@/components/profile/MapPickerModal";
import { SearchSubmitButton } from "@/components/search/PlayerSearch";
import { usePwaStandalone } from "@/components/pwa/PwaControls";

export function ProfileView() {
  const params = useParams<{ name: string }>();
  const profile = decodeURIComponent(params.name ?? "");
  return <ProfileContent key={profile} profile={profile} />;
}

function ProfileContent({ profile }: { profile: string }) {
  const isStandalone = usePwaStandalone();
  const [page, setPage] = useState(1);
  const [profileView, setProfileView] = useState<"summary" | "maps" | "matches">("summary");
  const [sort, setSort] = useState<"time" | "wins" | "losses">("time");
  const [opponent, setOpponent] = useState("");
  const [opponentSearchQuery, setOpponentSearchQuery] = useState("");
  const [selectedOpponent, setSelectedOpponent] = useState<string | null>(null);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [selectedMapId, setSelectedMapId] = useState<number | null>(null);
  const [previewMapId, setPreviewMapId] = useState<number | null>(null);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const {
    data: profileStatistics,
    key: statisticsRequestKey,
    dataKey: statisticsDataKey,
    loading: statisticsLoading,
    error: statisticsError,
    refreshVersion: statisticsRefreshVersion,
  } = useProfileStatistics(profile, selectedOpponent);
  const { names: opponentSuggestions, error: suggestionsError } =
    usePlayerNameSuggestions(opponentSearchQuery, profile);
  const {
    matches: pageMatches,
    matchNumbers,
    newMatchIds,
    totalCount,
    loading: pageLoading,
    error: pageError,
    hasData: hasPageData,
  } = usePlayerMatchPage(profile, page, sort);

  const teams = profileStatistics?.teams ?? [];
  const maps = profileStatistics?.maps ?? [];
  const topMaps = maps.slice(0, 3);
  const selectedMap = selectedMapId === null ? null : maps.find((map) => map.id === selectedMapId) ?? null;
  const gamesByMap = new Map(maps.map((map) => [map.id, map.games]));
  const rivals = profileStatistics?.rivals ?? [];
  const pageCount = Math.max(1, Math.ceil(totalCount / 10));
  const effectivePage = Math.min(page, pageCount);

  const hasSelectedStatistics = statisticsDataKey === statisticsRequestKey;
  const selectedRival = hasSelectedStatistics
    ? profileStatistics?.selectedRival ?? null
    : null;

  return (
    <AppShell title="플레이어 프로필">
      {previewMapId !== null ? (
        <MapPreviewModal id={previewMapId} onClose={() => setPreviewMapId(null)} />
      ) : null}
      {mapPickerOpen ? (
        <MapPickerModal
          gamesByMap={gamesByMap}
          selectedMapId={selectedMapId}
          onSelect={setSelectedMapId}
          onClose={() => setMapPickerOpen(false)}
        />
      ) : null}
      <StatusBlock
        loading={pageLoading}
        error={pageError}
        keepChildrenOnError={hasPageData || profileStatistics !== null}
        refreshKey={statisticsRefreshVersion}
      >
        {statisticsError ? (
          <div className="mb-3 rounded-2xl border border-rose-500/30 bg-rose-950/25 p-4 text-rose-100" role="alert">
            <strong className="block text-sm font-semibold">
              {profileStatistics
                ? "프로필 통계를 갱신하지 못했습니다."
                : "프로필 통계를 불러오지 못했습니다."}
            </strong>
            <p className="mt-1 text-sm text-rose-100/80">{statisticsError}</p>
          </div>
        ) : null}
        {!profileStatistics && statisticsLoading ? (
          <p className="py-5 text-sm text-slate-300/80" role="status">프로필 통계를 불러오는 중입니다.</p>
        ) : null}
        {isStandalone ? (
          <div className="mb-3 flex gap-1.5 rounded-xl border border-slate-700 bg-slate-900/90 p-1" role="group" aria-label="프로필 보기">
            <button
              type="button"
              className={[
                "flex-1 rounded-lg border border-transparent px-2.5 py-3 text-sm font-bold transition",
                profileView === "summary" ? "border-cyan-400/20 bg-cyan-500/10 text-cyan-300" : "text-slate-400",
              ].join(" ")}
              aria-pressed={profileView === "summary"}
              onClick={() => setProfileView("summary")}
            >
              요약
            </button>
            <button
              type="button"
              className={[
                "flex-1 rounded-lg border border-transparent px-2.5 py-3 text-sm font-bold transition",
                profileView === "maps" ? "border-cyan-400/20 bg-cyan-500/10 text-cyan-300" : "text-slate-400",
              ].join(" ")}
              aria-pressed={profileView === "maps"}
              onClick={() => setProfileView("maps")}
            >
              맵
            </button>
            <button
              type="button"
              className={[
                "flex-1 rounded-lg border border-transparent px-2.5 py-3 text-sm font-bold transition",
                profileView === "matches" ? "border-cyan-400/20 bg-cyan-500/10 text-cyan-300" : "text-slate-400",
              ].join(" ")}
              aria-pressed={profileView === "matches"}
              onClick={() => setProfileView("matches")}
            >
              개인별 대전 기록
            </button>
          </div>
        ) : null}
        {profileStatistics && (!isStandalone || profileView === "summary") && (
          <motion.article
            className="mb-3 flex flex-col items-stretch gap-4 rounded-2xl border border-slate-700/80 bg-gradient-to-br from-slate-800/95 to-slate-900/95 p-4 shadow-[0_14px_40px_rgba(0,0,0,0.18)] md:flex-row md:items-center md:justify-between md:p-5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="min-w-0">
              <p className="text-[11px] font-bold tracking-[1.2px] text-slate-400 uppercase">플레이어 프로필</p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-white">{profile}</h2>
              <p className="mt-2 text-sm text-slate-300/80">
                <AnimatedNumber value={profileStatistics.summary.games} refreshKey={statisticsRefreshVersion} />전{" "}
                <AnimatedNumber value={profileStatistics.summary.wins} refreshKey={statisticsRefreshVersion} />승{" "}
                <AnimatedNumber value={profileStatistics.summary.losses} refreshKey={statisticsRefreshVersion} />패
              </p>
            </div>
            <div className="grid w-full grid-cols-1 gap-0 md:flex md:w-auto md:flex-wrap md:gap-[18px]">
              <div className="flex min-w-0 items-center justify-between gap-3 border-t border-slate-700 py-2 first:border-0 first:pl-0 md:flex-col md:items-start md:justify-start md:gap-0 md:border-l md:border-t-0 md:py-0 md:pl-[18px] md:first:border-0 md:first:pl-0">
                <strong className="order-2 min-w-0 text-right text-[17px] font-bold text-white [overflow-wrap:anywhere] md:order-none md:block md:text-left md:text-[23px]">
                  <AnimatedNumber
                    value={profileStatistics.summary.rate}
                    refreshKey={statisticsRefreshVersion}
                    decimals={1}
                  />%
                </strong>
                <span className="order-1 shrink-0 text-sm text-slate-400 md:order-none md:text-sm md:normal-case md:tracking-normal">승률</span>
              </div>
              <div className="flex min-w-0 items-center justify-between gap-3 border-t border-slate-700 py-2 md:flex-col md:items-start md:justify-start md:gap-0 md:border-l md:border-t-0 md:py-0 md:pl-[18px]">
                <strong className="order-2 min-w-0 text-right text-[17px] font-bold text-white [overflow-wrap:anywhere] md:order-none md:block md:text-left md:text-[23px]">
                  <AnimatedNumber
                    value={profileStatistics.summary.playSeconds}
                    refreshKey={statisticsRefreshVersion}
                    formatValue={formatSeconds}
                  />
                </strong>
                <span className="order-1 shrink-0 text-sm text-slate-400 md:order-none md:text-sm md:normal-case md:tracking-normal">총 플레이 시간</span>
              </div>
              <div className="flex min-w-0 items-center justify-between gap-3 border-t border-slate-700 py-2 md:flex-col md:items-start md:justify-start md:gap-0 md:border-l md:border-t-0 md:py-0 md:pl-[18px]">
                <strong className="order-2 min-w-0 text-right text-[17px] font-bold text-white [overflow-wrap:anywhere] md:order-none md:block md:text-left md:text-[23px]">{profileStatistics.summary.lastAccess ? formatDate(profileStatistics.summary.lastAccess) : "-"}</strong>
                <span className="order-1 shrink-0 text-sm text-slate-400 md:order-none md:text-sm md:normal-case md:tracking-normal">마지막 접속</span>
              </div>
            </div>
          </motion.article>
        )}

        {profileStatistics && (!isStandalone || profileView !== "matches") && (
          <section className={[
            "mb-3 grid gap-3",
            isStandalone
              ? `lg:grid-cols-${profileView === "maps" ? "1" : "2"}`
              : "lg:grid-cols-3",
          ].join(" ")}>
              {(!isStandalone || profileView === "summary") && (
                <motion.article
                  className="rounded-2xl border border-slate-700/80 bg-gradient-to-br from-slate-800/95 to-slate-900/95 p-5 shadow-[0_14px_40px_rgba(0,0,0,0.18)] lg:p-4"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, type: "spring", stiffness: 110, damping: 20 }}
                whileHover={{ y: -4, borderColor: "rgba(70, 217, 255, 0.4)" }}
              >
                <div className="mb-3 flex items-start justify-between gap-3 lg:min-h-[48px]">
                  <div>
                    <p className="text-[11px] font-bold tracking-[1.2px] text-slate-400 uppercase lg:whitespace-nowrap lg:text-[clamp(9px,0.65vw,11px)] lg:tracking-[0.6px]">MOST PLAYED TEAMS</p>
                    <h3 className="mt-1.5 text-xl font-semibold tracking-[-0.03em] text-white lg:whitespace-nowrap lg:text-[clamp(15px,1.25vw,20px)]">주력 태그 조합</h3>
                  </div>
                  <span className="rounded-full border border-slate-600/80 bg-slate-700/30 px-2 py-1 text-[11px] font-medium text-slate-200">TOP 5</span>
                </div>
                {teams.length ? (
                  teams.map((team, index) => {
                    const ids = uniqueCharacterIds(team.ids);
                    return (
                      <motion.div
                        className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_clamp(44px,16vw,60px)] items-center gap-2 border-b border-slate-700/80 py-3 last:border-b-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_88px] md:gap-3 lg:min-h-[140px] lg:grid-cols-[minmax(0,1fr)_clamp(52px,5.2vw,60px)] lg:gap-1 lg:py-1 xl:grid-cols-[minmax(0,1fr)_clamp(64px,6vw,88px)]"
                        key={team.ids.join("/")}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.16 + index * 0.07 }}
                        whileHover={{ backgroundColor: "rgba(78, 154, 214, 0.055)" }}
                      >
                        <div className="contents lg:flex lg:min-w-0 lg:items-center lg:gap-3">
                          <div className={`flex min-w-0 items-center ${ids.length === 1 ? "md:max-lg:w-full" : ""}`}>
                            <span className={`flex min-w-0 w-full items-start gap-0.5 md:gap-1.5 lg:gap-1 ${ids.length === 1 ? "md:max-lg:w-full" : "md:w-auto"}`}>
                              {ids.map((id) => (
                                <span className={`@container grid min-w-0 flex-1 justify-items-center gap-1 text-center text-[10px] font-semibold text-slate-200 md:flex-none md:gap-1.5 md:text-[12px] lg:!w-[clamp(28px,2.8vw,36px)] lg:max-w-none xl:!w-[clamp(48px,4vw,68px)] ${ids.length === 1 ? "max-lg:!w-1/2 max-lg:!flex-none" : ""}`} key={id}>
                                  <CharacterImage
                                    id={id}
                                    width={96}
                                    height={108}
                                    sizes="(max-width: 330px) 36px, (max-width: 767px) 106px, (min-width: 1280px) 4vw, (min-width: 1024px) 2.8vw, 96px"
                                    className="grid w-full place-items-center [&>img]:h-auto [&>img]:w-full [&>img]:object-contain md:w-[96px] lg:!w-full"
                                  />
                                  <CharacterName className="max-w-[84px] break-words text-slate-200 md:max-w-[70px] md:text-[12px] md:leading-[15px] lg:text-[clamp(10px,0.9vw,13px)] xl:max-w-[84px] xl:text-[clamp(11px,1vw,14px)]">
                                    {characterLabel(id)}
                                  </CharacterName>
                                </span>
                              ))}
                              {ids.length === 1 ? (
                                <span aria-hidden="true" className="hidden lg:block lg:w-[clamp(28px,2.8vw,36px)] lg:shrink-0 xl:w-[clamp(48px,4vw,68px)]" />
                              ) : null}
                            </span>
                          </div>
                          <div className="justify-self-start whitespace-nowrap text-left text-[clamp(12px,3.5vw,14px)] font-semibold text-slate-100 md:justify-self-center md:text-center md:text-[15px] lg:shrink-0 lg:text-[clamp(11px,0.9vw,14px)] xl:text-[clamp(12px,1vw,16px)]">
                            <b>
                              <AnimatedNumber value={team.games} refreshKey={statisticsRefreshVersion} />전{" "}
                              <AnimatedNumber value={team.wins} refreshKey={statisticsRefreshVersion} />승{" "}
                              <AnimatedNumber value={team.games - team.wins} refreshKey={statisticsRefreshVersion} />패
                            </b>
                          </div>
                        </div>
                        <div className="grid place-items-center">
                          <WinRateGauge rate={team.rate} label="조합 승률" refreshKey={statisticsRefreshVersion} size={88} className="max-md:!h-[clamp(44px,16vw,60px)] max-md:!w-[clamp(44px,16vw,60px)] md:!h-[88px] md:!w-[88px] lg:!h-[clamp(52px,5.2vw,60px)] lg:!w-[clamp(52px,5.2vw,60px)] xl:!h-[clamp(64px,6vw,88px)] xl:!w-[clamp(64px,6vw,88px)]" />
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <p className="py-4 text-sm text-slate-300/80">태그 조합 기록이 없습니다.</p>
                )}
              </motion.article>
            )}

            {(!isStandalone || profileView === "maps") && (
              <motion.article
                className="rounded-2xl border border-slate-700/80 bg-gradient-to-br from-slate-800/95 to-slate-900/95 p-5 shadow-[0_14px_40px_rgba(0,0,0,0.18)] lg:p-4"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16, type: "spring", stiffness: 110, damping: 20 }}
                whileHover={{ y: -4, borderColor: "rgba(139, 123, 255, 0.46)" }}
              >
                <div className="mb-3 flex items-start justify-between gap-3 lg:min-h-[48px]">
                  <div>
                    <p className="text-[11px] font-bold tracking-[1.2px] text-slate-400 uppercase lg:whitespace-nowrap lg:text-[clamp(9px,0.65vw,11px)] lg:tracking-[0.6px]">STAGE RECORD</p>
                    <h3 className="mt-1.5 text-xl font-semibold tracking-[-0.03em] text-white lg:whitespace-nowrap lg:text-[clamp(15px,1.25vw,20px)]">맵별 전적</h3>
                  </div>
                  <span className="rounded-full border border-slate-600/80 bg-slate-700/30 px-2 py-1 text-[11px] font-medium text-slate-200">TOP 3 · 경기 수</span>
                </div>
                {topMaps.length ? (
                  <div className="grid gap-3 lg:gap-0">
                    {topMaps.map((map, index) => (
                      <motion.div
                        className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_clamp(44px,16vw,60px)] items-center gap-2 border-b border-slate-700/80 py-2.5 last:border-b-0 md:grid-cols-[120px_minmax(0,1fr)_88px] md:gap-3 lg:min-h-[140px] lg:grid-cols-[clamp(78px,7.4vw,115px)_minmax(0,1fr)_clamp(52px,5.2vw,60px)] lg:gap-3 lg:py-1 xl:grid-cols-[clamp(101px,9vw,138px)_minmax(0,1fr)_clamp(64px,6vw,88px)]"
                        key={map.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.22 + index * 0.07 }}
                        whileHover={{ backgroundColor: "rgba(78, 154, 214, 0.055)" }}
                      >
                        <button
                          className="group relative aspect-video w-full min-w-0 overflow-hidden rounded-md border border-slate-600 bg-slate-900/80 md:aspect-auto md:h-auto md:w-auto lg:!aspect-video lg:!h-auto lg:!w-full"
                          type="button"
                          onClick={() => setPreviewMapId(map.id)}
                          aria-label={`${mapLabel(map.id)} 맵 크게 보기`}
                        >
                          <MapImage
                            id={map.id}
                            width={640}
                            height={360}
                            sizes="(max-width: 640px) 184px, (min-width: 1280px) 9vw, (min-width: 1024px) 7.4vw, 240px"
                            className="aspect-video h-auto w-full object-cover md:aspect-auto md:h-[52px] lg:!aspect-video lg:!h-auto"
                          />
                          <span className="absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-lg border border-white/40 bg-slate-950/90 text-[12px] font-black text-white">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                        </button>
                        <div className="min-w-0">
                          <button
                            className="block w-full min-w-0 cursor-pointer break-words border-0 bg-transparent p-0 text-left text-[clamp(12px,3.5vw,14px)] font-bold leading-tight text-slate-100 md:text-base md:leading-normal lg:text-[clamp(12px,1vw,15px)] lg:leading-tight xl:text-[clamp(14px,1.15vw,18px)]"
                            type="button"
                            onClick={() => setPreviewMapId(map.id)}
                          >
                            {mapLabel(map.id)}
                          </button>
                          <small className="mt-1 block text-[clamp(12px,3.5vw,14px)] leading-tight text-slate-400 md:text-sm md:leading-normal lg:whitespace-nowrap lg:text-[clamp(11px,0.9vw,14px)] lg:leading-tight xl:text-[clamp(12px,1vw,16px)]">
                            <AnimatedNumber value={map.games} refreshKey={statisticsRefreshVersion} />전{" "}
                            <AnimatedNumber value={map.wins} refreshKey={statisticsRefreshVersion} />승{" "}
                            <AnimatedNumber value={map.games - map.wins} refreshKey={statisticsRefreshVersion} />패
                          </small>
                        </div>
                        <WinRateGauge rate={map.rate} label="맵 승률" refreshKey={statisticsRefreshVersion} size={88} className="max-md:!h-[clamp(44px,16vw,60px)] max-md:!w-[clamp(44px,16vw,60px)] md:!h-[88px] md:!w-[88px] lg:!h-[clamp(52px,5.2vw,60px)] lg:!w-[clamp(52px,5.2vw,60px)] xl:!h-[clamp(64px,6vw,88px)] xl:!w-[clamp(64px,6vw,88px)]" />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="py-4 text-sm text-slate-300/80">맵 대전 기록이 없습니다.</p>
                )}
                <div className="mt-4 border-t border-slate-700/80 pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">다른 맵 전적 보기</p>
                      <p className="mt-1 text-xs text-slate-400">맵을 선택해주세요.</p>
                    </div>
                    <button
                      className="flex h-10 shrink-0 items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-3 text-sm font-semibold text-slate-100 transition hover:border-cyan-400/60"
                      type="button"
                      onClick={() => setMapPickerOpen(true)}
                    >
                      {selectedMapId === null ? "맵 선택" : "맵 변경"}
                      <svg
                        className="h-4 w-4 text-slate-400"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                  </div>
                  {selectedMapId !== null ? (
                    <motion.div
                      className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_clamp(44px,16vw,60px)] items-center gap-2 border-b border-slate-700/80 py-2.5 last:border-b-0 md:grid-cols-[120px_minmax(0,1fr)_88px] md:gap-3 lg:min-h-[140px] lg:grid-cols-[clamp(78px,7.4vw,115px)_minmax(0,1fr)_clamp(52px,5.2vw,60px)] lg:gap-3 lg:py-1 xl:grid-cols-[clamp(101px,9vw,138px)_minmax(0,1fr)_clamp(64px,6vw,88px)]"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      whileHover={{ backgroundColor: "rgba(78, 154, 214, 0.055)" }}
                    >
                      <button
                        className="group relative aspect-video w-full min-w-0 overflow-hidden rounded-md border border-slate-600 bg-slate-900/80 md:aspect-auto md:h-auto md:w-auto lg:!aspect-video lg:!h-auto lg:!w-full"
                        type="button"
                        onClick={() => setPreviewMapId(selectedMapId)}
                        aria-label={`${mapLabel(selectedMapId)} 맵 크게 보기`}
                      >
                        <MapImage
                          id={selectedMapId}
                          width={640}
                          height={360}
                          sizes="(max-width: 640px) 184px, (min-width: 1280px) 9vw, (min-width: 1024px) 7.4vw, 240px"
                          className="aspect-video h-auto w-full object-cover md:aspect-auto md:h-[52px] lg:!aspect-video lg:!h-auto"
                        />
                      </button>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold leading-tight text-slate-100 md:text-base md:leading-normal lg:text-[clamp(12px,1vw,15px)] xl:text-[clamp(14px,1.15vw,18px)]">
                          {mapLabel(selectedMapId)}
                        </p>
                        {selectedMap ? (
                          <small className="mt-1 block text-[10px] leading-tight text-slate-400 md:text-sm md:leading-normal lg:whitespace-nowrap lg:text-[clamp(11px,0.9vw,14px)] lg:leading-tight xl:text-[clamp(12px,1vw,16px)]">
                            <AnimatedNumber value={selectedMap.games} refreshKey={statisticsRefreshVersion} />전{" "}
                            <AnimatedNumber value={selectedMap.wins} refreshKey={statisticsRefreshVersion} />승{" "}
                            <AnimatedNumber value={selectedMap.games - selectedMap.wins} refreshKey={statisticsRefreshVersion} />패
                          </small>
                        ) : (
                          <small className="mt-1 block text-[10px] leading-tight text-slate-400 md:text-sm">
                            아직 대전 기록이 없습니다.
                          </small>
                        )}
                      </div>
                      {selectedMap ? (
                        <WinRateGauge
                          rate={selectedMap.rate}
                          label="선택한 맵 승률"
                          refreshKey={statisticsRefreshVersion}
                          size={88}
                          className="max-md:!h-[clamp(44px,16vw,60px)] max-md:!w-[clamp(44px,16vw,60px)] md:!h-[88px] md:!w-[88px] lg:!h-[clamp(52px,5.2vw,60px)] lg:!w-[clamp(52px,5.2vw,60px)] xl:!h-[clamp(64px,6vw,88px)] xl:!w-[clamp(64px,6vw,88px)]"
                        />
                      ) : <span />}
                    </motion.div>
                  ) : null}
                </div>
              </motion.article>
            )}

            {(!isStandalone || profileView === "summary") && (
              <motion.article
                className="rounded-2xl border border-slate-700/80 bg-gradient-to-br from-slate-800/95 to-slate-900/95 p-5 shadow-[0_14px_40px_rgba(0,0,0,0.18)]"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.24, type: "spring", stiffness: 110, damping: 20 }}
                whileHover={{ y: -4, borderColor: "rgba(90, 240, 186, 0.4)" }}
              >
                <div className="mb-3">
                  <p className="text-[11px] font-bold tracking-[1.2px] text-slate-400 uppercase">HEAD TO HEAD</p>
                  <h3 className="mt-1.5 text-xl font-semibold tracking-[-0.03em] text-white">상대 전적</h3>
                </div>
                <form
                  className="relative flex h-[54px]"
                  onSubmit={(event: FormEvent) => {
                    event.preventDefault();
                    const selected = opponent.trim();
                    setOpponent(selected);
                    setSelectedOpponent(selected || null);
                    setSuggestionsOpen(false);
                  }}
                >
                  <label className="sr-only" htmlFor="opponent">
                    상대 닉네임
                  </label>
                  <input
                    id="opponent"
                    className="w-full rounded-xl border border-slate-600 bg-slate-900/80 px-4 py-3 pr-16 text-base text-slate-100 placeholder:text-slate-400 focus:border-cyan-400/60 focus:outline-none"
                    value={opponent}
                    onChange={(event) => {
                      const value = event.target.value;
                      setOpponent(value);
                      setOpponentSearchQuery(value);
                      if (!value.trim()) setSelectedOpponent(null);
                      setSuggestionsOpen(true);
                    }}
                    onFocus={() => setSuggestionsOpen(true)}
                    placeholder="상대 닉네임 입력..."
                  />
                  <SearchSubmitButton label="상대 전적 검색" />
                  {opponent && suggestionsOpen ? (
                    <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 rounded-lg border border-slate-600 bg-slate-900/95 shadow-[0_12px_30px_rgba(0,0,0,0.4)]">
                      {opponentSuggestions.slice(0, 5).map((name) => (
                        <button
                          type="button"
                          key={name}
                          className="block w-full border-0 bg-transparent px-3 py-2.5 text-left text-slate-100 transition hover:bg-slate-800"
                          onClick={() => {
                            setOpponent(name);
                            setSuggestionsOpen(false);
                            void prefetchSelectedProfileStatistics(profile, name);
                          }}
                        >
                          {name}
                        </button>
                      ))}
                      {suggestionsError ? (
                        <p className="px-3 py-2 text-sm text-rose-200" role="alert">{suggestionsError}</p>
                      ) : null}
                    </div>
                  ) : null}
                </form>
                <div className="mt-3 grid gap-2">
                  {statisticsLoading ? (
                    <p className="py-2 text-sm text-slate-300/80" role="status">
                      {selectedOpponent
                        ? "상대 전적을 불러오는 중입니다."
                        : "프로필 통계를 갱신하는 중입니다."}
                    </p>
                  ) : null}
                  {!statisticsLoading &&
                  selectedOpponent &&
                  hasSelectedStatistics &&
                  !selectedRival ? (
                    <p className="py-2 text-sm text-slate-300/80">상대 전적이 없습니다.</p>
                  ) : null}
                  {!statisticsLoading &&
                    (!selectedOpponent || hasSelectedStatistics) &&
                    (selectedRival ? [selectedRival] : selectedOpponent ? [] : rivals).map((rival) => {
                      const row = (
                        <>
                          <strong className="truncate text-base font-semibold text-white">{rival.name}</strong>
                          <span className="text-sm text-slate-300/80">
                            <AnimatedNumber value={rival.games} refreshKey={statisticsRefreshVersion} />전{" "}
                            <AnimatedNumber value={rival.wins} refreshKey={statisticsRefreshVersion} />승{" "}
                            <AnimatedNumber value={rival.games - rival.wins} refreshKey={statisticsRefreshVersion} />패
                          </span>
                          <b className="text-right text-base font-bold text-cyan-300">
                            <AnimatedNumber
                              value={rival.games ? (rival.wins / rival.games) * 100 : 0}
                              refreshKey={statisticsRefreshVersion}
                              decimals={1}
                            />%
                          </b>
                        </>
                      );
                      return selectedRival ? (
                        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2.5 border-b border-slate-700/80 py-2.5 last:border-b-0 max-md:grid-cols-[minmax(0,1fr)_auto_56px] md:grid-cols-[minmax(0,1fr)_auto_56px]" key={rival.name}>
                          {row}
                        </div>
                      ) : (
                        <Link className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2.5 border-b border-slate-700/80 py-2.5 last:border-b-0 max-md:grid-cols-[minmax(0,1fr)_auto_56px] md:grid-cols-[minmax(0,1fr)_auto_56px]" href={`/profile/${encodeURIComponent(rival.name)}`} key={rival.name}>
                          {row}
                        </Link>
                      );
                    })}
                </div>
              </motion.article>
            )}
          </section>
        )}

        {(!isStandalone || profileView === "matches") && (
          <article className="rounded-2xl border border-slate-700/80 bg-gradient-to-br from-slate-800/95 to-slate-900/95 p-5 shadow-[0_14px_40px_rgba(0,0,0,0.18)]">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold tracking-[1.2px] text-slate-400 uppercase">PLAYER MATCH HISTORY</p>
                <h3 className="mt-1.5 text-xl font-semibold tracking-[-0.03em] text-white">개인별 대전 기록</h3>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-300/80">
                <span>정렬</span>
                <select
                  className="rounded-md border border-slate-600 bg-slate-900/80 px-2 py-1.5 text-slate-100"
                  value={sort}
                  onChange={(event) => {
                    setSort(event.target.value as "time" | "wins" | "losses");
                    setPage(1);
                  }}
                >
                  <option value="time">최신 순</option>
                  <option value="wins">승리 순</option>
                  <option value="losses">패배 순</option>
                </select>
              </label>
            </div>
            {pageLoading ? (
              <p className="py-5 text-sm text-slate-300/80">대전 기록을 불러오는 중입니다.</p>
            ) : (
              <MatchList
                matches={pageMatches}
                matchNumbers={matchNumbers}
                newMatchIds={newMatchIds}
                onMapClick={setSelectedMapId}
              />
            )}
            <Pagination
              currentPage={effectivePage}
              pageCount={pageCount}
              onPageChange={setPage}
              label="프로필 대전 기록 페이지"
            />
          </article>
        )}
      </StatusBlock>
    </AppShell>
  );
}
