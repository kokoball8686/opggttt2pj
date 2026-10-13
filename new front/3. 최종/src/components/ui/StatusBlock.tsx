import { useEffect, useRef, useState } from "react";

function RefreshContent({
  refreshKey,
  children,
}: {
  refreshKey: string | number;
  children: React.ReactNode;
}) {
  const previousKey = useRef(refreshKey);
  const [highlighted, setHighlighted] = useState(false);

  useEffect(() => {
    if (previousKey.current === refreshKey) return;
    previousKey.current = refreshKey;

    const startTimeout = window.setTimeout(() => setHighlighted(true), 0);
    const endTimeout = window.setTimeout(() => setHighlighted(false), 1_000);
    return () => {
      window.clearTimeout(startTimeout);
      window.clearTimeout(endTimeout);
    };
  }, [refreshKey]);

  return (
    <div
      className={[
        "rounded-2xl transition-shadow duration-700 ease-out",
        highlighted
          ? "shadow-[0_0_20px_2px_rgba(34,211,238,0.22)]"
          : "shadow-[0_0_0_0_rgba(34,211,238,0)]",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export function StatusBlock({
  loading,
  error,
  empty,
  emptyText,
  keepChildrenOnError = false,
  refreshKey,
  children,
}: {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyText?: string;
  keepChildrenOnError?: boolean;
  refreshKey?: string | number;
  children: React.ReactNode;
}) {
  const withRefreshAnimation = (content: React.ReactNode) =>
    refreshKey === undefined ? <>{content}</> : (
      <RefreshContent refreshKey={refreshKey}>{content}</RefreshContent>
    );

  if (loading) return withRefreshAnimation(children);
  if (error) {
    return (
      <>
        {keepChildrenOnError
          ? withRefreshAnimation(
              empty ? (
                <p className="py-5 text-sm text-slate-300/80">
                  {emptyText ?? "표시할 데이터가 없습니다."}
                </p>
              ) : children,
            )
          : null}
        <div
          className="rounded-2xl border border-rose-500/30 bg-rose-950/25 p-5 text-rose-100 shadow-[0_14px_40px_rgba(0,0,0,0.18)]"
          role="alert"
        >
          <strong className="block text-base font-semibold text-rose-50">
            {keepChildrenOnError
              ? "최신 데이터를 갱신하지 못했습니다."
              : "데이터를 불러오지 못했습니다."}
          </strong>
          <p className="mt-2 text-sm leading-6 text-rose-100/80">{error}</p>
        </div>
      </>
    );
  }
  if (empty) {
    return withRefreshAnimation(
      <p className="py-5 text-sm text-slate-300/80">
        {emptyText ?? "표시할 데이터가 없습니다."}
      </p>,
    );
  }
  return withRefreshAnimation(children);
}
