export function formatDate(value: string | null | undefined) {
  if (!value) return "시간 없음";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "시간 없음"
    : date.toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" });
}

export function formatDuration(start: string | null, end: string | null) {
  if (!start || !end) return "시간 없음";
  const seconds = Math.floor((Date.parse(end) - Date.parse(start)) / 1000);
  if (!Number.isFinite(seconds) || seconds < 0) return "시간 없음";
  return formatSeconds(seconds);
}

export function formatSeconds(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const hours = Math.floor(minutes / 60);
  if (hours) return `${hours}시간 ${minutes % 60}분`;
  if (minutes) return `${minutes}분 ${total % 60}초`;
  return `${total}초`;
}
