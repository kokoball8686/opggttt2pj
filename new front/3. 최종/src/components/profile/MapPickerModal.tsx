"use client";

import { useEffect } from "react";
import { MapImage } from "@/components/matches/MapImage";
import { mapLabel, mapNames } from "@/lib/matches";

type Props = {
  gamesByMap: Map<number, number>;
  selectedMapId: number | null;
  onSelect: (id: number) => void;
  onClose: () => void;
};

export function MapPickerModal({ gamesByMap, selectedMapId, onSelect, onClose }: Props) {
  const mapIds = Object.keys(mapNames).map(Number).sort((a, b) => a - b);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/85 p-3 sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="flex max-h-[min(88dvh,760px)] w-full max-w-[760px] flex-col overflow-hidden rounded-2xl border border-slate-600 bg-slate-900 shadow-[0_18px_48px_rgba(0,0,0,0.42)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="map-picker-title"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-700 px-4 py-3 sm:px-5">
          <div>
            <h2 id="map-picker-title" className="text-lg font-bold text-white">맵 선택</h2>
            <p className="mt-1 text-xs text-slate-400">맵을 선택해주세요.</p>
          </div>
          <button
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-600 bg-slate-950/80 text-lg text-white"
            type="button"
            aria-label="맵 선택 닫기"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="grid grid-cols-2 gap-2 overflow-y-auto p-3 sm:grid-cols-3 sm:gap-3 sm:p-4">
          {mapIds.map((id) => {
            const games = gamesByMap.get(id) ?? 0;
            const selected = selectedMapId === id;
            return (
              <button
                key={id}
                className={[
                  "flex h-[140px] min-w-0 flex-col items-stretch overflow-hidden rounded-xl border text-left transition-colors max-sm:h-auto max-sm:min-h-[140px] sm:h-[170px]",
                  selected
                    ? "border-cyan-300 bg-cyan-400/10 ring-1 ring-cyan-300/50"
                    : "border-slate-700 bg-slate-800/70 hover:border-slate-500",
                ].join(" ")}
                type="button"
                aria-label={`${mapLabel(id)}, ${games ? `${games}전 기록 있음` : "전적 없음"}`}
                aria-pressed={selected}
                onClick={() => {
                  onSelect(id);
                  onClose();
                }}
              >
                <span className="block bg-slate-950/60 p-1.5 sm:p-2">
                  <MapImage
                    id={id}
                    width={320}
                    height={180}
                    sizes="(max-width: 640px) 45vw, 230px"
                    className="aspect-video w-full object-contain"
                  />
                </span>
                <span className="flex min-h-10 min-w-0 items-center justify-between gap-1 px-2 py-1.5 max-sm:flex-col max-sm:items-stretch max-sm:gap-0">
                  <span className="line-clamp-2 min-w-0 text-left text-[11px] font-semibold leading-tight text-slate-100 max-sm:line-clamp-none max-sm:w-full sm:text-xs">
                    {mapLabel(id)}
                  </span>
                  <span className="shrink-0 text-[10px] text-slate-400 max-sm:self-end">
                    {games ? `${games}전` : "기록 없음"}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
