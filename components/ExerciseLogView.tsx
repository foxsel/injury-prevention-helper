"use client";

// Design Ref: PRD nice "진행 기록 화면" — 운동 하나의 통증 증감 그래프와 분석.
// Plan SC: 3번 연속 높아지거나 6점 이상이면 병원 진료 제안, 줄어들면 이 운동을 추천에서 더 앞에 보여 준다.

import Link from "next/link";
import type { ReactNode } from "react";
import { EXERCISES } from "../lib/exercises/data";
import { analyzeTrend, entriesFor, type TrendStatus } from "../lib/log";
import { LOG_MESSAGES, TREND_MESSAGES } from "../lib/notices";
import { Card } from "./Card";
import { PainChart } from "./PainChart";
import { useLog } from "./logStore";

const HEADLINES: Record<TrendStatus, string> = {
  consult: "병원 진료를 권해요",
  rising: "조금 지켜봐 주세요",
  improving: "통증이 줄어드는 흐름이에요",
  steady: "큰 변화가 없어요",
  "need-more": "분석하려면 기록이 더 필요해요",
};

const BODIES: Record<TrendStatus, string> = {
  consult: TREND_MESSAGES.consult,
  rising: TREND_MESSAGES.rising,
  improving: TREND_MESSAGES.improving,
  steady: TREND_MESSAGES.steady,
  "need-more": TREND_MESSAGES.needMore,
};

function Legend({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-2">{children}</span>;
}

export function ExerciseLogView({ exerciseId }: { exerciseId: string }) {
  const entries = entriesFor(useLog(), exerciseId);
  const exercise = EXERCISES.find((e) => e.id === exerciseId);
  const name = exercise?.name ?? "알 수 없는 운동";
  const trend = analyzeTrend(entries);
  const strong = trend.status === "consult";

  return (
    <section className="mx-auto flex w-full max-w-[760px] flex-1 flex-col px-4 pb-12 pt-[clamp(72px,10vh,104px)]">
      <Link
        href="/log"
        className="self-start rounded-full px-5 py-3 text-sm font-medium text-muted ring-1 ring-line transition hover:text-foreground hover:ring-foreground/30"
      >
        ← 기록으로
      </Link>

      <h1 className="mt-8 text-[clamp(30px,4vw,48px)] font-extrabold leading-[1.12] tracking-[-0.03em]">
        {name}
      </h1>
      <p className="mt-3 text-sm text-muted">
        기록 {entries.length}번 ·{" "}
        <Link href={`/guide/${exerciseId}`} className="underline underline-offset-4">
          운동 가이드 보기
        </Link>
      </p>

      {entries.length === 0 ? (
        <Card className="mt-8 text-center">
          <p className="leading-7 text-muted">{LOG_MESSAGES.empty}</p>
        </Card>
      ) : (
        <>
          <Card className="mt-8">
            <h2 className="text-lg font-semibold">통증 변화</h2>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
              <Legend>
                <span aria-hidden="true" className="inline-block h-0.5 w-6 bg-foreground" />
                운동 후
              </Legend>
              <Legend>
                <span aria-hidden="true" className="inline-block w-6 border-t-2 border-dotted border-muted" />
                운동 전
              </Legend>
            </div>
            <div className="mt-2">
              <PainChart entries={entries} />
            </div>
          </Card>

          {/* 분석 */}
          <section
            aria-labelledby="trend-heading"
            className={`mt-6 rounded-3xl p-6 ring-1 ring-line ${strong ? "bg-accent text-on-accent" : "bg-surface"}`}
          >
            <h2 id="trend-heading" className="text-lg font-semibold">
              분석 · {HEADLINES[trend.status]}
            </h2>
            {trend.reasons.length > 0 ? (
              <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm leading-6">
                {trend.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            ) : null}
            <p className="mt-3 leading-7">{BODIES[trend.status]}</p>
            <p className={`mt-4 text-xs leading-5 ${strong ? "opacity-80" : "text-muted"}`}>
              {TREND_MESSAGES.note}
            </p>
          </section>

          {/* 숫자 표: 그래프를 볼 수 없는 경우에도 같은 내용을 읽을 수 있게 */}
          <div className="mt-6 overflow-x-auto rounded-3xl bg-surface ring-1 ring-line">
            <table className="w-full min-w-[320px] text-left text-sm">
              <caption className="sr-only">{name} 기록</caption>
              <thead className="text-xs text-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">날짜</th>
                  <th scope="col" className="px-3 py-3 font-medium">운동 전</th>
                  <th scope="col" className="px-3 py-3 font-medium">운동 후</th>
                </tr>
              </thead>
              <tbody>
                {[...entries].reverse().map((e) => (
                  <tr key={e.id} className="border-t border-line">
                    <td className="px-5 py-3">{e.date}</td>
                    <td className="px-3 py-3 tabular-nums">
                      {e.painBefore === undefined ? "–" : `${e.painBefore}점`}
                    </td>
                    <td className="px-3 py-3 font-semibold tabular-nums">{e.pain}점</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="mt-6 text-xs leading-5 text-muted">{LOG_MESSAGES.storage}</p>
    </section>
  );
}
