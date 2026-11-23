// Design Ref: 화면 분위기(둥근 흰 카드) — 모든 화면이 같은 카드 모양을 쓰도록 한곳에 모은다.

import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

/** 둥근 모서리와 아주 연한 그림자가 있는 흰 카드 */
export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-3xl bg-surface p-6 shadow-[0_2px_24px_rgba(0,0,0,0.06)] ring-1 ring-line ${className}`}
    >
      {children}
    </div>
  );
}
