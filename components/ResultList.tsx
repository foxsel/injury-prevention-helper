// Design Ref: §3.1 결과 영역 — 추천된 운동 목록, 막힘(병원 상담 안내), 비었음, 오류를 보여 준다.
// Plan SC: 모든 운동에 방법·횟수·세트·주의사항·중단 기준이 함께 보이고, 공통 안내 2종이 결과 아래에도 보인다.

import type { ReactNode } from "react";
import type { Exercise } from "../lib/exercises/types";
import {
  BLOCK_MESSAGES,
  NOTICE_NOT_MEDICAL,
  NOTICE_PROTOTYPE,
  RESULT_MESSAGES,
} from "../lib/notices";
import type { RecommendResponse } from "../lib/recommend";

/** 서버가 보낸 결과 + 서버에 닿지 못한 경우 */
export type ResultView = RecommendResponse | { status: "network-error" };

function ExerciseCard({ exercise, index }: { exercise: Exercise; index: number }) {
  return (
    <li className="rounded-3xl bg-surface p-5 ring-1 ring-line sm:p-6">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-on-accent"
        >
          {index + 1}
        </span>
        <div className="min-w-0">
          <h4 className="text-lg font-semibold leading-7">{exercise.name}</h4>
          <p className="mt-1 text-sm leading-6 text-muted">{exercise.description}</p>
        </div>
      </div>

      <p className="mt-4 flex flex-wrap gap-2 text-[13px] font-medium">
        <span className="rounded-full bg-notice-bg px-3 py-1">{exercise.reps}</span>
        <span className="rounded-full bg-notice-bg px-3 py-1">{exercise.sets}</span>
      </p>

      <div className="mt-4 border-t border-line pt-4">
        <h5 className="text-sm font-semibold">하는 방법</h5>
        <ol className="mt-1.5 flex list-decimal flex-col gap-1 pl-5 text-sm leading-6">
          {exercise.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>

      <div className="mt-4">
        <h5 className="text-sm font-semibold">주의사항</h5>
        <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-5 text-sm leading-6">
          {exercise.cautions.map((caution) => (
            <li key={caution}>{caution}</li>
          ))}
        </ul>
      </div>

      <div className="mt-4 rounded-2xl bg-notice-bg px-4 py-3 text-sm leading-6">
        <h5 className="font-semibold">이럴 땐 멈추세요</h5>
        <ul className="mt-1 flex list-disc flex-col gap-0.5 pl-5">
          {exercise.stopCriteria.map((criterion) => (
            <li key={criterion}>{criterion}</li>
          ))}
        </ul>
      </div>
    </li>
  );
}

function Message({ children }: { children: ReactNode }) {
  return <p className="rounded-3xl bg-surface p-5 leading-7 ring-1 ring-line">{children}</p>;
}

export function ResultList({ result }: { result: ResultView }) {
  let content: ReactNode;
  switch (result.status) {
    case "ok":
      content = (
        <ul className="flex flex-col gap-4">
          {result.exercises.map((exercise, i) => (
            <ExerciseCard key={exercise.id} exercise={exercise} index={i} />
          ))}
        </ul>
      );
      break;
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
    <section aria-labelledby="result-heading" className="flex flex-col gap-4">
      <h3 id="result-heading" className="scroll-mt-16 text-xl font-semibold">
        {result.status === "ok" ? "추천 운동" : "안내"}
      </h3>
      <div role="status">{content}</div>
      <p className="text-center text-xs leading-5 text-muted">
        {NOTICE_NOT_MEDICAL} · {NOTICE_PROTOTYPE}
      </p>
    </section>
  );
}
