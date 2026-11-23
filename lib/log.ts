// Design Ref: PRD nice "진행 기록 화면" — 운동 완료 여부와 통증 변화를 브라우저에만 저장한다.
// Plan SC: 기록은 서버로 보내지 않는다. 통증을 6점 이상으로 기록하면 운동 중단과 상담을 안내한다.
//
// 이 파일은 저장 방식과 상관없는 순수 함수만 둔다(시험하기 쉽도록). 실제 저장은 components/logStore.ts가 맡는다.

import { BODY_PARTS, PAIN_BLOCK_THRESHOLD, PAIN_MAX, PAIN_MIN, type BodyPart } from "./constants";

export const LOG_KEY = "exercise-log-v1";
/** 브라우저 저장 공간을 아끼려고 기록은 최근 이만큼만 남긴다. */
export const MAX_LOG_ENTRIES = 300;

/**
 * 기록 한 건: "이 날 이 운동을 했고, 이 부위의 운동 후 통증은 이만큼이었다".
 * 운동 번호·부위·날짜·통증 점수만 담는다. 같은 운동이어도 부위가 다르면 따로 모아 그래프를 그린다.
 */
export interface LogEntry {
  /** 기록 번호 (지우기 위해 쓴다) */
  id: string;
  exerciseId: string;
  /** 어느 부위의 통증을 기록했는지 */
  part: BodyPart;
  /** 기록한 날(이 기기의 날짜, YYYY-MM-DD) */
  date: string;
  /** 운동 전 통증 0~10. 이 값이 생기기 전에 만든 옛 기록에는 없을 수 있다. */
  painBefore?: number;
  /** 운동 후 통증 0~10 */
  pain: number;
  /** 기록한 시각(밀리초). 순서를 가릴 때 쓴다. */
  at: number;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isPain(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= PAIN_MIN && value <= PAIN_MAX;
}

/** part를 뺀 나머지 모양이 맞는지(부위는 parseLog가 따로 채운다) */
function hasEntryShape(value: unknown): value is Omit<LogEntry, "part"> & { part?: unknown } {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v.painBefore !== undefined && !isPain(v.painBefore)) return false;
  return (
    typeof v.id === "string" &&
    typeof v.exerciseId === "string" &&
    typeof v.date === "string" &&
    DATE_PATTERN.test(v.date) &&
    isPain(v.pain) &&
    typeof v.at === "number" &&
    Number.isFinite(v.at)
  );
}

/**
 * 저장된 글자를 기록 목록으로 바꾼다. 깨졌거나 모양이 틀린 기록은 조용히 버린다.
 * 부위가 없는 옛 기록(부위 기능이 생기기 전에 만든 기록)은 firstPartOf(운동 번호)가 알려 주는
 * 그 운동의 첫 번째 부위로 채우고, 알 수 없으면 버린다.
 */
