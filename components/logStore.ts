"use client";

// Design Ref: PRD nice "진행 기록 화면" — 기록은 이 브라우저(localStorage)에만 저장하고 서버로 보내지 않는다.
// 브라우저가 저장을 막은 경우(시크릿 창, 저장 공간 꽉 참 등)에는 오류 없이 저장만 건너뛴다.

import { useMemo, useSyncExternalStore } from "react";
import type { BodyPart } from "../lib/constants";
import { EXERCISES } from "../lib/exercises/data";
import { LOG_KEY, parseLog, serializeLog, type LogEntry } from "../lib/log";

const CHANGE_EVENT = "app:log-changed";

/** 부위가 없는 옛 기록은 그 운동의 첫 번째 부위로 본다. */
function firstPartOf(exerciseId: string): BodyPart | undefined {
  return EXERCISES.find((e) => e.id === exerciseId)?.bodyParts[0];
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange); // 다른 탭에서 바뀐 경우
  window.addEventListener(CHANGE_EVENT, onChange); // 이 탭에서 바뀐 경우
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(LOG_KEY);
  } catch {
    return null;
  }
}

/** 저장된 기록 목록. 서버에서 그릴 때는 비어 있다. */
export function useLog(): LogEntry[] {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  return useMemo(() => parseLog(raw, firstPartOf), [raw]);
}

/** 화면이 아닌 곳(추천 결과 처리 등)에서 저장된 기록을 한 번 읽는다. */
export function readLogEntries(): LogEntry[] {
  return parseLog(readRaw(), firstPartOf);
}

/** 기록 전체를 저장한다. 저장에 성공하면 true. */
export function saveLog(entries: LogEntry[]): boolean {
  try {
    if (entries.length === 0) window.localStorage.removeItem(LOG_KEY);
    else window.localStorage.setItem(LOG_KEY, serializeLog(entries));
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return true;
  } catch {
    return false;
  }
}
