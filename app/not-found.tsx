// Design Ref: §7 오류 처리 — 없는 주소로 들어왔을 때 한국어 안내와 홈 링크.

import Link from "next/link";
import { Card } from "../components/Card";

export default function NotFound() {
  return (
    <section className="mx-auto flex w-full max-w-[760px] flex-1 flex-col items-center px-4 pt-[clamp(96px,14vh,140px)]">
      <Card className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-2xl font-semibold">페이지를 찾을 수 없습니다</h1>
        <p className="leading-7 text-muted">주소가 잘못되었거나 없어진 페이지입니다.</p>
        <Link
          href="/"
          className="mt-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-on-accent"
        >
          처음으로 가기
        </Link>
      </Card>
    </section>
  );
}
