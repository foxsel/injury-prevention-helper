// Design Ref: PRD nice "진행 기록 화면" — 통증 변화 분석 규칙과 추천 앞쪽 배치 시험.
import { describe, expect, it } from "vitest";
import { FORBIDDEN_TERMS, MAX_RECOMMENDATIONS } from "./constants";
import { EXERCISES } from "./exercises/data";
import type { BodyPart } from "./constants";
import type { RecommendRequest } from "./validate";
import { boostImproving, MAX_BOOSTED, safeCandidates } from "./boost";
import {
  analyzeTrend,
  EFFECT_DROP_POINTS,
  entriesFor,
  improvingExerciseIds,
  lastPainAfter,
  parseLog,
  serializeLog,
  type LogEntry,
} from "./log";
import { effectMessage, TREND_MESSAGES } from "./notices";

let clock = 0;
/** 시험용 기록: 호출할 때마다 시각이 1분씩 늦어진다. */
function e(exerciseId: string, pain: number, painBefore?: number, part: BodyPart = "발목"): LogEntry {
  clock += 60_000;
  const at = new Date(2026, 10, 1).getTime() + clock;
  return {
    id: `${at}-${exerciseId}`,
    exerciseId,
    part,
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

describe("처음 운동 전 통증과 최근 운동 후 통증 비교(효과 분석)", () => {
  /** [운동 전, 운동 후] 쌍으로 기록을 만든다. */
  const pairs = (...p: [number, number][]) => p.map(([b, a]) => e("x", a, b));

  it("기준은 2점이다", () => {
    expect(EFFECT_DROP_POINTS).toBe(2);
  });

  it("처음 운동 전 통증보다 최근 운동 후 통증이 2점 낮으면 효과 문구 대상이다", () => {
    const t = analyzeTrend(pairs([5, 4], [4, 3]));
    expect([t.dropFrom, t.dropTo, t.drop, t.effective]).toEqual([5, 3, 2, true]);
  });

  it("기록이 한 번뿐이어도 운동 전 5점에서 운동 후 3점이면 대상이다", () => {
    expect(analyzeTrend(pairs([5, 3])).effective).toBe(true);
  });

  it("운동 후 점수끼리 비교하지 않는다: 운동 후 4점 → 3점(1점 차이)이어도 처음 운동 전이 5점이면 대상이다", () => {
    const t = analyzeTrend(pairs([5, 4], [4, 3]));
    expect(t.effective).toBe(true);
    // 반대로 운동 후 점수끼리는 5점 → 3점으로 2점 줄었어도, 처음 운동 전 통증이 4점이면 1점 차이라 대상이 아니다.
    expect(analyzeTrend(pairs([4, 5], [5, 3])).effective).toBe(false);
  });

  it("2점보다 적게 낮으면 대상이 아니다", () => {
    expect(analyzeTrend(pairs([4, 3])).effective).toBe(false);
    expect(analyzeTrend(pairs([3, 3], [3, 3])).effective).toBe(false);
  });

  it("비교의 시작은 가장 처음 입력한 운동 전 통증이다(중간에 운동 전 통증이 바뀌어도 처음 값을 쓴다)", () => {
    const t = analyzeTrend(pairs([6, 5], [2, 3], [3, 2]));
    expect(t.dropFrom).toBe(6);
    expect(t.dropTo).toBe(2);
    expect(t.effective).toBe(true);
  });

  it("운동 전 통증이 없는 옛 기록은 건너뛰고 처음으로 운동 전 통증이 있는 기록을 쓴다", () => {
    const list = [e("x", 5), ...pairs([5, 4], [4, 2])];
    expect(analyzeTrend(list).dropFrom).toBe(5);
    expect(analyzeTrend(list).effective).toBe(true);
  });

  it("운동 전 통증이 하나도 없으면 비교할 수 없어 대상이 아니다", () => {
    const t = analyzeTrend([e("x", 5), e("x", 2)]);
    expect(t.effective).toBe(false);
    expect(t.drop).toBe(0);
  });

  it("기록이 없으면 대상이 아니다", () => {
    expect(analyzeTrend([]).effective).toBe(false);
  });

  it("최근 통증이 6점 이상이면 병원 상담이 먼저라 대상이 아니다", () => {
    const t = analyzeTrend(pairs([9, 8], [8, 6]));
    expect(t.status).toBe("consult");
    expect(t.effective).toBe(false);
  });

  it("지금 통증이 높아지는 중이면 대상이 아니다", () => {
    const t = analyzeTrend(pairs([7, 3], [3, 4], [4, 5]));
    expect(t.status).toBe("rising");
    expect(t.effective).toBe(false);
  });

  it("문구에 비교한 두 점수와 줄어든 점수가 들어 있고 효과를 보장하는 표현이 없다", () => {
    const text = effectMessage(5, 3);
    expect(text).toContain("운동 전 통증 5점");
    expect(text).toContain("운동 후 통증 3점");
    expect(text).toContain("2점 줄었어요");
    expect(text).toContain("효과를 보이는");
    for (const term of FORBIDDEN_TERMS) expect(text).not.toContain(term);
  });
});

describe("같은 운동이어도 부위가 다르면 따로 본다", () => {
  const list = [
    e("a", 2, 2, "발목"),
    e("a", 4, 4, "무릎"),
    e("a", 1, 2, "발목"),
    e("a", 6, 6, "무릎"),
  ];

  it("한 운동·한 부위의 기록만 고른다", () => {
    expect(entriesFor(list, "a", "발목").map((x) => x.pain)).toEqual([2, 1]);
    expect(entriesFor(list, "a", "무릎").map((x) => x.pain)).toEqual([4, 6]);
    expect(entriesFor(list, "a", "어깨")).toEqual([]);
  });

  it("지난 운동 후 통증도 부위별이다", () => {
    expect(lastPainAfter(list, "a", "발목")).toBe(1);
    expect(lastPainAfter(list, "a", "무릎")).toBe(6);
    expect(lastPainAfter(list, "a", "어깨")).toBeNull();
  });

  it("분석도 부위별이다(발목은 문제 없고 무릎은 6점 이상이라 진료 제안)", () => {
    expect(analyzeTrend(entriesFor(list, "a", "발목")).status).not.toBe("consult");
    expect(analyzeTrend(entriesFor(list, "a", "무릎")).status).toBe("consult");
  });

  it("추천 앞쪽 배치는 이번에 고른 부위의 기록만 본다", () => {
    const mixed = [
      ...[5, 4, 3].map((p) => e("g", p, 1, "발목")),
      ...[3, 3, 3].map((p) => e("g", p, 1, "무릎")),
    ];
    expect(improvingExerciseIds(mixed, ["발목"])).toEqual(["g"]);
    expect(improvingExerciseIds(mixed, ["무릎"])).toEqual([]);
    expect(improvingExerciseIds(mixed)).toEqual(["g"]);
  });

  it("같은 운동의 서로 다른 부위 기록을 섞어 분석하지 않는다(발목 좋아짐 + 무릎 나빠짐이 서로를 가리지 않는다)", () => {
    const mixed = [
      ...[5, 4, 3].map((p) => e("g", p, 1, "발목")),
      ...[1, 2, 3, 4].map((p) => e("g", p, 1, "무릎")),
    ];
    expect(analyzeTrend(entriesFor(mixed, "g", "발목")).status).toBe("improving");
    expect(analyzeTrend(entriesFor(mixed, "g", "무릎")).status).toBe("consult");
  });
});

describe("운동별 기록 고르기와 지난 운동 후 통증", () => {
  const all = [e("a", 3, 2), e("b", 4, 5), e("a", 2, 4)];

  it("한 운동의 기록만 시간 순서로 고른다", () => {
    expect(entriesFor(all, "a", "발목").map((x) => x.pain)).toEqual([3, 2]);
  });

  it("가장 최근 운동 후 통증을 돌려주고, 기록이 없으면 null", () => {
    expect(lastPainAfter(all, "a", "발목")).toBe(2);
    expect(lastPainAfter(all, "b", "발목")).toBe(4);
    expect(lastPainAfter(all, "zzz", "발목")).toBeNull();
  });

  it("운동 전 통증이 없는 옛 기록이어도 운동 후 통증으로 비교할 수 있다", () => {
    expect(lastPainAfter([e("a", 3), e("a", 5)], "a", "발목")).toBe(5);
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
