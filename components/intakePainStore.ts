"use client";

// Design Ref: PRD nice "진행 기록 화면" — 추천받을 때 입력한 통증을 이 탭(sessionStorage)에만 잠깐 둔다.
// 탭을 닫으면 사라지고, 서버로는 보내지 않는다. 저장이 막힌 브라우저에서는 조용히 건너뛴다.

import { useSyncExternalStore } from "react";
import type { BodyPart } from "../lib/constants";
import {
  INTAKE_PAIN_KEY,
  parseIntakePain,
  serializeIntakePain,
  withoutExercisePart,
  type IntakePainMap,
  type PartPains,
} from "../lib/intakePain";

const CHANGE_EVENT = "app:intake-pain-changed";

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

function readRaw(): string | null {
  try {
    return window.sessionStorage.getItem(INTAKE_PAIN_KEY);
  } catch {
    return null;
  }
}

function write(map: IntakePainMap): void {
  try {
    if (Object.keys(map).length === 0) window.sessionStorage.removeItem(INTAKE_PAIN_KEY);
    else window.sessionStorage.setItem(INTAKE_PAIN_KEY, serializeIntakePain(map));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // 저장이 막혀 있으면 운동 전 통증을 기록 카드에서 직접 입력하면 된다.
  }
}

const NONE: PartPains = {};

/** 이 운동에 대해 추천받을 때 입력한 부위별 통증. 없으면 빈 객체. */
export function useIntakePains(exerciseId: string): PartPains {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  return parseIntakePain(raw)[exerciseId] ?? NONE;
}

/** 새 추천 결과의 통증으로 바꿔 둔다(이전 추천의 값은 지운다). */
export function saveIntakePain(map: IntakePainMap): void {
  write(map);
}

/** 한 운동의 한 부위를 기록에 한 번 쓴 뒤에는 그 값을 지운다. (다음 기록은 "지난 운동 후 통증"과 비교한다) */
export function consumeIntakePain(exerciseId: string, part: BodyPart): void {
  write(withoutExercisePart(parseIntakePain(readRaw()), exerciseId, part));
}

/** [처음으로] 때 모두 지운다. */
export function clearIntakePain(): void {
  write({});
}
