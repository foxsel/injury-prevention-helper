// Design Ref: PRD nice "진행 기록 화면" — 통증 변화 분석 규칙과 추천 앞쪽 배치 시험.
import { describe, expect, it } from "vitest";
import { FORBIDDEN_TERMS, MAX_RECOMMENDATIONS } from "./constants";
import { EXERCISES } from "./exercises/data";
import type { RecommendRequest } from "./validate";
import { boostImproving, MAX_BOOSTED, safeCandidates } from "./boost";
import {
  analyzeTrend,
  entriesFor,
  improvingExerciseIds,
  lastPainBefore,
  parseLog,
  serializeLog,
  type LogEntry,
} from "./log";
import { TREND_MESSAGES } from "./notices";

let clock = 0;
/** 시험용 기록: 호출할 때마다 시각이 1분씩 늦어진다. */
function e(exerciseId: string, pain: number, painBefore?: number): LogEntry {
  clock += 60_000;
  const at = new Date(2026, 10, 1).getTime() + clock;
  return {
    id: `${at}-${exerciseId}`,
    exerciseId,
    date: "2026-11-01",
    ...(painBefore === undefined ? {} : { painBefore }),
    pain,
    at,
  };
}
const series = (...pains: number[]) => pains.map((p) => e("x", p, 0));

describe("통증 변화 분석", () => {
  it("기록이 없거나 1개뿐이면 더 쌓이길 기다린다", () => {
    expect(analyzeTrend([]).status).toBe("need-more");
    expect(analyzeTrend(series(3)).status).toBe("need-more");
  });

  it("운동 후 통증이 3번 연속 높아지면 병원 진료 제안(consult)", () => {
    const t = analyzeTrend(series(1, 2, 3, 4));
    expect(t.status).toBe("consult");
    expect(t.risingCount).toBe(3);
  });

  it("2번 높아진 것만으로는 지켜보기(rising)이고 진료 제안은 아니다", () => {
    expect(analyzeTrend(series(1, 2, 3)).status).toBe("rising");
    expect(analyzeTrend(series(5, 3, 4)).status).toBe("rising");
  });

  it("연속이 끊기면 다시 센다(오르내림은 3번 연속이 아님)", () => {
    expect(analyzeTrend(series(1, 3, 2, 4, 5)).status).toBe("rising");
    expect(analyzeTrend(series(1, 2, 3, 3, 4)).risingCount).toBe(1);
  });

  it("가장 최근 통증이 6점 이상이면 변화와 상관없이 병원 진료 제안", () => {
    expect(analyzeTrend(series(6)).status).toBe("consult");
    expect(analyzeTrend(series(9, 8, 7, 6)).status).toBe("consult");
    expect(analyzeTrend(series(5, 6)).status).toBe("consult");
    expect(analyzeTrend(series(3, 5)).status).toBe("rising");
  });

  it("운동 전 통증이 6점 이상이어도 병원 진료 제안", () => {
    expect(analyzeTrend([e("x", 2, 6)]).status).toBe("consult");
  });

  it("예전에 6점이었어도 가장 최근 기록이 낮으면 계속 경고하지 않는다", () => {
    expect(analyzeTrend(series(7, 6, 4)).status).not.toBe("consult");
  });

  it("운동 후 통증이 2번 연속 낮아지면 좋아지는 흐름(improving)", () => {
    const t = analyzeTrend(series(5, 4, 3));
    expect(t.status).toBe("improving");
    expect(t.fallingCount).toBe(2);
    expect(analyzeTrend(series(5, 4)).status).toBe("steady");
  });

  it("뚜렷한 변화가 없으면 steady", () => {
    expect(analyzeTrend(series(3, 3, 3)).status).toBe("steady");
    expect(analyzeTrend(series(3, 2, 3, 2)).status).toBe("steady");
  });

  it("기록 순서가 섞여 들어와도 시각 순서로 본다", () => {
    const list = series(1, 2, 3, 4);
    expect(analyzeTrend([list[3], list[0], list[2], list[1]]).status).toBe("consult");
  });

  it("분석 문구에 금지 표현이 없다", () => {
    for (const text of Object.values(TREND_MESSAGES)) {
      for (const term of FORBIDDEN_TERMS) expect(text).not.toContain(term);
    }
    expect(TREND_MESSAGES.consult).toContain("병원 진료");
  });
});

