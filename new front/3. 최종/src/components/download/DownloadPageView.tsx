"use client";

import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";

const releaseUrl =
  "https://github.com/opggttt2pj/TAG2.GG-Tracker/releases/latest/download/TAG2GGTracker.zip";

export function DownloadPageView() {
  return (
    <AppShell
      title="Tracker 다운로드"
      description="Tekken Tag Tournament 2 대전 기록 프로그램을 다운로드합니다."
    >
      <motion.article
        className="theme-panel rounded-2xl p-5"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -4, borderColor: "rgba(14, 165, 233, 0.4)" }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
      >
        <p className="text-base leading-7 text-[var(--text)]">
          Tracker를 실행해 두면 RPCS3에서 진행한 온라인 대전이 자동으로 기록됩니다. 기록된
          경기부터 TAG2.GG에서 전적과 통계를 확인할 수 있습니다.
        </p>
        <div className="mt-5 grid gap-2 rounded-xl border-l-4 border-cyan-400 bg-[rgba(14,165,233,0.06)] p-4 text-[var(--text)]">
          <strong className="text-base font-semibold text-cyan-700">PC에서 다운로드해 주세요.</strong>
          <span className="text-sm leading-6 text-[var(--muted)]">
            Windows PC에서 Tracker가 실행 중일 때 진행한 온라인 대전만 기록됩니다. 실행하기 전의
            과거 경기는 자동으로 추가되지 않습니다.
          </span>
        </div>
        <a
          className="mt-5 inline-flex min-h-12 items-center justify-center rounded-lg bg-cyan-400 px-5 font-bold text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.2)] transition hover:bg-cyan-300"
          href={releaseUrl}
        >
          다운로드
        </a>
      </motion.article>
    </AppShell>
  );
}
