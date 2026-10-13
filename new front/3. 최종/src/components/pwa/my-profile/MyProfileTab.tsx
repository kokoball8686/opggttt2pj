"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { MyProfilesSheet } from "@/components/pwa/my-profile/MyProfilesSheet";

export function MyProfileTab() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = pathname.startsWith("/profile/");

  return (
    <>
      <button
        className={[
          "flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium text-slate-400 transition-colors",
          active || open ? "text-cyan-300" : "",
        ].join(" ")}
        type="button"
        aria-label="내 프로필 열기"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <svg
          className="h-5 w-5 shrink-0"
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
        </svg>
        <span>내 프로필</span>
      </button>
      {open ? <MyProfilesSheet onClose={() => setOpen(false)} /> : null}
    </>
  );
}
