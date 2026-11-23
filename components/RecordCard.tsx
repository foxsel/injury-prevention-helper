"use client";

// Design Ref: PRD nice "진행 기록 화면" — 가이드 화면 아래에서 오늘 운동을 마쳤다고 기록한다.
// Plan SC: 운동 전·후 통증을 남긴다. 운동 전 통증은 처음 한 번만 입력하고, 같은 운동은 지난번 값을 그대로 쓰거나 새로 입력한다.
//          통증을 6점 이상으로 기록하면 운동 중단과 전문가 상담을 안내한다. 기록은 브라우저에만 저장된다.

import Link from "next/link";
import { useState } from "react";
import { PAIN_MAX, PAIN_MIN } from "../lib/constants";
import { addEntry, lastPainBefore, makeEntry, shouldAdviseStop } from "../lib/log";
import { LOG_MESSAGES } from "../lib/notices";
import { Card } from "./Card";
import { Choice } from "./Choice";
import { saveLog, useLog } from "./logStore";

type Saved = { advise: boolean; ok: boolean } | null;

function PainSlider({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="flex items-baseline justify-between text-sm font-medium">
        <span>{label}</span>
        <span className="text-lg font-semibold tabular-nums">{value}점</span>
      </label>
      <input
        id={id}
        type="range"
        min={PAIN_MIN}
        max={PAIN_MAX}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-foreground"
      />
    </div>
  );
}

export function RecordCard({ exerciseId }: { exerciseId: string }) {
  const entries = useLog();
  // 이 운동에서 지난번에 기록한 "운동 전 통증". 있으면 입력을 건너뛸 수 있다.
  const last = lastPainBefore(entries, exerciseId);

  const [mode, setMode] = useState<"same" | "change">("same");
  const [before, setBefore] = useState(0);
  const [pain, setPain] = useState(0);
  const [saved, setSaved] = useState<Saved>(null);

  const useSame = last !== null && mode === "same";
  const painBefore = useSame ? last : before;

  function record() {
    const ok = saveLog(addEntry(entries, makeEntry(exerciseId, painBefore, pain, new Date())));
    setSaved({ ok, advise: shouldAdviseStop(painBefore) || shouldAdviseStop(pain) });
    // 방금 입력한 값이 다음 기록의 "지난번 값"이 되므로, 다음에는 다시 "같아요"부터 시작한다.
    setMode("same");
  }

  return (
    <Card className="mt-6 flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold">오늘 운동 기록하기</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          운동 전과 운동 후 통증을 남기면 그래프로 변화를 볼 수 있어요. (0 = 없음, 10 = 참기 어려움)
        </p>
      </div>

      {/* 운동 전 통증: 처음 한 번만 입력하고, 그다음부터는 지난번 값을 그대로 쓸 수 있다. */}
      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium">운동 전 통증</legend>
        {last === null ? (
          <>
            <PainSlider
              id="record-before"
              label="운동 전 통증"
              value={before}
              onChange={(v) => {
                setBefore(v);
                setSaved(null);
              }}
            />
            <p className="text-xs leading-5 text-muted">
              처음 한 번만 입력하면, 다음부터 이 운동은 입력을 건너뛸 수 있어요.
            </p>
          </>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              <Choice
                type="radio"
                name="before-mode"
                checked={mode === "same"}
                onChange={() => {
                  setMode("same");
                  setSaved(null);
                }}
              >
                지난번과 같아요 ({last}점)
              </Choice>
              <Choice
                type="radio"
                name="before-mode"
                checked={mode === "change"}
                onChange={() => {
                  setMode("change");
                  setBefore(last);
                  setSaved(null);
                }}
              >
                달라졌어요
              </Choice>
            </div>
            {mode === "change" ? (
              <PainSlider
                id="record-before"
                label="새로 입력하는 운동 전 통증"
                value={before}
                onChange={(v) => {
                  setBefore(v);
                  setSaved(null);
                }}
              />
            ) : null}
          </>
        )}
      </fieldset>

      <PainSlider
        id="record-pain"
        label="운동 후 통증"
        value={pain}
        onChange={(v) => {
          setPain(v);
          setSaved(null);
        }}
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={record}
          className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-on-accent"
        >
          운동 완료로 기록
        </button>
        <Link
          href={`/log/${exerciseId}`}
          className="text-sm font-medium underline underline-offset-4"
        >
          이 운동의 그래프·분석 보기 →
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
        {saved?.advise ? (
          <p className="rounded-2xl bg-accent px-4 py-3 font-semibold text-on-accent">
            {LOG_MESSAGES.stop}
          </p>
        ) : null}
      </div>

      <p className="text-xs leading-5 text-muted">{LOG_MESSAGES.storage}</p>
    </Card>
  );
}
