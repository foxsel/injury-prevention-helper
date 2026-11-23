"use client";

// Design Ref: §3.1 `/` 입력 영역, §4 데이터 흐름 ①②③⑪ — 입력 화면.
// Plan SC: 유형·종목·여러 부위·부위별 통증·하체일 때의 체중 질문을 받고, 위험하면 서버를 부르지 않고 먼저 막는다.
// 결과 표시는 PLAN 9번(ResultList)에서 제대로 만들기 전까지 아래 ResultPreview로 임시로 보여준다.

import { useState, type FormEvent, type ReactNode } from "react";
import {
  BODY_PARTS,
  PAIN_MAX,
  PAIN_MIN,
  SPORTS,
  USER_TYPES,
  type BodyPart,
  type UserType,
} from "../lib/constants";
import {
  EMPTY_INTAKE,
  orderedParts,
  shouldAskWeight,
  validateIntake,
  type IntakeState,
} from "../lib/intake";
import { BLOCK_MESSAGES, RESULT_MESSAGES } from "../lib/notices";
import type { RecommendResponse } from "../lib/recommend";
import { judgeSafety } from "../lib/safety";
import type { ValidationIssue } from "../lib/validate";
import { Card } from "./Card";

const USER_TYPE_HINT: Record<UserType, string> = {
  예방형: "아직 다치지 않았어요",
  회복형: "치료 후 회복 중이에요",
};

/** 서버가 보낸 결과 + 서버에 닿지 못한 경우 */
type ResultView = RecommendResponse | { status: "network-error" };

// ── 작은 부품 ────────────────────────────────────────────────

/** 라디오·체크박스를 알약 모양으로 보여주는 선택 버튼 */
function Choice({
  type,
  name,
  checked,
  onChange,
  children,
  hint,
}: {
  type: "radio" | "checkbox";
  name: string;
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="relative cursor-pointer">
      <input
        type={type}
        name={name}
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <span className="flex min-h-12 flex-col justify-center rounded-2xl bg-surface px-5 py-2 text-base font-semibold ring-1 ring-line transition peer-checked:bg-accent peer-checked:text-white peer-checked:ring-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent-text">
        {children}
        {hint ? (
          <span className="text-sm font-normal opacity-80">{hint}</span>
        ) : null}
      </span>
    </label>
  );
}

function Question({
  id,
  legend,
  help,
  children,
}: {
  id: string;
  legend: string;
  help?: string;
  children: ReactNode;
}) {
  return (
    <fieldset id={id} className="flex flex-col gap-3 border-0 p-0">
      <legend className="text-lg font-bold">{legend}</legend>
      {help ? <p className="-mt-1 text-sm leading-6 text-muted">{help}</p> : null}
      <div className="flex flex-wrap gap-3">{children}</div>
    </fieldset>
  );
}

// ── 임시 결과 보기 (PLAN 9번에서 ResultList로 교체) ──────────────

function ResultPreview({ result }: { result: ResultView }) {
  let content: ReactNode;
  switch (result.status) {
    case "ok":
      content = (
        <ul className="flex list-disc flex-col gap-1 pl-5">
          {result.exercises.map((exercise) => (
            <li key={exercise.id}>
              {exercise.name} ({exercise.reps}, {exercise.sets})
            </li>
          ))}
        </ul>
      );
      break;
    case "blocked":
      content = <p>{BLOCK_MESSAGES[result.reason]}</p>;
      break;
    case "empty":
      content = <p>{RESULT_MESSAGES.empty}</p>;
      break;
    case "network-error":
      content = <p>{RESULT_MESSAGES.network}</p>;
      break;
    case "error":
      content =
        result.code === "INVALID_INPUT" ? (
          <ul className="flex list-disc flex-col gap-1 pl-5">
            {result.issues.map((issue) => (
              <li key={issue.field + issue.message}>{issue.message}</li>
            ))}
          </ul>
        ) : (
          <p>
            {result.code === "AI_TIMEOUT"
              ? RESULT_MESSAGES.aiTimeout
              : RESULT_MESSAGES.aiFailed}
          </p>
        );
      break;
  }

  return (
    <Card className="flex flex-col gap-3" >
      <h2 className="text-xl font-bold">추천 결과</h2>
      <div role="status" className="leading-7">
        {content}
      </div>
    </Card>
  );
}

// ── 입력 화면 ────────────────────────────────────────────────

