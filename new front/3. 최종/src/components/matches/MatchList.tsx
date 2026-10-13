import Link from "next/link";
import { MotionConfig, motion } from "framer-motion";
import { Match, characterLabel, isWinner, mapLabel, uniqueCharacterIds } from "@/lib/matches";
import { formatDate, formatDuration } from "@/lib/format";
import { CharacterImage } from "@/components/matches/CharacterImage";
import { CharacterName } from "@/components/matches/CharacterName";
import { MapImage } from "@/components/matches/MapImage";

type Props = {
  matches: Match[];
  matchNumbers?: Map<string, number>;
  newMatchIds: string[];
  onMapClick: (id: number) => void;
};

function MatchSide({
  name,
  ids,
  seat,
  won,
  hasKnownWinner,
}: {
  name: string;
  ids: number[];
  seat: "1P" | "2P";
  won: boolean;
  hasKnownWinner: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col items-stretch">
      <div
        className={[
          "mb-1.5 grid min-w-0 grid-cols-[minmax(0,1fr)_max-content] items-center gap-x-1 gap-y-0.5 sm:mb-2 sm:flex sm:flex-wrap sm:gap-2",
          seat === "1P" ? "justify-end" : "justify-start",
        ].join(" ")}
      >
        {seat === "1P" ? (
          <>
            <span
              className={[
                "col-start-1 row-start-1 inline-flex items-center justify-self-start rounded-full border px-1.5 py-0.5 max-sm:px-1 text-[clamp(12px,3.75vw,15px)] font-bold tracking-[0.04em] sm:col-auto sm:row-auto sm:px-2.5 sm:py-1.5 sm:text-[12px]",
                won
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                  : hasKnownWinner
                    ? "border-rose-500/30 bg-rose-500/10 text-rose-700"
                    : "border-[var(--line)] bg-[rgba(12,21,32,0.9)] text-[var(--muted)]",
              ].join(" ")}
            >
              {won ? "승리" : hasKnownWinner ? "패배" : "결과 미상"}
            </span>
            <Link className="col-span-2 row-start-2 min-w-0 truncate text-right text-[clamp(12px,3.75vw,15px)] font-semibold text-[var(--text)] hover:text-[var(--cyan)] sm:col-auto sm:row-auto sm:text-left sm:text-[16px]" href={`/profile/${encodeURIComponent(name)}`}>
              {name}
            </Link>
            <span className="theme-surface-muted col-start-2 row-start-1 justify-self-end rounded-md px-1.5 py-0.5 max-sm:px-1 text-[clamp(12px,3.75vw,15px)] font-bold tracking-[0.12em] sm:col-auto sm:row-auto sm:px-2.5 sm:py-1.5 sm:text-[12px]">{seat}</span>
          </>
        ) : (
          <>
            <span className="theme-surface-muted col-start-1 row-start-1 justify-self-start rounded-md px-1.5 py-0.5 max-sm:px-1 text-[clamp(12px,3.75vw,15px)] font-bold tracking-[0.12em] sm:col-auto sm:row-auto sm:px-2.5 sm:py-1.5 sm:text-[12px]">{seat}</span>
            <Link className="col-span-2 row-start-2 min-w-0 truncate text-[clamp(12px,3.75vw,15px)] font-semibold text-[var(--text)] hover:text-[var(--cyan)] sm:col-auto sm:row-auto sm:text-[16px]" href={`/profile/${encodeURIComponent(name)}`}>
              {name}
            </Link>
            <span
              className={[
                "col-start-2 row-start-1 inline-flex items-center justify-self-end rounded-full border px-1.5 py-0.5 max-sm:px-1 text-[clamp(12px,3.75vw,15px)] font-bold tracking-[0.04em] sm:col-auto sm:row-auto sm:px-2.5 sm:py-1.5 sm:text-[12px]",
                won
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                  : hasKnownWinner
                    ? "border-rose-500/30 bg-rose-500/10 text-rose-700"
                    : "border-[var(--line)] bg-[rgba(12,21,32,0.9)] text-[var(--muted)]",
              ].join(" ")}
            >
              {won ? "승리" : hasKnownWinner ? "패배" : "결과 미상"}
            </span>
          </>
        )}
      </div>
      <div
        className={[
          "grid min-w-0 grid-cols-2 gap-1 sm:flex sm:gap-2.5",
          ids.length === 1 && seat === "1P" ? "grid-cols-2" : ids.length === 1 ? "grid-cols-1" : "",
          seat === "1P" ? "justify-items-end sm:justify-end" : "justify-items-start sm:justify-start",
        ].join(" ")}
      >
        {ids.map((id, index) => (
          <span
            className={[
              "grid min-w-0 w-full max-w-[80px] justify-items-center gap-1 sm:w-[clamp(48px,15vw,80px)] sm:shrink-0 md:w-[100px] md:max-w-none",
              ids.length === 1 && seat === "1P" ? "col-start-2 justify-self-end sm:col-auto sm:justify-self-auto" : ids.length === 1 ? "justify-self-start sm:justify-self-auto" : "",
            ].join(" ")}
            key={`${name}-${id}-${index}`}
          >
            <CharacterImage
              id={id}
              width={100}
              height={100}
              sizes="(max-width: 320px) 48px, (max-width: 533px) 15vw, (max-width: 767px) 80px, (max-width: 1100px) 80px, 100px"
              className="grid w-full [&>img]:h-auto [&>img]:w-full"
            />
            <CharacterName className="text-[var(--muted)] sm:text-[12px]">
              {characterLabel(id)}
            </CharacterName>
          </span>
        ))}
      </div>
    </div>
  );
}

