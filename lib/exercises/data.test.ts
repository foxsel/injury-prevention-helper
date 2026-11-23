// Design Ref: §11 시험 계획 "데이터 점검" — 운동 목록이 약속한 형식을 지키는지 확인한다.
import { describe, expect, it } from "vitest";
import {
  BODY_PARTS,
  FORBIDDEN_TERMS,
  MAX_STEPS,
  MIN_STEPS,
  PURPOSES,
  SPORTS,
  STOP_CRITERIA_TEXT,
} from "../constants";
import { EXERCISES, SAMPLE_SOURCE } from "./data";

describe("운동 목록 형식", () => {
  it("운동 id가 겹치지 않는다", () => {
    const ids = EXERCISES.map((exercise) => exercise.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(EXERCISES.map((exercise) => [exercise.id, exercise] as const))(
    "%s: 필수 항목을 모두 갖췄다",
    (_id, exercise) => {
      expect(exercise.name.trim()).not.toBe("");
      expect(exercise.description.trim()).not.toBe("");
      expect(exercise.steps.length).toBeGreaterThanOrEqual(MIN_STEPS);
      expect(exercise.steps.length).toBeLessThanOrEqual(MAX_STEPS);
      expect(exercise.reps.trim()).not.toBe("");
      expect(exercise.sets.trim()).not.toBe("");
      expect(exercise.cautions.length).toBeGreaterThanOrEqual(1);
      expect(exercise.stopCriteria).toContain(STOP_CRITERIA_TEXT);
      expect(exercise.source.trim()).not.toBe("");
      expect(exercise.sports.length).toBeGreaterThanOrEqual(1);
      expect(exercise.bodyParts.length).toBeGreaterThanOrEqual(1);
      expect(typeof exercise.highImpact).toBe("boolean");
    },
  );

  it("모든 문장에 금지 표현(진단·처방·효과 보장)이 없다", () => {
    for (const exercise of EXERCISES) {
      const text = JSON.stringify(exercise);
      for (const term of FORBIDDEN_TERMS) {
        expect(text, `${exercise.id}에 금지 표현 "${term}"`).not.toContain(term);
      }
    }
  });
});

describe("운동 목록 범위", () => {
  it("종목·부위·목적의 모든 조합에 운동이 하나 이상 있다", () => {
    for (const sport of SPORTS) {
      for (const part of BODY_PARTS) {
        for (const purpose of PURPOSES) {
          const count = EXERCISES.filter(
            (e) =>
              e.sports.includes(sport) &&
              e.bodyParts.includes(part) &&
              e.purpose === purpose,
          ).length;
          expect(count, `${sport}/${part}/${purpose}`).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });

  it("통증 3점 이상에서도 모든 조합에 충격이 작은 운동이 남는다", () => {
    for (const sport of SPORTS) {
      for (const part of BODY_PARTS) {
        for (const purpose of PURPOSES) {
          const count = EXERCISES.filter(
            (e) =>
              !e.highImpact &&
              e.sports.includes(sport) &&
              e.bodyParts.includes(part) &&
              e.purpose === purpose,
          ).length;
          expect(count, `${sport}/${part}/${purpose}`).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });
});

describe("가상 샘플 데이터 표시", () => {
  it("가상 샘플 운동은 부연설명과 주의사항에 샘플임을 밝힌다", () => {
    const samples = EXERCISES.filter((e) => e.source === SAMPLE_SOURCE);
    expect(samples.length).toBeGreaterThan(0);
    for (const exercise of samples) {
      expect(exercise.description, exercise.id).toContain("[가상 샘플]");
      expect(
        exercise.cautions.some((c) => c.includes("가상 샘플")),
        exercise.id,
      ).toBe(true);
    }
  });
});
