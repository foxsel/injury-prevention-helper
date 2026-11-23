// Design Ref: PRD nice "진행 기록 화면" — 추천 때 입력한 통증을 부위별로 운동 전 통증에 넘기는 규칙 시험.
import { describe, expect, it } from "vitest";
import {
  buildIntakePainMap,
  painsForExercise,
  parseIntakePain,
  serializeIntakePain,
  withoutExercisePart,
} from "./intakePain";

const shoulder = { id: "s1", bodyParts: ["어깨" as const] };
const knee = { id: "k1", bodyParts: ["무릎" as const] };
const both = { id: "b1", bodyParts: ["발목" as const, "무릎" as const] };

describe("운동별·부위별로 넘겨줄 통증", () => {
  const parts = [
    { part: "발목" as const, pain: 2 },
    { part: "무릎" as const, pain: 5 },
  ];

  it("운동이 다루는 부위 중 고른 부위의 통증을 부위별로 돌려준다(섞지 않는다)", () => {
    expect(painsForExercise(both, parts)).toEqual({ 발목: 2, 무릎: 5 });
    expect(painsForExercise(knee, parts)).toEqual({ 무릎: 5 });
  });

  it("고르지 않은 부위의 운동이면 빈 객체", () => {
    expect(painsForExercise(shoulder, parts)).toEqual({});
  });

  it("추천된 운동별 번호표를 만든다(겹치는 부위가 없는 운동은 뺀다)", () => {
    expect(buildIntakePainMap([shoulder, knee, both], parts)).toEqual({
      k1: { 무릎: 5 },
      b1: { 발목: 2, 무릎: 5 },
    });
  });
});

describe("저장 글자", () => {
  it("저장했다가 읽으면 같은 값이다", () => {
    const map = { k1: { 무릎: 5 }, b1: { 발목: 0, 무릎: 3 } };
    expect(parseIntakePain(serializeIntakePain(map))).toEqual(map);
  });

  it("깨졌거나 범위 밖·소수·글자 값, 모르는 부위는 버린다", () => {
    expect(parseIntakePain(null)).toEqual({});
    expect(parseIntakePain("{깨짐")).toEqual({});
    expect(parseIntakePain("[1,2]")).toEqual({});
    expect(parseIntakePain(JSON.stringify({ a: 3 }))).toEqual({});
    expect(
      parseIntakePain(JSON.stringify({ a: { 발목: 11, 무릎: -1, 어깨: 2.5, 허리: 3 }, b: { 무릎: 4, 발목: "3" } })),
    ).toEqual({ b: { 무릎: 4 } });
  });

  it("한 운동의 한 부위 값만 지우고, 부위가 모두 사라지면 운동도 뺀다", () => {
    const map = { a: { 발목: 1, 무릎: 2 }, b: { 어깨: 3 } };
    expect(withoutExercisePart(map, "a", "발목")).toEqual({ a: { 무릎: 2 }, b: { 어깨: 3 } });
    expect(withoutExercisePart(map, "b", "어깨")).toEqual({ a: { 발목: 1, 무릎: 2 } });
  });
});
