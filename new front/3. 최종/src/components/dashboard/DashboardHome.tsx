"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { characterLabel, uniqueCharacterIds } from "@/lib/matches";
import { useDashboardStatistics } from "@/hooks/useDashboardStatistics";
import { AppShell } from "@/components/layout/AppShell";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { StatusBlock } from "@/components/ui/StatusBlock";
import {
  ActivityBarChart,
  CHART_COLORS,
  HorizontalRateChart,
  PickRateDonutChart,
  RisingCompareChart,
} from "@/components/charts/Charts";

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 105, damping: 18 },
  },
};

function StatCard({
  label,
  value,
  note,
  refreshKey,
}: {
  label: string;
  value: number;
  note: string;
  refreshKey: number;
}) {
  return (
    <motion.article
      className="theme-panel relative overflow-hidden rounded-2xl p-3 sm:p-5"
      variants={cardVariants}
      whileHover={{ y: -6, scale: 1.025 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="absolute -right-10 -top-10 h-20 w-20 rounded-full bg-[rgba(241,178,108,0.08)] blur-2xl sm:h-28 sm:w-28" />
      <span className="relative block text-[9px] leading-[1.25] font-medium tracking-[0.12em] text-slate-300/80 uppercase max-sm:min-h-[2.5em] sm:text-[16px] sm:tracking-[0.18em]">{label}</span>
      <strong className="relative mt-1.5 block text-[20px] font-bold tracking-[-0.04em] text-white sm:mt-2 sm:text-[42px] lg:text-[52px]">
        <AnimatedNumber value={value} refreshKey={refreshKey} />
      </strong>
      <small className="relative mt-1 block text-[9px] text-slate-400 sm:text-base">{note}</small>
    </motion.article>
  );
}

function PanelHeader({
  eyebrow,
  title,
  description,
  badge,
  stackBadgeOnMobile = false,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  badge?: string;
  stackBadgeOnMobile?: boolean;
}) {
  const badgeClass =
    "shrink-0 rounded-full border border-slate-600/80 bg-slate-700/30 px-2 py-1 text-[9px] font-medium tracking-[0.08em] text-slate-200 uppercase sm:text-[13px]";

  return (
    <div className="mb-3 flex items-start justify-between gap-2 sm:gap-3">
      <div className="min-w-0 flex-1">
        <div className={stackBadgeOnMobile ? "flex items-center justify-between gap-2" : ""}>
          <p className="text-[12px] font-bold tracking-[1.2px] text-slate-400 uppercase sm:text-[16px]">
            {eyebrow}
          </p>
          {badge && stackBadgeOnMobile ? (
            <span className={badgeClass}>{badge}</span>
          ) : null}
        </div>
        <h3
          className={`mt-1 mb-0.5 text-[20px] font-semibold tracking-[-0.03em] text-slate-100 sm:mt-1.5 sm:mb-1 sm:whitespace-nowrap sm:text-[30px] ${
            stackBadgeOnMobile ? "whitespace-nowrap" : ""
          }`}
        >
          {title}
        </h3>
        {description ? (
          <p className="min-w-0 break-words text-[12px] leading-5 text-slate-300/80 sm:text-base sm:leading-7">
            {description}
          </p>
        ) : null}
      </div>
      {badge && !stackBadgeOnMobile ? (
        <span className={badgeClass}>{badge}</span>
      ) : null}
    </div>
  );
}

export function DashboardHome() {
  const { data: summary, loading, error, refreshVersion } = useDashboardStatistics();
  const monthly = summary?.activity.reduce((total, day) => total + day.count, 0) ?? 0;

  return (
    <AppShell
      title="홈"
      description="커뮤니티 전체 대전 데이터를 한눈에 확인하세요."
    >
      <StatusBlock
        loading={loading}
        error={error}
        keepChildrenOnError={summary !== null}
        refreshKey={refreshVersion}
      >
        {summary ? (
          <>
        <motion.section
          className="mb-4 grid grid-cols-3 gap-2 sm:gap-3"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.09 } } }}
        >
          {[
            { value: summary.totalMatches, label: "전체 대전", note: "전체 기록" },
            { value: summary.totalPlayers, label: "등록 플레이어", note: "활동 플레이어" },
            {
              value: summary.todayMatches,
              label: "오늘 대전",
              note: "한국 시간 기준",
            },
          ].map(({ value, label, note }) => (
            <StatCard
              key={label}
              label={label}
              value={value}
              note={note}
              refreshKey={refreshVersion}
            />
          ))}
        </motion.section>

        <motion.section
          className="grid gap-3 lg:grid-cols-2"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } } }}
        >
          <motion.article
            className="theme-panel relative overflow-hidden rounded-2xl p-5"
            variants={cardVariants}
            whileHover={{ y: -5, borderColor: "rgba(70, 217, 255, 0.48)" }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}
          >
            <PanelHeader
              eyebrow="META"
              title="캐릭터 픽률"
              description="전체 경기에서 각 캐릭터가 차지한 출전 비율입니다."
              badge="TOP 6"
            />
            <PickRateDonutChart
              refreshKey={refreshVersion}
              data={summary.characters.map((entry, index) => ({
                label: characterLabel(entry.id),
                value: Number(entry.rate.toFixed(1)),
                fill: CHART_COLORS[index % CHART_COLORS.length],
                characterIds: [entry.id],
              }))}
            />
          </motion.article>

          <motion.article
            className="theme-panel relative overflow-hidden rounded-2xl p-5"
            variants={cardVariants}
            whileHover={{ y: -5, borderColor: "rgba(139, 123, 255, 0.55)" }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}
          >
            <PanelHeader
              eyebrow="TEAM META"
              title="고승률 태그 조합"
              description="10전 이상 기록된 조합을 승률 순으로 표시합니다."
              badge="10전 이상 · TOP 6"
            />
            <HorizontalRateChart
              animationOnly
              refreshKey={refreshVersion}
              data={summary.combos.map((combo) => ({
                label: uniqueCharacterIds(combo.ids).map(characterLabel).join(" · "),
                value: Number(combo.rate.toFixed(1)),
                characterIds: uniqueCharacterIds(combo.ids),
              }))}
            />
          </motion.article>

          <motion.article
            className="theme-panel relative overflow-hidden rounded-2xl p-5"
            variants={cardVariants}
            whileHover={{ y: -5, borderColor: "rgba(90, 240, 186, 0.5)" }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}
          >
            <PanelHeader
              eyebrow="RISING STAR"
              title="이번 주 급상승 플레이어"
              description="직전 7일과 최근 7일 모두 10전 이상인 플레이어 중 승률 상승폭 1위입니다."
              badge="최근 7일 · 최소 10전"
              stackBadgeOnMobile
            />
            {summary.rising ? (
              <>
                <div className="relative mt-3 mb-2 overflow-hidden rounded-xl border border-emerald-300/20 bg-gradient-to-br from-emerald-400/[0.12] via-cyan-400/[0.07] to-transparent p-3 sm:p-4">
                  <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-emerald-300/15 blur-3xl" />
                  <div className="relative flex items-center justify-between gap-3">
                    <Link
                      className="min-w-0 text-[19px] leading-tight font-extrabold tracking-[-0.03em] text-white drop-shadow-[0_0_14px_rgba(90,240,186,0.18)] transition-colors hover:text-emerald-200 sm:text-[24px]"
                      href={`/profile/${encodeURIComponent(summary.rising.name)}`}
                    >
                      {summary.rising.name}
                    </Link>
                    <div className="shrink-0 rounded-lg border border-emerald-200/20 bg-emerald-300/[0.10] px-3 py-1.5 text-right shadow-[0_0_24px_rgba(90,240,186,0.12)] sm:px-4 sm:py-2">
                      <span className="block text-[9px] leading-tight font-semibold tracking-[0.12em] text-emerald-100/70 uppercase sm:text-[10px]">
                        승률 상승
                      </span>
                      <strong className="block bg-gradient-to-r from-emerald-200 via-cyan-100 to-white bg-clip-text text-[25px] leading-tight font-black tracking-[-0.04em] text-transparent drop-shadow-[0_0_12px_rgba(90,240,186,0.3)] tabular-nums sm:text-[32px]">
                        +<AnimatedNumber
                          value={summary.rising.recentRate - summary.rising.previousRate}
                          refreshKey={refreshVersion}
                          decimals={1}
                        />
                        <small className="ml-0.5 text-[12px] font-bold tracking-normal sm:text-[14px]">%p</small>
                      </strong>
                    </div>
                  </div>
                </div>
                <RisingCompareChart
                  previousRate={summary.rising.previousRate}
                  recentRate={summary.rising.recentRate}
                  previousGames={summary.rising.previous.games}
                  previousWins={summary.rising.previous.wins}
                  recentGames={summary.rising.recent.games}
                  recentWins={summary.rising.recent.wins}
                  refreshKey={refreshVersion}
                />
              </>
            ) : (
              <p className="pt-4 text-sm leading-6 text-[color:rgba(244,239,233,0.75)]">
                최근 7일과 직전 7일을 각각 10전 이상 기록한 상승 플레이어가 아직 없습니다.
              </p>
            )}
          </motion.article>

          <motion.article
            className="theme-panel relative overflow-hidden rounded-2xl p-5"
            variants={cardVariants}
            whileHover={{ y: -5, borderColor: "rgba(255, 189, 74, 0.5)" }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}
          >
            <PanelHeader
              eyebrow="ACTIVITY"
              title="월간 대전 횟수"
              description="최근 30일 날짜별 경기량입니다."
              badge="최근 30일"
            />
            <div className="mb-2 flex items-baseline gap-2">
              <strong className="text-[28px] font-bold text-[var(--text)]">
                <AnimatedNumber value={monthly} refreshKey={refreshVersion} />
              </strong>
              <span className="text-sm text-[color:rgba(244,239,233,0.75)]">경기</span>
            </div>
            <ActivityBarChart
              data={summary.activity.map((day) => ({
                key: day.key,
                label: day.label,
                count: day.count,
              }))}
            />
          </motion.article>

        </motion.section>
          </>
        ) : (
          <p className="py-5 text-sm text-slate-300/80">대시보드 통계를 불러오는 중입니다.</p>
        )}
      </StatusBlock>
    </AppShell>
  );
}
