// Design Ref: §11 시험 계획 — 입력 화면 값 → 추천 요청 변환 시험.
import { describe, expect, it } from "vitest";
import {
  EMPTY_INTAKE,
  orderedParts,
  shouldAskWeight,
  validateIntake,
  type IntakeState,
} from "./intake";

function state(overrides: Partial<IntakeState> = {}): IntakeState {
  return { ...EMPTY_INTAKE, ...overrides };
}

function fields(result: ReturnType<typeof validateIntake>): string[] {
  return result.ok ? [] : result.issues.map((issue) => issue.field);
}

describe("orderedParts / shouldAskWeight", () => {
  it("선택한 순서와 상관없이 발목, 무릎, 어깨 순서로 정리한다", () => {
    const parts = orderedParts(
      state({ selectedParts: ["어깨", "발목"], pains: { 어깨: 4, 발목: 1 } }),
    );
    expect(parts).toEqual([
      { part: "발목", pain: 1 },
      { part: "어깨", pain: 4 },
    ]);
  });

  it("통증을 움직이지 않은 부위는 0점으로 본다", () => {
    expect(orderedParts(state({ selectedParts: ["무릎"] }))).toEqual([
      { part: "무릎", pain: 0 },
    ]);
  });

  it("선택하지 않은 부위의 통증 값은 무시한다", () => {
    expect(
      orderedParts(state({ selectedParts: ["발목"], pains: { 발목: 2, 어깨: 9 } })),
    ).toEqual([{ part: "발목", pain: 2 }]);
  });

  it("하체 부위가 있을 때만 체중 질문이 필요하다", () => {
    expect(shouldAskWeight(state({ selectedParts: ["어깨"] }))).toBe(false);
    expect(shouldAskWeight(state({ selectedParts: ["발목"] }))).toBe(true);
    expect(shouldAskWeight(state({ selectedParts: ["어깨", "무릎"] }))).toBe(true);
    expect(shouldAskWeight(state())).toBe(false);
  });
});

describe("validateIntake: 빠진 항목 안내", () => {
  it("아무것도 고르지 않으면 유형·종목·부위를 모두 알려 준다", () => {
    const result = validateIntake(state());
    expect(result.ok).toBe(false);
    expect(fields(result)).toEqual(["userType", "sport", "parts"]);
  });

  it("안내 문장은 모두 한국어이고 비어 있지 않다", () => {
    const result = validateIntake(state());
    if (result.ok) throw new Error("실패해야 합니다.");
    for (const issue of result.issues) {
      expect(issue.message).toMatch(/[가-힣]/);
    }
  });

  it("회복형이 허가 질문에 답하지 않았으면 알려 준다", () => {
    const result = validateIntake(
      state({ userType: "회복형", sport: "축구", selectedParts: ["어깨"] }),
    );
    expect(fields(result)).toEqual(["recoveryApproved"]);
  });

  it("예방형은 허가 질문에 답하지 않아도 된다", () => {
    const result = validateIntake(
      state({ userType: "예방형", sport: "축구", selectedParts: ["어깨"] }),
    );
    expect(result.ok).toBe(true);
  });

  it("발목이나 무릎을 골랐는데 체중 질문에 답하지 않았으면 알려 준다", () => {
    const result = validateIntake(
      state({ userType: "예방형", sport: "농구", selectedParts: ["무릎"] }),
    );
    expect(fields(result)).toEqual(["cannotBearWeight"]);
  });

  it("어깨만 골랐다면 체중 질문 없이 통과한다", () => {
    const result = validateIntake(
      state({ userType: "예방형", sport: "야구", selectedParts: ["어깨"] }),
    );
    expect(result.ok).toBe(true);
  });
});

describe("validateIntake: 추천 요청 만들기", () => {
  it("예방형 하체 입력을 요청으로 바꾼다", () => {
    const result = validateIntake(
      state({
        userType: "예방형",
        sport: "배구",
        selectedParts: ["무릎", "발목"],
        pains: { 발목: 2, 무릎: 3 },
        cannotBearWeight: false,
      }),
    );
    expect(result).toEqual({
      ok: true,
      request: {
        userType: "예방형",
        sport: "배구",
        parts: [
          { part: "발목", pain: 2 },
          { part: "무릎", pain: 3 },
        ],
        cannotBearWeight: false,
      },
    });
  });

  it("회복형 입력에는 허가 값이 들어간다", () => {
    const result = validateIntake(
      state({
        userType: "회복형",
        recoveryApproved: true,
        sport: "헬스",
        selectedParts: ["어깨"],
        pains: { 어깨: 1 },
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.request.recoveryApproved).toBe(true);
      expect(result.request).not.toHaveProperty("cannotBearWeight");
    }
  });

  it("예방형으로 바꾸면 이전에 답한 허가 값은 요청에 넣지 않는다", () => {
    const result = validateIntake(
      state({
        userType: "예방형",
        recoveryApproved: false,
        sport: "축구",
        selectedParts: ["어깨"],
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.request).not.toHaveProperty("recoveryApproved");
    }
  });

  it("어깨만 고르면 이전에 답한 체중 값은 요청에 넣지 않는다", () => {
    const result = validateIntake(
      state({
        userType: "예방형",
        sport: "축구",
        selectedParts: ["어깨"],
        cannotBearWeight: true,
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.request).not.toHaveProperty("cannotBearWeight");
    }
  });

  it("회복형이 허가 \"아니오\"라고 답한 입력도 요청으로 만든다(막는 일은 안전 판정이 한다)", () => {
    const result = validateIntake(
      state({
        userType: "회복형",
        recoveryApproved: false,
        sport: "축구",
        selectedParts: ["어깨"],
      }),
    );
    expect(result.ok).toBe(true);
  });
});
