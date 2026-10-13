"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlayerSearch } from "@/components/search/PlayerSearch";
import { PwaControls, usePwaStandalone } from "@/components/pwa/PwaControls";

export function TopBar({
  onToggleMenu,
}: {
  onToggleMenu: () => void;
}) {
  const pathname = usePathname();
  const isStandalone = usePwaStandalone();

  return (
    <header
      className={`theme-topbar sticky top-0 z-40 flex h-[58px] items-center gap-2 border-b sm:h-[68px] sm:gap-[18px] ${
        isStandalone
          ? "px-6 sm:px-10 md:px-10 lg:px-6"
          : "px-2 sm:px-[clamp(20px,3vw,52px)] md:pl-[clamp(25px,2.5vw,10px)]"
      }`}
    >
      <button
        className={isStandalone ? "hidden" : "inline-grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-700 bg-slate-900/90 text-slate-100 shadow-[0_0_18px_rgba(15,23,42,0.35)] md:hidden"}
        onClick={onToggleMenu}
        aria-label="메뉴 열기"
        type="button"
      >
        ☰
      </button>
      <div className="flex min-w-0 items-center gap-2">
        <Link
          className="shrink-0 text-[24px] font-extrabold leading-none tracking-[-0.06em] text-[var(--text)] sm:text-[28px]"
          href="/"
          onClick={(event) => {
            if (pathname !== "/") return;
            event.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          TAG2<span className="text-[var(--cyan)]">.GG</span>
        </Link>
        <PwaControls />
      </div>
      <div className="ml-auto flex min-w-0 flex-1 justify-end md:hidden">
        <PlayerSearch />
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 right-0 hidden md:block">
        <div className="h-full w-full px-3 sm:px-5 lg:px-6">
          <div className="mx-auto flex h-full w-full max-w-[1800px] min-w-0 lg:pl-[252px]">
            <div className="pointer-events-auto ml-auto flex min-w-0 flex-1 items-center justify-end">
              <PlayerSearch />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
