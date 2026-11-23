// Design Ref: §6 API 명세, §7 오류 처리 — AI 호출 실패의 종류.
// 추천 로직(recommend.ts)이 외부 SDK를 몰라도 되도록 오류 종류만 따로 둔다.

/** AI가 제한 시간 안에 답하지 않았다. (504 AI_TIMEOUT) */
export class AiTimeoutError extends Error {
  constructor(message = "AI 응답 시간이 초과되었습니다.") {
    super(message);
    this.name = "AiTimeoutError";
  }
}

/** AI 호출이 실패했거나 답이 약속한 형식이 아니었다. (502 AI_FAILED) */
export class AiFailedError extends Error {
  constructor(message = "AI 호출에 실패했습니다.") {
    super(message);
    this.name = "AiFailedError";
  }
}
