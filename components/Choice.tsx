// Design Ref: §3.3 입력 화면 — 라디오·체크박스를 알약 모양 선택 버튼으로 보여주는 공통 부품.

import type { ReactNode } from "react";

interface ChoiceProps {
  type: "radio" | "checkbox";
  name: string;
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
}

export function Choice({ type, name, checked, onChange, children }: ChoiceProps) {
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
    </label>
  );
}
