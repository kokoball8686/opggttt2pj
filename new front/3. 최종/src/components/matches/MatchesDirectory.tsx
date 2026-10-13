"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useMatchPage } from "@/hooks/useMatches";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBlock } from "@/components/ui/StatusBlock";
import { MatchList } from "@/components/matches/MatchList";
import { Pagination } from "@/components/matches/Pagination";
import { MapPreviewModal } from "@/components/matches/MapImage";

export function MatchesDirectory() {
  const [page, setPage] = useState(1);
  const [selectedMapId, setSelectedMapId] = useState<number | null>(null);
  const {
    matches,
    matchNumbers,
    newMatchIds,
    totalCount,
    loading,
    error,
    hasData,
  } = useMatchPage(page);
  const pageCount = Math.max(1, Math.ceil(totalCount / 10));
  const effectivePage = Math.min(page, pageCount);

  return (
    <AppShell
      title="전체 대전 기록"
      description="대전 기록을 확인합니다."
    >
      {selectedMapId !== null ? (
        <MapPreviewModal id={selectedMapId} onClose={() => setSelectedMapId(null)} />
      ) : null}
      <StatusBlock
        loading={loading}
        error={error}
        keepChildrenOnError={hasData}
      >
        <motion.article
          className="theme-panel rounded-2xl p-4 sm:p-5"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 110, damping: 20 }}
        >
          <div className="mb-5 flex items-end justify-between gap-3 border-b border-[var(--line)] pb-4">
            <div>
              <p className="text-[10px] font-bold tracking-[1.3px] text-[var(--muted)] uppercase">MATCH DIRECTORY</p>
              <h2 className="mt-2 text-xl font-bold tracking-[-0.03em] text-[var(--text)] sm:text-2xl">전체 대전 기록</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                경기별 승자, 1P·2P 점수, 사용 캐릭터, 맵과 경기 시간을 확인할 수 있습니다.
              </p>
            </div>
          </div>
          {loading ? (
            <p className="py-5 text-sm text-[var(--muted)]">대전 기록을 불러오는 중입니다.</p>
          ) : (
            <MatchList
              matches={matches}
              matchNumbers={matchNumbers}
              newMatchIds={newMatchIds}
              onMapClick={setSelectedMapId}
            />
          )}
          <Pagination
            currentPage={effectivePage}
            pageCount={pageCount}
            onPageChange={setPage}
            label="대전 기록 페이지"
          />
        </motion.article>
      </StatusBlock>
    </AppShell>
  );
}
