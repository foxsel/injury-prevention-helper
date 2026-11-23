"use client";

// Design Ref: PRD nice "진행 기록 화면" — 가이드 화면 아래에서 오늘 운동을 마쳤다고 기록한다.
// Plan SC: 통증을 6점 이상으로 기록하면 운동 중단과 전문가 상담을 안내한다. 기록은 브라우저에만 저장된다.

import Link from "next/link";
import { useState } from "react";
import { PAIN_MAX, PAIN_MIN } from "../lib/constants";
import { addEntry, makeEntry, shouldAdviseStop } from "../lib/log";
import { LOG_MESSAGES } from "../lib/notices";
import { Card } from "./Card";
import { saveLog, useLog } from "./logStore";

type Saved = { pain: number; ok: boolean } | null;

export function RecordCard({ exerciseId }: { exerciseId: string }) {
  const entries = useLog();
  const [pain, setPain] = useState(0);
  const [saved, setSaved] = useState<Saved>(null);

  function record() {
    const ok = saveLog(addEntry(entries, makeEntry(exerciseId, pain, new Date())));
    setSaved({ pain, ok });
  }

  return (
    <Card className="mt-6 flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">오늘 운동 기록하기</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          운동을 마쳤다면 지금 통증을 함께 남겨 보세요. (0 = 없음, 10 = 참기 어려움)
        </p>
      </div>

      <div>
        <label htmlFor="record-pain" className="flex items-baseline justify-between text-sm font-medium">
          <span>운동 후 통증</span>
          <span className="text-lg font-semibold tabular-nums">{pain}점</span>
        </label>
        <input
          id="record-pain"
          type="range"
          min={PAIN_MIN}
          max={PAIN_MAX}
          step={1}
          value={pain}
          onChange={(e) => {
            setPain(Number(e.target.value));
            setSaved(null);
          }}
          className="mt-2 w-full accent-foreground"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={record}
          className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-on-accent"
        >
          운동 완료로 기록
        </button>
        <Link href="/log" className="text-sm font-medium underline underline-offset-4">
          기록 보기 →
        </Link>
      </div>

      <div role="status" className="flex flex-col gap-2 text-sm leading-6">
        {saved ? (
          saved.ok ? (
            <p className="font-medium">{LOG_MESSAGES.saved}</p>
          ) : (
            <p className="text-muted">{LOG_MESSAGES.saveFailed}</p>
          )
        ) : null}
        {saved && shouldAdviseStop(saved.pain) ? (
          <p className="rounded-2xl bg-accent px-4 py-3 font-semibold text-on-accent">
            {LOG_MESSAGES.stop}
          </p>
        ) : null}
      </div>

      <p className="text-xs leading-5 text-muted">{LOG_MESSAGES.storage}</p>
    </Card>
  );
}
