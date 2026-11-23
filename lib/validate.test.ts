// Design Ref: §11 시험 계획 — 입력값 검증 시험.
import { describe, expect, it } from "vitest";
import { validateRecommendRequest, type ValidationResult } from "./validate";

// 올바른 요청을 만들고, 시험마다 필요한 부분만 바꿔서 쓴다.
function validRequest(overrides: Record<string, unknown> = {}) {
  return {
    userType: "예방형",
    sport: "축구",
    parts: [{ part: "어깨", pain: 2 }],
    ...overrides,
  };
}

function fieldsOf(result: ValidationResult): string[] {
  return result.ok ? [] : result.issues.map((issue) => issue.field);
}

describe("올바른 입력", () => {
  it("예방형 어깨 입력은 통과한다(체중 값 없어도 됨)", () => {
    const result = validateRecommendRequest(validRequest());
    expect(result.ok).toBe(true);
  });

  it("예방형 하체 입력은 체중 값이 있으면 통과한다", () => {
    const result = validateRecommendRequest(
      validRequest({
        parts: [{ part: "발목", pain: 0 }],
        cannotBearWeight: false,
      }),
    );
    expect(result.ok).toBe(true);
  });

  it("회복형은 허가 값이 있으면 통과한다", () => {
    const result = validateRecommendRequest(
      validRequest({ userType: "회복형", recoveryApproved: true }),
    );
    expect(result.ok).toBe(true);
  });

  it("부위 여러 개와 경계 통증 점수(0, 10)를 받는다", () => {
    const result = validateRecommendRequest(
      validRequest({
        parts: [
          { part: "발목", pain: 0 },
          { part: "무릎", pain: 10 },
          { part: "어깨", pain: 5 },
        ],
        cannotBearWeight: false,
      }),
    );
    expect(result.ok).toBe(true);
  });

  it("어깨만 골랐을 때 체중 값이 와도 거부하지 않는다", () => {
    const result = validateRecommendRequest(validRequest({ cannotBearWeight: true }));
    expect(result.ok).toBe(true);
  });

  it("통과한 결과에 입력값이 그대로 담긴다", () => {
    const result = validateRecommendRequest(validRequest({ sport: "야구" }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.sport).toBe("야구");
      expect(result.data.parts).toEqual([{ part: "어깨", pain: 2 }]);
    }
  });
});

describe("지원하지 않는 값", () => {
  it("목록에 없는 종목은 거부한다", () => {
    const result = validateRecommendRequest(validRequest({ sport: "수영" }));
    expect(result.ok).toBe(false);
    expect(fieldsOf(result)).toContain("sport");
  });

  it("목록에 없는 부위는 거부한다", () => {
    const result = validateRecommendRequest(
      validRequest({ parts: [{ part: "허리", pain: 1 }] }),
    );
    expect(result.ok).toBe(false);
    expect(fieldsOf(result)).toContain("parts.0.part");
  });

  it("목록에 없는 사용 유형은 거부한다", () => {
    const result = validateRecommendRequest(validRequest({ userType: "관리형" }));
    expect(result.ok).toBe(false);
    expect(fieldsOf(result)).toContain("userType");
  });

  it("알 수 없는 항목이 섞여 있으면 거부한다", () => {
    const result = validateRecommendRequest(validRequest({ name: "홍길동" }));
    expect(result.ok).toBe(false);
  });
});

describe("통증 점수", () => {
  it.each([
    ["11점", 11],
    ["-1점", -1],
    ["소수(2.5)", 2.5],
    ["NaN", Number.NaN],
    ["무한대", Number.POSITIVE_INFINITY],
  ])("범위 밖이거나 정수가 아닌 값(%s)은 거부한다", (_label, pain) => {
    const result = validateRecommendRequest(
      validRequest({ parts: [{ part: "어깨", pain }] }),
    );
    expect(result.ok).toBe(false);
    expect(fieldsOf(result)).toContain("parts.0.pain");
  });

  it("숫자가 아닌 통증 값(문자열)은 거부한다", () => {
    const result = validateRecommendRequest(
      validRequest({ parts: [{ part: "어깨", pain: "3" }] }),
    );
    expect(result.ok).toBe(false);
    expect(fieldsOf(result)).toContain("parts.0.pain");
  });

  it("통증 점수가 없으면 거부한다", () => {
    const result = validateRecommendRequest(
      validRequest({ parts: [{ part: "어깨" }] }),
    );
    expect(result.ok).toBe(false);
    expect(fieldsOf(result)).toContain("parts.0.pain");
  });
});