export function MatchList({
  matches,
  matchNumbers,
  newMatchIds,
  onMapClick,
}: Props) {
  if (!matches.length) {
    return <p className="py-5 text-sm text-[var(--muted)]">표시할 대전 기록이 없습니다.</p>;
  }

  return (
    <MotionConfig reducedMotion="never">
      <div className="grid gap-2.5">
      {matches.map((match, index) => {
        const p1Won = isWinner(match, match.p1Name);
        const p2Won = isWinner(match, match.p2Name);
        const hasKnownWinner = p1Won || p2Won;
        const p1CharacterIds = uniqueCharacterIds(match.p1Characters);
        const p2CharacterIds = uniqueCharacterIds(match.p2Characters);
        const matchNumber = matchNumbers?.get(match.id);
        const isNewMatch = newMatchIds.includes(match.id);
        const entranceDelay = Math.min(index * 0.045, 0.24);

        return (
          <motion.div
            className="theme-surface grid items-center gap-2.5 rounded-xl border border-transparent px-3 py-3 md:grid-cols-[24px_minmax(0,1fr)_minmax(160px,0.42fr)_minmax(120px,180px)]"
            key={match.id}
            layout="position"
            initial={
              isNewMatch
                ? {
                    opacity: 0,
                    y: -14,
                    borderColor: "rgba(103,232,249,0.75)",
                    boxShadow: "0 0 24px 2px rgba(34,211,238,0.28)",
                  }
                : { opacity: 0, x: -12 }
            }
            animate={{
              opacity: 1,
              x: 0,
              y: 0,
              borderColor: isNewMatch
                ? ["rgba(103,232,249,0.75)", "rgba(103,232,249,0)"]
                : "rgba(103,232,249,0)",
              boxShadow: isNewMatch
                ? [
                    "0 0 24px 2px rgba(34,211,238,0.28)",
                    "0 0 0 0 rgba(34,211,238,0)",
                  ]
                : "0 0 0 0 rgba(34,211,238,0)",
            }}
            transition={{
              opacity: {
                duration: isNewMatch ? 0.38 : 0.3,
                delay: isNewMatch ? entranceDelay : index * 0.035,
              },
              x: {
                duration: isNewMatch ? 0.38 : 0.3,
                delay: isNewMatch ? entranceDelay : index * 0.035,
              },
              y: { duration: 0.38, delay: entranceDelay, ease: "easeOut" },
              borderColor: { duration: 1.2, delay: entranceDelay, ease: "easeOut" },
              boxShadow: { duration: 1.2, delay: entranceDelay, ease: "easeOut" },
            }}
            whileHover={{ background: "linear-gradient(135deg, rgba(16,29,49,0.98), rgba(12,21,32,0.98))", x: 3 }}
          >
            <small className="text-xs font-medium text-[var(--muted)] md:translate-x-[4px]">
              {matchNumbers ? `#${matchNumber ?? "-"}` : ""}
            </small>
            <div className="grid w-full max-w-[600px] grid-cols-[minmax(0,1fr)_48px_minmax(0,1fr)] items-start gap-1.5 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:gap-6">
              <MatchSide
                name={match.p1Name}
                ids={p1CharacterIds}
                seat="1P"
                won={p1Won}
                hasKnownWinner={hasKnownWinner}
              />
              <strong
                className="flex self-center items-center justify-center gap-1 whitespace-nowrap text-lg font-bold text-[var(--text)] sm:gap-1.5 sm:text-2xl"
                aria-label={`1P ${match.p1Score}점 대 2P ${match.p2Score}점`}
              >
                <span>{match.p1Score}</span>
                <small className="text-[10px] font-bold tracking-[0.2em] text-[var(--muted)]">VS</small>
                <span>{match.p2Score}</span>
              </strong>
              <MatchSide
                name={match.p2Name}
                ids={p2CharacterIds}
                seat="2P"
                won={p2Won}
                hasKnownWinner={hasKnownWinner}
              />
            </div>
            <div className="grid min-w-0 items-center gap-2 text-sm text-[var(--muted)] md:pl-2">
              <span className="min-w-0">
                {match.mapId === null ? (
                  <>
                    <span className="theme-surface-muted grid aspect-video w-full place-items-center rounded-md text-xs font-bold">?</span>
                    <span className="mt-2 block font-semibold text-[var(--text)]">Map unavailable</span>
                  </>
                ) : (
                  <button
                    type="button"
                    className="grid min-w-0 gap-1.5 rounded-md border-0 bg-transparent p-0 text-left text-[var(--text)] max-md:w-full"
                    onClick={() => onMapClick(match.mapId as number)}
                    aria-label={`${mapLabel(match.mapId)} 맵 크게 보기`}
                  >
                    <MapImage
                      id={match.mapId}
                      width={640}
                      height={360}
                      sizes="(max-width: 767px) 100vw, (max-width: 1100px) 150px, 208px"
                      className="w-full rounded-md border border-[var(--line)] object-cover"
                    />
                    <span className="truncate font-semibold text-[var(--text)]">{mapLabel(match.mapId)}</span>
                  </button>
                )}
              </span>
            </div>
            <time className="grid gap-1 text-xs text-[var(--muted)] md:justify-self-end md:text-right">
              <strong className="text-sm font-bold text-[var(--cyan)]">{formatDuration(match.startAt, match.endAt)}</strong>
              <span>시작 {match.startAt ? formatDate(match.startAt) : "시간 없음"}</span>
              <span>종료 {formatDate(match.endAt ?? match.playedAt)}</span>
            </time>
          </motion.div>
        );
      })}
      </div>
    </MotionConfig>
  );
}
