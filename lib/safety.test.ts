// Design Ref: §11 시험 계획 — 안전 판정 규칙 시험.
import { describe, expect, it } from "vitest";
import { EXERCISES } from "./exercises/data";
import { filterBySafety, judgeSafety, needsWeightQuestion } from "./safety";

describe("judgeSafety: 통증 기준", () => {
  it("통증 5점은 통과한다", () => {
    const result = judgeSafety({
      userType: "예방형",
      parts: [{ part: "발목", pain: 5 }],
    });
    expect(result.status).toBe("ok");
  });

  it("통증 6점은 막는다", () => {
    const result = judgeSafety({
      userType: "예방형",
      parts: [{ part: "발목", pain: 6 }],
    });
    expect(result).toEqual({ status: "blocked", reason: "pain" });
  });

  it("회복형도 통증 6점이면 막는다(허가를 받았어도)", () => {
    const result = judgeSafety({
      userType: "회복형",
      recoveryApproved: true,
      parts: [{ part: "어깨", pain: 6 }],
    });
    expect(result).toEqual({ status: "blocked", reason: "pain" });
  });

  it("여러 부위 중 한 부위라도 6점 이상이면 막는다", () => {
    const result = judgeSafety({
      userType: "예방형",
      parts: [
        { part: "발목", pain: 1 },
        { part: "무릎", pain: 8 },
      ],
    });
    expect(result).toEqual({ status: "blocked", reason: "pain" });
  });

  it("통증 0점과 10점의 경계값도 올바르게 판정한다", () => {
    expect(
      judgeSafety({ userType: "예방형", parts: [{ part: "발목", pain: 0 }] }).status,
    ).toBe("ok");
    expect(
      judgeSafety({ userType: "예방형", parts: [{ part: "발목", pain: 10 }] }).status,
    ).toBe("blocked");
  });

  it("숫자가 아닌 통증 값(NaN)은 안전한 쪽(막음)으로 판단한다", () => {
    const result = judgeSafety({
      userType: "예방형",
      parts: [{ part: "발목", pain: Number.NaN }],
    });
    expect(result).toEqual({ status: "blocked", reason: "pain" });
  });
});

describe("judgeSafety: 체중을 싣기 어려움", () => {
  it("하체 부위(발목)에서 체중을 싣기 어렵다면 막는다", () => {
    const result = judgeSafety({
      userType: "예방형",
      parts: [{ part: "발목", pain: 2 }],
      cannotBearWeight: true,
    });
    expect(result).toEqual({ status: "blocked", reason: "weight" });
  });

  it("하체 부위(무릎)에서 체중을 싣기 어렵다면 막는다", () => {
    const result = judgeSafety({
      userType: "예방형",
      parts: [{ part: "무릎", pain: 2 }],
      cannotBearWeight: true,
    });
    expect(result).toEqual({ status: "blocked", reason: "weight" });
  });

  it("어깨만 골랐다면 체중 질문이 없으므로 이 값이 true여도 막지 않는다", () => {
    const parts = [{ part: "어깨" as const, pain: 2 }];
    expect(needsWeightQuestion(parts)).toBe(false);
    const result = judgeSafety({ userType: "예방형", parts, cannotBearWeight: true });
    expect(result.status).toBe("ok");
  });

  it("어깨와 하체를 함께 골랐다면 체중 질문이 필요하고 true이면 막는다", () => {
    const parts = [
      { part: "어깨" as const, pain: 1 },
      { part: "무릎" as const, pain: 1 },
    ];
    expect(needsWeightQuestion(parts)).toBe(true);
    const result = judgeSafety({ userType: "예방형", parts, cannotBearWeight: true });
    expect(result).toEqual({ status: "blocked", reason: "weight" });
  });

  it("체중을 싣기 어렵지 않다고 답하면 통과한다", () => {
    const result = judgeSafety({
      userType: "예방형",
      parts: [{ part: "발목", pain: 2 }],
      cannotBearWeight: false,
    });
    expect(result.status).toBe("ok");
  });
});

describe("judgeSafety: 회복형 운동 허가", () => {
  it('회복형이 허가 "아니오"이면 막는다', () => {
    const result = judgeSafety({
      userType: "회복형",
      recoveryApproved: false,
      parts: [{ part: "발목", pain: 1 }],
    });
    expect(result).toEqual({ status: "blocked", reason: "not-approved" });
  });

  it("회복형인데 허가 값이 없으면 막는다", () => {
    const result = judgeSafety({
      userType: "회복형",
      parts: [{ part: "발목", pain: 1 }],
    });
    expect(result).toEqual({ status: "blocked", reason: "not-approved" });
  });

  it("회복형이 허가 \"예\"이면 통과한다", () => {
    const result = judgeSafety({
      userType: "회복형",
      recoveryApproved: true,
      parts: [{ part: "발목", pain: 1 }],
    });
    expect(result.status).toBe("ok");
  });

  it("예방형은 허가 값이 없어도 막지 않는다", () => {
    const result = judgeSafety({
      userType: "예방형",
      parts: [{ part: "발목", pain: 1 }],
    });
    expect(result.status).toBe("ok");
  });
});

describe("judgeSafety: 막는 이유의 우선순위", () => {
  it("허가 없음이 통증보다 먼저 걸린다", () => {
    const result = judgeSafety({
      userType: "회복형",
      recoveryApproved: false,
      parts: [{ part: "발목", pain: 9 }],
    });
    expect(result).toEqual({ status: "blocked", reason: "not-approved" });
  });

  it("통증이 체중 문제보다 먼저 걸린다", () => {
    const result = judgeSafety({
      userType: "예방형",
      parts: [{ part: "발목", pain: 9 }],
      cannotBearWeight: true,
    });
    expect(result).toEqual({ status: "blocked", reason: "pain" });
  });
});

describe("judgeSafety: 고충격 운동 제외", () => {
  it("통증 2점이면 고충격 운동도 포함한다", () => {
    const result = judgeSafety({
      userType: "예방형",
      parts: [{ part: "무릎", pain: 2 }],
    });
    expect(result).toEqual({ status: "ok", excludeHighImpact: false });
  });

  it("통증 3점이면 고충격 운동을 제외한다", () => {
    const result = judgeSafety({
      userType: "예방형",
      parts: [{ part: "무릎", pain: 3 }],
    });
    expect(result).toEqual({ status: "ok", excludeHighImpact: true });
  });

  it("여러 부위 중 한 부위만 3점 이상이어도 제외한다", () => {
    const result = judgeSafety({
      userType: "예방형",
      parts: [
        { part: "발목", pain: 0 },
        { part: "무릎", pain: 4 },
      ],
    });
    expect(result).toEqual({ status: "ok", excludeHighImpact: true });
  });
});

describe("filterBySafety", () => {
  it("제외가 켜지면 고충격 운동만 빠지고 나머지는 그대로 남는다", () => {
    const filtered = filterBySafety(EXERCISES, true);
    expect(filtered.some((exercise) => exercise.highImpact)).toBe(false);
    expect(filtered.length).toBe(EXERCISES.filter((e) => !e.highImpact).length);
    expect(filtered.length).toBeLessThan(EXERCISES.length);
  });

  it("제외가 꺼지면 목록을 그대로 돌려준다", () => {
    expect(filterBySafety(EXERCISES, false)).toEqual(EXERCISES);
  });
});
