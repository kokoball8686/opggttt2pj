"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { characterLabel, uniqueCharacterIds } from "@/lib/matches";
import { usePlayerRankings } from "@/hooks/usePlayerRankings";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBlock } from "@/components/ui/StatusBlock";
import { CharacterImage } from "@/components/matches/CharacterImage";
import { CharacterName } from "@/components/matches/CharacterName";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

export function PlayersRanking() {
  const { data: ranking, loading, error, refreshVersion } = usePlayerRankings();

  return (
    <AppShell title="TOP 10" description="서버 전체 플레이어 상위 목록입니다.">
      <StatusBlock
        loading={loading}
        error={error}
        keepChildrenOnError={ranking !== null}
        refreshKey={refreshVersion}
        empty={ranking !== null && ranking.length === 0}
        emptyText="20전 이상인 플레이어가 없습니다."
      >
        {ranking === null ? (
          <p className="py-5 text-sm text-slate-300/80">플레이어 순위를 불러오는 중입니다.</p>
        ) : (
          <motion.article
            className="theme-panel rounded-2xl p-5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 110, damping: 20 }}
          >
            <div className="mb-4 flex gap-4 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4">
              <span className="text-2xl text-amber-600" aria-hidden="true">
                ⚠
              </span>
              <div>
                <strong className="block text-sm font-bold text-amber-700">실전 기록을 바탕으로 한 플레이어 랭킹</strong>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                  현재 순위는 계급이 아닌 승률을 기준으로 산정됩니다. 객관적인 비교를 위해 총 20전
                  이상 기록된 플레이어만 집계하며, 승률이 같을 경우 더 많은 경기 수를 기록한
                  플레이어가 우선됩니다.
                </p>
              </div>
            </div>
            <div className="grid">
              {ranking.map((item, index) => {
                const ids = uniqueCharacterIds(item.team.ids);
                return (
                  <Link
                    className="grid items-center gap-3 border-b border-[var(--line)] py-4 last:border-b-0 md:grid-cols-[42px_minmax(0,calc(48%-66px))_minmax(0,1fr)_72px]"
                    href={`/profile/${encodeURIComponent(item.name)}`}
                    key={item.name}
                  >
                    <b className="text-sm font-bold text-[var(--muted)]">{String(index + 1).padStart(2, "0")}</b>
                    <div className="min-w-0">
                      <strong className="mb-1 block text-base font-semibold text-[var(--text)]">{item.name}</strong>
                      <span className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
                        {ids.map((id) => (
                          <CharacterImage
                            key={id}
                            id={id}
                            width={72}
                            height={80}
                            sizes="(max-width: 500px) 56px, 72px"
                          />
                        ))}
                        {ids.length ? (
                          <CharacterName className="whitespace-nowrap text-base text-[var(--text)]">
                            {ids.map(characterLabel).join(" · ")}
                          </CharacterName>
                        ) : null}
                      </span>
                    </div>
                    <span className="text-base text-[var(--muted)] md:justify-self-start">
                      <AnimatedNumber value={item.games} refreshKey={refreshVersion} />전{" "}
                      <AnimatedNumber value={item.wins} refreshKey={refreshVersion} />승{" "}
                      <AnimatedNumber value={item.games - item.wins} refreshKey={refreshVersion} />패
                    </span>
                    <em className="text-right text-xl font-bold text-[var(--cyan)] md:text-left">
                      <AnimatedNumber
                        value={item.rate}
                        refreshKey={refreshVersion}
                        decimals={1}
                      />%
                    </em>
                  </Link>
                );
              })}
            </div>
          </motion.article>
        )}
      </StatusBlock>
    </AppShell>
  );
}
