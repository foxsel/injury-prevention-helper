// Design Ref: 첫 화면 "이렇게 사용해요" — 위쪽 연한 그림 영역, 큰 제목, 보조 설명, 우하단 작은 원형 번호.
// 그림은 장식이라 화면 읽기 도구(스크린 리더)에서는 숨긴다.

import type { ReactNode } from "react";

interface StepCardProps {
  step: number;
  title: string;
  description: string;
  visual: ReactNode;
}

export function StepCard({ step, title, description, visual }: StepCardProps) {
  return (
    <li className="flex flex-col overflow-hidden rounded-3xl bg-surface shadow-[0_2px_24px_rgba(0,0,0,0.06)] ring-1 ring-line">
      <div
        aria-hidden="true"
        className="flex h-36 items-center justify-center bg-gradient-to-b from-accent-soft to-accent-soft-2 px-6"
      >
        {visual}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-6">
        <h3 className="text-xl font-bold">{title}</h3>
        <p className="leading-7 text-muted">{description}</p>
        <span
          aria-label={`${step}단계`}
          className="mt-auto flex size-9 items-center justify-center self-end rounded-full bg-accent-soft text-sm font-bold text-accent-text"
        >
          {step}
        </span>
      </div>
    </li>
  );
}

/** 1단계 그림: 예방형·회복형 선택 */
export function TypeVisual() {
  return (
    <div className="flex gap-3">
      <span className="rounded-full bg-accent px-5 py-2 text-sm font-bold text-white shadow-md">
        예방형
      </span>
      <span className="rounded-full bg-surface px-5 py-2 text-sm font-bold text-accent-text shadow-sm ring-1 ring-line">
        회복형
      </span>
    </div>
  );
}

/** 2단계 그림: 통증 0~10 막대 (한 막대만 진하게) */
export function PainVisual() {
  const heights = [28, 36, 30, 44, 38, 56, 40, 34, 26, 22, 18];
  return (
    <div className="flex h-24 items-end gap-1.5">
      {heights.map((height, index) => (
        <span
          key={index}
          style={{ height }}
          className={`w-3 rounded-full ${index === 5 ? "bg-accent" : "bg-accent/30"}`}
        />
      ))}
    </div>
  );
}

/** 3단계 그림: 추천 운동 목록 */
export function ResultVisual() {
  return (
    <div className="flex w-full max-w-48 flex-col gap-2">
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          className="flex items-center gap-2 rounded-full bg-surface px-3 py-2 shadow-sm ring-1 ring-line"
        >
          <span className="size-4 rounded-full bg-accent" />
          <span
            className={`h-2 rounded-full bg-accent/30 ${row === 0 ? "w-24" : row === 1 ? "w-20" : "w-28"}`}
          />
        </div>
      ))}
    </div>
  );
}
