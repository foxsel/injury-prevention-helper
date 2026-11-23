// Design Ref: §11 시험 계획 — AI 응답 검증 시험.
import { describe, expect, it } from "vitest";
import {
  FORBIDDEN_TERMS,
  MAX_RECOMMENDATIONS,
  STOP_CRITERIA_TEXT,
} from "./constants";
import { EXERCISES } from "./exercises/data";
import type { Exercise } from "./exercises/types";
import { findExerciseProblems, verifyPicks } from "./verify";

// 올바른 운동 하나를 복사해 시험마다 필요한 부분만 망가뜨려 쓴다.
function validExercise(): Exercise {
  return structuredClone(EXERCISES[0]);
}

function broken(change: (exercise: Exercise) => void): Exercise {
  const exercise = validExercise();
  change(exercise);
  return exercise;
}

describe("findExerciseProblems: 필수 정보", () => {
  it("우리 운동 목록의 모든 운동은 문제가 없다", () => {
    for (const exercise of EXERCISES) {
      expect(findExerciseProblems(exercise), exercise.id).toEqual([]);
    }
  });

  it("방법이 2단계면 문제로 본다", () => {
    const exercise = broken((e) => {
      e.steps = e.steps.slice(0, 2);
    });
    expect(findExerciseProblems(exercise).length).toBeGreaterThan(0);
  });

  it("방법이 6단계면 문제로 본다", () => {
    const exercise = broken((e) => {
      e.steps = ["1", "2", "3", "4", "5", "6"];
    });
    expect(findExerciseProblems(exercise).length).toBeGreaterThan(0);
  });

  it("방법에 빈 문장이 있으면 문제로 본다", () => {
    const exercise = broken((e) => {
      e.steps = ["한 단계", "   ", "세 단계"];
    });
    expect(findExerciseProblems(exercise).length).toBeGreaterThan(0);
  });

  it("횟수가 비어 있으면 문제로 본다", () => {
    const exercise = broken((e) => {
      e.reps = "  ";
    });
    expect(findExerciseProblems(exercise)).toContain("횟수가 없습니다.");
  });

  it("세트가 비어 있으면 문제로 본다", () => {
    const exercise = broken((e) => {
      e.sets = "";
    });
    expect(findExerciseProblems(exercise)).toContain("세트가 없습니다.");
  });

  it("주의사항이 없으면 문제로 본다", () => {
    const exercise = broken((e) => {
      e.cautions = [];
    });
    expect(findExerciseProblems(exercise)).toContain("주의사항이 없습니다.");
  });

  it("중단 기준에 정해진 문구가 없으면 문제로 본다", () => {
    const exercise = broken((e) => {
      e.stopCriteria = ["아프면 쉰다"];
    });
    expect(findExerciseProblems(exercise)).toContain(
      "중단 기준에 정해진 문구가 없습니다.",
    );
  });

  it("중단 기준에 정해진 문구가 있으면 다른 문구가 더 있어도 괜찮다", () => {
    const exercise = broken((e) => {
      e.stopCriteria = [STOP_CRITERIA_TEXT, "추가 안내"];
    });
    expect(findExerciseProblems(exercise)).toEqual([]);
  });
});

describe("findExerciseProblems: 금지 표현", () => {
  it.each(FORBIDDEN_TERMS.map((term) => [term]))(
    '"%s"가 방법에 있으면 문제로 본다',
    (term) => {
      const exercise = broken((e) => {
        e.steps = [e.steps[0], `이렇게 하면 ${term}`, e.steps[2]];
      });
      expect(findExerciseProblems(exercise).length).toBeGreaterThan(0);
    },
  );

  it("이름, 설명, 주의사항 어디에 있어도 잡아낸다", () => {
    const term = FORBIDDEN_TERMS[0];
    expect(
      findExerciseProblems(broken((e) => { e.name = `${term} 운동`; })).length,
    ).toBeGreaterThan(0);
    expect(
      findExerciseProblems(broken((e) => { e.description = `${term}`; })).length,
    ).toBeGreaterThan(0);
    expect(
      findExerciseProblems(broken((e) => { e.cautions = [`${term}`]; })).length,
    ).toBeGreaterThan(0);
  });

  it("금지 표현 목록에 효과 보장과 진단·처방 표현이 모두 들어 있다", () => {
    expect(FORBIDDEN_TERMS).toContain("완치");
    expect(FORBIDDEN_TERMS).toContain("100% 예방");
    expect(FORBIDDEN_TERMS).toContain("진단합니다");
    expect(FORBIDDEN_TERMS).toContain("처방합니다");
  });
});

describe("verifyPicks", () => {
  const candidates = EXERCISES.filter((e) => e.purpose === "예방");

  it("AI가 정한 순서를 지킨다", () => {
    const [a, b, c] = candidates;
    const result = verifyPicks([c.id, a.id, b.id], candidates);
    expect(result.map((e) => e.id)).toEqual([c.id, a.id, b.id]);
  });

  it("후보에 없는 id는 버린다", () => {
    const [a, b] = candidates;
    const result = verifyPicks([a.id, "없는-운동", b.id], candidates);
    expect(result.map((e) => e.id)).toEqual([a.id, b.id]);
  });

  it("후보가 아닌 운동은 목록에 있어도 버린다", () => {
    const recovery = EXERCISES.find((e) => e.purpose === "회복")!;
    expect(verifyPicks([recovery.id], candidates)).toEqual([]);
  });

  it("중복 id는 한 번만 남긴다", () => {
    const [a, b] = candidates;
    const result = verifyPicks([a.id, a.id, b.id, a.id], candidates);
    expect(result.map((e) => e.id)).toEqual([a.id, b.id]);
  });

  it("최대 개수를 넘으면 앞에서부터 5개만 남긴다", () => {
    expect(candidates.length).toBeGreaterThan(MAX_RECOMMENDATIONS);
    const result = verifyPicks(
      candidates.map((e) => e.id),
      candidates,
    );
    expect(result).toHaveLength(MAX_RECOMMENDATIONS);
    expect(result.map((e) => e.id)).toEqual(
      candidates.slice(0, MAX_RECOMMENDATIONS).map((e) => e.id),
    );
  });

  it("문제가 있는 운동은 건너뛰고 다음 id로 이어간다", () => {
    const [a, b, c] = candidates;
    const bad = { ...b, reps: "" };
    const result = verifyPicks([a.id, b.id, c.id], [a, bad, c]);
    expect(result.map((e) => e.id)).toEqual([a.id, c.id]);
  });

  it("금지 표현이 있는 운동은 건너뛴다", () => {
    const [a, b] = candidates;
    const bad = { ...a, description: "이 운동으로 완치됩니다" };
    const result = verifyPicks([a.id, b.id], [bad, b]);
    expect(result.map((e) => e.id)).toEqual([b.id]);
  });

  it("모두 걸러지면 빈 목록을 돌려준다", () => {
    expect(verifyPicks(["없는-운동"], candidates)).toEqual([]);
    expect(verifyPicks([], candidates)).toEqual([]);
  });

  it("문제가 있어 걸러진 운동은 5개 자리를 차지하지 않는다", () => {
    const good = candidates.slice(0, 4);
    const bad = { ...candidates[4], sets: "" };
    const extra = candidates[5];
    const pool = [...good, bad, extra];
    const result = verifyPicks(
      pool.map((e) => e.id),
      pool,
    );
    expect(result.map((e) => e.id)).toEqual([...good, extra].map((e) => e.id));
  });
});
