// Design Ref: §3 화면 구성, PRD 5번·7번 — 화면에 보이는 고정 문구를 한곳에 모은다.
// Plan SC: 안내 문구는 PRD 원문과 정확히 같아야 하므로, 화면 코드가 아니라 여기서만 고친다.

/** 서비스 이름 (임시 이름) */
export const SERVICE_NAME = "부상 예방·회복 운동 도우미";

/** 헤더에 보이는 한 줄 소개 */
export const SERVICE_TAGLINE =
  "축구·농구·배구·야구·헬스를 하는 분을 위한 맞춤 예방·회복 운동 안내";

/** 모든 화면에 보이는 공통 안내 문구 2종 (PRD 5번) */
export const NOTICE_NOT_MEDICAL = "의료 행위를 대신하지 않습니다";
export const NOTICE_PROTOTYPE = "전문가 검토 전 시제품입니다";

/** 첫 화면에만 보이는 AI 전송 안내 문구 (PRD 7번 원문) */
export const NOTICE_AI_TRANSMISSION =
  "입력한 내용(종목·부위·통증 점수)은 AI 서비스로 전송되어 답변을 만드는 데 사용됩니다";
