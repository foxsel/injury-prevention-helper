// Design Ref: §4 데이터 흐름 ①·④, §5 데이터 모델 RecommendRequest, §7 오류 처리 — 입력값 검증.
// Plan SC: 목록에 없는 종목·부위, 범위 밖 통증, 비어 있는 입력, 회복형 허가 값 없음,
//          하체 부위인데 체중 값 없음을 걸러 낸다. (브라우저와 서버에서 같은 코드로 실행)
//
// 이 파일은 "입력의 모양"이 올바른지만 검사한다.
// 통증이 높아서 추천하지 않는 등의 안전 판정은 safety.ts가 맡는다.

import { z } from "zod";
import {
  BODY_PARTS,
  PAIN_MAX,
  PAIN_MIN,
  SPORTS,
  USER_TYPES,
} from "./constants";
import { needsWeightQuestion } from "./safety";

const painSchema = z
  .number({ error: "통증 점수는 숫자여야 합니다." })
  .int({ error: "통증 점수는 정수여야 합니다." })
  .min(PAIN_MIN, { error: `통증 점수는 ${PAIN_MIN}점 이상이어야 합니다.` })
  .max(PAIN_MAX, { error: `통증 점수는 ${PAIN_MAX}점 이하여야 합니다.` });

const partEntrySchema = z.strictObject({
  part: z.enum(BODY_PARTS, { error: "지원하지 않는 부위입니다." }),
  pain: painSchema,
});

// 알 수 없는 항목이 섞여 들어오면 거부한다(필요한 정보만 받기 위해 strictObject를 쓴다).
const recommendRequestSchema = z
  .strictObject({
    userType: z.enum(USER_TYPES, { error: "사용 유형(예방형/회복형)을 선택해 주세요." }),
    recoveryApproved: z
      .boolean({ error: "치료 후 운동 허가 여부는 예 또는 아니오여야 합니다." })
      .optional(),
    sport: z.enum(SPORTS, { error: "지원하지 않는 종목입니다." }),
    parts: z
      .array(partEntrySchema, { error: "부위를 선택해 주세요." })
      .min(1, { error: "부위를 하나 이상 선택해 주세요." })
      .max(BODY_PARTS.length, { error: "선택할 수 있는 부위 수를 넘었습니다." }),
    cannotBearWeight: z
      .boolean({ error: "체중을 싣기 어려운지는 예 또는 아니오여야 합니다." })
      .optional(),
  })
  .superRefine((value, ctx) => {
    // 같은 부위를 두 번 고를 수 없다.
    const seen = new Set<string>();
    value.parts.forEach((entry, index) => {
      if (seen.has(entry.part)) {
        ctx.addIssue({
          code: "custom",
          path: ["parts", index, "part"],
          message: "같은 부위를 두 번 선택할 수 없습니다.",
        });
      }
      seen.add(entry.part);
    });

    // 회복형은 치료 후 운동 허가 여부를 반드시 답해야 한다.
    if (value.userType === "회복형" && value.recoveryApproved === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["recoveryApproved"],
        message: "회복형은 치료 후 운동 허가 여부를 답해 주세요.",
      });
    }

    // 하체 부위(발목·무릎)를 골랐다면 체중을 싣기 어려운지 반드시 답해야 한다.
    if (needsWeightQuestion(value.parts) && value.cannotBearWeight === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["cannotBearWeight"],
        message: "발목이나 무릎을 골랐다면 체중을 싣기 어려운지 답해 주세요.",
      });
    }
  });

/** 검증을 통과한 추천 요청 (브라우저 → 서버) */
export type RecommendRequest = z.infer<typeof recommendRequestSchema>;

/** 잘못된 입력 하나: 어느 항목(field)이 왜(message) 잘못됐는지 */
export interface ValidationIssue {
  /** 점으로 이어 쓴 항목 위치. 예: "parts.0.pain" */
  field: string;
  /** 사용자에게 보여줄 안내 문장 */
  message: string;
}

export type ValidationResult =
  | { ok: true; data: RecommendRequest }
  | { ok: false; issues: ValidationIssue[] };

/** 알 수 없는 값(JSON으로 읽은 입력 등)이 올바른 추천 요청인지 검사한다. */
export function validateRecommendRequest(input: unknown): ValidationResult {
  const result = recommendRequestSchema.safeParse(input);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  return {
    ok: false,
    issues: result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    })),
  };
}
