// Design Ref: PRD nice "진행 기록 화면" — 운동 완료 여부와 통증 변화를 브라우저에만 저장한다.
// Plan SC: 기록은 서버로 보내지 않는다. 통증을 6점 이상으로 기록하면 운동 중단과 상담을 안내한다.
//
// 이 파일은 저장 방식과 상관없는 순수 함수만 둔다(시험하기 쉽도록). 실제 저장은 components/logStore.ts가 맡는다.

import { PAIN_BLOCK_THRESHOLD, PAIN_MAX, PAIN_MIN } from "./constants";

export const LOG_KEY = "exercise-log-v1";
/** 브라우저 저장 공간을 아끼려고 기록은 최근 이만큼만 남긴다. */
export const MAX_LOG_ENTRIES = 300;

/** 기록 한 건: "이 날 이 운동을 했고, 운동 후 통증은 이만큼이었다". 운동 번호와 날짜, 통증 점수만 담는다. */
export interface LogEntry {
  /** 기록 번호 (지우기 위해 쓴다) */
  id: string;
  exerciseId: string;
  /** 기록한 날(이 기기의 날짜, YYYY-MM-DD) */
  date: string;
  /** 운동 후 통증 0~10 */
  pain: number;
  /** 기록한 시각(밀리초). 순서를 가릴 때 쓴다. */
  at: number;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isEntry(value: unknown): value is LogEntry {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.exerciseId === "string" &&
    typeof v.date === "string" &&
    DATE_PATTERN.test(v.date) &&
    typeof v.pain === "number" &&
    Number.isInteger(v.pain) &&
    v.pain >= PAIN_MIN &&
    v.pain <= PAIN_MAX &&
    typeof v.at === "number" &&
    Number.isFinite(v.at)
  );
}

/** 저장된 글자를 기록 목록으로 바꾼다. 깨졌거나 모양이 틀린 기록은 조용히 버린다. */
export function parseLog(raw: string | null): LogEntry[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter(isEntry).slice(-MAX_LOG_ENTRIES);
  } catch {
    return [];
  }
}

export function serializeLog(entries: LogEntry[]): string {
  return JSON.stringify(entries.slice(-MAX_LOG_ENTRIES));
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** 이 기기의 날짜를 YYYY-MM-DD로 */
export function localDate(now: Date): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function makeEntry(exerciseId: string, pain: number, now: Date): LogEntry {
  const at = now.getTime();
  return { id: `${at}-${exerciseId}`, exerciseId, date: localDate(now), pain, at };
}

export function addEntry(entries: LogEntry[], entry: LogEntry): LogEntry[] {
  return [...entries, entry].slice(-MAX_LOG_ENTRIES);
}

export function removeEntry(entries: LogEntry[], id: string): LogEntry[] {
  return entries.filter((e) => e.id !== id);
}

/** 통증을 이 점수로 기록했을 때 운동 중단과 상담을 안내해야 하는지 (추천 기준과 같은 6점) */
export function shouldAdviseStop(pain: number): boolean {
  return pain >= PAIN_BLOCK_THRESHOLD;
}

/** 같은 운동의 바로 이전 기록 통증. 없으면 null. */
export function previousPain(entries: LogEntry[], entry: LogEntry): number | null {
  const earlier = entries
    .filter((e) => e.exerciseId === entry.exerciseId && e.at < entry.at)
    .sort((a, b) => b.at - a.at);
  return earlier.length > 0 ? earlier[0].pain : null;
}

/** 이전 기록과 비교한 문장. 좋아졌다·나빠졌다 같은 판단 없이 숫자 차이만 알려 준다. */
export function describeChange(current: number, previous: number | null): string {
  if (previous === null) return "첫 기록";
  const diff = current - previous;
  if (diff === 0) return "지난 기록과 같음";
  return diff > 0 ? `지난 기록보다 ${diff}점 높음` : `지난 기록보다 ${-diff}점 낮음`;
}

export interface LogDay {
  date: string;
  entries: LogEntry[];
}

/** 날짜별로 묶는다. 최근 날짜가 위, 같은 날은 최근 기록이 위. */
export function groupByDate(entries: LogEntry[]): LogDay[] {
  const sorted = [...entries].sort((a, b) => b.at - a.at);
  const days: LogDay[] = [];
  for (const entry of sorted) {
    const last = days[days.length - 1];
    if (last && last.date === entry.date) last.entries.push(entry);
    else days.push({ date: entry.date, entries: [entry] });
  }
  return days;
}
