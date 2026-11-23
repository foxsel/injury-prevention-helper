// Design Ref: §11 시험 계획 — 추천 처리 흐름 시험. 가짜 AI를 끼워 넣어 AI 호출 없이 확인한다.
import { describe, expect, it, vi } from "vitest";
import type { AiPicker } from "./ai";
import { AiFailedError, AiTimeoutError } from "./aiErrors";
import { MAX_RECOMMENDATIONS, MAX_REQUEST_BYTES } from "./constants";
import { EXERCISES } from "./exercises/data";
import { getCandidates, handleRecommend } from "./recommend";

function body(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    userType: "예방형",
    sport: "축구",
    parts: [{ part: "무릎", pain: 1 }],
    cannotBearWeight: false,
    ...overrides,
  });
}

// 후보의 앞에서부터 n개를 그대로 고르는 가짜 AI
function pickFirst(n: number): AiPicker {
  return vi.fn<AiPicker>(async (_request, candidates) =>
    candidates.slice(0, n).map((e) => e.id),
  );
}

describe("getCandidates", () => {
  it("예방형은 예방 운동만, 선택한 부위에 맞는 운동만 추린다", () => {
    const candidates = getCandidates({
      userType: "예방형",
      sport: "농구",
      parts: [{ part: "무릎", pain: 1 }],
      cannotBearWeight: false,
    });
    expect(candidates.length).toBeGreaterThan(0);
    for (const exercise of candidates) {
      expect(exercise.purpose).toBe("예방");
      expect(exercise.bodyParts).toContain("무릎");
      expect(exercise.sports).toContain("농구");
    }
  });

  it("회복형은 회복 운동만 추린다", () => {
    const candidates = getCandidates({
      userType: "회복형",
      recoveryApproved: true,
      sport: "배구",
      parts: [{ part: "무릎", pain: 1 }],
      cannotBearWeight: false,
    });
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every((e) => e.purpose === "회복")).toBe(true);
  });

  it("부위를 여러 개 고르면 하나라도 맞는 운동을 모두 포함한다", () => {
    const candidates = getCandidates({
      userType: "예방형",
      sport: "축구",
      parts: [
        { part: "발목", pain: 1 },
        { part: "무릎", pain: 1 },
      ],
      cannotBearWeight: false,
    });
    expect(candidates.some((e) => e.bodyParts.includes("발목"))).toBe(true);
    expect(candidates.some((e) => e.bodyParts.includes("무릎"))).toBe(true);
  });

  it("근거 자료가 없어 비워 둔 어깨 예방은 후보가 없다(가상 샘플을 내보내지 않는다)", () => {
    const candidates = getCandidates({
      userType: "예방형",
      sport: "야구",
      parts: [{ part: "어깨", pain: 1 }],
    });
    expect(candidates).toEqual([]);
  });
});

describe("handleRecommend: 입력 오류", () => {
  it("JSON이 아니면 400", async () => {
    const ai = pickFirst(1);
    const result = await handleRecommend("이건 JSON이 아님", ai);
    expect(result.httpStatus).toBe(400);
    expect(result.body).toMatchObject({ status: "error", code: "INVALID_INPUT" });
    expect(ai).not.toHaveBeenCalled();
  });

  it("너무 큰 요청이면 400", async () => {
    const ai = pickFirst(1);
    const big = JSON.stringify({ memo: "가".repeat(MAX_REQUEST_BYTES) });
    const result = await handleRecommend(big, ai);
    expect(result.httpStatus).toBe(400);
    expect(ai).not.toHaveBeenCalled();
  });

  it("지원하지 않는 종목이면 400과 안내를 돌려준다", async () => {
    const ai = pickFirst(1);
    const result = await handleRecommend(body({ sport: "수영" }), ai);
    expect(result.httpStatus).toBe(400);
    if (result.body.status === "error" && result.body.code === "INVALID_INPUT") {
      expect(result.body.issues.some((i) => i.field === "sport")).toBe(true);
    } else {
      throw new Error("INVALID_INPUT이어야 합니다.");
    }
    expect(ai).not.toHaveBeenCalled();
  });
});

