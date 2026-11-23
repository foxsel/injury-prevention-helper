// Design Ref: §3.3 입력 화면 — 라디오·체크박스를 알약 모양 선택 버튼으로 보여주는 공통 부품.

import type { ReactNode } from "react";

interface ChoiceProps {
  type: "radio" | "checkbox";
  name: string;
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
  /** 선택지 모서리에 붙는 작은 표시(예: "추천") */
  badge?: string;
}

export function Choice({ type, name, checked, onChange, children, badge }: ChoiceProps) {
  return (
    <label className="relative cursor-pointer">
      <input
        type={type}
        name={name}
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <span className="flex min-h-11 items-center justify-center rounded-full bg-surface px-5 text-[15px] font-medium ring-1 ring-line transition hover:ring-foreground/30 peer-checked:bg-accent peer-checked:text-on-accent peer-checked:ring-accent peer-focus-visible:ring-2 peer-focus-visible:ring-foreground">
        {children}
      </span>
      {badge ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-1 -top-2 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold leading-none text-background"
        >
          {badge}
        </span>
      ) : null}
    </label>
  );
}
