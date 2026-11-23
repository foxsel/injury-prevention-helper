// Design Ref: PRD nice "진행 기록 화면" — 그래프, 운동별 기록 화면, 기록 카드, 추천 결과의 표시 시험.
// 기록을 읽는 화면은 서버에서 그릴 때 기록이 비어 있으므로, 그래프와 결과 표시는 값을 직접 넘겨 확인한다.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EXERCISES } from "../lib/exercises/data";
import type { LogEntry } from "../lib/log";
import { TREND_MESSAGES } from "../lib/notices";
import { ExerciseLogView } from "./ExerciseLogView";
import { PainChart } from "./PainChart";
import { RecordCard } from "./RecordCard";
import { ResultList } from "./ResultList";

function entry(i: number, pain: number, painBefore?: number): LogEntry {
  return {
    id: `e${i}`,
    exerciseId: "x",
    date: `2026-11-${String(10 + i).padStart(2, "0")}`,
    ...(painBefore === undefined ? {} : { painBefore }),
    pain,
    at: i,
  };
}

describe("통증 그래프", () => {
  const html = renderToStaticMarkup(
    <PainChart entries={[entry(0, 2, 1), entry(1, 4, 1), entry(2, 3, 2)]} />,
  );

  it("그림 설명이 있고 6점 기준선이 보인다", () => {
    expect(html).toContain('role="img"');
    expect(html).toContain("가장 최근 운동 후 통증 3점");
    expect(html).toContain("6점 · 병원 상담 기준");
  });

  it("기록마다 운동 후 점과 운동 전 점이 그려진다", () => {
    expect((html.match(/<circle/g) ?? []).length).toBe(6);
  });

  it("운동 전 통증이 없는 옛 기록만 있어도 그려진다", () => {
    const old = renderToStaticMarkup(<PainChart entries={[entry(0, 2), entry(1, 5)]} />);
    expect((old.match(/<circle/g) ?? []).length).toBe(2);
  });

  it("기록이 1개여도 그려지고, 20개를 넘으면 최근 20개만 그린다", () => {
    expect(renderToStaticMarkup(<PainChart entries={[entry(0, 3, 3)]} />)).toContain("<circle");
    const many = Array.from({ length: 30 }, (_, i) => entry(i, i % 10));
    const manyHtml = renderToStaticMarkup(<PainChart entries={many} />);
    expect((manyHtml.match(/<circle/g) ?? []).length).toBe(20);
  });
});

describe("운동별 기록 화면", () => {
  it("기록이 없으면 안내와 돌아가기가 보인다", () => {
    const html = renderToStaticMarkup(<ExerciseLogView exerciseId={EXERCISES[0].id} />);
    expect(html).toContain(EXERCISES[0].name);
    expect(html).toContain("아직 기록이 없어요");
    expect(html).toContain("기록으로");
    expect(html).toContain("브라우저에만 저장");
  });
});

describe("기록 카드", () => {
  it("추천을 거치지 않은 첫 기록이면 운동 전·후 통증 슬라이더가 둘 다 보인다", () => {
    const html = renderToStaticMarkup(<RecordCard exerciseId={EXERCISES[0].id} />);
    expect((html.match(/type="range"/g) ?? []).length).toBe(2);
    expect(html).toContain("추천을 거치지 않고 처음 기록하는 운동");
    expect(html).toContain(`/log/${EXERCISES[0].id}`);
  });
});

describe("추천 결과의 '통증이 줄고 있는 운동' 표시", () => {
  const [a, b] = EXERCISES;

  it("앞으로 올라온 운동에만 표시가 붙는다", () => {
    const html = renderToStaticMarkup(
      <ResultList result={{ status: "ok", exercises: [a, b], boosted: [a.id] }} onBack={() => {}} />,
    );
    expect(html.split(TREND_MESSAGES.boosted).length - 1).toBe(1);
  });

  it("boosted가 없으면 표시가 없다", () => {
    const html = renderToStaticMarkup(
      <ResultList result={{ status: "ok", exercises: [a, b] }} onBack={() => {}} />,
    );
    expect(html).not.toContain(TREND_MESSAGES.boosted);
  });
});
