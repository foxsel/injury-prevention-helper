// Design Ref: §3.1 결과 영역 — 추천된 운동 목록, 막힘(병원 상담 안내), 비었음, 오류를 보여 준다.
// Plan SC: 모든 운동에 방법·횟수·세트·주의사항·중단 기준이 함께 보이고, 공통 안내 2종이 결과 아래에도 보인다.

import Link from "next/link";
import type { ReactNode } from "react";
import type { Sport } from "../lib/constants";
import type { Exercise } from "../lib/exercises/types";
import { isSportFocus } from "../lib/sportFocus";
import {
  BLOCK_MESSAGES,
  NOTICE_NOT_MEDICAL,
  NOTICE_PROTOTYPE,
  RESULT_MESSAGES,
  TREND_MESSAGES,
} from "../lib/notices";
import type { RecommendResponse } from "../lib/recommend";

/** 서버가 보낸 결과 + 서버에 닿지 못한 경우 */
export type ResultView =
  | Exclude<RecommendResponse, { status: "ok" }>
  // boosted: 진행 기록에서 통증이 줄고 있어 앞쪽으로 올라온 운동의 번호
  // sport: 고른 종목(주요 부위 표시용)
  | { status: "ok"; exercises: Exercise[]; boosted?: string[]; sport?: Sport }
  | { status: "network-error" };

/** 추천된 모든 운동에 똑같이 들어 있는 중단 기준(한 번만 보여 준다) */
export function commonStopCriteria(exercises: Exercise[]): string[] {
  if (exercises.length === 0) return [];
  return exercises[0].stopCriteria.filter((c) => exercises.every((e) => e.stopCriteria.includes(c)));
}

function ExerciseCard({
  exercise,
  index,
  common,
  boosted,
  focusSport,
}: {
  exercise: Exercise;
  index: number;
  common: string[];
  boosted: boolean;
  focusSport?: Sport;
}) {
  const extraStops = exercise.stopCriteria.filter((c) => !common.includes(c));
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
          {boosted ? (
            <p className="mb-1 inline-block rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-on-accent">
              {TREND_MESSAGES.boosted}
            </p>
          ) : null}
          {focusSport && isSportFocus(exercise, focusSport) ? (
            <p className="mb-1 ml-1 inline-block rounded-full bg-notice-bg px-2.5 py-0.5 text-[11px] font-semibold">
              {focusSport}에서 부담이 많이 가는 부위
            </p>
          ) : null}
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

      <Link
        href={`/guide/${exercise.id}`}
        className="mt-4 inline-block text-sm font-medium underline underline-offset-4"
      >
        가이드 따로 보기 →
      </Link>

      {extraStops.length > 0 ? (
        <div className="mt-4 rounded-2xl bg-notice-bg px-4 py-3 text-sm leading-6">
          <h5 className="font-semibold">이 운동은 특히</h5>
          <ul className="mt-1 flex list-disc flex-col gap-0.5 pl-5">
            {extraStops.map((criterion) => (
              <li key={criterion}>{criterion}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}

function Message({ children }: { children: ReactNode }) {
  return <p className="rounded-3xl bg-surface p-5 leading-7 ring-1 ring-line">{children}</p>;
}

export function ResultList({
  result,
  pending = false,
  onBack,
  onRetry,
}: {
  result: ResultView;
  pending?: boolean;
  onBack: () => void;
  onRetry?: () => void;
}) {
  // 서버 오류·지연·연결 실패는 잠시 뒤 같은 입력으로 다시 시도할 수 있다.
  const retryable =
    result.status === "network-error" ||
    (result.status === "error" && result.code !== "INVALID_INPUT");
  let content: ReactNode;
  const common = result.status === "ok" ? commonStopCriteria(result.exercises) : [];
  switch (result.status) {
    case "ok":
      content = (
        <>
        {common.length > 0 ? (
          <div className="mb-4 rounded-3xl bg-notice-bg p-5 text-sm leading-6">
            <h4 className="font-semibold">모든 운동 공통 · 이럴 땐 멈추세요</h4>
            <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-5">
              {common.map((criterion) => (
                <li key={criterion}>{criterion}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <ul className="flex flex-col gap-4">
          {result.exercises.map((exercise, i) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              index={i}
              common={common}
              boosted={result.boosted?.includes(exercise.id) ?? false}
              focusSport={result.sport}
            />
          ))}
        </ul>
        </>
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
    <section
      aria-labelledby="step-heading"
      className="flex flex-1 flex-col items-center px-4 pb-12 pt-[clamp(56px,8vh,88px)]"
    >
      <div className="flex w-full max-w-[760px] flex-col gap-5">
        <h2
          id="step-heading"
          tabIndex={-1}
          className="text-center text-[clamp(28px,3.6vw,44px)] font-extrabold leading-[1.12] tracking-[-0.03em] outline-none"
        >
          {result.status === "ok" ? "추천 운동" : "안내"}
        </h2>
        <div role="status">{content}</div>
        {retryable && onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            disabled={pending}
            className="self-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-on-accent transition disabled:opacity-60"
          >
            {pending ? "불러오는 중..." : "다시 시도"}
          </button>
        ) : null}
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
