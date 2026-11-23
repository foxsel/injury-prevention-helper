"use client";

// Design Ref: PRD nice "진행 기록 화면" — 기록 첫 화면: 기록한 운동을 한 운동당 한 줄로 보여 준다.
// Plan SC: 같은 운동을 여러 번 기록해도 하나만 보이고, 누르면 날짜별 기록·그래프·분석을 볼 수 있다.
//          기록은 이 브라우저에만 있고, 모두 지울 수 있다(하나씩 지우기는 운동별 화면에서).

import Link from "next/link";
import { useState } from "react";
import { EXERCISES } from "../lib/exercises/data";
import { summarizeByExercise } from "../lib/log";
import { LOG_MESSAGES } from "../lib/notices";
import { Card } from "./Card";
import { saveLog, useLog } from "./logStore";

function nameOf(exerciseId: string): string {
  return EXERCISES.find((e) => e.id === exerciseId)?.name ?? "알 수 없는 운동";
}

export function LogView() {
  const entries = useLog();
  const [confirmingClear, setConfirmingClear] = useState(false);
  const summaries = summarizeByExercise(entries);

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
            <h2 className="text-sm font-semibold text-faint">
              기록한 운동 {summaries.length}개 · 누르면 날짜별 기록과 그래프를 볼 수 있어요
            </h2>
            <ul className="mt-3 flex flex-col gap-3">
              {summaries.map((item) => (
                <li key={item.exerciseId}>
                  <Link
                    href={`/log/${item.exerciseId}`}
                    className="flex items-center justify-between gap-3 rounded-3xl bg-surface p-5 ring-1 ring-line transition hover:ring-foreground/30"
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold">{nameOf(item.exerciseId)}</span>
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
