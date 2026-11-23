"use client";

// Design Ref: §3.1 결과 영역 — 추천 운동을 카드 한 줄로 세우고 좌우로 돌려 고른 뒤, 전체 화면 상세로 보여 준다.
// Plan SC: 카드에는 운동 이름만 보이고, 주의사항은 카드 화면과 상세 화면(아래 작은 경고) 모두에 보인다.

import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Exercise } from "../lib/exercises/types";
import { NOTICE_NOT_MEDICAL, NOTICE_PROTOTYPE } from "../lib/notices";

/** 추천된 모든 운동에 똑같이 들어 있는 중단 기준(한 번만 보여 준다) */
export function commonStopCriteria(exercises: Exercise[]): string[] {
  if (exercises.length === 0) return [];
  return exercises[0].stopCriteria.filter((c) => exercises.every((e) => e.stopCriteria.includes(c)));
}

/** 카드가 가운데에서 얼마나 떨어져 있는지(원형으로 계산). 0이 가운데 카드다. */
export function cardOffset(index: number, active: number, count: number): number {
  const half = Math.floor(count / 2);
  return ((index - active + count + half) % count) - half;
}

const STAGE =
  "bg-[#070b14] bg-[radial-gradient(ellipse_at_50%_0%,rgba(121,220,232,0.16),transparent_55%),radial-gradient(ellipse_at_50%_100%,rgba(255,255,255,0.06),transparent_50%)] text-white";

const PILL =
  "inline-flex h-14 items-center justify-center rounded-full px-9 text-[15px] font-bold text-[#071227] [background:linear-gradient(180deg,#ffffff_0%,#d6e8f8_4%,#d9ecfe_72%,#ffffff_100%)] shadow-[0_10px_18px_-8px_rgba(255,255,255,0.5),0_0_26px_rgba(255,255,255,0.18),inset_0_0_0_2px_rgba(255,255,255,0.9)] transition-transform hover:scale-[1.03] active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#79dce8]";

const ARROW =
  "flex size-12 items-center justify-center rounded-full bg-white/10 text-xl text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#79dce8]";

function tagLine(exercise: Exercise): string {
  return `${exercise.bodyParts.join("·")} · ${exercise.purpose}`;
}

function SmallWarning({ common }: { common: string[] }) {
  return (
    <div
      role="note"
      className="border-t border-white/10 bg-black/40 px-4 py-3 text-center text-[11px] leading-5 text-white/60 backdrop-blur"
    >
      {common.length > 0 ? (
        <p>
          <span className="font-semibold text-white/80">이럴 땐 멈추세요 · </span>
          {common.join(" ")}
        </p>
      ) : null}
      <p>
        {NOTICE_NOT_MEDICAL} · {NOTICE_PROTOTYPE}
      </p>
    </div>
  );
}

