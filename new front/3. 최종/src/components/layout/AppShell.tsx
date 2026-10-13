"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { prefetchInitialClientData } from "@/lib/client-data-requests";
import { requestClientStoragePersistence } from "@/lib/client-cache";
import { useOnlineStatus, usePwaStandalone } from "@/components/pwa/PwaControls";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { TopBar } from "@/components/layout/TopBar";

function PageTitleIcon({ name }: { name: "home" | "players" | "matches" | "download" }) {
  const paths = {
    home: (
      <>
        <path d="m3 10 9-7 9 7" />
        <path d="M5 9v11h14V9" />
        <path d="M9 20v-6h6v6" />
      </>
    ),
    players: (
      <>
        <circle cx="9" cy="8" r="4" />
        <path d="M2 20a7 7 0 0 1 14 0" />
        <path d="M17 4a4 4 0 0 1 0 8" />
        <path d="M18 14a6 6 0 0 1 4 6" />
      </>
    ),
    matches: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12" />
        <path d="m7 11 5 5 5-5" />
        <path d="M4 20h16" />
      </>
    ),
  };

  return (
    <svg
      className="h-[42px] w-[42px] shrink-0 text-cyan-400"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

export function AppShell({
  children,
  title,
  description,
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
}) {
  useEffect(() => {
    void requestClientStoragePersistence();
    void prefetchInitialClientData();
  }, []);

  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const isStandalone = usePwaStandalone();
  const isOnline = useOnlineStatus();
  const closeMenu = () => setMenuOpen(false);

  const section =
    pathname.startsWith("/players")
      ? "players"
      : pathname.startsWith("/matches")
        ? "matches"
        : pathname.startsWith("/download")
          ? "download"
          : pathname.startsWith("/profile")
            ? "profile"
            : "home";

  return (
    <main className="min-h-screen bg-transparent text-[var(--text)]">
      <TopBar onToggleMenu={() => setMenuOpen((open) => !open)} />
      <SidebarNav menuOpen={menuOpen} onClose={closeMenu} />
      <div className="w-full px-3 sm:px-5 lg:px-6">
        <div className="mx-auto w-full max-w-[1800px] min-w-0 pt-6 sm:pt-8 lg:pl-[252px] lg:pt-8">
          <section className="mb-3 flex items-start justify-between gap-2 lg:mb-6 lg:px-0">
            <div className="min-w-0 flex-1">
              <p className="whitespace-nowrap text-[10px] font-bold tracking-[1.1px] text-[var(--muted)] uppercase sm:text-[16px]">
                RPCS3 / TEKKEN TAG TOURNAMENT 2
              </p>
              <h1 className="mt-1.5 mb-1 flex items-center gap-2 text-[22px] font-bold tracking-[-0.04em] text-[var(--text)] sm:mt-2 sm:mb-1.5 sm:text-[40px]">
                <PageTitleIcon
                  name={
                    section === "players" || section === "profile"
                      ? "players"
                      : section === "matches"
                        ? "matches"
                        : section === "download"
                          ? "download"
                          : "home"
                  }
                />
                {title}
              </h1>
              {description ? <p className="m-0 whitespace-nowrap text-[12px] text-[var(--muted)] sm:text-base lg:text-[20px]">{description}</p> : null}
            </div>
            <div
              className="flex shrink-0 items-center gap-2 text-[10px] font-bold tracking-[1px] text-[var(--cyan)] sm:text-[16px]"
              title="Supabase 데이터"
            >
              <i className="h-4 w-4 rounded-full bg-emerald-400 shadow-[0_0_0_6.4px_rgba(52,211,153,0.12)] animate-pulse" />
              LIVE DATA
            </div>
          </section>
          {isStandalone && !isOnline ? (
            <div
              className="mx-3 mb-3 flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-100 sm:mx-5 lg:mx-0"
              role="status"
              aria-live="polite"
            >
              <span className="font-bold" aria-hidden="true">!</span>
              <span>오프라인 상태입니다. 이 기기에 저장된 경기 기록은 마지막 연결 당시 기준입니다.</span>
            </div>
          ) : null}
          <div
            className={[
              "px-3 sm:px-5 lg:px-0",
              isStandalone ? "pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-6" : "pb-6",
            ].join(" ")}
          >
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}

export function RouteTransition({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-transparent">{children}</div>;
}
