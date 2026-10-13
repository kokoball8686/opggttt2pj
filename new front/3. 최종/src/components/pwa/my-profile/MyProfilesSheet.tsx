"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePlayerNameSuggestions } from "@/hooks/usePlayerNameSuggestions";
import { MAX_MY_PROFILES, useMyProfiles } from "@/hooks/pwa/useMyProfiles";

export function MyProfilesSheet({
  onClose,
}: {
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [suggestionQuery, setSuggestionQuery] = useState("");
  const { profiles, error, readOnly, addProfile, removeProfile } = useMyProfiles();
  const canAddProfile = !readOnly && profiles.length < MAX_MY_PROFILES;
  const {
    names,
    loading: searching,
    error: searchError,
    preservePendingSearch,
    cancelPendingSearchOnNextChange,
  } = usePlayerNameSuggestions(suggestionQuery, "");
  const suggestions = useMemo(
    () => names.filter((name) => !profiles.some((saved) => saved.toLowerCase() === name.toLowerCase())).slice(0, 8),
    [names, profiles],
  );

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        className="absolute inset-0 bg-slate-950/70"
        type="button"
        aria-label="내 프로필 닫기"
        onClick={onClose}
      />
      <section
        className="theme-panel absolute inset-x-3 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] mx-auto max-h-[70vh] max-w-lg overflow-y-auto rounded-2xl p-4 shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="my-profiles-title"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold tracking-[1.2px] text-[var(--muted)] uppercase">PWA SHORTCUTS</p>
            <h2 className="mt-1 text-lg font-bold text-[var(--text)]" id="my-profiles-title">내 프로필</h2>
          </div>
          <button
            className="theme-button grid h-10 w-10 shrink-0 place-items-center rounded-lg text-xl"
            type="button"
            aria-label="닫기"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <label className="sr-only" htmlFor="my-profile-search">플레이어 닉네임 검색</label>
        <input
          className="theme-input h-11 w-full rounded-xl px-3 text-sm focus:border-cyan-400/60 focus:outline-none"
          id="my-profile-search"
          value={query}
          onChange={(event) => {
            cancelPendingSearchOnNextChange();
            const value = event.target.value;
            setQuery(value);
            setSuggestionQuery(value);
          }}
          maxLength={100}
          placeholder={canAddProfile ? "추가할 플레이어 닉네임 검색" : "저장된 프로필을 삭제하면 추가할 수 있습니다"}
          disabled={!canAddProfile}
          autoComplete="off"
        />
        <p className="mt-2 text-sm text-[var(--muted)]">
          내 프로필은 최대 {MAX_MY_PROFILES}개까지 저장할 수 있습니다.
        </p>
        {!readOnly && !canAddProfile ? (
          <p className="mt-2 text-sm text-[var(--muted)]" role="status">
            {profiles.length > MAX_MY_PROFILES
              ? "저장된 프로필이 최대 개수를 초과합니다. 프로필을 삭제해 3개 이하로 줄여주세요."
              : "저장된 프로필을 삭제하면 다른 프로필을 추가할 수 있습니다."}
          </p>
        ) : null}
        {canAddProfile && query.trim() ? (
          <div className="mt-2 grid max-h-40 gap-1 overflow-y-auto">
            {searchError ? (
              <p className="px-1 py-2 text-sm text-rose-200" role="alert">{searchError}</p>
            ) : searching && suggestions.length === 0 ? (
              <p className="px-1 py-2 text-sm text-[var(--muted)]" role="status">플레이어 검색 중...</p>
            ) : null}
            {suggestions.map((name) => (
              <button
                className="theme-surface-muted flex min-h-10 items-center justify-between rounded-lg px-3 text-left text-sm"
                key={name}
                type="button"
                onClick={() => {
                  preservePendingSearch();
                  if (addProfile(name)) setQuery("");
                }}
              >
                <span>{name}</span>
                <span className="text-cyan-300" aria-hidden="true">＋</span>
              </button>
            ))}
            {!searching && !searchError && suggestions.length === 0 ? (
              <p className="px-1 py-2 text-sm text-[var(--muted)]">
                일치하는 플레이어가 없습니다.
              </p>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <p className="mt-3 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-5">
          <h3 className="mb-2 text-sm font-semibold text-[var(--text)]">저장된 프로필</h3>
          {profiles.length ? (
            <ul className="grid gap-2">
              {profiles.map((name) => (
                <li className="theme-surface-muted flex min-h-12 items-center gap-2 rounded-xl px-3" key={name}>
                  <Link
                    className="min-w-0 flex-1 truncate py-3 text-sm font-medium text-[var(--text)]"
                    href={`/profile/${encodeURIComponent(name)}`}
                    onClick={onClose}
                  >
                    {name}
                  </Link>
                  <button
                    className="rounded-lg px-2 py-2 text-xs text-rose-300 transition hover:bg-rose-400/10"
                    type="button"
                    aria-label={`${name} 프로필 삭제`}
                    disabled={readOnly}
                    onClick={() => removeProfile(name)}
                  >
                    삭제
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-[var(--line)] px-3 py-4 text-center text-sm text-[var(--muted)]">
              검색해서 자주 보는 플레이어를 추가하세요.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
