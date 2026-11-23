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
import { EXERCISES, SAMPLE_SOURCE, UNUSED_SAMPLE_EXERCISES } from "./data";

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

// 근거 자료를 찾지 못해 비워 둔 조합(어깨 예방). 자료를 채우면 이 목록에서 지우고 시험이 모두 확인하게 한다.
const KNOWN_EMPTY = (part: string, purpose: string) => part === "어깨" && purpose === "예방";

describe("운동 목록 범위", () => {
  it("종목·부위·목적의 모든 조합에 운동이 하나 이상 있다(알려진 빈 조합 제외)", () => {
    for (const sport of SPORTS) {
      for (const part of BODY_PARTS) {
        for (const purpose of PURPOSES) {
          if (KNOWN_EMPTY(part, purpose)) continue;
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

  it("통증 3점 이상에서도 모든 조합에 충격이 작은 운동이 남는다(알려진 빈 조합 제외)", () => {
    for (const sport of SPORTS) {
      for (const part of BODY_PARTS) {
        for (const purpose of PURPOSES) {
          if (KNOWN_EMPTY(part, purpose)) continue;
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

describe("가상 샘플 데이터 차단", () => {
  it("공개 목록(EXERCISES)에 가상 샘플이 하나도 섞여 있지 않다", () => {
    expect(EXERCISES.filter((e) => e.source === SAMPLE_SOURCE)).toHaveLength(0);
    expect(EXERCISES.some((e) => e.id.includes("sample") || e.description.includes("[가상 샘플]"))).toBe(false);
  });

  it("내보내지 않는 가상 샘플도 샘플임을 밝히고 있다(나중에 실수로 켜도 표시되도록)", () => {
    const samples = UNUSED_SAMPLE_EXERCISES;
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
