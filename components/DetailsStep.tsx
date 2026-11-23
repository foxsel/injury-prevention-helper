// Design Ref: §3.1 입력 영역, §3.3 입력 화면 확인 목록 — 세 번째 화면: 나머지 항목을 한 화면에서 모두 고른다.
// 순서: (회복형만) 치료 후 운동 허가 → 종목 → 부위(여러 개) → 부위별 통증 → (하체일 때) 체중 질문.

import type { FormEvent, ReactNode } from "react";
import {
  BODY_PARTS,
  PAIN_MAX,
  PAIN_MIN,
  SPORTS,
  type BodyPart,
} from "../lib/constants";
import { orderedParts, shouldAskWeight, type IntakeState } from "../lib/intake";
import type { ValidationIssue } from "../lib/validate";
import { Card } from "./Card";
import { Choice } from "./Choice";

/** 질문 하나. 모든 질문이 같은 간격과 정렬을 갖도록 한 부품으로 만들었다. */
function Question({
  id,
  title,
  help,
  children,
}: {
  id?: string;
  title: string;
  help?: string;
  children: ReactNode;
}) {
  return (
    <fieldset
      id={id}
      className="flex flex-col gap-3 border-0 border-t border-line p-0 pt-6 first:border-t-0 first:pt-0"
    >
      <legend className="float-left w-full pb-3 text-lg font-semibold">{title}</legend>
      {help ? <p className="clear-both -mt-1 text-sm leading-6 text-muted">{help}</p> : null}
      <div className="clear-both flex flex-wrap gap-2.5">{children}</div>
    </fieldset>
  );
}

export interface DetailsStepProps {
  intake: IntakeState;
  issues: ValidationIssue[];
  pending: boolean;
  onChange: (next: Partial<IntakeState>) => void;
  onTogglePart: (part: BodyPart) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
  onChangeType: () => void;
}

