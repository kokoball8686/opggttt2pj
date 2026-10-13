"use client";

import { useMemo, useState, useSyncExternalStore } from "react";

const STORAGE_KEY = "tag2gg:pwa:my-profiles:v1";
const CHANGE_EVENT = "tag2gg:pwa:my-profiles-change";
export const MAX_MY_PROFILES = 3;

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function getSnapshot() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "[]";
  } catch (error: unknown) {
    console.error("Failed to read saved PWA profiles:", error);
    return "storage-error";
  }
}

function getServerSnapshot() {
  return "[]";
}

export function useMyProfiles() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [actionError, setActionError] = useState<string | null>(null);
  const { profiles, storageError } = useMemo(() => {
    if (snapshot === "storage-error") {
      return { profiles: [], storageError: "기기의 저장 공간에 접근할 수 없습니다." };
    }
    try {
      const parsed: unknown = JSON.parse(snapshot);
      if (!Array.isArray(parsed) || parsed.some((name) => typeof name !== "string")) {
        throw new Error("저장된 내 프로필 데이터 형식이 올바르지 않습니다.");
      }
      return {
        profiles: [...new Set(parsed.map((name: string) => name.trim()).filter(Boolean))],
        storageError: null,
      };
    } catch (loadError: unknown) {
      const message =
        loadError instanceof Error ? loadError.message : "내 프로필을 불러오지 못했습니다.";
      console.error("Failed to load saved PWA profiles:", loadError);
      return { profiles: [], storageError: message };
    }
  }, [snapshot]);

  const save = (nextProfiles: string[]) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextProfiles));
      window.dispatchEvent(new Event(CHANGE_EVENT));
      setActionError(null);
      return true;
    } catch (saveError: unknown) {
      const message =
        saveError instanceof Error ? saveError.message : "내 프로필을 저장하지 못했습니다.";
      setActionError(message);
      console.error("Failed to save PWA profiles:", saveError);
      return false;
    }
  };

  const addProfile = (name: string) => {
    const normalized = name.trim();
    if (
      storageError ||
      !normalized ||
      profiles.length >= MAX_MY_PROFILES ||
      profiles.some((profile) => profile.toLowerCase() === normalized.toLowerCase())
    ) {
      return false;
    }
    return save([...profiles, normalized]);
  };

  const removeProfile = (name: string) =>
    storageError ? false : save(profiles.filter((profile) => profile !== name));

  return {
    profiles,
    error: storageError ?? actionError,
    readOnly: storageError !== null,
    addProfile,
    removeProfile,
  };
}
