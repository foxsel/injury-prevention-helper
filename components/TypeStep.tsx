// Design Ref: 두 번째 화면 — 예방형인지 회복형인지 고른다. 카드를 누르면 선택하고 다음 화면으로 넘어간다.

import type { ReactNode } from "react";
import { USER_TYPES, type UserType } from "../lib/constants";

interface TypeInfo {
  description: string;
  glyph: ReactNode;
}

// 작은 점 그림(첫 화면의 점 느낌): 예방은 둥근 울타리, 회복은 되돌아오는 화살표 모양
const TYPE_INFO: Record<UserType, TypeInfo> = {
  예방형: {
    description: "아직 다치지 않았어요. 다치지 않도록 미리 몸을 준비하고 싶어요.",
    glyph: (
      <svg viewBox="0 0 40 40" className="size-10" aria-hidden="true">
        {Array.from({ length: 12 }, (_, k) => {
          const angle = (k / 12) * Math.PI * 2;
          return (
            <circle
              key={k}
              cx={20 + 15 * Math.cos(angle)}
              cy={20 + 15 * Math.sin(angle)}
              r={k % 3 === 0 ? 2.6 : 1.8}
              fill="currentColor"
            />
          );
        })}
        <circle cx="20" cy="20" r="3" fill="currentColor" />
      </svg>
    ),
  },
  회복형: {
    description: "병원 치료를 받았어요. 집에서 회복 운동을 하고 싶어요.",
    glyph: (
      <svg viewBox="0 0 40 40" className="size-10" aria-hidden="true">
        {[
          [6, 20], [12, 20], [18, 20], [24, 20], [30, 20],
          [26, 14], [32, 20], [26, 26],
        ].map(([x, y], k) => (
          <circle key={k} cx={x} cy={y} r={k < 5 ? 1.8 + k * 0.25 : 2.6} fill="currentColor" />
        ))}
      </svg>
    ),
  },
};

interface TypeStepProps {
  selected: UserType | null;
  onSelect: (type: UserType) => void;
  onBack: () => void;
}

export function TypeStep({ selected, onSelect, onBack }: TypeStepProps) {
  return (
    <section
      aria-labelledby="step-heading"
      className="relative flex flex-1 flex-col items-center px-4 pb-10 pt-[clamp(36px,8vh,88px)] text-center"
    >
      <p className="text-sm font-medium text-faint">1 / 2</p>
      <h2
        id="step-heading"
        tabIndex={-1}
        className="mt-3 text-[clamp(30px,4vw,52px)] font-medium leading-[1.12] tracking-[-0.03em] outline-none"
      >
        어떤 운동이 필요하세요?
      </h2>
      <p className="mt-3 text-[clamp(14px,1.1vw,16px)] text-muted">
        하나를 고르면 다음 화면으로 넘어가요.
      </p>

      <div className="mt-10 grid w-full max-w-[760px] gap-4 sm:grid-cols-2">
        {USER_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            aria-pressed={selected === type}
            onClick={() => onSelect(type)}
            className="group flex min-h-48 flex-col items-start gap-4 rounded-[28px] bg-surface p-7 text-left shadow-[0_2px_24px_rgba(0,0,0,0.05)] ring-1 ring-line transition duration-300 hover:-translate-y-1 hover:shadow-[0_12px_36px_rgba(0,0,0,0.12)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground aria-pressed:bg-accent aria-pressed:text-on-accent aria-pressed:ring-accent"
          >
            <span className="text-faint group-aria-pressed:text-on-accent">
              {TYPE_INFO[type].glyph}
            </span>
            <span className="text-2xl font-semibold">{type}</span>
            <span className="text-[15px] leading-6 text-muted group-aria-pressed:text-on-accent group-aria-pressed:opacity-80">
              {TYPE_INFO[type].description}
            </span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onBack}
        className="mt-10 rounded-full px-5 py-2.5 text-sm font-medium text-muted ring-1 ring-line transition hover:text-foreground hover:ring-foreground/30"
      >
        ← 처음으로
      </button>
    </section>
  );
}
