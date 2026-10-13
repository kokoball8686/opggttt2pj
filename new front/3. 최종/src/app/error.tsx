"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="m-6 rounded-2xl border border-rose-500/30 bg-rose-950/25 p-5 text-rose-100 shadow-[0_14px_40px_rgba(0,0,0,0.18)]" role="alert">
      <strong className="block text-base font-semibold text-rose-50">화면을 표시하지 못했습니다.</strong>
      <p className="mt-2 text-sm leading-6 text-rose-100/80">{error.message || "알 수 없는 오류가 발생했습니다."}</p>
      <button
        type="button"
        className="mt-4 inline-flex min-h-12 items-center justify-center rounded-lg bg-cyan-400 px-5 font-bold text-slate-950 transition hover:bg-cyan-300"
        onClick={reset}
      >
        다시 시도
      </button>
    </div>
  );
}
