// Design Ref: §3.3 `/guide/[id]` 확인 목록 — 필수 정보와 안내 문구, 금지 표현 없음.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FORBIDDEN_TERMS, STOP_CRITERIA_TEXT } from "../lib/constants";
import { EXERCISES } from "../lib/exercises/data";
import { NOTICE_NOT_MEDICAL, NOTICE_PROTOTYPE } from "../lib/notices";
import { GuideView } from "./GuideView";

describe("운동 가이드 화면", () => {
  it("모든 운동에서 필수 정보와 안내 문구 2종이 보인다", () => {
    for (const e of EXERCISES) {
      const html = renderToStaticMarkup(<GuideView exercise={e} />);
      expect(html, e.id).toContain(e.name);
      expect(html, e.id).toContain(e.reps);
      expect(html, e.id).toContain(e.sets);
      for (const s of e.steps) expect(html).toContain(s);
      for (const c of e.cautions) expect(html).toContain(c);
      for (const c of e.stopCriteria) expect(html).toContain(c);
      expect(html).toContain(STOP_CRITERIA_TEXT);
      expect(html).toContain(NOTICE_NOT_MEDICAL);
      expect(html).toContain(NOTICE_PROTOTYPE);
      expect(html).toContain("추천 목록으로");
    }
  });

  it("화면 문장에 금지 표현이 없다", () => {
    for (const e of EXERCISES) {
      const html = renderToStaticMarkup(<GuideView exercise={e} />);
      for (const term of FORBIDDEN_TERMS) expect(html, `${e.id} ${term}`).not.toContain(term);
    }
  });
});