describe("운동별 기록 고르기와 운동 전 통증 이어받기", () => {
  const all = [e("a", 3, 2), e("b", 4, 5), e("a", 2, 4)];

  it("한 운동의 기록만 시간 순서로 고른다", () => {
    expect(entriesFor(all, "a").map((x) => x.pain)).toEqual([3, 2]);
  });

  it("가장 최근 운동 전 통증을 돌려주고, 기록이 없으면 null", () => {
    expect(lastPainBefore(all, "a")).toBe(4);
    expect(lastPainBefore(all, "b")).toBe(5);
    expect(lastPainBefore(all, "zzz")).toBeNull();
  });

  it("운동 전 통증이 없는 옛 기록은 건너뛰고 그 이전 값을 쓴다", () => {
    const old = [e("a", 3, 6), e("a", 2)];
    expect(lastPainBefore(old, "a")).toBe(6);
  });

  it("운동 전 통증이 없는 옛 기록도 읽을 수 있고, 범위 밖 값은 버린다", () => {
    const withoutBefore = e("a", 3);
    expect(parseLog(serializeLog([withoutBefore]))).toEqual([withoutBefore]);
    const bad = { ...e("a", 3, 2), painBefore: 12 };
    expect(parseLog(JSON.stringify([bad]))).toEqual([]);
  });
});

describe("좋아지는 운동을 추천 앞쪽에 올리기", () => {
  const request: RecommendRequest = {
    userType: "예방형",
    sport: "농구",
    parts: [{ part: "어깨", pain: 1 }],
  };
  const candidates = safeCandidates(request);

  it("좋아지는 흐름인 운동의 번호만 모은다", () => {
    const log = [
      ...[5, 4, 3].map((p) => e("good", p, 1)),
      ...[1, 2, 3, 4].map((p) => e("bad", p, 1)),
    ];
    expect(improvingExerciseIds(log)).toEqual(["good"]);
  });

  it("후보 안의 운동은 앞으로 올라오고, 합쳐도 5개를 넘지 않으며 중복이 없다", () => {
    expect(candidates.length).toBeGreaterThanOrEqual(3);
    const target = candidates[candidates.length - 1];
    const ai = candidates.slice(0, MAX_RECOMMENDATIONS);
    const result = boostImproving(ai, candidates, [target.id]);
    expect(result.exercises[0].id).toBe(target.id);
    expect(result.boosted).toEqual([target.id]);
    expect(result.exercises.length).toBeLessThanOrEqual(MAX_RECOMMENDATIONS);
    expect(new Set(result.exercises.map((x) => x.id)).size).toBe(result.exercises.length);
  });

  it("앞으로 올리는 개수는 최대 2개이고 AI가 고른 나머지의 순서는 지킨다", () => {
    const ids = candidates.map((c) => c.id);
    const ai = candidates.slice(0, 2);
    const result = boostImproving(ai, candidates, ids);
    expect(result.boosted.length).toBeLessThanOrEqual(MAX_BOOSTED);
    const rest = result.exercises.filter((x) => !result.boosted.includes(x.id)).map((x) => x.id);
    const aiRest = ai.filter((x) => !result.boosted.includes(x.id)).map((x) => x.id);
    expect(rest).toEqual(aiRest.slice(0, rest.length));
  });

  it("후보에 없는 운동(다른 종목·부위·유형, 고충격)은 올라오지 않는다", () => {
    const outside = EXERCISES.find((x) => !candidates.some((c) => c.id === x.id))!;
    const result = boostImproving(candidates.slice(0, 2), candidates, [outside.id]);
    expect(result.boosted).toEqual([]);
    expect(result.exercises.map((x) => x.id)).toEqual(candidates.slice(0, 2).map((x) => x.id));
  });

  it("통증 3점 이상이면 고충격 운동은 후보에서 빠져 앞으로 올라오지 않는다", () => {
    const high = EXERCISES.filter((x) => x.highImpact);
    expect(high.length).toBeGreaterThan(0);
    const hi = high[0];
    const req: RecommendRequest = {
      userType: hi.purpose === "예방" ? "예방형" : "회복형",
      sport: hi.sports[0],
      parts: [{ part: hi.bodyParts[0], pain: 3 }],
      ...(hi.purpose === "회복" ? { recoveryApproved: true } : {}),
      ...(hi.bodyParts[0] === "발목" || hi.bodyParts[0] === "무릎" ? { cannotBearWeight: false } : {}),
    } as RecommendRequest;
    expect(safeCandidates(req).some((x) => x.id === hi.id)).toBe(false);
  });

  it("막힌 요청(통증 6점 이상)에는 후보가 없다", () => {
    const blocked: RecommendRequest = { ...request, parts: [{ part: "어깨", pain: 6 }] };
    expect(safeCandidates(blocked)).toEqual([]);
  });
});
