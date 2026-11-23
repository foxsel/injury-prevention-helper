// Design Ref: PRD nice "진행 기록 화면" — 기록은 브라우저에만 있으므로 서버는 빈 틀만 내려보낸다.

import type { Metadata } from "next";
import { LogView } from "../../components/LogView";

export const metadata: Metadata = { title: "진행 기록" };

export default function LogPage() {
  return <LogView />;
}
