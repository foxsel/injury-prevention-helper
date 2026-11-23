// Design Ref: §11 시험 계획 — 결과 화면이 모든 필수 정보와 안내 문구를 보여 주는지 확인한다.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EXERCISES } from "../lib/exercises/data";
import { BLOCK_MESSAGES, NOTICE_NOT_MEDICAL, NOTICE_PROTOTYPE, RESULT_MESSAGES } from "../lib/notices";
import { ResultList, commonStopCriteria } from "./ResultList";

const render = (result: Parameters<typeof ResultList>[0]["result"]) =>
  renderToStaticMarkup(<ResultList result={result} onBack={() => {}} />);

describe("추천 결과 화면", () => {
  it("모든 운동에 방법·횟수·세트·주의사항·중단 기준이 보인다", () => {
    const html = render({ status: "ok", exercises: EXERCISES.slice(0, 3) });
    for (const e of EXERCISES.slice(0, 3)) {
      expect(html).toContain(e.name);
      expect(html).toContain(e.reps);
      expect(html).toContain(e.sets);
      for (const c of e.stopCriteria) expect(html).toContain(c);
      for (const s of e.steps) expect(html).toContain(s);
      for (const c of e.cautions) expect(html).toContain(c);
    }
  });

  it("모든 운동에 같은 중단 기준은 한 번만 보인다", () => {
    const list = EXERCISES.slice(0, 3);
    const common = commonStopCriteria(list);
    expect(common.length).toBeGreaterThan(0);
    const html = render({ status: "ok", exercises: list });
    for (const c of common) expect(html.split(c).length - 1).toBe(1);
  });

  it("공통 안내 2종이 결과 아래에 보인다", () => {
    const html = render({ status: "empty" });
    expect(html).toContain(NOTICE_NOT_MEDICAL);
    expect(html).toContain(NOTICE_PROTOTYPE);
  });

  it("막힘·비었음·오류별 안내 문구를 보여 준다", () => {
    expect(render({ status: "blocked", reason: "pain" })).toContain(BLOCK_MESSAGES.pain);
    expect(render({ status: "empty" })).toContain(RESULT_MESSAGES.empty);
    expect(render({ status: "network-error" })).toContain(RESULT_MESSAGES.network);
    expect(render({ status: "error", code: "AI_TIMEOUT" })).toContain(RESULT_MESSAGES.aiTimeout);
    expect(render({ status: "error", code: "AI_FAILED" })).toContain(RESULT_MESSAGES.aiFailed);
  });
});

describe("[다시 시도] 버튼", () => {
  const withRetry = (result: Parameters<typeof ResultList>[0]["result"]) =>
    renderToStaticMarkup(<ResultList result={result} onBack={() => {}} onRetry={() => {}} />);

  it("AI 오류·지연·연결 실패에만 보인다", () => {
    expect(withRetry({ status: "error", code: "AI_FAILED" })).toContain("다시 시도");
    expect(withRetry({ status: "error", code: "AI_TIMEOUT" })).toContain("다시 시도");
    expect(withRetry({ status: "network-error" })).toContain("다시 시도");
  });

  it("막힘·추천 없음·입력 오류에는 보이지 않는다(같은 입력으로는 결과가 같기 때문)", () => {
    expect(withRetry({ status: "blocked", reason: "pain" })).not.toContain("다시 시도");
    expect(withRetry({ status: "empty" })).not.toContain("다시 시도");
    expect(withRetry({ status: "error", code: "INVALID_INPUT", issues: [] })).not.toContain("다시 시도");
  });

  it("요청 중에는 눌리지 않는다", () => {
    const html = renderToStaticMarkup(
      <ResultList result={{ status: "network-error" }} pending onBack={() => {}} onRetry={() => {}} />,
    );
    expect(html).toMatch(/<button[^>]*disabled[^>]*>불러오는 중/);
  });
});
