// Design Ref: PRD nice "진행 기록 화면" — 통증이 줄고 있는 운동을 다음 추천에서 앞쪽에 더 보여 준다.
// Plan SC: 기록은 서버로 보내지 않는다. 그래서 이 일은 브라우저에서만 한다.
//          앞쪽으로 올리는 운동도 서버가 쓰는 것과 같은 후보 거르기(종목·유형·부위·고충격 제외)와
//          같은 검증(verifyPicks)을 거치고, 총 5개를 넘기지 않는다.

import { MAX_RECOMMENDATIONS } from "./constants";
import type { Exercise } from "./exercises/types";
import { getCandidates } from "./recommend";
import { filterBySafety, judgeSafety } from "./safety";
import type { RecommendRequest } from "./validate";
import { verifyPicks } from "./verify";

/** 한 번의 추천에서 기록 덕분에 앞으로 올라올 수 있는 운동의 최대 개수 */
export const MAX_BOOSTED = 2;

/** 이 요청에 대해 서버가 쓰는 것과 같은 기준으로 거른 후보 운동 */
export function safeCandidates(request: RecommendRequest): Exercise[] {
  const safety = judgeSafety(request);
  if (safety.status === "blocked") return [];
  return filterBySafety(getCandidates(request), safety.excludeHighImpact);
}

export interface BoostResult {
  exercises: Exercise[];
  /** 기록 덕분에 앞으로 올라온 운동의 번호(화면에서 표시한다) */
  boosted: string[];
}

/**
 * AI가 고른 운동 앞에, 통증이 줄고 있는 운동(후보 안에 있는 것만, 최대 MAX_BOOSTED개)을 놓는다.
 * 합친 목록은 최대 5개이며, AI가 고른 나머지는 원래 순서를 지킨다.
 */
export function boostImproving(
  aiExercises: Exercise[],
  candidates: Exercise[],
  improvingIds: string[],
): BoostResult {
  const wanted = candidates.filter((c) => improvingIds.includes(c.id)).map((c) => c.id);
  const boosted = verifyPicks(wanted, candidates).slice(0, MAX_BOOSTED);
  const boostedIds = new Set(boosted.map((e) => e.id));
  const rest = aiExercises.filter((e) => !boostedIds.has(e.id));
  return {
    exercises: [...boosted, ...rest].slice(0, MAX_RECOMMENDATIONS),
    boosted: boosted.map((e) => e.id),
  };
}
