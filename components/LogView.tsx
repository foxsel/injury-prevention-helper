"use client";

// Design Ref: PRD nice "진행 기록 화면" — 기록 첫 화면: 기록한 운동을 한 운동당 한 줄로 보여 준다.
// Plan SC: 같은 운동을 여러 번 기록해도 하나만 보이고, 부위별 탭(전체·발목·무릎·어깨)으로 나눠 보며,
//          누르면 날짜별 기록·그래프·분석을 볼 수 있다.
//          기록은 이 브라우저에만 있고, 모두 지울 수 있다(하나씩 지우기는 운동별 화면에서).

import Link from "next/link";
import { useState, type KeyboardEvent } from "react";
import { BODY_PARTS, type BodyPart } from "../lib/constants";
import { EXERCISES } from "../lib/exercises/data";
import { summariesForPart, summarizeByExercise } from "../lib/log";
import { LOG_MESSAGES } from "../lib/notices";
import { Card } from "./Card";
import { saveLog, useLog } from "./logStore";

function nameOf(exerciseId: string): string {
  return EXERCISES.find((e) => e.id === exerciseId)?.name ?? "알 수 없는 운동";
}

function partsOf(exerciseId: string): BodyPart[] {
  return EXERCISES.find((e) => e.id === exerciseId)?.bodyParts ?? [];
}

/** 탭 이름: null은 전체 */
type Tab = BodyPart | null;
const TABS: Tab[] = [null, ...BODY_PARTS];
const tabLabel = (tab: Tab) => tab ?? "전체";

export function LogView() {
  const entries = useLog();
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [tab, setTab] = useState<Tab>(null);
  const summaries = summarizeByExercise(entries);
  const shown = summariesForPart(summaries, tab, partsOf);

  // 탭에서 ← → 키로 옆 탭으로 옮긴다.
  function onTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next = (index + (event.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length;
    setTab(TABS[next]);
    document.getElementById(`log-tab-${next}`)?.focus();
  }

  return (
    <section className="mx-auto flex w-full max-w-[760px] flex-1 flex-col px-4 pb-12 pt-[clamp(72px,10vh,104px)]">
      <h1 className="text-[clamp(30px,4vw,48px)] font-extrabold leading-[1.12] tracking-[-0.03em]">
        진행 기록
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted">{LOG_MESSAGES.storage}</p>

      {summaries.length === 0 ? (
        <Card className="mt-8 text-center">
          <p className="leading-7 text-muted">{LOG_MESSAGES.empty}</p>
        </Card>
      ) : (
        <div className="mt-8 flex flex-col gap-6">
          <div>
            {/* 부위별 탭: 전체 / 발목 / 무릎 / 어깨 */}
            <div role="tablist" aria-label="부위별 기록" className="flex flex-wrap gap-2">
              {TABS.map((t, i) => {
                const count = summariesForPart(summaries, t, partsOf).length;
                const selected = tab === t;
                return (
                  <button
                    key={tabLabel(t)}
                    id={`log-tab-${i}`}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls="log-tabpanel"
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setTab(t)}
                    onKeyDown={(e) => onTabKey(e, i)}
                    className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm font-medium ring-1 transition ${
                      selected
                        ? "bg-accent text-on-accent ring-accent"
                        : "bg-surface ring-line hover:ring-foreground/30"
                    }`}
                  >
                    {tabLabel(t)}
                    <span className={selected ? "opacity-80" : "text-muted"}>{count}</span>
                  </button>
                );
              })}
            </div>

            <div
              id="log-tabpanel"
              role="tabpanel"
              aria-labelledby={`log-tab-${TABS.indexOf(tab)}`}
              className="mt-4"
            >
              <h2 className="text-sm font-semibold text-faint">
                기록한 운동 {shown.length}개 · 누르면 날짜별 기록과 그래프를 볼 수 있어요
              </h2>
              {shown.length === 0 ? (
                <Card className="mt-3 text-center">
                  <p className="leading-7 text-muted">{tab} 부위의 기록은 아직 없어요.</p>
                </Card>
              ) : (
                <ul className="mt-3 flex flex-col gap-3">
                  {shown.map((item) => (
                    <li key={item.exerciseId}>
                      <Link
                        href={`/log/${item.exerciseId}`}
                        className="flex items-center justify-between gap-3 rounded-3xl bg-surface p-5 ring-1 ring-line transition hover:ring-foreground/30"
                      >
                        <span className="min-w-0">
                          <span className="block text-xs font-semibold tracking-[0.08em] text-faint">
                            {partsOf(item.exerciseId).join("·") || "부위 미상"}
                          </span>
                          <span className="mt-0.5 block font-semibold">{nameOf(item.exerciseId)}</span>
                          <span className="mt-1 block text-sm text-muted">
                            기록 {item.count}번 · 최근 {item.lastDate}
                          </span>
                        </span>
                        <span aria-hidden="true" className="shrink-0 text-lg">
                          →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="self-start">
            {confirmingClear ? (
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span>기록을 모두 지울까요? 되돌릴 수 없어요.</span>
                <button
                  type="button"
                  onClick={() => {
                    saveLog([]);
                    setConfirmingClear(false);
                  }}
                  className="rounded-full bg-accent px-4 py-2 font-semibold text-on-accent"
                >
                  모두 지우기
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingClear(false)}
                  className="rounded-full px-4 py-2 font-medium ring-1 ring-line"
                >
                  취소
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingClear(true)}
                className="rounded-full px-5 py-3 text-sm font-medium text-muted ring-1 ring-line transition hover:text-foreground"
              >
                기록 모두 지우기
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
