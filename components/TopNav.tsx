"use client";

// Design Ref: §3.1 공통 틀 — 왼쪽 위에 [처음으로]와 [참고]를 모든 화면에서 늘 누를 수 있게 둔다.

import Link from "next/link";
import { requestStart } from "../lib/startSignal";
import { InfoButton } from "./InfoButton";

export function TopNav() {
  return (
    <div className="fixed left-4 top-4 z-50 flex items-start gap-2">
      <Link
        href="/"
        onClick={() => requestStart()}
        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-surface/90 px-3.5 text-[13px] font-medium ring-1 ring-line backdrop-blur transition-colors hover:bg-surface"
      >
        <span aria-hidden="true">⌂</span>
        처음으로
      </Link>
      <InfoButton />
    </div>
  );
}
