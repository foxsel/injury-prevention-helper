"use client";

// Design Ref: §3.1 화면 구성 — 서비스 소개와 공통 안내 2종을 왼쪽 위 [참고] 버튼 뒤에 둔다.
// Plan SC: 공통 안내 2종은 모든 화면에서 버튼 한 번으로 볼 수 있다(화면에는 한 번만 그려진다).

import { useEffect, useId, useRef, useState } from "react";
import { SERVICE_NAME, SERVICE_TAGLINE } from "../lib/notices";
import { CommonNotices } from "./Disclaimer";

export function InfoButton() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);

  // 바깥을 누르거나 Esc를 누르면 닫는다.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-surface/90 px-3.5 text-[13px] font-medium ring-1 ring-line backdrop-blur transition-colors hover:bg-surface"
      >
        <span aria-hidden="true">ⓘ</span>
        참고
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="absolute left-0 top-full mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl bg-surface p-4 shadow-lg ring-1 ring-line"
      >
        <p className="text-base font-bold leading-6">{SERVICE_NAME}</p>
        <p className="mt-0.5 text-sm leading-5 text-muted">{SERVICE_TAGLINE}</p>
        <div className="mt-3 border-t border-line pt-3">
          <CommonNotices />
        </div>
      </div>
    </div>
  );
}
