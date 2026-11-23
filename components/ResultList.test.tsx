// Design Ref: §11 시험 계획 — 결과 화면(카드 한 줄)과 안내 문구, 오류 안내를 확인한다.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EXERCISES } from "../lib/exercises/data";
import { BLOCK_MESSAGES, NOTICE_NOT_MEDICAL, NOTICE_PROTOTYPE, RESULT_MESSAGES } from "../lib/notices";
import { commonStopCriteria, rel, virtualCount } from "./ExerciseCarousel";
import { ResultList } from "./ResultList";

const render = (result: Parameters<typeof ResultList>[0]["result"]) =>
  renderToStaticMarkup(<ResultList result={result} onBack={() => {}} />);

describe("추천 결과 화면(카드 한 줄)", () => {
  const list = EXERCISES.slice(0, 4);
  const html = render({ status: "ok", exercises: list });

  it("카드마다 운동 이름이 보이고 좌우 이동 버튼이 있다", () => {
    for (const e of list) expect(html).toContain(e.name);
    expect(html).toContain('aria-label="이전 운동"');
    expect(html).toContain('aria-label="다음 운동"');
  });

  it("카드에는 상세 내용(방법·횟수)이 보이지 않는다", () => {
    expect(html).not.toContain("하는 방법");
    expect(html).not.toContain(list[0].steps[0]);
  });

  it("공통 주의사항과 안내 문구 2종이 카드 화면에 보인다", () => {
    const common = commonStopCriteria(list);
    expect(common.length).toBeGreaterThan(0);
    for (const c of common) expect(html).toContain(c);
    expect(html).toContain(NOTICE_NOT_MEDICAL);
    expect(html).toContain(NOTICE_PROTOTYPE);
  });
});

describe("선반 돌리기 계산", () => {
  it("가운데는 0이고 양옆은 -1·1이며 끝에서 이어진다", () => {
    expect(rel(0, 0, 24)).toBe(0);
    expect(rel(1, 0, 24)).toBe(1);
    expect(rel(23, 0, 24)).toBe(-1);
    expect(rel(12, 0, 24)).toBe(-12);
    expect(rel(0, 23, 24)).toBe(1);
  });

  it("가상 테이프 수는 운동 수의 배수이고 선반을 채울 만큼 많다", () => {
    for (const n of [1, 2, 3, 4, 5]) {
      const v = virtualCount(n);
      expect(v % n).toBe(0);
      expect(v).toBeGreaterThanOrEqual(24);
    }
  });
});

describe("막힘·비었음·오류 안내", () => {
  it("각각 알맞은 문구와 공통 안내 2종을 보여 준다", () => {
    expect(render({ status: "blocked", reason: "pain" })).toContain(BLOCK_MESSAGES.pain);
    expect(render({ status: "empty" })).toContain(RESULT_MESSAGES.empty);
    expect(render({ status: "network-error" })).toContain(RESULT_MESSAGES.network);
    expect(render({ status: "error", code: "AI_TIMEOUT" })).toContain(RESULT_MESSAGES.aiTimeout);
    expect(render({ status: "error", code: "AI_FAILED" })).toContain(RESULT_MESSAGES.aiFailed);
    const h = render({ status: "empty" });
    expect(h).toContain(NOTICE_NOT_MEDICAL);
    expect(h).toContain(NOTICE_PROTOTYPE);
  });
});
