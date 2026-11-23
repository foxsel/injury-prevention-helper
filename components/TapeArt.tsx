// Design Ref: §3.1 결과 영역 — 비디오테이프처럼 세워 둔 운동 카드의 겉모습(옆면 spine, 앞면 cover).
// 이미지 파일 없이 CSS만으로 그린다. 크기는 부모의 글자 크기(em)에 맞춰 늘고 줄어든다.

import type { CSSProperties } from "react";
import type { Exercise } from "../lib/exercises/types";

export function tagLine(exercise: Exercise): string {
  return `${exercise.bodyParts.join("·")} · ${exercise.purpose}`;
}

/** 점(하프톤)으로 그린 그림: 카드마다 자리를 조금씩 바꿔 서로 다르게 보이게 한다. */
const ART_SPOTS = [
  { right: "-1.6em", bottom: "2.2em", at: "35% 35%" },
  { left: "-1.8em", bottom: "2.6em", at: "65% 35%" },
  { right: "-2.2em", bottom: "3em", at: "30% 50%" },
  { left: "-1.4em", bottom: "2em", at: "55% 25%" },
] as const;

function dots(at: string): CSSProperties {
  return {
    background: "radial-gradient(circle, var(--dots) 0 36%, transparent 42%) 0 0 / 0.42em 0.42em",
    WebkitMaskImage: `radial-gradient(circle at ${at}, #000 0 28%, transparent 68%)`,
    maskImage: `radial-gradient(circle at ${at}, #000 0 28%, transparent 68%)`,
  };
}

/** 앞면(cover): 운동 이름이 크게, 아래에는 점으로 그린 그림 */
export function CoverArt({
  exercise,
  index,
  total,
}: {
  exercise: Exercise;
  index: number;
  total: number;
}) {
  const spot = ART_SPOTS[index % ART_SPOTS.length];
  const { at, ...pos } = spot;
  return (
    <div className="absolute inset-0 flex flex-col justify-between overflow-hidden bg-surface p-[1.1em] text-foreground ring-1 ring-inset ring-foreground/80">
      <div>
        <p className="text-[0.62em] font-semibold tracking-[0.14em]">
          추천 운동 · {String(index + 1).padStart(2, "0")}/{String(total).padStart(2, "0")}
        </p>
        <h3 className="mt-[0.7em] break-keep text-[1.45em] font-extrabold leading-[1.12] tracking-[-0.03em]">
          {exercise.name}
        </h3>
      </div>
      <span
        aria-hidden="true"
        className="absolute size-[9em] rounded-full"
        style={{ ...pos, ...dots(at) }}
      />
      <p className="relative z-10 flex items-end justify-between text-[0.62em] font-semibold tracking-[0.1em]">
        <span>{tagLine(exercise)}</span>
        <span className="rounded-[0.2em] px-[0.6em] py-[0.25em] ring-1 ring-foreground">운동</span>
      </p>
    </div>
  );
}

/** 옆면(spine): 위에 작은 점 그림, 세로로 쓴 이름, 아래에 작은 상자 */
export function SpineArt({ exercise, index }: { exercise: Exercise; index: number }) {
  const spot = ART_SPOTS[index % ART_SPOTS.length];
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-between overflow-hidden bg-accent-soft py-[0.9em] text-foreground ring-1 ring-inset ring-foreground/70">
      <span
        aria-hidden="true"
        className="block size-[2.1em] rounded-full"
        style={dots(spot.at)}
      />
      <span className="max-h-[11em] overflow-hidden whitespace-nowrap text-[0.95em] font-bold tracking-[0.02em] [text-orientation:mixed] [writing-mode:vertical-rl]">
        {exercise.name}
      </span>
      <span className="text-[0.5em] font-semibold tracking-[0.1em] ring-1 ring-foreground/80 px-[0.5em] py-[0.2em]">
        {String(index + 1).padStart(2, "0")}
      </span>
    </div>
  );
}
