// Design Ref: PRD "종목별 맞춤" — 종목별 주요 부위 표와 정렬 규칙 시험.
import { describe, expect, it } from "vitest";
import { BODY_PARTS, FORBIDDEN_TERMS, SPORTS } from "./constants";
import { EXERCISES } from "./exercises/data";
import { focusHint, isSportFocus, SPORT_FOCUS, sortBySportFocus } from "./sportFocus";

describe("종목별 주요 부위 표", () => {
  it("모든 종목에 지원하는 부위만 1개 이상 들어 있다", () => {
    for (const sport of SPORTS) {
      expect(SPORT_FOCUS[sport].length).toBeGreaterThanOrEqual(1);
      for (const part of SPORT_FOCUS[sport]) expect(BODY_PARTS).toContain(part);
    }
  });

  it("안내 문장에 금지 표현(진단·처방·효과 보장)이 없다", () => {
    for (const sport of SPORTS) {
      for (const term of FORBIDDEN_TERMS) expect(focusHint(sport)).not.toContain(term);
    }
  });
});

describe("주요 부위 운동을 앞에 두는 정렬", () => {
  const ankle = { id: "a", bodyParts: ["발목" as const] };
  const knee = { id: "k", bodyParts: ["무릎" as const] };
  const shoulder = { id: "s", bodyParts: ["어깨" as const] };

  it("야구는 어깨 운동이 앞에 온다", () => {
    expect(sortBySportFocus([ankle, knee, shoulder], "야구").map((e) => e.id)).toEqual(["s", "a", "k"]);
  });

  it("개수와 내용은 그대로이고, 같은 순번은 원래 순서를 지킨다", () => {
    const input = [shoulder, knee, ankle];
    const out = sortBySportFocus(input, "축구");
    expect(out).toHaveLength(3);
    expect(out.map((e) => e.id)).toEqual(["a", "k", "s"]); // 축구: 발목 → 무릎 → (주요 부위 아님) 어깨
    expect(input.map((e) => e.id)).toEqual(["s", "k", "a"]); // 원본은 바뀌지 않는다
  });

  it("여러 부위를 다루는 운동은 가장 앞선 주요 부위로 순서를 정한다", () => {
    const both = { id: "b", bodyParts: ["무릎" as const, "어깨" as const] };
    expect(sortBySportFocus([knee, both], "야구").map((e) => e.id)).toEqual(["b", "k"]);
  });

  it("실제 운동 목록에서도 모든 운동이 사라지지 않는다", () => {
    for (const sport of SPORTS) {
      expect(sortBySportFocus(EXERCISES, sport)).toHaveLength(EXERCISES.length);
    }
  });

  it("isSportFocus: 주요 부위가 아니면 false", () => {
    expect(isSportFocus(shoulder, "축구")).toBe(false);
    expect(isSportFocus(ankle, "축구")).toBe(true);
  });
});
