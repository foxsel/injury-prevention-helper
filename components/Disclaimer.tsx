// Design Ref: §3.1 화면 구성 "안내 문구 영역", §9 폴더 구조 — 안내 문구 컴포넌트.
// Plan SC: 공통 안내 2종은 모든 화면에, AI 전송 안내는 첫 화면에만 보인다.

import {
  NOTICE_AI_TRANSMISSION,
  NOTICE_NOT_MEDICAL,
  NOTICE_PROTOTYPE,
} from "../lib/notices";

/** 모든 화면의 위쪽(공통 틀)에 한 번만 놓는 공통 안내 문구 2종 */
export function CommonNotices() {
  return (
    <div
      role="note"
      aria-label="이용 안내"
      className="border-b border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
    >
      <ul className="mx-auto flex max-w-3xl flex-col gap-1 px-4 py-3 text-sm font-medium sm:flex-row sm:gap-6">
        <li>{NOTICE_NOT_MEDICAL}</li>
        <li>{NOTICE_PROTOTYPE}</li>
      </ul>
    </div>
  );
}

/** 첫 화면에만 놓는 AI 전송 안내 문구 */
export function AiTransmissionNotice() {
  return (
    <p
      role="note"
      className="rounded-lg border border-sky-300 bg-sky-50 px-4 py-3 text-sm text-sky-950 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-100"
    >
      {NOTICE_AI_TRANSMISSION}
    </p>
  );
}
