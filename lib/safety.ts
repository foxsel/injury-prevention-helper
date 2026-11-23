// Design Ref: §4 데이터 흐름 ②·⑤·⑥, §5 데이터 모델 — 안전 판정 (AI를 부르기 전에 먼저 막는다).
// Plan SC: 통증 6점 이상, 하체 부위에서 체중을 싣기 어려움, 회복형 허가 "아니오"는 추천을 막고,
//          통증 3점 이상이면 고충격 운동을 후보에서 뺀다.
//
// 이 함수는 브라우저(입력 직후)와 서버(추천 API) 양쪽에서 같은 코드로 실행한다.
// 입력값 자체의 검사(범위 밖 통증, 지원하지 않는 부위 등)는 validate.ts(PLAN 3번)가 맡고,
// 여기서는 검사를 통과했다고 가정하되 이상한 값이 와도 안전한 쪽(막는 쪽)으로 판단한다.

import {
  HIGH_IMPACT_PAIN_THRESHOLD,
  LOWER_BODY_PARTS,
  PAIN_BLOCK_THRESHOLD,
  type BodyPart,
  type UserType,
} from "./constants";
import type { Exercise } from "./exercises/types";

/** 부위 하나와 그 부위의 통증 점수(0~10) */
export interface PainEntry {
  part: BodyPart;
  pain: number;
}

export interface SafetyInput {
  userType: UserType;
  /** 회복형이면 필수: 병원 치료 후 운동해도 된다는 안내를 받았는지 */
  recoveryApproved?: boolean;
  parts: PainEntry[];
  /** 하체 부위(발목·무릎)를 고른 경우에만 의미가 있다: 체중을 싣기 어려운지 */
  cannotBearWeight?: boolean;
}

/** 추천을 막는 이유 */
export type BlockReason = "pain" | "weight" | "not-approved";

export type SafetyResult =
  | {
      status: "ok";
      /** true이면 점프 같은 고충격 운동을 추천 후보에서 뺀다 */
      excludeHighImpact: boolean;
    }
  | { status: "blocked"; reason: BlockReason };

// 통증이 기준 "미만"이 아니면(기준 이상이거나 숫자가 아니면) 기준에 걸린 것으로 본다.
// NaN 같은 이상한 값이 와도 안전한 쪽(막는 쪽)으로 판단하기 위해 "미만"을 뒤집는 방식으로 쓴다.
function isAtOrAbove(pain: number, threshold: number): boolean {
  return !(pain < threshold);
}

/** 하체 부위(발목·무릎)가 하나라도 선택되었는지. true일 때만 "체중을 싣기 어렵다"를 묻는다. */
export function needsWeightQuestion(parts: PainEntry[]): boolean {
  return parts.some((entry) => LOWER_BODY_PARTS.includes(entry.part));
}

/**
 * 입력을 보고 추천해도 되는지 판정한다.
 *
 * 확인 순서(먼저 걸리는 이유를 돌려준다)
 * 1) 회복형인데 치료 후 운동 허가가 "예"가 아니면(값이 없는 경우 포함) → not-approved
 * 2) 한 부위라도 통증이 6점 이상이면(예방형 포함) → pain
 * 3) 하체 부위를 골랐고 체중을 싣기 어렵다고 답했으면 → weight
 * 4) 그 외에는 추천 가능. 통증이 3점 이상인 부위가 하나라도 있으면 고충격 운동을 뺀다.
 */
export function judgeSafety(input: SafetyInput): SafetyResult {
  if (input.userType === "회복형" && input.recoveryApproved !== true) {
    return { status: "blocked", reason: "not-approved" };
  }

  if (input.parts.some((entry) => isAtOrAbove(entry.pain, PAIN_BLOCK_THRESHOLD))) {
    return { status: "blocked", reason: "pain" };
  }

  if (needsWeightQuestion(input.parts) && input.cannotBearWeight === true) {
    return { status: "blocked", reason: "weight" };
  }

  return {
    status: "ok",
    excludeHighImpact: input.parts.some((entry) =>
      isAtOrAbove(entry.pain, HIGH_IMPACT_PAIN_THRESHOLD),
    ),
  };
}

/** 판정 결과에 따라 후보 운동에서 고충격 운동을 뺀다. */
export function filterBySafety(
  exercises: Exercise[],
  excludeHighImpact: boolean,
): Exercise[] {
  return excludeHighImpact
    ? exercises.filter((exercise) => !exercise.highImpact)
    : exercises;
}
