// Design Ref: PRD nice "진행 기록 화면" — 추천 때 입력한 통증을 운동 전 통증으로 넘기는 규칙 시험.
import { describe, expect, it } from "vitest";
import { buildIntakePainMap, painForExercise, parseIntakePain, serializeIntakePain, withoutExercise } from "./intakePain";

const shoulder = { id: "s1", bodyParts: ["어깨" as const] };
const knee = { id: "k1", bodyParts: ["무릎" as const] };
const both = { id: "b1", bodyParts: ["발목" as const, "무릎" as const] };

describe("운동별로 넘겨줄 통증", () => {
  const parts = [
    { part: "발목" as const, pain: 2 },
    { part: "무릎" as const, pain: 5 },
  ];

  it("운동이 다루는 부위 중 고른 부위의 통증을 쓰고, 여러 곳이면 가장 높은 값", () => {
    expect(painForExercise(both, parts)).toBe(5);
    expect(painForExercise(knee, parts)).toBe(5);
  });

  it("고르지 않은 부위의 운동이면 null", () => {
    expect(painForExercise(shoulder, parts)).toBeNull();
  });

  it("추천된 운동별 번호표를 만든다(겹치는 부위가 없는 운동은 뺀다)", () => {
    expect(buildIntakePainMap([shoulder, knee, both], parts)).toEqual({ k1: 5, b1: 5 });
  });
});

describe("저장 글자", () => {
  it("저장했다가 읽으면 같은 값이다", () => {
    const map = { k1: 5, b1: 0 };
    expect(parseIntakePain(serializeIntakePain(map))).toEqual(map);
  });

  it("깨졌거나 범위 밖·소수·글자 값은 버린다", () => {
    expect(parseIntakePain(null)).toEqual({});
    expect(parseIntakePain("{깨짐")).toEqual({});
    expect(parseIntakePain("[1,2]")).toEqual({});
    expect(parseIntakePain(JSON.stringify({ a: 11, b: -1, c: 2.5, d: "3", e: 4 }))).toEqual({ e: 4 });
  });

  it("한 운동의 값만 지운다", () => {
    expect(withoutExercise({ a: 1, b: 2 }, "a")).toEqual({ b: 2 });
  });
});
