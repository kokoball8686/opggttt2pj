"use client";

import { useId } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CharacterImage } from "@/components/matches/CharacterImage";
import { AnimatedNumber, useAnimatedNumber } from "@/components/ui/AnimatedNumber";
import { characterLabel } from "@/lib/matches";

export const CHART_COLORS = ["#46d9ff", "#8b7bff", "#ff5da2", "#ffbd4a", "#5af0ba", "#ff785e"];
const GLOW = "drop-shadow(0 0 9px rgba(70, 217, 255, 0.32))";
const TOOLTIP_STYLE = {
  padding: "10px 12px",
  backgroundColor: "rgba(9, 17, 30, 0.97)",
  border: "1px solid rgba(99, 220, 255, 0.42)",
  borderRadius: 12,
  color: "#eef6ff",
  boxShadow: "0 12px 36px rgba(0, 0, 0, 0.45)",
};

type NamedRate = {
  label: string;
  value: number;
  fill?: string;
  characterIds?: number[];
  detail?: { games: number; wins: number };
};

export function PickRateDonutChart({
  data,
  refreshKey,
}: {
  data: NamedRate[];
  refreshKey: string | number;
}) {
  const total = data.reduce((sum, entry) => sum + entry.value, 0);
  const chartData =
    total < 99.95
      ? [...data, { label: "그 외 캐릭터", value: 100 - total, fill: "#31415a" }]
      : data;

  return (
    <div className="grid min-h-[300px] items-center gap-3 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <div className="relative mx-auto h-[300px] w-full max-w-[320px] drop-shadow-[0_15px_24px_rgba(0,0,0,0.22)]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="label"
              innerRadius="65%"
              outerRadius="92%"
              paddingAngle={4}
              cornerRadius={6}
              stroke="rgba(255,255,255,0.18)"
              strokeWidth={1}
              isAnimationActive
              animationDuration={1100}
              animationEasing="ease-out"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={entry.label}
                  fill={entry.fill ?? CHART_COLORS[index % CHART_COLORS.length]}
                  style={{ filter: GLOW }}
                />
              ))}
            </Pie>
            <Tooltip
              wrapperClassName="chart-tooltip"
              position={{ x: 6, y: 6 }}
              allowEscapeViewBox={{ x: true, y: true }}
              wrapperStyle={{ zIndex: 20, pointerEvents: "none" }}
              content={({ active, payload }) => {
                const entry = payload?.[0]?.payload as NamedRate | undefined;
                if (!active || !entry) return null;

                const index = chartData.findIndex((item) => item.label === entry.label);
                const color = entry.fill ?? CHART_COLORS[index % CHART_COLORS.length];

                return (
                  <div className="chart-tooltip flex items-center gap-2 whitespace-nowrap" style={TOOLTIP_STYLE}>
                    <i style={{ background: color, color, width: 12, height: 12, borderRadius: 9999, display: "inline-block" }} />
                    <strong>{entry.label}</strong>
                    <span>{Number(entry.value).toFixed(1)}%</span>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-content-center" aria-hidden="true">
          <strong
            className="text-center text-[34px] leading-none text-slate-50"
            style={{ textShadow: "0 0 22px rgba(70, 217, 255, 0.45)" }}
          >
            <AnimatedNumber value={data.length} refreshKey={refreshKey} />
          </strong>
          <span className="mt-2 text-[10px] font-extrabold tracking-[1.5px] text-slate-400">TOP PICKS</span>
        </div>
      </div>
      <div className="grid gap-1.5">
        {chartData.map((entry, index) => (
          <div
            className="grid grid-cols-[16px_auto_minmax(0,1fr)] items-center gap-2 rounded-lg border border-transparent p-2 text-slate-200 transition hover:border-sky-400/20 hover:bg-sky-500/5 hover:translate-x-1"
            key={entry.label}
          >
            <i
              className="h-3.5 w-3.5 justify-self-center rounded-full border border-white/50 shadow-[0_0_12px_currentColor]"
              style={{
                background: entry.fill ?? CHART_COLORS[index % CHART_COLORS.length],
                color: entry.fill ?? CHART_COLORS[index % CHART_COLORS.length],
              }}
            />
            {entry.characterIds?.length ? (
              <span className="flex items-center gap-1">
                {entry.characterIds.map((id) => (
                  <CharacterImage
                    key={id}
                    id={id}
                    width={80}
                    height={80}
                    className="h-20 w-20 shrink-0 bg-transparent"
                  />
                ))}
              </span>
            ) : (
              <span className="theme-placeholder grid h-20 w-20 place-items-center gap-1 rounded-md" aria-hidden="true">
                <svg className="h-8 w-8" viewBox="0 0 32 32" fill="none">
                  <circle cx="12" cy="10" r="4" stroke="currentColor" strokeWidth="2" />
                  <circle cx="23" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                  <path d="M4 25c0-4.2 3.4-7 8-7s8 2.8 8 7v1H4v-1Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                  <path d="M21 19c3.8-.5 7 1.7 7 5v2h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <small className="text-[8px] font-extrabold tracking-[1px]">OTHERS</small>
              </span>
            )}
            <span className="flex min-w-0 items-center justify-between gap-2 whitespace-nowrap text-[18px] leading-none" style={{ fontFamily: '"Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif' }}>
              <span>{entry.label}</span>
              <strong className="font-bold text-slate-50">
                <AnimatedNumber
                  value={entry.value}
                  refreshKey={refreshKey}
                  decimals={1}
                />%
              </strong>
            </span>
          </div>
        ))}
      </div>
      <span className="sr-only">표시된 캐릭터 픽률 합계 {total.toFixed(1)}%</span>
    </div>
  );
}

function CharacterAxisTick({
  x = 0,
  y = 0,
  payload,
  data,
}: {
  x?: string | number;
  y?: string | number;
  payload?: { value: string | number };
  data: NamedRate[];
}) {
  const clipId = useId().replace(/:/g, "");
  const xPosition = Number(x) || 0;
  const yPosition = Number(y) || 0;
  const label = String(payload?.value ?? "");
  const entry = data.find((item) => item.label === label);
  if (!entry?.characterIds?.length) {
    return (
      <text x={xPosition} y={yPosition} dy={5} textAnchor="end" fill="#d4e1f2" fontSize={16}>
        {label}
      </text>
    );
  }

  const imageWidth = 80;
  const imageHeight = 80;
  const imageGap = 6;
  const imageStep = imageWidth + imageGap;

  return (
    <g transform={`translate(${xPosition - 340}, ${yPosition - 40})`}>
      {entry.characterIds.map((id, index) => (
        <g key={id}>
          <defs>
            <clipPath id={`${clipId}-desktop-${index}`}>
              <rect x={index * imageStep} y={0} width={imageWidth} height={imageHeight} rx={6} />
            </clipPath>
          </defs>
          <image
            href={`/characters/${id}.webp`}
            x={index * imageStep}
            y={0}
            width={imageWidth}
            height={imageHeight}
            preserveAspectRatio="xMidYMid meet"
            clipPath={`url(#${clipId}-desktop-${index})`}
          />
          <rect
            x={index * imageStep}
            y={0}
            width={imageWidth}
            height={imageHeight}
            rx={6}
            fill="none"
            stroke="rgba(156, 174, 216, 0.22)"
          />
        </g>
      ))}
      <text
        x={entry.characterIds.length * imageStep}
        y={imageHeight / 2}
        dominantBaseline="middle"
        fill="#d4e1f2"
        fontSize={18}
        fontFamily='"Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif'
        fontWeight={500}
      >
        {entry.label}
      </text>
    </g>
  );
}

function RateAxisTick({
  x = 0,
  y = 0,
  payload,
  data,
  refreshKey,
}: {
  x?: string | number;
  y?: string | number;
  payload?: { value: string | number };
  data: NamedRate[];
  refreshKey: string | number;
}) {
  const xPosition = Number(x) || 0;
  const yPosition = Number(y) || 0;
  const entry = data.find((item) => item.label === String(payload?.value ?? ""));
  const games = useAnimatedNumber(entry?.detail?.games ?? 0, refreshKey);
  const wins = useAnimatedNumber(entry?.detail?.wins ?? 0, refreshKey);

  return (
    <g textAnchor="end">
      <text x={xPosition} y={yPosition - 5} fill="#d4e1f2" fontSize={14} fontWeight={700}>
        {entry?.label ?? payload?.value}
      </text>
      {entry?.detail ? (
        <text x={xPosition} y={yPosition + 15} fill="#b5c5da" fontSize={14} fontWeight={600}>
          {games}전 {wins}승
        </text>
      ) : null}
    </g>
  );
}

function CompactCharacterAxisTick({
  x = 0,
  y = 0,
  payload,
  data,
}: {
  x?: string | number;
  y?: string | number;
  payload?: { value: string | number };
  data: NamedRate[];
}) {
  const clipId = useId().replace(/:/g, "");
  const xPosition = Number(x) || 0;
  const yPosition = Number(y) || 0;
  const entry = data.find((item) => item.label === String(payload?.value ?? ""));
  if (!entry?.characterIds?.length) {
    return (
      <text x={xPosition} y={yPosition} dy={5} textAnchor="end" fill="#d4e1f2" fontSize={12}>
        {entry?.label ?? payload?.value}
      </text>
    );
  }

  const imageWidth = 80;
  const imageHeight = 80;
  const imageGap = 6;
  const imagesWidth = entry.characterIds.length * imageWidth + (entry.characterIds.length - 1) * imageGap;
  const axisWidth = 168;
  const startX = (axisWidth - imagesWidth) / 2;

  return (
    <g transform={`translate(${xPosition - axisWidth}, ${yPosition - 52})`}>
      {entry.characterIds.map((id, index) => (
        <g key={id}>
          <defs>
            <clipPath id={`${clipId}-mobile-${index}`}>
              <rect
                x={startX + index * (imageWidth + imageGap)}
                y={0}
                width={imageWidth}
                height={imageHeight}
                rx={6}
              />
            </clipPath>
          </defs>
          <image
            href={`/characters/${id}.webp`}
            x={startX + index * (imageWidth + imageGap)}
            y={0}
            width={imageWidth}
            height={imageHeight}
            preserveAspectRatio="xMidYMid meet"
            clipPath={`url(#${clipId}-mobile-${index})`}
          />
          <rect
            x={startX + index * (imageWidth + imageGap)}
            y={0}
            width={imageWidth}
            height={imageHeight}
            rx={6}
            fill="none"
            stroke="rgba(156, 174, 216, 0.22)"
          />
        </g>
      ))}
      {entry.characterIds.map((id, index) => (
        <text
          key={`${id}-label`}
          x={startX + index * (imageWidth + imageGap) + imageWidth / 2}
          y={100}
          textAnchor="middle"
          fill="#d4e1f2"
          fontSize={15}
          fontFamily='"Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif'
          fontWeight={500}
        >
          {characterLabel(id)}
        </text>
      ))}
    </g>
  );
}

export function HorizontalRateChart({
  data,
  animationOnly = false,
  refreshKey = 0,
}: {
  data: NamedRate[];
  animationOnly?: boolean;
  refreshKey?: string | number;
}) {
  const hasCharacterImages = data.some((entry) => entry.characterIds?.length);
  const chartId = useId().replace(/:/g, "");
  const renderChart = (compact: boolean) => (
    <ResponsiveContainer
      width="100%"
      height={
        hasCharacterImages
          ? data.length * (compact ? 132 : 108)
          : Math.max(180, data.length * 42)
      }
    >
      <BarChart
        data={data}
        layout="vertical"
        margin={{ left: compact ? 2 : 8, right: 18, top: 8, bottom: 8 }}
        barCategoryGap="28%"
      >
        {animationOnly ? null : (
          <defs>
            {data.map((entry, index) => (
              <linearGradient
                id={`${chartId}-${compact ? "mobile" : "desktop"}-bar-${index}`}
                key={`${entry.label}-${index}`}
                x1="0"
                y1="0"
                x2="1"
                y2="0"
              >
                <stop offset="0%" stopColor={entry.fill ?? CHART_COLORS[index % CHART_COLORS.length]} />
                <stop offset="55%" stopColor="#e8fbff" stopOpacity="0.9" />
                <stop offset="100%" stopColor={entry.fill ?? CHART_COLORS[index % CHART_COLORS.length]} />
              </linearGradient>
            ))}
          </defs>
        )}
        <CartesianGrid strokeDasharray="2 6" stroke="#34465e" horizontal={false} />
        <XAxis
          type="number"
          stroke="#8193ad"
          tickFormatter={(value) => `${value}%`}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: compact ? 10 : 13, fill: "#93a6c0" }}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={hasCharacterImages ? (compact ? 176 : 340) : 104}
          stroke="#a9bad0"
          axisLine={false}
          tickLine={false}
          tick={(props) =>
            hasCharacterImages && compact ? (
              <CompactCharacterAxisTick {...props} data={data} />
            ) : data.some((entry) => entry.detail) ? (
              <RateAxisTick {...props} data={data} refreshKey={refreshKey} />
            ) : (
              <CharacterAxisTick {...props} data={data} />
            )
          }
        />
        <Tooltip
          wrapperClassName="chart-tooltip"
          formatter={(value) => [`${Number(value).toFixed(1)}%`, "비율"]}
          cursor={animationOnly ? false : { fill: "rgba(115, 196, 255, 0.08)" }}
          contentStyle={TOOLTIP_STYLE}
        />
        <Bar
          dataKey="value"
          radius={animationOnly ? [0, 6, 6, 0] : [0, 8, 8, 0]}
          isAnimationActive
          animationBegin={120}
          animationDuration={1250}
          animationEasing="ease-out"
          background={{ fill: "rgba(130, 160, 195, 0.08)", radius: 8 }}
        >
          {data.map((entry, index) => (
            <Cell
              key={entry.label}
              fill={
                animationOnly
                  ? entry.fill ?? CHART_COLORS[index % CHART_COLORS.length]
                  : `url(#${chartId}-${compact ? "mobile" : "desktop"}-bar-${index})`
              }
              stroke={animationOnly ? "rgba(255,255,255,0.18)" : "none"}
              strokeWidth={animationOnly ? 1 : 0}
              style={
                animationOnly
                  ? { filter: GLOW }
                  : { filter: "drop-shadow(0 0 8px rgba(70, 217, 255, 0.62))" }
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  return (
    <div className={`w-full min-h-[180px] ${hasCharacterImages ? "min-w-0" : ""}`}>
      {hasCharacterImages ? (
        <div className="-mx-4 w-[calc(100%+2rem)] md:hidden">
          {renderChart(true)}
        </div>
      ) : null}
      <div className={hasCharacterImages ? "hidden md:block" : "block"}>
        {renderChart(false)}
      </div>
    </div>
  );
}

export function RisingCompareChart({
  previousRate,
  recentRate,
  previousGames,
  previousWins,
  recentGames,
  recentWins,
  refreshKey,
}: {
  previousRate: number;
  recentRate: number;
  previousGames: number;
  previousWins: number;
  recentGames: number;
  recentWins: number;
  refreshKey: string | number;
}) {
  return (
    <HorizontalRateChart
      refreshKey={refreshKey}
      data={[
        {
          label: "직전 7일",
          detail: { games: previousGames, wins: previousWins },
          value: Number(previousRate.toFixed(1)),
          fill: "#74849d",
        },
        {
          label: "최근 7일",
          detail: { games: recentGames, wins: recentWins },
          value: Number(recentRate.toFixed(1)),
          fill: "#46d9ff",
        },
      ]}
    />
  );
}

export function ActivityBarChart({
  data,
}: {
  data: Array<{ key: string; label: string; count: number }>;
}) {
  return (
    <div className="chart-box activity-chart-box">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ left: 0, right: 8, top: 16, bottom: 8 }}>
          <defs>
            <linearGradient id="activity-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#57e6ff" stopOpacity={1} />
              <stop offset="100%" stopColor="#557bff" stopOpacity={0.62} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 6" stroke="#34465e" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="#8193ad"
            tick={{ fontSize: 13, fill: "#93a6c0" }}
            axisLine={false}
            tickLine={false}
            interval={4}
          />
          <YAxis
            stroke="#8193ad"
            allowDecimals={false}
            width={36}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#93a6c0" }}
          />
          <Tooltip
            wrapperClassName="chart-tooltip"
            formatter={(value) => [`${value}경기`, "대전"]}
            labelFormatter={(label) => `${label}`}
            cursor={{ fill: "rgba(115, 196, 255, 0.08)" }}
            contentStyle={TOOLTIP_STYLE}
          />
          <Bar
            dataKey="count"
            fill="url(#activity-gradient)"
            radius={[6, 6, 0, 0]}
            isAnimationActive
            animationDuration={1100}
            animationEasing="ease-out"
            style={{ filter: GLOW }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WinRateGauge({
  rate,
  label,
  refreshKey,
  size = 88,
  className,
}: {
  rate: number;
  label: string;
  refreshKey: string | number;
  size?: number;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, rate));
  const chartId = useId().replace(/:/g, "");

  return (
    <div
      className={`relative shrink-0 drop-shadow-[0_0_12px_rgba(70,217,255,0.18)] ${className ?? ""}`}
      role="img"
      aria-label={`${label} 승률 ${clamped.toFixed(1)}%`}
      style={!className ? { width: size, height: size } : undefined}
    >
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          data={[{ rate: clamped }]}
          cx="50%"
          cy="50%"
          innerRadius="72%"
          outerRadius="100%"
          startAngle={90}
          endAngle={-270}
        >
          <defs>
            <linearGradient id={`${chartId}-win-rate`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="48%" stopColor="#46d9ff" />
              <stop offset="100%" stopColor="#5af0ba" />
            </linearGradient>
            <filter id={`${chartId}-win-rate-glow`} x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <PolarAngleAxis type="number" domain={[0, 100]} dataKey="rate" tick={false} />
          <RadialBar
            dataKey="rate"
            fill={`url(#${chartId}-win-rate)`}
            background={{ fill: "#26354b", stroke: "#52617a", strokeWidth: 1 }}
            cornerRadius={12}
            style={{ filter: `url(#${chartId}-win-rate-glow)` }}
            isAnimationActive
            animationBegin={80}
            animationDuration={1100}
            animationEasing="ease-out"
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <strong className="pointer-events-none absolute inset-0 flex items-center justify-center whitespace-nowrap text-[clamp(9px,3vw,14px)] font-semibold text-[#eff8ff] [text-shadow:0_0_12px_rgba(70,217,255,0.36)]">
        <AnimatedNumber value={clamped} refreshKey={refreshKey} decimals={1} />%
      </strong>
    </div>
  );
}
