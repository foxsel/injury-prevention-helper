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
      className="border-b border-notice-line bg-notice-bg text-notice-text"
    >
      <ul className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-2.5 text-[13px] font-medium sm:flex-row sm:gap-6">
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
          {NOTICE_NOT_MEDICAL}
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
          {NOTICE_PROTOTYPE}
        </li>
      </ul>
    </div>
  );
}

/** 첫 화면에만 놓는 AI 전송 안내 문구 */
export function AiTransmissionNotice() {
  return (
    <p
      role="note"
      className="inline-flex max-w-[34rem] items-start gap-2 rounded-2xl bg-surface/80 px-4 py-2.5 text-left text-xs leading-5 text-muted ring-1 ring-line backdrop-blur"
    >
      <span
        aria-hidden="true"
        className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-on-accent"
      >
        i
      </span>
      <span>{NOTICE_AI_TRANSMISSION}</span>
    </p>
  );
}
