// Design Ref: PRD nice "진행 기록 화면" — 추천받을 때 입력한 통증을 첫 기록의 "운동 전 통증"으로 넘겨준다.
// Plan SC: 같은 통증을 두 번 묻지 않는다. 값은 이 브라우저(탭)에만 잠깐 두고 서버로 보내지 않는다.
//
// 추천 화면에서 부위별 통증을 입력했으므로, 추천된 운동마다 "그 운동이 다루는 부위의 통증"을 부위별로 정해 두었다가
// 가이드 화면의 기록 카드가 고른 부위의 운동 전 통증으로 미리 채워 준다.

import type { BodyPart } from "./constants";
import { BODY_PARTS, PAIN_MAX, PAIN_MIN } from "./constants";

export const INTAKE_PAIN_KEY = "intake-pain-v1";

/** 부위별 통증(0~10). 추천받을 때 고른 부위만 들어 있다. */
export type PartPains = Partial<Record<BodyPart, number>>;

/** 운동 번호 → 그 운동이 다루는 부위 중, 추천받을 때 입력한 부위별 통증 */
export type IntakePainMap = Record<string, PartPains>;

/** 한 번에 추천되는 운동은 최대 5개라 이보다 많은 값은 저장하지 않는다. */
const MAX_ENTRIES = 10;

function isPain(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= PAIN_MIN && value <= PAIN_MAX;
}

export function parseIntakePain(raw: string | null): IntakePainMap {
  if (!raw) return {};
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== "object" || data === null || Array.isArray(data)) return {};
    const map: IntakePainMap = {};
    for (const [id, value] of Object.entries(data as Record<string, unknown>)) {
      if (Object.keys(map).length >= MAX_ENTRIES) break;
      if (typeof value !== "object" || value === null || Array.isArray(value)) continue;
      const pains: PartPains = {};
      for (const part of BODY_PARTS) {
        const pain = (value as Record<string, unknown>)[part];
        if (isPain(pain)) pains[part] = pain;
      }
      if (Object.keys(pains).length > 0) map[id] = pains;
    }
    return map;
  } catch {
    return {};
  }
}

export function serializeIntakePain(map: IntakePainMap): string {
  return JSON.stringify(map);
}

/**
 * 운동이 다루는 부위 가운데, 사용자가 고른 부위의 통증을 부위별로 돌려준다.
 * (겹치는 부위가 없으면 빈 객체. 추천 후보는 고른 부위와 겹치는 운동만이라 보통 값이 있다.)
 */
export function painsForExercise(
  exercise: { bodyParts: BodyPart[] },
  parts: { part: BodyPart; pain: number }[],
): PartPains {
  const pains: PartPains = {};
  for (const entry of parts) {
    if (exercise.bodyParts.includes(entry.part)) pains[entry.part] = entry.pain;
  }
  return pains;
}

/** 추천된 운동들의 번호별·부위별 통증을 만든다. */
export function buildIntakePainMap(
  exercises: { id: string; bodyParts: BodyPart[] }[],
  parts: { part: BodyPart; pain: number }[],
): IntakePainMap {
  const map: IntakePainMap = {};
  for (const exercise of exercises) {
    const pains = painsForExercise(exercise, parts);
    if (Object.keys(pains).length > 0) map[exercise.id] = pains;
  }
  return map;
}

/** 한 운동의 한 부위 값을 뺀 새 목록(그 부위를 기록에 한 번 쓰고 나면 지운다) */
export function withoutExercisePart(map: IntakePainMap, exerciseId: string, part: BodyPart): IntakePainMap {
  const next: IntakePainMap = { ...map };
  const pains = { ...next[exerciseId] };
  delete pains[part];
  if (Object.keys(pains).length === 0) delete next[exerciseId];
  else next[exerciseId] = pains;
  return next;
}
