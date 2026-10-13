"use client";

import { useEffect, useId, useRef, useState } from "react";

type Props = {
  currentPage: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  label: string;
};

export function Pagination({ currentPage, pageCount, onPageChange, label }: Props) {
  const [pageMenuOpen, setPageMenuOpen] = useState(false);
  const pageMenuId = useId();
  const pagePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pageMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!pagePickerRef.current?.contains(event.target as Node)) {
        setPageMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPageMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [pageMenuOpen]);

  return (
    <nav className="mt-4 flex items-center justify-center gap-3" aria-label={label}>
      <button
        className="theme-button h-11 min-w-11 rounded-lg text-lg disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="이전 페이지"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        type="button"
      >
        ‹
      </button>
      <div className="relative flex items-center gap-2 text-sm text-[var(--muted)]" ref={pagePickerRef}>
        <button
          type="button"
          className="theme-button flex h-11 min-w-[76px] items-center justify-center gap-2 rounded-lg border px-2 font-semibold text-[var(--text)]"
          aria-label={`${label} 선택`}
          aria-expanded={pageMenuOpen}
          aria-controls={pageMenuId}
          onClick={() => setPageMenuOpen((open) => !open)}
        >
          <span>{currentPage}</span>
          <span className="h-2 w-2 rotate-45 border-b border-r border-current" aria-hidden="true" />
        </button>
        <span aria-hidden="true">/ {pageCount}</span>
        {pageMenuOpen ? (
          <div
            className="absolute bottom-full left-1/2 z-50 mb-2 max-h-60 w-20 -translate-x-1/2 overflow-y-auto overscroll-contain rounded-lg border border-slate-600 bg-slate-900 p-1 shadow-[0_12px_30px_rgba(0,0,0,0.45)]"
            id={pageMenuId}
            aria-label="페이지 목록"
          >
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => (
              <button
                className={[
                  "block min-h-10 w-full rounded-md px-2 text-center text-sm font-medium",
                  page === currentPage ? "bg-cyan-500/15 text-cyan-300" : "text-slate-200 hover:bg-slate-800",
                ].join(" ")}
                aria-current={page === currentPage ? "page" : undefined}
                aria-label={`${page}페이지`}
                key={page}
                onClick={() => {
                  onPageChange(page);
                  setPageMenuOpen(false);
                }}
                type="button"
              >
                {page}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <span className="sr-only" aria-live="polite">
        {currentPage} / {pageCount}
      </span>
      <button
        className="theme-button h-11 min-w-11 rounded-lg text-lg disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="다음 페이지"
        disabled={currentPage >= pageCount}
        onClick={() => onPageChange(currentPage + 1)}
        type="button"
      >
        ›
      </button>
    </nav>
  );
}
