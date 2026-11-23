// Design Ref: §3.2 `/guide/[id]` 가이드 화면 — 운동 하나의 방법·횟수·세트·주의사항·중단 기준.
// Plan SC: 필수 정보가 모두 보이고, 중단 기준은 강조해서 보인다. 안내 문구 2종이 아래에 보인다.

import type { Exercise } from "../lib/exercises/types";
import { NOTICE_NOT_MEDICAL, NOTICE_PROTOTYPE } from "../lib/notices";
import { BackButton } from "./BackButton";
import { Card } from "./Card";

export function GuideView({ exercise }: { exercise: Exercise }) {
  return (
    <section className="mx-auto flex w-full max-w-[760px] flex-1 flex-col px-4 pb-12 pt-[clamp(72px,10vh,104px)]">
      <BackButton />

      <header className="mt-8">
        <p className="text-sm font-medium text-faint">
          {exercise.sports.join("·")} · {exercise.bodyParts.join("·")} · {exercise.purpose}
        </p>
        <h1 className="mt-3 text-[clamp(30px,4vw,48px)] font-extrabold leading-[1.12] tracking-[-0.03em]">
          {exercise.name}
        </h1>
        <p className="mt-3 leading-7 text-muted">{exercise.description}</p>
        <p className="mt-4 flex flex-wrap gap-2 text-[13px] font-medium">
          <span className="rounded-full bg-notice-bg px-3 py-1">{exercise.reps}</span>
          <span className="rounded-full bg-notice-bg px-3 py-1">{exercise.sets}</span>
        </p>
      </header>

      <Card className="mt-8 flex flex-col gap-7">
        <div>
          <h2 className="text-lg font-semibold">하는 방법</h2>
          <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 leading-7">
            {exercise.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>

        <div>
          <h2 className="text-lg font-semibold">주의사항</h2>
          <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 leading-7">
            {exercise.cautions.map((caution) => (
              <li key={caution}>{caution}</li>
            ))}
          </ul>
        </div>

        <div role="note" className="rounded-2xl bg-accent px-5 py-4 text-on-accent">
          <h2 className="text-lg font-semibold">이럴 땐 멈추세요</h2>
          <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 leading-7">
            {exercise.stopCriteria.map((criterion) => (
              <li key={criterion}>{criterion}</li>
            ))}
          </ul>
        </div>
      </Card>

      <p className="mt-6 text-center text-xs leading-5 text-muted">
        {NOTICE_NOT_MEDICAL} · {NOTICE_PROTOTYPE}
      </p>
    </section>
  );
}