export function parseLog(
  raw: string | null,
  firstPartOf: (exerciseId: string) => BodyPart | undefined = () => undefined,
): LogEntry[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const entries: LogEntry[] = [];
    for (const item of data) {
      if (!hasEntryShape(item)) continue;
      const part = BODY_PARTS.find((p) => p === item.part) ?? firstPartOf(item.exerciseId);
      if (part !== undefined) entries.push({ ...item, part });
    }
    return entries.slice(-MAX_LOG_ENTRIES);
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

export function makeEntry(
  exerciseId: string,
  part: BodyPart,
  painBefore: number,
  pain: number,
  now: Date,
): LogEntry {
  const at = now.getTime();
  return { id: `${at}-${exerciseId}-${part}`, exerciseId, part, date: localDate(now), painBefore, pain, at };
}

export function addEntry(entries: LogEntry[], entry: LogEntry): LogEntry[] {
  return [...entries, entry].slice(-MAX_LOG_ENTRIES);
}

export function removeEntry(entries: LogEntry[], id: string): LogEntry[] {
  return entries.filter((e) => e.id !== id);
}

/** 한 운동·한 부위의 기록만 시간 순서(오래된 것 먼저)로 골라낸다. */
export function entriesFor(entries: LogEntry[], exerciseId: string, part: BodyPart): LogEntry[] {
  return entries
    .filter((e) => e.exerciseId === exerciseId && e.part === part)
    .sort((a, b) => a.at - b.at);
}

/**
 * 이 운동·부위에서 가장 최근에 기록한 "운동 후 통증". 없으면 null.
 * 다음 운동 전 통증은 보통 지난 운동이 끝난 때의 통증과 같으므로, 기록 카드가 이 값과 비교해서
 * 같으면 운동 전 통증 입력을 건너뛰게 한다.
 */
export function lastPainAfter(entries: LogEntry[], exerciseId: string, part: BodyPart): number | null {
  const list = entriesFor(entries, exerciseId, part);
  return list.length > 0 ? list[list.length - 1].pain : null;
}

/** 통증을 이 점수로 기록했을 때 운동 중단과 상담을 안내해야 하는지 (추천 기준과 같은 6점) */
export function shouldAdviseStop(pain: number): boolean {
  return pain >= PAIN_BLOCK_THRESHOLD;
}

/** 기록 첫 화면에 "운동+부위" 하나당 한 줄만 보여 주기 위한 요약 */
export interface ExerciseSummary {
  exerciseId: string;
  part: BodyPart;
  /** 이 운동·부위의 기록 개수 */
  count: number;
  /** 가장 최근 기록한 날(YYYY-MM-DD) */
  lastDate: string;
}

/** 운동+부위별로 하나씩 묶는다(같은 운동도 부위가 다르면 따로). 가장 최근에 기록한 것이 위에 온다. */
export function summarizeByExercisePart(entries: LogEntry[]): ExerciseSummary[] {
  const groups = new Map<string, ExerciseSummary & { lastAt: number }>();
  for (const entry of entries) {
    const key = `${entry.exerciseId}|${entry.part}`;
    const current = groups.get(key);
    if (!current) {
      groups.set(key, {
        exerciseId: entry.exerciseId,
        part: entry.part,
        count: 1,
        lastDate: entry.date,
        lastAt: entry.at,
      });
    } else {
      current.count += 1;
      if (entry.at >= current.lastAt) {
        current.lastAt = entry.at;
        current.lastDate = entry.date;
      }
    }
  }
  return [...groups.values()]
    .sort((a, b) => b.lastAt - a.lastAt)
    .map(({ exerciseId, part, count, lastDate }) => ({ exerciseId, part, count, lastDate }));
}

/** 기록 첫 화면의 부위 탭: 고른 부위의 기록만 남긴다. part가 null이면 전체. */
export function summariesForPart(summaries: ExerciseSummary[], part: BodyPart | null): ExerciseSummary[] {
  return part === null ? summaries : summaries.filter((s) => s.part === part);
}

/** 운동별 기록 화면 주소에 쓰는 부위 이름(한글을 주소에 직접 쓰지 않으려고 영어 이름표를 둔다) */
export const PART_SLUGS: Record<BodyPart, string> = {
  발목: "ankle",
  무릎: "knee",
  어깨: "shoulder",
};

export function partSlug(part: BodyPart): string {
  return PART_SLUGS[part];
}

/** 주소의 부위 이름표에서 부위를 찾는다. 없는 이름표면 undefined. */
export function partFromSlug(slug: string): BodyPart | undefined {
  return BODY_PARTS.find((p) => PART_SLUGS[p] === slug);
}

/** 한 운동·부위의 기록 화면 주소 */
export function logHref(exerciseId: string, part: BodyPart): string {
  return `/log/${exerciseId}/${partSlug(part)}`;
}

// ---- 통증 변화 분석 ----

export type TrendStatus = "need-more" | "consult" | "rising" | "improving" | "steady";

/** 통증이 연속으로 이만큼 높아지면 병원 진료·상담을 권한다. */
export const RISING_CONSULT_COUNT = 3;
/** 통증이 연속으로 이만큼 낮아지면 이 운동을 추천에서 더 앞에 보여 준다. */
export const FALLING_IMPROVE_COUNT = 2;

/** 가장 처음 입력한 운동 전 통증보다 가장 최근 운동 후 통증이 이만큼(점) 이상 낮으면 "효과를 보이는 흐름"이라고 알려 준다. */
export const EFFECT_DROP_POINTS = 2;

export interface Trend {
  status: TrendStatus;
  /** 그렇게 판단한 이유(화면에 보여 줄 문장) */
  reasons: string[];
  /** 가장 최근 기록 기준으로 통증이 연속해서 높아진 횟수 */
  risingCount: number;
  /** 가장 최근 기록 기준으로 통증이 연속해서 낮아진 횟수 */
  fallingCount: number;
  /** 비교의 시작: 가장 처음 입력한 운동 전 통증(운동 전 통증이 있는 기록이 없으면 dropTo와 같다) */
  dropFrom: number;
  /** 비교의 끝: 가장 최근 운동 후 통증(기록이 없으면 0) */
  dropTo: number;
  /** 낮아진 점수 = dropFrom - dropTo */
  drop: number;
  /** 처음 운동 전 통증보다 EFFECT_DROP_POINTS점 이상 낮고, 병원 상담 대상이 아니며 지금 통증이 높아지는 중이 아니면 true → "효과를 보이는 흐름" 문구를 보여 준다. */
  effective: boolean;
}

/**
 * 한 운동의 기록(운동 후 통증의 흐름)을 보고 상태를 정한다. 판단 순서는 안전한 쪽이 먼저다.
 * 1) 가장 최근 기록의 운동 전·후 통증이 6점 이상 → consult
 * 2) 통증이 3번 연속 높아짐 → consult
 * 3) 1~2번 높아짐 → rising(지켜보기)
 * 4) 기록이 2개 미만 → need-more
 * 5) 2번 연속 낮아짐 → improving
 * 6) 그 밖 → steady
 */
export function analyzeTrend(entriesOfOneExercise: LogEntry[]): Trend {
  const trend = classifyTrend(entriesOfOneExercise);
  const list = [...entriesOfOneExercise].sort((a, b) => a.at - b.at);
  const firstBefore = list.find((e) => e.painBefore !== undefined)?.painBefore;
  const dropTo = list.length > 0 ? list[list.length - 1].pain : 0;
  const dropFrom = firstBefore ?? dropTo;
  const drop = dropFrom - dropTo;
  return {
    ...trend,
    dropFrom,
    dropTo,
    drop,
    effective:
      firstBefore !== undefined &&
      trend.status !== "consult" &&
      trend.status !== "rising" &&
      drop >= EFFECT_DROP_POINTS,
  };
}

type BaseTrend = Pick<Trend, "status" | "reasons" | "risingCount" | "fallingCount">;

function classifyTrend(entriesOfOneExercise: LogEntry[]): BaseTrend {
  const list = [...entriesOfOneExercise].sort((a, b) => a.at - b.at);
  const pains = list.map((e) => e.pain);
  let rising = 0;
  for (let i = pains.length - 1; i > 0 && pains[i] > pains[i - 1]; i--) rising++;
  let falling = 0;
  for (let i = pains.length - 1; i > 0 && pains[i] < pains[i - 1]; i--) falling++;
  const base = { risingCount: rising, fallingCount: falling };

  if (list.length === 0) return { status: "need-more", reasons: [], ...base };

  const latest = list[list.length - 1];
  const reasons: string[] = [];
  if (shouldAdviseStop(latest.pain) || shouldAdviseStop(latest.painBefore ?? 0)) {
    reasons.push(`가장 최근 기록에서 통증이 ${PAIN_BLOCK_THRESHOLD}점 이상이에요.`);
  }
  if (rising >= RISING_CONSULT_COUNT) {
    reasons.push(`운동 후 통증이 ${rising}번 연속 높아졌어요.`);
  }
  if (reasons.length > 0) return { status: "consult", reasons, ...base };

  if (rising >= 1) return { status: "rising", reasons: [`운동 후 통증이 ${rising}번 연속 높아졌어요.`], ...base };
  if (list.length < 2) return { status: "need-more", reasons: [], ...base };
  if (falling >= FALLING_IMPROVE_COUNT) {
    return { status: "improving", reasons: [`운동 후 통증이 ${falling}번 연속 낮아졌어요.`], ...base };
  }
  return { status: "steady", reasons: [], ...base };
}

/**
 * 통증이 줄어드는 흐름(improving)인 운동의 번호들. 다음 추천에서 앞쪽에 보여 줄 때 쓴다.
 * parts를 주면 그 부위(이번 추천에서 고른 부위)의 기록만 본다. 같은 운동이어도 부위마다 따로 판단한다.
 */
export function improvingExerciseIds(entries: LogEntry[], parts?: BodyPart[]): string[] {
  const keys = new Map<string, { exerciseId: string; part: BodyPart }>();
  for (const e of entries) {
    if (parts === undefined || parts.includes(e.part)) {
      keys.set(`${e.exerciseId}|${e.part}`, { exerciseId: e.exerciseId, part: e.part });
    }
  }
  const ids = new Set<string>();
  for (const { exerciseId, part } of keys.values()) {
    if (analyzeTrend(entriesFor(entries, exerciseId, part)).status === "improving") ids.add(exerciseId);
  }
  return [...ids];
}
