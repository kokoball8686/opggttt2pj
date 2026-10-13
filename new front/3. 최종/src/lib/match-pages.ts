import { Match, normalizeMatch } from "@/lib/matches";

export type MatchPage = {
  page: number;
  pageSize: number;
  totalCount: number;
  matches: Match[];
  matchNumbers: Map<string, number>;
};

export function findAddedMatchIds(previousPage: MatchPage | null, currentPage: MatchPage | null) {
  if (!previousPage || !currentPage) return [];

  const previousIds = new Set(previousPage.matches.map((match) => match.id));
  return currentPage.matches
    .filter((match) => !previousIds.has(match.id))
    .map((match) => match.id);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function positiveInteger(value: unknown, field: string) {
  if (!Number.isSafeInteger(value) || Number(value) < 1) {
    throw new Error(`대전 데이터 응답의 ${field} 값이 올바르지 않습니다.`);
  }
  return Number(value);
}

export function normalizeMatchPage(value: unknown, requireMatchNumbers = false): MatchPage {
  if (!isRecord(value)) {
    throw new Error("대전 데이터 응답 형식이 올바르지 않습니다.");
  }

  const page = positiveInteger(value.page, "page");
  const pageSize = positiveInteger(value.page_size, "page_size");
  const totalCount = value.total_count;
  if (!Number.isSafeInteger(totalCount) || Number(totalCount) < 0) {
    throw new Error("대전 데이터 응답의 total_count 값이 올바르지 않습니다.");
  }
  if (!Array.isArray(value.matches)) {
    throw new Error("대전 데이터 응답의 matches 값이 올바르지 않습니다.");
  }

  const matchNumbers = new Map<string, number>();
  const matches = value.matches.map((row, index) => {
    if (!isRecord(row)) {
      throw new Error(`대전 데이터 ${index + 1}번째 행의 형식이 올바르지 않습니다.`);
    }
    const match = normalizeMatch(row, index);
    if (!match) {
      throw new Error(`대전 데이터 ${index + 1}번째 행을 경기 기록으로 변환할 수 없습니다.`);
    }
    const matchNumber = row.match_number;
    if (Number.isSafeInteger(matchNumber) && Number(matchNumber) > 0) {
      matchNumbers.set(match.id, Number(matchNumber));
    } else if (requireMatchNumbers) {
      throw new Error(`대전 데이터 ${index + 1}번째 행의 match_number가 올바르지 않습니다.`);
    } else {
      matchNumbers.set(
        match.id,
        Number(totalCount) - (page - 1) * pageSize - index,
      );
    }
    return match;
  });

  if (matches.length > pageSize) {
    throw new Error("대전 데이터 응답이 요청한 페이지 크기를 초과했습니다.");
  }

  return { page, pageSize, totalCount: Number(totalCount), matches, matchNumbers };
}
