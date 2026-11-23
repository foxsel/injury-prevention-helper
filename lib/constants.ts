// Design Ref: §5 데이터 모델, §9 폴더 구조 — 앱 전체가 함께 쓰는 값을 한곳에 모은다.
// Plan SC: 통증 6점 기준, 최대 5개 추천, 중단 기준 문구, 금지 표현이 이 파일에만 있다.

// 지원 종목 (PRD 6번)
export const SPORTS = ["축구", "농구", "배구", "야구", "헬스"] as const;
export type Sport = (typeof SPORTS)[number];

// 지원 부위 (PRD 6번)
export const BODY_PARTS = ["발목", "무릎", "어깨"] as const;
export type BodyPart = (typeof BODY_PARTS)[number];

// 하체 부위: 이 부위를 고른 경우에만 "체중을 싣기 어렵다"를 묻는다 (PRD 5번)
export const LOWER_BODY_PARTS: readonly BodyPart[] = ["발목", "무릎"];

// 사용 유형
export const USER_TYPES = ["예방형", "회복형"] as const;
export type UserType = (typeof USER_TYPES)[number];

// 운동 목적
export const PURPOSES = ["예방", "회복"] as const;
export type Purpose = (typeof PURPOSES)[number];

// 통증 점수 범위와 기준 (PRD 5번): 한 부위라도 이 점수 이상이면 운동을 추천하지 않는다.
export const PAIN_MIN = 0;
export const PAIN_MAX = 10;
export const PAIN_BLOCK_THRESHOLD = 6;

// 한 번에 추천하는 운동의 최대 개수 (PRD 5번)
export const MAX_RECOMMENDATIONS = 5;

// 운동 방법의 단계 수 범위 (PRD 5번)
export const MIN_STEPS = 3;
export const MAX_STEPS = 5;

// 모든 운동에 반드시 들어가는 중단 기준 문구 (PRD 5번 원문)
export const STOP_CRITERIA_TEXT =
  "운동 중 통증이 6점 이상이거나 운동 전보다 심해지면 즉시 중단";

// 화면에 나오는 문장에 쓰면 안 되는 표현의 시작 목록 (PRD 5번: 진단·처방·효과 보장 금지)
// 이 목록은 시작점이며, 응답 검증(PLAN 5번)을 만들 때 함께 다듬는다.
export const FORBIDDEN_TERMS: readonly string[] = [
  "완치",
  "100% 예방",
  "100% 낫",
  "반드시 낫",
  "진단합니다",
  "처방합니다",
  "치료됩니다",
];

// 추천 요청 본문의 최대 크기(바이트). 임의로 정한 값이다. (DESIGN 6번)
export const MAX_REQUEST_BYTES = 4096;