describe("비어 있거나 모자란 입력", () => {
  it.each([
    ["null", null],
    ["문자열", "추천해 주세요"],
    ["숫자", 123],
    ["빈 객체", {}],
    ["배열", []],
  ])("요청 전체가 올바르지 않으면(%s) 거부한다", (_label, input) => {
    expect(validateRecommendRequest(input).ok).toBe(false);
  });

  it("부위를 하나도 고르지 않으면 거부한다", () => {
    const result = validateRecommendRequest(validRequest({ parts: [] }));
    expect(result.ok).toBe(false);
    expect(fieldsOf(result)).toContain("parts");
  });

  it("같은 부위를 두 번 고르면 거부한다", () => {
    const result = validateRecommendRequest(
      validRequest({
        parts: [
          { part: "어깨", pain: 1 },
          { part: "어깨", pain: 2 },
        ],
      }),
    );
    expect(result.ok).toBe(false);
    expect(fieldsOf(result)).toContain("parts.1.part");
  });

  it("부위가 지원 개수보다 많으면 거부한다", () => {
    const result = validateRecommendRequest(
      validRequest({
        parts: [
          { part: "발목", pain: 1 },
          { part: "무릎", pain: 1 },
          { part: "어깨", pain: 1 },
          { part: "어깨", pain: 1 },
        ],
        cannotBearWeight: false,
      }),
    );
    expect(result.ok).toBe(false);
  });
});

describe("조건부 필수 항목", () => {
  it("회복형인데 허가 값이 없으면 거부한다", () => {
    const result = validateRecommendRequest(validRequest({ userType: "회복형" }));
    expect(result.ok).toBe(false);
    expect(fieldsOf(result)).toContain("recoveryApproved");
  });

  it("회복형이 허가 \"아니오\"라고 답한 입력은 모양이 올바르므로 통과한다(막는 일은 안전 판정이 한다)", () => {
    const result = validateRecommendRequest(
      validRequest({ userType: "회복형", recoveryApproved: false }),
    );
    expect(result.ok).toBe(true);
  });

  it("하체 부위(발목)인데 체중 값이 없으면 거부한다", () => {
    const result = validateRecommendRequest(
      validRequest({ parts: [{ part: "발목", pain: 1 }] }),
    );
    expect(result.ok).toBe(false);
    expect(fieldsOf(result)).toContain("cannotBearWeight");
  });

  it("하체 부위(무릎)인데 체중 값이 없으면 거부한다", () => {
    const result = validateRecommendRequest(
      validRequest({ parts: [{ part: "무릎", pain: 1 }] }),
    );
    expect(result.ok).toBe(false);
    expect(fieldsOf(result)).toContain("cannotBearWeight");
  });

  it("체중 값이 true/false가 아니면 거부한다", () => {
    const result = validateRecommendRequest(
      validRequest({ parts: [{ part: "발목", pain: 1 }], cannotBearWeight: "예" }),
    );
    expect(result.ok).toBe(false);
    expect(fieldsOf(result)).toContain("cannotBearWeight");
  });
});

describe("안내 문장", () => {
  it("잘못된 항목마다 사용자에게 보여줄 한국어 안내가 들어 있다", () => {
    const result = validateRecommendRequest(
      validRequest({ sport: "수영", parts: [{ part: "어깨", pain: 11 }] }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.length).toBeGreaterThanOrEqual(2);
      for (const issue of result.issues) {
        expect(issue.message.trim()).not.toBe("");
        expect(issue.message).toMatch(/[가-힣]/);
      }
    }
  });
});
