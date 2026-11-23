"use client";

// Design Ref: §3.1 결과 영역 — 카드(cover)에서 종이가 자라나 전체 화면이 되는 운동 상세.
// Plan SC: 방법·횟수·세트·주의사항을 보여 주고, 화면 아래에 중단 기준과 안내 문구를 작게 한 번 더 보인다.

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import type { Exercise } from "../lib/exercises/types";
import { NOTICE_NOT_MEDICAL, NOTICE_PROTOTYPE } from "../lib/notices";
import { CoverArt, tagLine } from "./TapeArt";

const EASE = "cubic-bezier(.76,0,.18,1)";

function insetOf(r: DOMRect): string {
  return `inset(${r.top}px ${window.innerWidth - r.right}px ${window.innerHeight - r.bottom}px ${r.left}px round 3px)`;
}

function reduced(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function ExerciseDetail({
  exercise,
  index,
  total,
  common,
  originRect,
  getCloseRect,
  onClosed,
}: {
  exercise: Exercise;
  index: number;
  total: number;
  common: string[];
  originRect: DOMRect;
  getCloseRect: () => DOMRect;
  onClosed: () => void;
}) {
  const sheet = useRef<HTMLDivElement>(null);
  const closing = useRef(false);
  const extraStops = exercise.stopCriteria.filter((c) => !common.includes(c));

  // 열기: 카드 모양의 종이가 전체 화면으로 자란다.
  useLayoutEffect(() => {
    const el = sheet.current;
    if (!el) return;
    el.animate([{ clipPath: insetOf(originRect) }, { clipPath: "inset(0 round 0)" }], {
      duration: reduced() ? 1 : 1050,
      easing: EASE,
      fill: "both",
    });
    el.querySelector<HTMLElement>("#detail-heading")?.focus({ preventScroll: true });
  }, [originRect]);

  // 닫기: 종이가 다시 카드 자리로 줄어든다.
  const close = useCallback(() => {
    const el = sheet.current;
    if (!el || closing.current) return;
    closing.current = true;
    const anim = el.animate(
      [{ clipPath: "inset(0 round 0)" }, { clipPath: insetOf(getCloseRect()) }],
      { duration: reduced() ? 1 : 850, easing: EASE, fill: "both" },
    );
    anim.onfinish = onClosed;
  }, [getCloseRect, onClosed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);

  return (
    <div
      ref={sheet}
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-heading"
      className="fixed inset-0 z-40 flex flex-col bg-background text-foreground"
    >
      <button
        type="button"
        onClick={close}
        className="absolute right-5 top-5 z-10 inline-flex h-9 items-center gap-2 rounded-full bg-surface px-4 text-[11px] font-semibold tracking-[0.14em] ring-1 ring-foreground/80 transition hover:bg-accent hover:text-on-accent sm:right-9"
      >
        닫기 · CLOSE
      </button>

      <div className="flex-1 overflow-y-auto px-6 pb-8 pt-20 md:px-[6vw]">
        <div className="mx-auto grid w-full max-w-[1100px] items-center gap-8 md:min-h-[calc(100svh-200px)] md:grid-cols-2 md:gap-[4vw]">
          {/* 포스터(cover) */}
          <div className="flex justify-center md:order-2">
            <div
              className="wipe relative [--ph:min(46svh,120vw)] md:[--ph:min(70svh,60vw)]"
              style={{
                height: "var(--ph)",
                aspectRatio: "474 / 900",
                fontSize: "calc(var(--ph) / 18)",
                animationDelay: "520ms",
              }}
            >
              <CoverArt exercise={exercise} index={index} total={total} />
            </div>
          </div>

          {/* 글 */}
          <div className="flex max-w-[520px] flex-col gap-5 md:order-1">
            <div className="overflow-hidden">
              <p className="rise text-[11px] font-semibold tracking-[0.14em]" style={{ animationDelay: "620ms" }}>
                {tagLine(exercise)}
              </p>
            </div>
            <div className="overflow-hidden pb-1">
              <h2
                id="detail-heading"
                tabIndex={-1}
                className="rise text-[clamp(38px,5vw,72px)] font-semibold leading-[1.08] tracking-[-0.03em] outline-none"
                style={{ animationDelay: "700ms" }}
              >
                {exercise.name}
              </h2>
            </div>
            <div className="overflow-hidden">
              <p className="rise text-sm font-medium text-muted" style={{ animationDelay: "780ms" }}>
                {exercise.reps} / {exercise.sets}
              </p>
            </div>
            <div className="overflow-hidden">
              <p className="rise leading-7" style={{ animationDelay: "850ms" }}>
                {exercise.description}
              </p>
            </div>

            <section className="wipe border-t border-foreground/80 pt-4" style={{ animationDelay: "930ms" }}>
              <h3 className="text-[11px] font-semibold tracking-[0.14em]">하는 방법</h3>
              <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 leading-7">
                {exercise.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </section>

            <section className="wipe border-t border-foreground/80 pt-4" style={{ animationDelay: "1010ms" }}>
              <h3 className="text-[11px] font-semibold tracking-[0.14em]">주의사항</h3>
              <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 leading-7">
                {exercise.cautions.map((caution) => (
                  <li key={caution}>{caution}</li>
                ))}
                {extraStops.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>

      {/* 상세 화면에서도 아래에 작게 한 번 더 경고한다. */}
      <div
        role="note"
        className="border-t border-foreground/20 bg-background px-4 py-3 text-center text-[11px] leading-5 text-muted"
      >
        {common.length > 0 ? (
          <p>
            <span className="font-semibold text-foreground">이럴 땐 멈추세요 · </span>
            {common.join(" ")}
          </p>
        ) : null}
        <p>
          {NOTICE_NOT_MEDICAL} · {NOTICE_PROTOTYPE}
        </p>
      </div>
    </div>
  );
}