export function IntakeForm() {
  const [intake, setIntake] = useState<IntakeState>(EMPTY_INTAKE);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ResultView | null>(null);

  // 입력을 바꾸면 이전 안내와 결과는 지금 입력과 맞지 않으므로 지운다.
  function change(next: Partial<IntakeState>) {
    setIntake((current) => ({ ...current, ...next }));
    setIssues([]);
    setResult(null);
  }

  function togglePart(part: BodyPart) {
    const selected = intake.selectedParts.includes(part)
      ? intake.selectedParts.filter((p) => p !== part)
      : [...intake.selectedParts, part];
    change({ selectedParts: selected });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setResult(null);

    // ① 입력 검사
    const checked = validateIntake(intake);
    if (!checked.ok) {
      setIssues(checked.issues);
      document.getElementById(checked.issues[0].field)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }
    setIssues([]);

    // ② 위험하면 서버를 부르지 않고 먼저 막는다.
    const safety = judgeSafety(checked.request);
    if (safety.status === "blocked") {
      setResult({ status: "blocked", reason: safety.reason });
      return;
    }

    // ③ 서버에 추천을 요청한다.
    setPending(true);
    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checked.request),
      });
      setResult((await response.json()) as RecommendResponse);
    } catch {
      setResult({ status: "network-error" });
    } finally {
      setPending(false);
    }
  }

  const askWeight = shouldAskWeight(intake);
  const parts = orderedParts(intake);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-8">
          <h2 className="text-2xl font-bold">내 정보 입력</h2>

          <Question id="userType" legend="1. 어떤 경우인가요?">
            {USER_TYPES.map((type) => (
              <Choice
                key={type}
                type="radio"
                name="userType"
                checked={intake.userType === type}
                onChange={() => change({ userType: type, recoveryApproved: null })}
                hint={USER_TYPE_HINT[type]}
              >
                {type}
              </Choice>
            ))}
          </Question>

          {intake.userType === "회복형" ? (
            <Question
              id="recoveryApproved"
              legend="병원 치료를 받았고, 운동해도 된다는 안내를 받았나요?"
            >
              <Choice
                type="radio"
                name="recoveryApproved"
                checked={intake.recoveryApproved === true}
                onChange={() => change({ recoveryApproved: true })}
              >
                예
              </Choice>
              <Choice
                type="radio"
                name="recoveryApproved"
                checked={intake.recoveryApproved === false}
                onChange={() => change({ recoveryApproved: false })}
              >
                아니오
              </Choice>
            </Question>
          ) : null}

          <Question id="sport" legend="2. 어떤 운동을 하나요?">
            {SPORTS.map((sport) => (
              <Choice
                key={sport}
                type="radio"
                name="sport"
                checked={intake.sport === sport}
                onChange={() => change({ sport })}
              >
                {sport}
              </Choice>
            ))}
          </Question>

          <Question
            id="parts"
            legend="3. 어느 부위인가요?"
            help="여러 곳을 고를 수 있어요."
          >
            {BODY_PARTS.map((part) => (
              <Choice
                key={part}
                type="checkbox"
                name="parts"
                checked={intake.selectedParts.includes(part)}
                onChange={() => togglePart(part)}
              >
                {part}
              </Choice>
            ))}
          </Question>

          {parts.length > 0 ? (
            <fieldset className="flex flex-col gap-5 border-0 p-0">
              <legend className="text-lg font-bold">4. 통증은 어느 정도인가요?</legend>
              <p className="-mt-2 text-sm leading-6 text-muted">
                이 부위가 지금 얼마나 아프거나 불편한가요? (0 = 없음, 10 = 참기 어려움)
                {intake.userType === "예방형"
                  ? " 예방형은 이전에 다친 부위의 현재 불편감을 알려 주세요."
                  : ""}
              </p>
              {parts.map(({ part, pain }) => (
                <div key={part} className="flex flex-col gap-2">
                  <label
                    htmlFor={`pain-${part}`}
                    className="flex items-center justify-between font-semibold"
                  >
                    <span>{part}</span>
                    <output
                      htmlFor={`pain-${part}`}
                      className="rounded-full bg-accent-soft px-3 py-1 text-sm font-bold text-accent-text"
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
                      change({
                        pains: { ...intake.pains, [part]: Number(event.target.value) },
                      })
                    }
                    className="w-full accent-accent"
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
              legend="5. 다친 쪽 발에 체중을 싣기 어려운가요?"
              help="발목이나 무릎을 골랐을 때만 묻는 질문이에요."
            >
              <Choice
                type="radio"
                name="cannotBearWeight"
                checked={intake.cannotBearWeight === true}
                onChange={() => change({ cannotBearWeight: true })}
              >
                네, 어려워요
              </Choice>
              <Choice
                type="radio"
                name="cannotBearWeight"
                checked={intake.cannotBearWeight === false}
                onChange={() => change({ cannotBearWeight: false })}
              >
                아니요, 괜찮아요
              </Choice>
            </Question>
          ) : null}

          {issues.length > 0 ? (
            <div
              role="alert"
              className="rounded-2xl bg-notice-bg p-4 text-sm font-semibold leading-6 text-notice-text ring-1 ring-notice-line"
            >
              <p>아래 내용을 확인해 주세요.</p>
              <ul className="mt-1 list-disc pl-5">
                {issues.map((issue) => (
                  <li key={issue.field}>{issue.message}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="h-14 rounded-full bg-gradient-to-b from-accent to-accent-text px-8 text-lg font-bold text-white shadow-lg transition enabled:hover:brightness-105 enabled:active:scale-[0.99] disabled:cursor-wait disabled:opacity-70 sm:self-start"
          >
            {pending ? "불러오는 중..." : "추천받기"}
          </button>
        </form>
      </Card>

      {result ? <ResultPreview result={result} /> : null}
    </div>
  );
}
