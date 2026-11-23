"use client";

// Design Ref: §3.2 `/guide/[id]` — 직전 화면(추천 카드 목록)으로 돌아간다.
// 이 앱 안에서 넘어왔으면 브라우저 뒤로가기와 같아서 추천 목록이 그대로 남아 있다.
// 주소로 바로 들어와 돌아갈 곳이 없으면 링크 그대로 첫 화면으로 간다.

import Link from "next/link";

export function BackButton() {
  return (
    <Link
      href="/"
      onClick={(event) => {
        if (window.history.length > 1) {
          event.preventDefault();
          window.history.back();
        }
      }}
      className="self-start rounded-full px-5 py-3 text-sm font-medium text-muted ring-1 ring-line transition hover:text-foreground hover:ring-foreground/30"
    >
      ← 추천 목록으로
    </Link>
  );
}
