// Design Ref: §4 데이터 흐름 ③~⑪, §6 API 명세, §7 오류 처리 — 추천 처리 전체 흐름.
// Plan SC: 입력 검사 → 안전 판정 → 후보 추리기 → AI가 id 고르기 → 목록에서 운동 꺼내기.
//          화면에 나가는 운동 문장은 모두 우리 운동 목록에서만 나온다.
//
// AI 호출 부분은 바깥에서 받아(ai 인자) 쓰기 때문에, 시험에서는 가짜 AI로 바꿔 끼울 수 있다.

import { AiTimeoutError } from "./aiErrors";
import type { AiPicker } from "./ai";
import { MAX_RECOMMENDATIONS, MAX_REQUEST_BYTES } from "./constants";
import { EXERCISES } from "./exercises/data";
import type { Exercise } from "./exercises/types";
import { filterBySafety, judgeSafety, type BlockReason } from "./safety";
import {
  validateRecommendRequest,
  type RecommendRequest,
  type ValidationIssue,
} from "./validate";

/** 추천 응답 (서버 → 브라우저). DESIGN 5번 */
export type RecommendResponse =
  | { status: "ok"; exercises: Exercise[] }
  | { status: "blocked"; reason: BlockReason }
  | { status: "empty" }
  | { status: "error"; code: "INVALID_INPUT"; issues: ValidationIssue[] }
  | { status: "error"; code: "AI_FAILED" | "AI_TIMEOUT" };

export interface RecommendOutcome {
  /** HTTP 상태 번호 */
  httpStatus: number;
  body: RecommendResponse;
}

/** 종목·유형(예방/회복)이 맞고, 선택한 부위 중 하나라도 맞는 운동을 목록에서 추린다. */
export function getCandidates(request: RecommendRequest): Exercise[] {
  const purpose = request.userType === "예방형" ? "예방" : "회복";
  const selectedParts = request.parts.map((entry) => entry.part);
  return EXERCISES.filter(
    (exercise) =>
      exercise.sports.includes(request.sport) &&
      exercise.purpose === purpose &&
      exercise.bodyParts.some((part) => selectedParts.includes(part)),
  );
}

/**
 * AI가 고른 id를 후보 목록의 운동으로 바꾼다.
 * 후보에 없는 id와 중복 id는 버리고, AI가 정한 순서를 지키며 최대 5개까지만 남긴다.
 * (PLAN 5번에서 이 검증을 verify.ts로 옮기고 금지 표현 등 검사를 더한다.)
 */
export function pickByIds(ids: string[], candidates: Exercise[]): Exercise[] {
  const byId = new Map(candidates.map((exercise) => [exercise.id, exercise]));
  const picked: Exercise[] = [];
  const used = new Set<string>();
  for (const id of ids) {
    const exercise = byId.get(id);
    if (exercise && !used.has(id)) {
      picked.push(exercise);
      used.add(id);
    }
    if (picked.length >= MAX_RECOMMENDATIONS) {
      break;
    }
  }
  return picked;
}

function invalid(message: string): RecommendOutcome {
  return {
    httpStatus: 400,
    body: {
      status: "error",
      code: "INVALID_INPUT",
      issues: [{ field: "", message }],
    },
  };
}

/** 요청 본문(글자)을 받아 추천 결과를 돌려준다. */
export async function handleRecommend(
  rawBody: string,
  ai: AiPicker,
): Promise<RecommendOutcome> {
  // ① 크기 제한
  if (new TextEncoder().encode(rawBody).length > MAX_REQUEST_BYTES) {
    return invalid("요청이 너무 큽니다.");
  }

  // ② JSON 읽기
  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return invalid("요청 형식이 올바르지 않습니다.");
  }

  // ③ 입력 검사
  const validation = validateRecommendRequest(json);
  if (!validation.ok) {
    return {
      httpStatus: 400,
      body: { status: "error", code: "INVALID_INPUT", issues: validation.issues },
    };
  }
  const request = validation.data;

  // ④ 안전 판정: 위험하면 AI를 부르지 않고 먼저 막는다.
  const safety = judgeSafety(request);
  if (safety.status === "blocked") {
    return { httpStatus: 200, body: { status: "blocked", reason: safety.reason } };
  }

  // ⑤ 후보 추리기 (통증이 3점 이상이면 고충격 운동 제외)
  const candidates = filterBySafety(getCandidates(request), safety.excludeHighImpact);
  if (candidates.length === 0) {
    return { httpStatus: 200, body: { status: "empty" } };
  }

  // ⑥ AI가 후보 중에서 id를 고른다.
  let ids: string[];
  try {
    ids = await ai(request, candidates);
  } catch (error) {
    if (error instanceof AiTimeoutError) {
      return { httpStatus: 504, body: { status: "error", code: "AI_TIMEOUT" } };
    }
    return { httpStatus: 502, body: { status: "error", code: "AI_FAILED" } };
  }

  // AI가 정상적으로 0개를 골랐다면 "결과 없음"이다.
  if (ids.length === 0) {
    return { httpStatus: 200, body: { status: "empty" } };
  }

  // ⑦ 후보 안의 id만 남기고, 운동 내용은 우리 목록에서 꺼낸다.
  const exercises = pickByIds(ids, candidates);
  if (exercises.length === 0) {
    // AI가 고른 id가 전부 후보 밖이었다면 믿을 수 없는 응답이다.
    return { httpStatus: 502, body: { status: "error", code: "AI_FAILED" } };
  }

  return { httpStatus: 200, body: { status: "ok", exercises } };
}
