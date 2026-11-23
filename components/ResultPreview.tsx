// 임시 결과 보기 — PLAN 9번(추천 결과 화면, ResultList)을 만들면 이 파일을 교체한다.
// 지금은 추천 결과·막힘·오류 안내를 간단한 글로 보여 준다.

import type { ReactNode } from "react";
import { BLOCK_MESSAGES, RESULT_MESSAGES } from "../lib/notices";
import type { RecommendResponse } from "../lib/recommend";
import { Card } from "./Card";

/** 서버가 보낸 결과 + 서버에 닿지 못한 경우 */
export type ResultView = RecommendResponse | { status: "network-error" };

export function ResultPreview({ result }: { result: ResultView }) {
  let content: ReactNode;
  switch (result.status) {
    case "ok":
      content = (
        <ul className="flex list-disc flex-col gap-1 pl-5">
          {result.exercises.map((exercise) => (
            <li key={exercise.id}>
              {exercise.name} ({exercise.reps}, {exercise.sets})
            </li>
          ))}
        </ul>
      );
      break;
    case "blocked":
      content = <p>{BLOCK_MESSAGES[result.reason]}</p>;
      break;
    case "empty":
      content = <p>{RESULT_MESSAGES.empty}</p>;
      break;
    case "network-error":
      content = <p>{RESULT_MESSAGES.network}</p>;
      break;
    case "error":
      content =
        result.code === "INVALID_INPUT" ? (
          <ul className="flex list-disc flex-col gap-1 pl-5">
            {result.issues.map((issue) => (
              <li key={issue.field + issue.message}>{issue.message}</li>
            ))}
          </ul>
        ) : (
          <p>
            {result.code === "AI_TIMEOUT"
              ? RESULT_MESSAGES.aiTimeout
              : RESULT_MESSAGES.aiFailed}
          </p>
        );
      break;
  }

  return (
    <Card className="flex flex-col gap-3">
      <h3 className="text-xl font-semibold">추천 결과</h3>
      <div role="status" className="leading-7">
        {content}
      </div>
    </Card>
  );
}