export function DetailsStep({
  intake,
  issues,
  pending,
  onChange,
  onTogglePart,
  onSubmit,
  onBack,
  onChangeType,
}: DetailsStepProps) {
  const parts = orderedParts(intake);
  const askWeight = shouldAskWeight(intake);

  return (
    <section
      aria-labelledby="step-heading"
      className="relative flex flex-1 flex-col items-center px-4 pb-12 pt-[clamp(32px,6vh,64px)]"
    >
      <div className="flex w-full max-w-[760px] flex-col items-center text-center">
        <p className="text-sm font-medium text-faint">2 / 2</p>
        <h2
          id="step-heading"
          tabIndex={-1}
          className="mt-3 text-[clamp(28px,3.6vw,44px)] font-medium leading-[1.12] tracking-[-0.03em] outline-none"
        >
          나머지 정보를 알려 주세요
        </h2>
        <p className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[15px] text-muted">
          선택한 유형
          <span className="rounded-full bg-accent px-3 py-1 text-sm font-medium text-on-accent">
            {intake.userType}
          </span>
          <button
            type="button"
            onClick={onChangeType}
            className="rounded-full px-2 py-1 text-sm underline underline-offset-4 hover:text-foreground"
          >
            바꾸기
          </button>
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="mt-8 w-full max-w-[760px]">
        <Card className="flex flex-col gap-6">
          {intake.userType === "회복형" ? (
            <Question id="recoveryApproved" title="병원 치료를 받았고, 운동해도 된다는 안내를 받았나요?">
              <Choice
                type="radio"
                name="recoveryApproved"
                checked={intake.recoveryApproved === true}
                onChange={() => onChange({ recoveryApproved: true })}
              >
                예
              </Choice>
              <Choice
                type="radio"
                name="recoveryApproved"
                checked={intake.recoveryApproved === false}
                onChange={() => onChange({ recoveryApproved: false })}
              >
                아니오
              </Choice>
            </Question>
          ) : null}

          <Question id="sport" title="어떤 운동을 하나요?">
            {SPORTS.map((sport) => (
              <Choice
                key={sport}
                type="radio"
                name="sport"
                checked={intake.sport === sport}
                onChange={() => onChange({ sport })}
              >
                {sport}
              </Choice>
            ))}
          </Question>

          <Question id="parts" title="어느 부위인가요?" help="여러 곳을 고를 수 있어요.">
            {BODY_PARTS.map((part) => (
              <Choice
                key={part}
                type="checkbox"
                name="parts"
                checked={intake.selectedParts.includes(part)}
                onChange={() => onTogglePart(part)}
              >
                {part}
              </Choice>
            ))}
          </Question>

          {parts.length > 0 ? (
            <fieldset className="flex flex-col gap-4 border-0 border-t border-line p-0 pt-6">
              <legend className="float-left w-full pb-3 text-lg font-semibold">
                통증은 어느 정도인가요?
              </legend>
              <p className="clear-both -mt-1 text-sm leading-6 text-muted">
                이 부위가 지금 얼마나 아프거나 불편한가요? (0 = 없음, 10 = 참기 어려움)
                {intake.userType === "예방형"
                  ? " 예방형은 이전에 다친 부위의 현재 불편감을 알려 주세요."
                  : ""}
              </p>
              {parts.map(({ part, pain }) => (
                <div key={part} className="flex flex-col gap-2">
                  <label
                    htmlFor={`pain-${part}`}
                    className="flex items-center justify-between font-medium"
                  >
                    <span>{part}</span>
                    <output
                      htmlFor={`pain-${part}`}
                      className="min-w-12 rounded-full bg-accent-soft px-3 py-1 text-center text-sm font-semibold"
                    >
                      {pain}점
                    </output>
                  </label>
                  <input
                    id={`pain-${part}`}
                    type="range"
                    min={PAIN_MIN}
                    max={PAIN_MAX}
                    step={1}
                    value={pain}
                    onChange={(event) =>
                      onChange({
                        pains: { ...intake.pains, [part]: Number(event.target.value) },
                      })
                    }
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-accent-soft-2 accent-accent"
                  />
                  <div className="flex justify-between text-xs text-muted">
                    <span>{PAIN_MIN} 없음</span>
                    <span>{PAIN_MAX} 참기 어려움</span>
                  </div>
                </div>
              ))}
            </fieldset>
          ) : null}

          {askWeight ? (
            <Question
              id="cannotBearWeight"
              title="다친 쪽 발에 체중을 싣기 어려운가요?"
              help="발목이나 무릎을 골랐을 때만 묻는 질문이에요."
            >
              <Choice
                type="radio"
                name="cannotBearWeight"
                checked={intake.cannotBearWeight === true}
                onChange={() => onChange({ cannotBearWeight: true })}
              >
                네, 어려워요
              </Choice>
              <Choice
                type="radio"
                name="cannotBearWeight"
                checked={intake.cannotBearWeight === false}
                onChange={() => onChange({ cannotBearWeight: false })}
              >
                아니요, 괜찮아요
              </Choice>
            </Question>
          ) : null}

          {issues.length > 0 ? (
            <div
              role="alert"
              className="rounded-2xl bg-notice-bg p-4 text-sm font-medium leading-6 text-notice-text ring-1 ring-notice-line"
            >
              <p>아래 내용을 확인해 주세요.</p>
              <ul className="mt-1 list-disc pl-5">
                {issues.map((issue) => (
                  <li key={issue.field}>{issue.message}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-full px-5 py-3 text-sm font-medium text-muted ring-1 ring-line transition hover:text-foreground hover:ring-foreground/30"
          >
            ← 이전
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-accent px-8 py-3.5 text-[15px] font-medium text-on-accent transition enabled:hover:-translate-y-px disabled:cursor-wait disabled:opacity-60"
          >
            {pending ? "불러오는 중..." : "추천받기"}
          </button>
        </div>
      </form>
    </section>
  );
}
