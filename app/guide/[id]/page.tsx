// Design Ref: §3.2 `/guide/[id]` — 주소에는 운동 번호만 있고 개인 정보는 없다.
// 없는 번호이거나 필수 정보가 빠진 운동은 보여주지 않고 "찾을 수 없음"으로 처리한다.

import { notFound } from "next/navigation";
import { GuideView } from "../../../components/GuideView";
import { EXERCISES } from "../../../lib/exercises/data";
import { findExerciseProblems } from "../../../lib/verify";

export function generateStaticParams() {
  return EXERCISES.map((exercise) => ({ id: exercise.id }));
}

export default async function GuidePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const exercise = EXERCISES.find((e) => e.id === id);
  if (!exercise || findExerciseProblems(exercise).length > 0) notFound();
  return <GuideView exercise={exercise} />;
}