function ExerciseDetail({
  exercise,
  common,
  onClose,
}: {
  exercise: Exercise;
  common: string[];
  onClose: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const extraStops = exercise.stopCriteria.filter((c) => !common.includes(c));

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-heading"
      className={`fixed inset-0 z-40 flex flex-col ${STAGE}`}
    >
      <div className="flex-1 overflow-y-auto px-5 pb-10 pt-20">
        <div className="mx-auto flex w-full max-w-[640px] flex-col">
          <p className="text-center text-[13px] font-medium tracking-[0.25em] text-white/60">
            {tagLine(exercise)}
          </p>
          <h2
            id="detail-heading"
            ref={headingRef}
            tabIndex={-1}
            className="mt-4 text-center text-[clamp(34px,6vw,60px)] font-medium leading-[1.1] tracking-[-0.02em] outline-none"
          >
            {exercise.name}
          </h2>
          <span aria-hidden="true" className="mx-auto mt-6 h-[5px] w-24 rounded-full bg-[#79dce8]" />
          <p className="mx-auto mt-6 max-w-[520px] text-center leading-7 text-white/85">
            {exercise.description}
          </p>

          <p className="mt-6 flex justify-center gap-2 text-[13px] font-medium">
            <span className="rounded-full bg-white/10 px-4 py-1.5 ring-1 ring-white/15">{exercise.reps}</span>
            <span className="rounded-full bg-white/10 px-4 py-1.5 ring-1 ring-white/15">{exercise.sets}</span>
          </p>

          <section className="mt-8 rounded-3xl bg-white/[0.06] p-6 ring-1 ring-white/10">
            <h3 className="text-sm font-semibold text-[#79dce8]">하는 방법</h3>
            <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 leading-7 text-white/90">
              {exercise.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>

          <section className="mt-4 rounded-3xl bg-white/[0.06] p-6 ring-1 ring-white/10">
            <h3 className="text-sm font-semibold text-[#79dce8]">주의사항</h3>
            <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 leading-7 text-white/90">
              {exercise.cautions.map((caution) => (
                <li key={caution}>{caution}</li>
              ))}
              {extraStops.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </section>

          <button type="button" onClick={onClose} className={`${PILL} mt-10 self-center`}>
            ← 목록으로
          </button>
        </div>
      </div>
      <SmallWarning common={common} />
    </div>
  );
}

export function ExerciseCarousel({
  exercises,
  onBack,
}: {
  exercises: Exercise[];
  onBack: () => void;
}) {
  const count = exercises.length;
  const [active, setActive] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const common = commonStopCriteria(exercises);
  const touchX = useRef<number | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const move = useCallback((d: number) => setActive((a) => (a + d + count) % count), [count]);
  const close = useCallback(() => {
    setOpenId(null);
    // 상세를 닫으면 눌렀던 카드로 포커스를 돌려 준다.
    setTimeout(() => openerRef.current?.focus({ preventScroll: true }), 0);
  }, []);

  // 방향키로 카드를 돌린다. 상세 화면이 열려 있을 때는 쓰지 않는다.
  useEffect(() => {
    if (openId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") move(-1);
      if (e.key === "ArrowRight") move(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId, move]);

  const opened = exercises.find((e) => e.id === openId) ?? null;

  return (
    <section
      aria-labelledby="step-heading"
      className={`relative flex flex-1 flex-col overflow-hidden ${STAGE}`}
    >
      <div className="flex flex-col items-center px-4 pt-[clamp(72px,10vh,110px)] text-center">
        <p className="text-[13px] font-medium tracking-[0.35em] text-white/70">추천 운동</p>
        <h2
          id="step-heading"
          tabIndex={-1}
          className="mt-3 text-[clamp(34px,6vw,64px)] font-medium leading-[1.1] tracking-[-0.02em] outline-none"
        >
          {exercises[active].name}
        </h2>
        <span aria-hidden="true" className="mt-5 h-[5px] w-24 rounded-full bg-[#79dce8]" />
        <p className="mt-4 text-sm text-white/70" aria-live="polite">
          {tagLine(exercises[active])} · {active + 1} / {count}
        </p>
      </div>

      {/* 카드 한 줄: 가운데 카드가 크고, 양옆 카드는 작고 흐리며 화면 끝에서 잘린다. */}
      <div
        className="relative mx-auto mt-8 h-[clamp(240px,34vh,340px)] w-full flex-none [--cw:clamp(170px,22vw,260px)] [--step:calc(var(--cw)*1.08)]"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) > 40) move(dx < 0 ? 1 : -1);
        }}
      >
        {exercises.map((exercise, i) => {
          const o = cardOffset(i, active, count);
          const far = Math.abs(o) > 1;
          return (
            <button
              key={exercise.id}
              type="button"
              aria-label={o === 0 ? `${exercise.name} 자세히 보기` : `${exercise.name} 보기`}
              aria-current={o === 0 ? "true" : undefined}
              tabIndex={o === 0 ? 0 : -1}
              onClick={(e) => {
                if (o === 0) {
                  openerRef.current = e.currentTarget;
                  setOpenId(exercise.id);
                } else {
                  setActive(i);
                }
              }}
              style={{
                transform: `translateX(calc(${o} * var(--step))) scale(${o === 0 ? 1 : far ? 0.62 : 0.8})`,
                opacity: o === 0 ? 1 : far ? 0.3 : 0.6,
                zIndex: 10 - Math.abs(o),
              }}
              className="absolute left-1/2 top-0 -ml-[calc(var(--cw)/2)] flex h-full w-[var(--cw)] flex-col justify-between overflow-hidden rounded-[28px] p-6 text-left ring-1 ring-white/20 backdrop-blur transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] [background:linear-gradient(160deg,rgba(255,255,255,0.16),rgba(255,255,255,0.03)_55%,rgba(121,220,232,0.10))] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#79dce8] motion-reduce:transition-none"
            >
              <span className="font-serif text-5xl font-normal leading-none text-white/25">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>
                <span className="block text-[11px] font-medium tracking-[0.2em] text-[#79dce8]">
                  {tagLine(exercise)}
                </span>
                <span className="mt-2 block text-xl font-semibold leading-7 tracking-[-0.01em]">
                  {exercise.name}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-center gap-5">
        <button type="button" aria-label="이전 운동" onClick={() => move(-1)} className={ARROW}>
          &lt;
        </button>
        <button
          type="button"
          onClick={(e) => {
            openerRef.current = e.currentTarget;
            setOpenId(exercises[active].id);
          }}
          className={PILL}
        >
          자세히 보기
        </button>
        <button type="button" aria-label="다음 운동" onClick={() => move(1)} className={ARROW}>
          &gt;
        </button>
      </div>
      <p className="mt-3 text-center text-xs text-white/50">← → 방향키로도 넘길 수 있어요</p>

      <div className="flex-1" />

      <div className="mx-auto mt-10 w-full max-w-[640px] px-4 pb-6">
        <div className="rounded-3xl bg-white/[0.06] p-5 text-sm leading-6 ring-1 ring-white/10">
          <h3 className="font-semibold text-[#79dce8]">운동할 때 꼭 지켜 주세요</h3>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-white/85">
            {common.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="mx-auto mt-5 block rounded-full px-5 py-3 text-sm font-medium text-white/70 ring-1 ring-white/20 transition hover:text-white hover:ring-white/40"
        >
          ← 다시 입력하기
        </button>
      </div>
      <SmallWarning common={[]} />

      {/* 화면 전환 효과(transform) 안에서는 fixed가 화면 전체를 덮지 못해, body 바로 아래에 그린다. */}
      {opened
        ? createPortal(<ExerciseDetail exercise={opened} common={common} onClose={close} />, document.body)
        : null}
    </section>
  );
}
