"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePwaStandalone } from "@/components/pwa/PwaControls";
import { MyProfileTab } from "@/components/pwa/my-profile/MyProfileTab";

function scrollToTopOnCurrentRoute(
  event: React.MouseEvent<HTMLAnchorElement>,
  href: string,
  pathname: string,
) {
  if (pathname !== href) return;

  event.preventDefault();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

const NAV = [
  { href: "/", label: "홈", icon: "home" as const },
  { href: "/players", label: "TOP 10", icon: "players" as const },
  { href: "/matches", label: "전체 대전 기록", icon: "matches" as const },
  { href: "/download", label: "Tracker 다운로드", icon: "download" as const },
];

function MenuIcon({ name }: { name: (typeof NAV)[number]["icon"] }) {
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
      className="h-[20px] w-[20px] shrink-0 text-current"
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

export function SidebarNav({
  menuOpen,
  onClose,
}: {
  menuOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const isStandalone = usePwaStandalone();
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
    <>
      {menuOpen && !isStandalone ? (
        <button
          type="button"
          className="fixed inset-x-0 top-[68px] bottom-0 z-10 border-0 bg-slate-950/40 md:hidden"
          aria-label="사이드바 닫기"
          onClick={onClose}
        />
      ) : null}
      <aside
        className={[
          "theme-sidebar fixed left-0 top-[68px] z-20 h-[calc(100vh-68px)] w-[252px] overflow-y-auto p-7",
          menuOpen && !isStandalone ? "block" : "hidden",
          "md:block",
        ].join(" ")}
      >
        <p className="m-0 text-[17px] font-bold tracking-[1.2px] text-[var(--muted)] uppercase">STATISTICS</p>
        <nav aria-label="통계 메뉴" className="mt-[18px] grid gap-2">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? section === "home"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                className={[
                  "flex items-center gap-3 rounded-xl border border-transparent px-3 py-3 text-[var(--text)]/90 transition duration-200 hover:bg-[rgba(14,165,233,0.08)] hover:text-[var(--text)]",
                  active ? "border-[rgba(14,165,233,0.22)] bg-[rgba(14,165,233,0.08)] text-[var(--cyan)] shadow-[inset_3px_0_0_var(--cyan)]" : "",
                ].join(" ")}
                href={item.href}
                onClick={(event) => {
                  onClose();
                  scrollToTopOnCurrentRoute(event, item.href, pathname);
                }}
              >
                <MenuIcon name={item.icon} />
                <span className="text-left text-[17px] font-medium text-[inherit]">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="fixed bottom-6 left-4 text-[16px] leading-relaxed tracking-[1px] text-[var(--muted)] md:left-[18px]">
          RPCS3 COMMUNITY
          <br />
          <strong className="text-[var(--text)]">TEKKEN TAG 2</strong>
        </div>
      </aside>
      {isStandalone ? (
        <nav
          aria-label="주요 메뉴"
          className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 border-t border-slate-700/80 bg-slate-950/95 pt-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(2,6,23,0.35)] md:hidden"
        >
          {NAV.map((item) => {
            if (item.href === "/download") {
              return <MyProfileTab key="my-profile" />;
            }

            const active =
              item.href === "/"
                ? section === "home"
                : item.href === "/players"
                  ? section === "players" || section === "profile"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                className={[
                  "flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium text-slate-400 transition-colors",
                  active ? "text-cyan-300" : "",
                ].join(" ")}
                href={item.href}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                onClick={(event) => scrollToTopOnCurrentRoute(event, item.href, pathname)}
              >
                <MenuIcon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      ) : null}
    </>
  );
}