describe("handleRecommend: 안전 판정으로 막는 경우 (AI를 부르지 않는다)", () => {
  it("통증 6점이면 막는다", async () => {
    const ai = pickFirst(1);
    const result = await handleRecommend(
      body({ parts: [{ part: "어깨", pain: 6 }] }),
      ai,
    );
    expect(result).toEqual({
      httpStatus: 200,
      body: { status: "blocked", reason: "pain" },
    });
    expect(ai).not.toHaveBeenCalled();
  });

  it("하체 부위에서 체중을 싣기 어렵다면 막는다", async () => {
    const ai = pickFirst(1);
    const result = await handleRecommend(
      body({ parts: [{ part: "발목", pain: 1 }], cannotBearWeight: true }),
      ai,
    );
    expect(result.body).toEqual({ status: "blocked", reason: "weight" });
    expect(ai).not.toHaveBeenCalled();
  });

  it("회복형이 허가 \"아니오\"면 막는다", async () => {
    const ai = pickFirst(1);
    const result = await handleRecommend(
      body({ userType: "회복형", recoveryApproved: false }),
      ai,
    );
    expect(result.body).toEqual({ status: "blocked", reason: "not-approved" });
    expect(ai).not.toHaveBeenCalled();
  });
});

describe("handleRecommend: 정상 흐름", () => {
  it("AI가 고른 운동의 전체 내용을 우리 목록에서 꺼내 돌려준다", async () => {
    const ai = pickFirst(2);
    const result = await handleRecommend(body(), ai);
    expect(result.httpStatus).toBe(200);
    expect(result.body.status).toBe("ok");
    if (result.body.status === "ok") {
      expect(result.body.exercises).toHaveLength(2);
      for (const exercise of result.body.exercises) {
        expect(EXERCISES).toContainEqual(exercise);
      }
    }
    expect(ai).toHaveBeenCalledTimes(1);
  });

  it("AI에는 조건에 맞는 후보만 넘긴다", async () => {
    const ai = pickFirst(1);
    await handleRecommend(body({ sport: "야구" }), ai);
    const [request, candidates] = vi.mocked(ai).mock.calls[0];
    expect(request.sport).toBe("야구");
    expect(candidates.every((e) => e.bodyParts.includes("무릎"))).toBe(true);
    expect(candidates.every((e) => e.purpose === "예방")).toBe(true);
  });

  it("통증 3점이면 고충격 운동을 후보에서 뺀 채 AI를 부른다", async () => {
    const ai = pickFirst(1);
    await handleRecommend(
      body({ parts: [{ part: "무릎", pain: 3 }], cannotBearWeight: false }),
      ai,
    );
    const [, candidates] = vi.mocked(ai).mock.calls[0];
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.some((e) => e.highImpact)).toBe(false);
  });

  it("통증 2점이면 고충격 운동도 후보에 들어간다", async () => {
    const ai = pickFirst(1);
    await handleRecommend(
      body({ parts: [{ part: "무릎", pain: 2 }], cannotBearWeight: false }),
      ai,
    );
    const [, candidates] = vi.mocked(ai).mock.calls[0];
    expect(candidates.some((e) => e.highImpact)).toBe(true);
  });

  it("AI가 6개를 골라도 최대 5개만 돌려준다", async () => {
    const ai: AiPicker = async (_request, candidates) => candidates.map((e) => e.id);
    const result = await handleRecommend(
      body({ parts: [{ part: "무릎", pain: 0 }], cannotBearWeight: false }),
      ai,
    );
    expect(result.body.status).toBe("ok");
    if (result.body.status === "ok") {
      expect(result.body.exercises.length).toBeLessThanOrEqual(MAX_RECOMMENDATIONS);
    }
  });
});

describe("handleRecommend: AI 문제", () => {
  it("AI가 후보 밖 id만 돌려주면 502 AI_FAILED", async () => {
    const ai: AiPicker = async () => ["존재하지-않는-운동"];
    const result = await handleRecommend(body(), ai);
    expect(result).toEqual({
      httpStatus: 502,
      body: { status: "error", code: "AI_FAILED" },
    });
  });

  it("AI가 정상적으로 0개를 고르면 empty", async () => {
    const ai: AiPicker = async () => [];
    const result = await handleRecommend(body(), ai);
    expect(result).toEqual({ httpStatus: 200, body: { status: "empty" } });
  });

  it("AI 시간 초과면 504 AI_TIMEOUT", async () => {
    const ai: AiPicker = async () => {
      throw new AiTimeoutError();
    };
    const result = await handleRecommend(body(), ai);
    expect(result).toEqual({
      httpStatus: 504,
      body: { status: "error", code: "AI_TIMEOUT" },
    });
  });

  it("AI 호출이 실패하면 502 AI_FAILED", async () => {
    const ai: AiPicker = async () => {
      throw new AiFailedError();
    };
    const result = await handleRecommend(body(), ai);
    expect(result.httpStatus).toBe(502);
    expect(result.body).toEqual({ status: "error", code: "AI_FAILED" });
  });

  it("예상하지 못한 오류도 502 AI_FAILED로 처리한다", async () => {
    const ai: AiPicker = async () => {
      throw new Error("알 수 없는 오류");
    };
    const result = await handleRecommend(body(), ai);
    expect(result.httpStatus).toBe(502);
  });
});
