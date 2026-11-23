// Design Ref: §3.1 입력 영역, §4 데이터 흐름 ①, §5 RecommendRequest — 입력 화면의 값을 추천 요청으로 바꾼다.
// Plan SC: 고르지 않은 항목은 친절한 문장으로 알려 주고, 통과한 값만 추천 요청이 된다.
//
// 화면(IntakeForm)은 이 파일의 함수만 호출한다. 화면 없이도 시험할 수 있도록 순수 함수로 만들었다.

import { BODY_PARTS, type BodyPart, type Sport, type UserType } from "./constants";
import { needsWeightQuestion, type PainEntry } from "./safety";
import {
  validateRecommendRequest,
  type RecommendRequest,
  type ValidationIssue,
} from "./validate";

/** 입력 화면에서 사용자가 지금까지 고른 값. 아직 고르지 않은 항목은 null이다. */
export interface IntakeState {
  userType: UserType | null;
  /** 회복형에게만 묻는다: 치료 후 운동해도 된다는 안내를 받았는지 */
  recoveryApproved: boolean | null;
  sport: Sport | null;
  /** 선택한 부위 (선택한 순서와 상관없이 아래 함수가 정해진 순서로 정리한다) */
  selectedParts: BodyPart[];
  /** 부위별 통증 점수(0~10). 아직 움직이지 않은 부위는 0으로 본다. */
  pains: Partial<Record<BodyPart, number>>;
  /** 하체 부위(발목·무릎)를 골랐을 때만 묻는다: 체중을 싣기 어려운지 */
  cannotBearWeight: boolean | null;
}

export const EMPTY_INTAKE: IntakeState = {
  userType: null,
  recoveryApproved: null,
  sport: null,
  selectedParts: [],
  pains: {},
  cannotBearWeight: null,
};

/** 선택한 부위를 지원 부위 순서(발목, 무릎, 어깨)로 정리하고 통증 점수를 붙인다. */
export function orderedParts(state: IntakeState): PainEntry[] {
  return BODY_PARTS.filter((part) => state.selectedParts.includes(part)).map((part) => ({
    part,
    pain: state.pains[part] ?? 0,
  }));
}

/** 지금 고른 부위에 하체 부위가 있어 체중 질문을 보여줘야 하는지 */
export function shouldAskWeight(state: IntakeState): boolean {
  return needsWeightQuestion(orderedParts(state));
}

export type IntakeResult =
  | { ok: true; request: RecommendRequest }
  | { ok: false; issues: ValidationIssue[] };

/**
 * 입력 화면의 값이 추천을 요청할 만큼 채워졌는지 확인하고, 채워졌다면 추천 요청으로 바꾼다.
 * issues의 field는 화면에서 해당 항목을 찾는 데 쓴다.
 */
export function validateIntake(state: IntakeState): IntakeResult {
  const issues: ValidationIssue[] = [];
  const askWeight = shouldAskWeight(state);

  if (state.userType === null) {
    issues.push({ field: "userType", message: "사용 유형(예방형/회복형)을 선택해 주세요." });
  }
  if (state.userType === "회복형" && state.recoveryApproved === null) {
    issues.push({
      field: "recoveryApproved",
      message: "병원 치료 후 운동해도 된다는 안내를 받았는지 답해 주세요.",
    });
  }
  if (state.sport === null) {
    issues.push({ field: "sport", message: "종목을 선택해 주세요." });
  }
  if (state.selectedParts.length === 0) {
    issues.push({ field: "parts", message: "부위를 하나 이상 선택해 주세요." });
  }
  if (askWeight && state.cannotBearWeight === null) {
    issues.push({
      field: "cannotBearWeight",
      message: "발목이나 무릎을 골랐다면 체중을 싣기 어려운지 답해 주세요.",
    });
  }
  if (issues.length > 0) {
    return { ok: false, issues };
  }

  // 위에서 비어 있는 항목이 없음을 확인했으므로, 서버가 쓰는 것과 같은 검사로 최종 확인한다.
  const payload = {
    userType: state.userType,
    sport: state.sport,
    parts: orderedParts(state),
    ...(state.userType === "회복형" ? { recoveryApproved: state.recoveryApproved } : {}),
    ...(askWeight ? { cannotBearWeight: state.cannotBearWeight } : {}),
  };
  const result = validateRecommendRequest(payload);
  return result.ok
    ? { ok: true, request: result.data }
    : { ok: false, issues: result.issues };
}
