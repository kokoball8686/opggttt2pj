"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type PwaInstallContextValue = {
  installPrompt: InstallPromptEvent | null;
  installed: boolean;
  isStandalone: boolean;
  clearInstallPrompt: () => void;
};

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);
const DISPLAY_MODE_QUERY = "(display-mode: standalone)";

export function usePwaStandalone() {
  const context = useContext(PwaInstallContext);

  if (!context) {
    throw new Error("usePwaStandalone must be used inside PwaInstallProvider.");
  }

  return context.isStandalone;
}

function subscribeToNetworkStatus(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getIsOnline() {
  return navigator.onLine;
}

function getServerIsOnline() {
  return true;
}

export function useOnlineStatus() {
  return useSyncExternalStore(subscribeToNetworkStatus, getIsOnline, getServerIsOnline);
}

function subscribeToDisplayMode(callback: () => void) {
  const mediaQuery = window.matchMedia(DISPLAY_MODE_QUERY);
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getIsStandalone() {
  return window.matchMedia(DISPLAY_MODE_QUERY).matches;
}

function getServerIsStandalone() {
  return false;
}

export function PwaInstallProvider({ children }: { children: React.ReactNode }) {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const isStandalone = useSyncExternalStore(
    subscribeToDisplayMode,
    getIsStandalone,
    getServerIsStandalone,
  );

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
        console.error("Failed to register the TAG2.GG service worker:", error);
      });
    }

    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstallPrompt(null);
      setInstalled(true);
    };
    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  return (
    <PwaInstallContext.Provider
      value={{
        installPrompt,
        installed: installed || isStandalone,
        isStandalone,
        clearInstallPrompt: () => setInstallPrompt(null),
      }}
    >
      {children}
    </PwaInstallContext.Provider>
  );
}

export function PwaControls() {
  const context = useContext(PwaInstallContext);
  const [helpOpen, setHelpOpen] = useState(false);

  if (!context) {
    throw new Error("PwaControls must be rendered inside PwaInstallProvider.");
  }

  const install = async () => {
    if (!context.installPrompt) {
      setHelpOpen(true);
      return;
    }

    try {
      await context.installPrompt.prompt();
      await context.installPrompt.userChoice;
      context.clearInstallPrompt();
    } catch (error) {
      console.error("Failed to start the TAG2.GG installation prompt:", error);
    }
  };

  const isAppleMobile =
    typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (context.installed) return null;

  return (
    <>
      <motion.button
        className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-cyan-400/60 bg-gradient-to-br from-cyan-700/80 to-indigo-700/80 px-2.5 text-[10px] font-semibold text-cyan-50 shadow-[0_0_20px_rgba(70,217,255,0.16)] transition md:hidden"
        type="button"
        onClick={() => void install()}
        whileHover={{ y: -2, scale: 1.03 }}
        whileTap={{ scale: 0.96 }}
      >
        앱 설치
      </motion.button>
      {helpOpen ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-5" role="dialog" aria-modal="true" aria-labelledby="pwa-help-title">
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.65)]">
            <button
              className="absolute right-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-lg border border-slate-600 bg-slate-900 text-xl text-slate-100"
              type="button"
              onClick={() => setHelpOpen(false)}
              aria-label="안내 닫기"
            >
              ×
            </button>
            <h2 id="pwa-help-title" className="mr-8 text-lg font-semibold text-white">홈 화면에 TAG2.GG 추가하기</h2>
            {isAppleMobile ? (
              <p>
                Safari 하단의 <strong>공유</strong> 버튼을 누른 다음 <strong>홈 화면에 추가</strong>를
                선택해 주세요.
              </p>
            ) : (
              <p className="mt-3 text-sm leading-7 text-slate-300">
                브라우저 메뉴(⋮)를 열고 <strong className="text-cyan-300">앱 설치</strong> 또는 <strong className="text-cyan-300">홈 화면에 추가</strong>를
                선택해 주세요.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
