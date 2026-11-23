// Design Ref: §4 데이터 흐름 ⑨, §1 설계 원칙 — 추천 결과 검증 (화면에 나가기 전 마지막 안전장치).
// Plan SC: 후보 목록 밖 운동, 필수 정보(방법·횟수·세트·주의사항·중단 기준)가 빠진 운동,
//          금지 표현이 있는 운동은 걸러 내고, 5개를 넘으면 앞의 5개만 남긴다.
//
// AI가 돌려주는 것은 운동 id뿐이고 운동 문장은 우리 목록에서 나오므로, 문장 검사는
// "목록이 나중에 잘못 고쳐져도 위험한 문장이 화면에 나가지 않게" 하는 이중 장치다.

import {
  FORBIDDEN_TERMS,
  MAX_RECOMMENDATIONS,
  MAX_STEPS,
  MIN_STEPS,
  STOP_CRITERIA_TEXT,
} from "./constants";
import type { Exercise } from "./exercises/types";

function isBlank(text: string): boolean {
  return text.trim() === "";
}

/** 운동에 들어 있는 모든 문장(이름, 설명, 방법, 횟수, 세트, 주의사항, 중단 기준) */
function allTexts(exercise: Exercise): string[] {
  return [
    exercise.name,
    exercise.description,
    ...exercise.steps,
    exercise.reps,
    exercise.sets,
    ...exercise.cautions,
    ...exercise.stopCriteria,
  ];
}

/**
 * 운동을 화면에 보여줘도 되는지 검사하고, 문제가 있으면 그 내용을 목록으로 돌려준다.
 * 빈 목록이면 문제가 없는 것이다.
 */
export function findExerciseProblems(exercise: Exercise): string[] {
  const problems: string[] = [];

  if (
    exercise.steps.length < MIN_STEPS ||
    exercise.steps.length > MAX_STEPS ||
    exercise.steps.some(isBlank)
  ) {
    problems.push(`방법은 ${MIN_STEPS}~${MAX_STEPS}단계의 비어 있지 않은 문장이어야 합니다.`);
  }
  if (isBlank(exercise.reps)) {
    problems.push("횟수가 없습니다.");
  }
  if (isBlank(exercise.sets)) {
    problems.push("세트가 없습니다.");
  }
  if (exercise.cautions.length < 1 || exercise.cautions.some(isBlank)) {
    problems.push("주의사항이 없습니다.");
  }
  if (!exercise.stopCriteria.includes(STOP_CRITERIA_TEXT)) {
    problems.push("중단 기준에 정해진 문구가 없습니다.");
  }

  const text = allTexts(exercise).join("\n");
  for (const term of FORBIDDEN_TERMS) {
    if (text.includes(term)) {
      problems.push(`금지 표현이 있습니다: ${term}`);
    }
  }

  return problems;
}

/**
 * AI가 고른 id를 검증해 화면에 보여줄 운동으로 바꾼다.
 * - 후보 목록에 없는 id와 중복 id는 버린다.
 * - 필수 정보가 빠졌거나 금지 표현이 있는 운동은 건너뛴다.
 * - AI가 정한 순서를 지키며 최대 5개까지만 남긴다.
 */
export function verifyPicks(ids: string[], candidates: Exercise[]): Exercise[] {
  const byId = new Map(candidates.map((exercise) => [exercise.id, exercise]));
  const used = new Set<string>();
  const verified: Exercise[] = [];

  for (const id of ids) {
    if (verified.length >= MAX_RECOMMENDATIONS) {
      break;
    }
    const exercise = byId.get(id);
    if (!exercise || used.has(id)) {
      continue;
    }
    used.add(id);
    if (findExerciseProblems(exercise).length === 0) {
      verified.push(exercise);
    }
  }

  return verified;
}
