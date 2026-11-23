// Design Ref: PRD nice "진행 기록 화면" — 운동·부위별 통증 그래프와 분석.
// 기록은 브라우저에만 있고, 주소에는 운동 번호와 부위 이름표(영어)만 있다.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExerciseLogView } from "../../../../components/ExerciseLogView";
import { EXERCISES } from "../../../../lib/exercises/data";
import { partFromSlug, partSlug } from "../../../../lib/log";

export const metadata: Metadata = { title: "운동별 기록" };

/** 운동마다 그 운동이 다루는 부위별로 화면을 하나씩 만든다. */
export function generateStaticParams() {
  return EXERCISES.flatMap((exercise) =>
    exercise.bodyParts.map((part) => ({ id: exercise.id, part: partSlug(part) })),
  );
}

export default async function ExerciseLogPage({
  params,
}: {
  params: Promise<{ id: string; part: string }>;
}) {
  const { id, part: slug } = await params;
  const exercise = EXERCISES.find((e) => e.id === id);
  const part = partFromSlug(slug);
  // 없는 운동이거나, 그 운동이 다루지 않는 부위 주소면 찾을 수 없음 처리한다.
  if (!exercise || !part || !exercise.bodyParts.includes(part)) notFound();
  return <ExerciseLogView exerciseId={id} part={part} />;
}
