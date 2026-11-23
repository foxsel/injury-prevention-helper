// Design Ref: PRD nice "진행 기록 화면" — 추천받을 때 입력한 통증을 첫 기록의 "운동 전 통증"으로 넘겨준다.
// Plan SC: 같은 통증을 두 번 묻지 않는다. 값은 이 브라우저(탭)에만 잠깐 두고 서버로 보내지 않는다.
//
// 추천 화면에서 부위별 통증을 입력했으므로, 추천된 운동마다 "그 운동이 다루는 부위의 통증"을 정해 두었다가
// 가이드 화면의 기록 카드가 운동 전 통증으로 미리 채워 준다.

import type { BodyPart } from "./constants";
import { PAIN_MAX, PAIN_MIN } from "./constants";

export const INTAKE_PAIN_KEY = "intake-pain-v1";

/** 운동 번호 → 추천받을 때 입력한 통증(0~10) */
export type IntakePainMap = Record<string, number>;

/** 한 번에 추천되는 운동은 최대 5개라 이보다 많은 값은 저장하지 않는다. */
const MAX_ENTRIES = 10;

export function parseIntakePain(raw: string | null): IntakePainMap {
  if (!raw) return {};
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== "object" || data === null || Array.isArray(data)) return {};
    const map: IntakePainMap = {};
    for (const [id, pain] of Object.entries(data as Record<string, unknown>)) {
      if (
        typeof pain === "number" &&
        Number.isInteger(pain) &&
        pain >= PAIN_MIN &&
        pain <= PAIN_MAX &&
        Object.keys(map).length < MAX_ENTRIES
      ) {
        map[id] = pain;
      }
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
 * 운동이 다루는 부위 가운데, 사용자가 고른 부위의 통증 중 가장 높은 값.
 * (겹치는 부위가 없으면 null. 추천 후보는 고른 부위와 겹치는 운동만이라 보통 값이 있다.)
 */
export function painForExercise(
  exercise: { bodyParts: BodyPart[] },
  parts: { part: BodyPart; pain: number }[],
): number | null {
  const pains = parts.filter((p) => exercise.bodyParts.includes(p.part)).map((p) => p.pain);
  return pains.length > 0 ? Math.max(...pains) : null;
}

/** 추천된 운동들의 번호별 통증을 만든다. */
export function buildIntakePainMap(
  exercises: { id: string; bodyParts: BodyPart[] }[],
  parts: { part: BodyPart; pain: number }[],
): IntakePainMap {
  const map: IntakePainMap = {};
  for (const exercise of exercises) {
    const pain = painForExercise(exercise, parts);
    if (pain !== null) map[exercise.id] = pain;
  }
  return map;
}

/** 한 운동의 값을 뺀 새 목록(기록에 한 번 쓰고 나면 지운다) */
export function withoutExercise(map: IntakePainMap, exerciseId: string): IntakePainMap {
  const next = { ...map };
  delete next[exerciseId];
  return next;
}
