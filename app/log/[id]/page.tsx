// Design Ref: PRD nice "진행 기록 화면" — 운동별 통증 그래프·분석. 기록은 브라우저에만 있고 주소에는 운동 번호만 있다.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExerciseLogView } from "../../../components/ExerciseLogView";
import { EXERCISES } from "../../../lib/exercises/data";

export const metadata: Metadata = { title: "운동별 기록" };

export function generateStaticParams() {
  return EXERCISES.map((exercise) => ({ id: exercise.id }));
}

export default async function ExerciseLogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!EXERCISES.some((e) => e.id === id)) notFound();
  return <ExerciseLogView exerciseId={id} />;
}
