"use client";

// Design Ref: PRD nice "진행 기록 화면" — 날짜별로 한 운동과 통증 변화를 보여 준다.
// Plan SC: 기록은 이 브라우저에만 있고, 하나씩 또는 모두 지울 수 있다.

import Link from "next/link";
import { useState } from "react";
import { EXERCISES } from "../lib/exercises/data";
import { describeChange, groupByDate, previousPain, removeEntry, shouldAdviseStop } from "../lib/log";
import { LOG_MESSAGES } from "../lib/notices";
import { Card } from "./Card";
import { saveLog, useLog } from "./logStore";

function nameOf(exerciseId: string): string {
  return EXERCISES.find((e) => e.id === exerciseId)?.name ?? "알 수 없는 운동";
}

export function LogView() {
  const entries = useLog();
  const [confirmingClear, setConfirmingClear] = useState(false);
  const days = groupByDate(entries);
  const exerciseIds = [...new Set(entries.map((e) => e.exerciseId))];

  return (
    <section className="mx-auto flex w-full max-w-[760px] flex-1 flex-col px-4 pb-12 pt-[clamp(72px,10vh,104px)]">
      <h1 className="text-[clamp(30px,4vw,48px)] font-extrabold leading-[1.12] tracking-[-0.03em]">
        진행 기록
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted">{LOG_MESSAGES.storage}</p>

      {days.length === 0 ? (
        <Card className="mt-8 text-center">
          <p className="leading-7 text-muted">{LOG_MESSAGES.empty}</p>
        </Card>
      ) : (
        <div className="mt-8 flex flex-col gap-6">
          <div>
            <h2 className="text-sm font-semibold text-faint">운동별 그래프·분석 보기</h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {exerciseIds.map((id) => (
                <li key={id}>
                  <Link
                    href={`/log/${id}`}
                    className="inline-flex min-h-10 items-center rounded-full bg-surface px-4 text-sm font-medium ring-1 ring-line transition hover:ring-foreground/30"
                  >
                    {nameOf(id)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          {days.map((day) => (
            <div key={day.date}>
              <h2 className="text-sm font-semibold text-faint">{day.date}</h2>
              <ul className="mt-2 flex flex-col gap-3">
                {day.entries.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-start justify-between gap-3 rounded-3xl bg-surface p-5 ring-1 ring-line"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/log/${entry.exerciseId}`}
                        className="font-semibold underline-offset-4 hover:underline"
                      >
                        {nameOf(entry.exerciseId)} <span aria-hidden="true">→</span>
                      </Link>
                      <p className="mt-1 text-sm text-muted">
                        {entry.painBefore === undefined ? "" : `운동 전 ${entry.painBefore}점 → `}운동 후 {entry.pain}점 · {describeChange(entry.pain, previousPain(entries, entry))}
                      </p>
                      {shouldAdviseStop(entry.pain) ? (
                        <p className="mt-2 rounded-2xl bg-accent px-3 py-2 text-sm font-medium text-on-accent">
                          {LOG_MESSAGES.stop}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      aria-label={`${nameOf(entry.exerciseId)} ${entry.date} 기록 지우기`}
                      onClick={() => saveLog(removeEntry(entries, entry.id))}
                      className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-muted ring-1 ring-line transition hover:text-foreground"
                    >
                      지우기
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}

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
