// Design Ref: PRD "종목별 맞춤" — 종목마다 부담이 많이 가는 부위를 참고 정보로 보여 주고, 추천 순서에만 반영한다.
// Plan SC: 운동을 새로 고르거나 걸러 내지 않는다(후보·안전 판정은 그대로). 이미 안전하다고 걸러진 운동의
//          '순서'만 바꾸고, 병명·진단 표현은 쓰지 않는다.
//
// 근거: 발목·무릎 부상이 구기 종목(축구·농구·배구 등)에서 흔하다는 연구 종합(예: PMC8539527, PMC10749669)과
//       어깨 부상이 야구 같은 던지기·머리 위 동작 종목에서 많다는 감시 연구를 참고한 '일반 정보'다.
//       종목마다 정확한 순위를 확인한 것이 아니므로 전문가 검토 전의 참고용이다.

import type { BodyPart, Sport } from "./constants";
import type { Exercise } from "./exercises/types";

/** 종목별로 부담이 많이 가는 것으로 알려진 부위(앞에 있을수록 먼저). 앱이 지원하는 세 부위 안에서만 정했다. */
export const SPORT_FOCUS: Record<Sport, readonly BodyPart[]> = {
  축구: ["발목", "무릎"],
  농구: ["발목", "무릎"],
  배구: ["어깨", "발목", "무릎"],
  야구: ["어깨"],
  헬스: ["어깨", "무릎"],
};

/** 부위를 고르는 질문 아래에 보여 주는 안내(참고용). '추천' 표시가 붙은 부위를 설명한다. */
export function focusHint(sport: Sport): string {
  return `${sport}에서는 ${SPORT_FOCUS[sport].join("·")}에 부담이 많이 가는 것으로 알려져 '추천'으로 표시했어요. 참고만 하고, 실제로 신경 쓰이는 부위를 여러 곳 골라도 돼요.`;
}

/** 운동이 이 종목의 주요 부위를 하나라도 다루는지 */
export function isSportFocus(exercise: Pick<Exercise, "bodyParts">, sport: Sport): boolean {
  return exercise.bodyParts.some((part) => SPORT_FOCUS[sport].includes(part));
}

/** 운동이 다루는 부위 중 가장 앞선 주요 부위의 순번(없으면 맨 뒤) */
function rank(exercise: Pick<Exercise, "bodyParts">, sport: Sport): number {
  const order = SPORT_FOCUS[sport];
  const ranks = exercise.bodyParts.map((part) => order.indexOf(part)).filter((i) => i >= 0);
  return ranks.length > 0 ? Math.min(...ranks) : order.length;
}

/**
 * 주요 부위 운동을 앞에 둔다. 개수·내용은 그대로이고 순서만 바뀌며,
 * 같은 순번끼리는 원래 순서(AI가 고른 순서)를 지킨다.
 */
export function sortBySportFocus<T extends Pick<Exercise, "bodyParts">>(exercises: T[], sport: Sport): T[] {
  return exercises
    .map((exercise, index) => ({ exercise, index, rank: rank(exercise, sport) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((item) => item.exercise);
}
