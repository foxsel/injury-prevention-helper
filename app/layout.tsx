// Design Ref: §3.1 화면 구성, §9 폴더 구조 — 모든 화면을 감싸는 공통 틀.
// Plan SC: 왼쪽 위 TopNav([처음으로]·[기록]·[참고])가 모든 화면에 있고, 서비스 이름·소개와 공통 안내 문구 2종은
//          [참고] 창 안에 한 번만 그려진다(추천 결과·가이드 화면 아래에는 같은 문구가 따로 보인다).

import type { Metadata } from "next";
import { TopNav } from "../components/TopNav";
import { SERVICE_NAME, SERVICE_TAGLINE } from "../lib/notices";
import "./globals.css";

export const metadata: Metadata = {
  title: SERVICE_NAME,
  description: SERVICE_TAGLINE,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col break-keep">
        <TopNav />
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
