// Design Ref: §3.1 결과 영역 — 추천된 운동 목록, 막힘(병원 상담 안내), 비었음, 오류를 보여 준다.
// Plan SC: 모든 운동에 방법·횟수·세트·주의사항·중단 기준이 함께 보이고, 공통 안내 2종이 결과 아래에도 보인다.

import type { ReactNode } from "react";
import { ExerciseCarousel } from "./ExerciseCarousel";
import {
  BLOCK_MESSAGES,
  NOTICE_NOT_MEDICAL,
  NOTICE_PROTOTYPE,
  RESULT_MESSAGES,
} from "../lib/notices";
import type { RecommendResponse } from "../lib/recommend";

/** 서버가 보낸 결과 + 서버에 닿지 못한 경우 */
export type ResultView = RecommendResponse | { status: "network-error" };

function Message({ children }: { children: ReactNode }) {
  return <p className="rounded-3xl bg-surface p-5 leading-7 ring-1 ring-line">{children}</p>;
}

export function ResultList({ result, onBack }: { result: ResultView; onBack: () => void }) {
  if (result.status === "ok") {
    return <ExerciseCarousel exercises={result.exercises} onBack={onBack} />;
  }
  let content: ReactNode;
  switch (result.status) {
    case "blocked":
      content = <Message>{BLOCK_MESSAGES[result.reason]}</Message>;
      break;
    case "empty":
      content = <Message>{RESULT_MESSAGES.empty}</Message>;
      break;
    case "network-error":
      content = <Message>{RESULT_MESSAGES.network}</Message>;
      break;
    case "error":
      content =
        result.code === "INVALID_INPUT" ? (
          <Message>
            <ul className="flex list-disc flex-col gap-1 pl-5">
              {result.issues.map((issue) => (
                <li key={issue.field + issue.message}>{issue.message}</li>
              ))}
            </ul>
          </Message>
        ) : (
          <Message>
            {result.code === "AI_TIMEOUT" ? RESULT_MESSAGES.aiTimeout : RESULT_MESSAGES.aiFailed}
          </Message>
        );
      break;
  }

  return (
    <section
      aria-labelledby="step-heading"
      className="flex flex-1 flex-col items-center px-4 pb-12 pt-[clamp(56px,8vh,88px)]"
    >
      <div className="flex w-full max-w-[760px] flex-col gap-5">
        <h2
          id="step-heading"
          tabIndex={-1}
          className="text-center text-[clamp(28px,3.6vw,44px)] font-medium leading-[1.12] tracking-[-0.03em] outline-none"
        >
          안내
        </h2>
        <div role="status">{content}</div>
        <button
          type="button"
          onClick={onBack}
          className="self-center rounded-full px-5 py-3 text-sm font-medium text-muted ring-1 ring-line transition hover:text-foreground hover:ring-foreground/30"
        >
          ← 다시 입력하기
        </button>
        <p className="text-center text-xs leading-5 text-muted">
          {NOTICE_NOT_MEDICAL} · {NOTICE_PROTOTYPE}
        </p>
      </div>
    </section>
  );
}
