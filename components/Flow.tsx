"use client";

// Design Ref: §3.1 `/` 화면 흐름, §4 데이터 흐름 ①②③ — 첫 화면 → 유형 고르기 → 나머지 입력 → (결과).
// Plan SC: 버튼을 누르면 나가는 화면이 사라진 뒤 들어오는 화면이 올라오고, 점으로 그린 손도 함께 움직인다.
// 입력값은 이 컴포넌트 안(브라우저 메모리)에만 있고, 서버에는 추천을 요청할 때만 보낸다.

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { BodyPart, UserType } from "../lib/constants";
import type { HandsMode } from "../lib/dotMatrix";
import { EMPTY_INTAKE, validateIntake, type IntakeState } from "../lib/intake";
import type { RecommendResponse } from "../lib/recommend";
import { judgeSafety } from "../lib/safety";
import { consumeStart, START_EVENT } from "../lib/startSignal";
import type { RecommendRequest, ValidationIssue } from "../lib/validate";
import { DetailsStep } from "./DetailsStep";
import { DotHands } from "./DotHands";
import { HeroStep } from "./HeroStep";
import { ResultList, type ResultView } from "./ResultList";
import { TypeStep } from "./TypeStep";

type Step = "hero" | "type" | "details" | "result";

const STEP_TO_HANDS: Record<Step, HandsMode> = {
  hero: "hero",
  type: "type",
  details: "details",
  result: "details",
};

/** 나가는 화면이 사라지는 시간(밀리초). globals.css의 step-out 시간과 같다. */
const LEAVE_MS = 280;
/** 유형 카드를 누른 뒤 선택된 모습을 잠깐 보여 주고 넘어가는 시간 */
const SELECT_PAUSE_MS = 220;

export function Flow() {
  const [step, setStep] = useState<Step>("hero");
  const [leaving, setLeaving] = useState(false);
  const [intake, setIntake] = useState<IntakeState>(EMPTY_INTAKE);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ResultView | null>(null);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRender = useRef(true);

  // 화면이 바뀐 뒤에는 키보드·화면 읽기 사용자가 새 화면의 제목으로 바로 이동하도록 포커스를 옮긴다.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    document.getElementById("step-heading")?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [step]);

  /** 첫 화면으로 돌아간다: 고른 값과 결과를 모두 지운다. */
  function resetAll() {
    if (timer.current) clearTimeout(timer.current);
    setLeaving(false);
    setStep("hero");
    setIntake(EMPTY_INTAKE);
    setIssues([]);
    setResult(null);
    setPending(false);
  }

  // [처음으로] 신호: 이 화면이 보이는 중이면 이벤트로 받고, 다른 화면에서 돌아왔을 때는 표시로 확인한다.
  useEffect(() => {
    const onStart = () => {
      consumeStart();
      resetAll();
    };
    window.addEventListener(START_EVENT, onStart);
    queueMicrotask(() => {
      if (consumeStart()) resetAll();
    });
    return () => window.removeEventListener(START_EVENT, onStart);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  /** 지금 화면을 사라지게 한 뒤 다음 화면으로 바꾼다. 움직임을 줄이는 설정이면 바로 바꾼다. */
  function go(next: Step, delay = 0) {
    if (timer.current) clearTimeout(timer.current);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    timer.current = setTimeout(
      () => {
        if (reduceMotion) {
          setStep(next);
          return;
        }
        setLeaving(true);
        timer.current = setTimeout(() => {
          setStep(next);
          setLeaving(false);
        }, LEAVE_MS);
      },
      delay,
    );
  }

  // 입력을 바꾸면 이전 안내와 결과는 지금 입력과 맞지 않으므로 지운다.
  function change(next: Partial<IntakeState>) {
    setIntake((current) => ({ ...current, ...next }));
    setIssues([]);
    setResult(null);
  }

  function selectType(type: UserType) {
    // 유형이 바뀌면 회복형 질문의 이전 답은 지운다.
    change(intake.userType === type ? {} : { userType: type, recoveryApproved: null });
    go("details", SELECT_PAUSE_MS);
  }

  function togglePart(part: BodyPart) {
    const selected = intake.selectedParts.includes(part)
      ? intake.selectedParts.filter((p) => p !== part)
      : [...intake.selectedParts, part];
    change({ selectedParts: selected });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
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
      go("result");
      return;
    }

    // ③ 서버에 추천을 요청한다.
    await requestRecommend(checked.request);
  }

  async function requestRecommend(request: RecommendRequest) {
    setPending(true);
    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      setResult((await response.json()) as RecommendResponse);
    } catch {
      setResult({ status: "network-error" });
    } finally {
      setPending(false);
    }
    go("result");
  }

  /** 오류·지연 안내 화면의 [다시 시도]: 같은 입력으로 한 번 더 요청한다. */
  async function retry() {
    if (pending) return;
    const checked = validateIntake(intake);
    if (!checked.ok) {
      go("details");
      return;
    }
    await requestRecommend(checked.request);
  }

  return (
    <main className="relative isolate flex min-h-[680px] flex-1 flex-col overflow-hidden">
      <DotHands mode={STEP_TO_HANDS[step]} />

      {/* key가 바뀌면 들어오는 움직임이 다시 시작된다. */}
      <div
        key={step}
        className={`relative z-10 flex flex-1 flex-col ${leaving ? "step-out" : "step-in"}`}
      >
        {step === "hero" ? <HeroStep onStart={() => go("type")} /> : null}

        {step === "type" ? (
          <TypeStep
            selected={intake.userType}
            onSelect={selectType}
            onBack={() => go("hero")}
          />
        ) : null}

        {step === "details" ? (
          <DetailsStep
            intake={intake}
            issues={issues}
            pending={pending}
            onChange={change}
            onTogglePart={togglePart}
            onSubmit={submit}
            onBack={() => go("type")}
            onChangeType={() => go("type")}
          />
        ) : null}

        {step === "result" && result ? (
          <ResultList
            result={result}
            pending={pending}
            onBack={() => go("details")}
            onRetry={retry}
          />
        ) : null}
      </div>
    </main>
  );
}
