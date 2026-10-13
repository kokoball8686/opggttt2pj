"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { mapLabel, mapNames } from "@/lib/matches";

type Props = {
  id: number;
  width: number;
  height: number;
  sizes: string;
  className?: string;
};

export function MapImage({ id, width, height, sizes, className }: Props) {
  const [failed, setFailed] = useState(false);
  if (!mapNames[id] || failed) {
    return (
      <span className={`${className ?? ""} map-image-fallback`} aria-hidden="true">
        ?
      </span>
    );
  }
  return (
    <Image
      src={`/maps/${id}.webp`}
      alt=""
      width={width}
      height={height}
      sizes={sizes}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

export function MapPreviewModal({ id, onClose }: { id: number; onClose: () => void }) {
  const name = mapLabel(id);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/85 p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="relative w-full max-w-[720px] rounded-2xl border border-slate-600 bg-slate-900 p-3 shadow-[0_18px_48px_rgba(0,0,0,0.42)]"
        role="dialog"
        aria-modal="true"
        aria-label={`${name} 맵 미리보기`}
      >
        <button
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-slate-500 bg-slate-950/80 text-lg text-white"
          type="button"
          aria-label="맵 미리보기 닫기"
          onClick={onClose}
        >
          ×
        </button>
        <Image
          src={`/maps/${id}.webp`}
          alt={`${name} 맵`}
          width={640}
          height={360}
          sizes="(max-width: 800px) 92vw, 640px"
          className="w-full rounded-xl border border-slate-700 object-cover"
        />
        <h2 className="mt-3 px-1 text-lg font-bold text-white">{name}</h2>
      </section>
    </div>
  );
}
