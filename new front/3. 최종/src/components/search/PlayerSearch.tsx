"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePlayerNameSuggestions } from "@/hooks/usePlayerNameSuggestions";

export function SearchSubmitButton({ label }: { label: string }) {
  return (
    <button
      className="absolute bottom-1 right-1 top-1 grid w-9 place-items-center rounded-md border border-cyan-400/40 bg-gradient-to-br from-cyan-500/90 to-sky-600/90 text-white shadow-[0_0_14px_rgba(14,165,233,0.18)] transition hover:border-cyan-300/80 hover:shadow-[0_0_18px_rgba(14,165,233,0.22)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
      type="submit"
      aria-label={label}
    >
      <svg className="h-[18px] w-[18px] fill-none stroke-current stroke-[2]" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="10.8" cy="10.8" r="6.3" />
        <path d="m15.5 15.5 4.2 4.2" />
      </svg>
    </button>
  );
}

export function PlayerSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const {
    names: suggestions,
    loading,
    error,
    preservePendingSearch,
    cancelPendingSearchOnNextChange,
  } = usePlayerNameSuggestions(query, "");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const player = query.trim();
    if (!player) return;
    setQuery("");
    router.push(`/profile/${encodeURIComponent(player)}`);
  };

  return (
    <form className="relative ml-auto flex h-[42px] w-full max-w-[230px] min-w-0 sm:h-[54px] sm:max-w-[420px] sm:w-[min(420px,48vw)]" onSubmit={submit}>
      <label className="sr-only" htmlFor="player-search">
        플레이어 닉네임 검색
      </label>
      <input
        id="player-search"
        className="theme-input h-full w-full rounded-xl px-3 py-2 pr-12 text-[12px] focus:border-cyan-400/60 focus:outline-none sm:px-4 sm:py-3 sm:pr-16 sm:text-base"
        value={query}
        onChange={(event) => {
          cancelPendingSearchOnNextChange();
          setQuery(event.target.value);
        }}
        maxLength={100}
        placeholder="플레이어 닉네임 입력"
        role="combobox"
        aria-autocomplete="list"
        aria-controls="player-suggestions"
        aria-expanded={Boolean(query)}
      />
      <SearchSubmitButton label="플레이어 검색" />
      {query ? (
        <div className="theme-dropdown absolute left-0 right-0 top-[calc(100%+6px)] z-30 rounded-lg" id="player-suggestions">
          {error ? (
            <p className="px-3 py-2.5 text-left text-sm text-rose-200" role="alert">{error}</p>
          ) : loading && suggestions.length === 0 ? (
            <p className="px-3 py-2.5 text-left text-sm text-[var(--muted)]" role="status">플레이어 검색 중...</p>
          ) : null}
          {suggestions.map((name) => (
            <Link
              key={name}
              className="block w-full border-0 bg-transparent px-3 py-2.5 text-left text-[var(--text)] transition hover:bg-[rgba(109,139,255,0.08)]"
              href={`/profile/${encodeURIComponent(name)}`}
              onClick={preservePendingSearch}
            >
              {name}
            </Link>
          ))}
        </div>
      ) : null}
    </form>
  );
}
