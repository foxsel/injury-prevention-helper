// Design Ref: §3.1 화면 구성, §9 폴더 구조 — 모든 화면을 감싸는 공통 틀.
// Plan SC: 헤더(서비스 이름 + 한 줄 소개)와 공통 안내 문구 2종이 모든 화면에 한 번씩만 보인다.

import type { Metadata } from "next";
import { CommonNotices } from "../components/Disclaimer";
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
        <header className="border-b border-zinc-200 dark:border-zinc-800">
          <div className="mx-auto max-w-3xl px-4 py-4">
            <p className="text-lg font-bold">{SERVICE_NAME}</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {SERVICE_TAGLINE}
            </p>
          </div>
        </header>
        <CommonNotices />
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
