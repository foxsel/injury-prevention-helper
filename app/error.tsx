"use client";

// Design Ref: §7 오류 처리 — 예상하지 못한 화면 오류가 났을 때 안내와 [다시 시도].
// 이 Next.js 버전의 오류 화면은 다시 그리기 함수 이름이 retry다.

import { Card } from "../components/Card";

export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return (
    <section className="mx-auto flex w-full max-w-[760px] flex-1 flex-col items-center px-4 pt-[clamp(96px,14vh,140px)]">
      <Card className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-2xl font-semibold">문제가 생겼습니다</h1>
        <p className="leading-7 text-muted">잠시 후 다시 시도해 주세요.</p>
        <button
          type="button"
          onClick={() => retry()}
          className="mt-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-on-accent"
        >
          다시 시도
        </button>
      </Card>
    </section>
  );
}
