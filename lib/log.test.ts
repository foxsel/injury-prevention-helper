// Design Ref: PRD nice "진행 기록 화면" — 기록 저장·불러오기·통증 안내 규칙 시험.
import { describe, expect, it } from "vitest";
import { PAIN_BLOCK_THRESHOLD } from "./constants";
import {
  MAX_LOG_ENTRIES,
  addEntry,
  localDate,
  makeEntry,
  parseLog,
  removeEntry,
  serializeLog,
  shouldAdviseStop,
  summariesForPart,
  summarizeByExercise,
} from "./log";
import { FORBIDDEN_TERMS } from "./constants";
import { LOG_MESSAGES } from "./notices";

const at = (iso: string) => new Date(iso);

describe("통증 안내 기준", () => {
  it("6점 이상이면 중단·상담을 안내하고 5점까지는 안내하지 않는다", () => {
    expect(PAIN_BLOCK_THRESHOLD).toBe(6);
    expect(shouldAdviseStop(5)).toBe(false);
    expect(shouldAdviseStop(6)).toBe(true);
    expect(shouldAdviseStop(10)).toBe(true);
  });

  it("안내 문구에 상담이 들어 있고 금지 표현이 없다", () => {
    expect(LOG_MESSAGES.stop).toContain("전문가(병원) 상담");
    expect(LOG_MESSAGES.stop).toContain(String(PAIN_BLOCK_THRESHOLD));
    for (const text of Object.values(LOG_MESSAGES)) {
      for (const term of FORBIDDEN_TERMS) expect(text).not.toContain(term);
    }
  });

  it("저장 안내에 브라우저에만 저장되고 서버로 보내지 않는다고 적혀 있다", () => {
    expect(LOG_MESSAGES.storage).toContain("브라우저에만 저장");
    expect(LOG_MESSAGES.storage).toContain("서버로 보내지 않습니다");
  });
});

describe("기록 만들기·저장 글자", () => {
  it("기록에는 운동 번호·날짜·운동 전후 통증·시각만 담긴다", () => {
    const e = makeEntry("ankle-01", 0, 3, at("2026-11-23T10:00:00"));
    expect(Object.keys(e).sort()).toEqual(["at", "date", "exerciseId", "id", "pain", "painBefore"]);
    expect(e.date).toBe("2026-11-23");
    expect(localDate(at("2026-01-05T23:59:00"))).toBe("2026-01-05");
  });

  it("저장했다가 다시 읽으면 같은 기록이 나온다", () => {
    const entries = addEntry([], makeEntry("a", 0, 2, at("2026-11-23T10:00:00")));
    expect(parseLog(serializeLog(entries))).toEqual(entries);
  });

  it("비었거나 깨진 저장 글자는 빈 목록이 된다", () => {
    expect(parseLog(null)).toEqual([]);
    expect(parseLog("")).toEqual([]);
    expect(parseLog("{깨짐")).toEqual([]);
    expect(parseLog('{"a":1}')).toEqual([]);
  });

  it("모양이 틀린 기록(통증 범위 밖·소수·날짜 형식)은 버리고 맞는 것만 남긴다", () => {
    const good = makeEntry("a", 0, 4, at("2026-11-23T10:00:00"));
    const raw = JSON.stringify([
      good,
      { ...good, id: "x1", pain: 11 },
      { ...good, id: "x2", pain: 2.5 },
      { ...good, id: "x3", pain: -1 },
      { ...good, id: "x4", date: "11/23" },
      { ...good, id: "x5", exerciseId: 5 },
      null,
    ]);
    expect(parseLog(raw)).toEqual([good]);
  });

  it("기록은 최근 것만 한도까지 남긴다", () => {
    let entries = parseLog(null);
    for (let i = 0; i < MAX_LOG_ENTRIES + 20; i++) {
      entries = addEntry(entries, makeEntry("a", 0, 1, new Date(2026, 0, 1, 0, 0, i)));
    }
    expect(entries).toHaveLength(MAX_LOG_ENTRIES);
    expect(entries[entries.length - 1].at).toBe(new Date(2026, 0, 1, 0, 0, MAX_LOG_ENTRIES + 19).getTime());
  });

  it("기록을 하나 지운다", () => {
    const a = makeEntry("a", 0, 1, at("2026-11-23T10:00:00"));
    const b = makeEntry("b", 0, 2, at("2026-11-23T11:00:00"));
    expect(removeEntry([a, b], a.id)).toEqual([b]);
  });
});

describe("운동별 요약(기록 첫 화면)", () => {
  const e1 = makeEntry("a", 0, 5, at("2026-11-21T09:00:00"));
  const e2 = makeEntry("b", 0, 7, at("2026-11-22T10:00:00"));
  const e3 = makeEntry("a", 0, 3, at("2026-11-23T09:00:00"));
  const e4 = makeEntry("a", 0, 2, at("2026-11-23T18:00:00"));

  it("같은 운동은 하나로 묶고 기록 개수와 가장 최근 날짜를 알려 준다", () => {
    const list = summarizeByExercise([e1, e2, e3, e4]);
    expect(list).toHaveLength(2);
    expect(list.find((x) => x.exerciseId === "a")).toEqual({ exerciseId: "a", count: 3, lastDate: "2026-11-23" });
    expect(list.find((x) => x.exerciseId === "b")).toEqual({ exerciseId: "b", count: 1, lastDate: "2026-11-22" });
  });

  it("가장 최근에 기록한 운동이 위에 온다", () => {
    expect(summarizeByExercise([e1, e2]).map((x) => x.exerciseId)).toEqual(["b", "a"]);
    expect(summarizeByExercise([e1, e2, e3]).map((x) => x.exerciseId)).toEqual(["a", "b"]);
  });

  it("기록 순서가 섞여 들어와도 가장 최근 날짜를 고른다", () => {
    expect(summarizeByExercise([e4, e1, e3])[0].lastDate).toBe("2026-11-23");
  });

  it("기록이 없으면 빈 목록", () => {
    expect(summarizeByExercise([])).toEqual([]);
  });
});

describe("부위 탭", () => {
  const parts: Record<string, ("발목" | "무릎" | "어깨")[]> = {
    a: ["발목"],
    b: ["발목", "무릎"],
    c: ["어깨"],
  };
  const partsOf = (id: string) => parts[id] ?? [];
  const list = summarizeByExercise([
    makeEntry("a", 0, 1, at("2026-11-21T09:00:00")),
    makeEntry("b", 0, 1, at("2026-11-22T09:00:00")),
    makeEntry("c", 0, 1, at("2026-11-23T09:00:00")),
    makeEntry("zzz", 0, 1, at("2026-11-24T09:00:00")),
  ]);

  it("전체(null)는 모든 운동이다", () => {
    expect(summariesForPart(list, null, partsOf)).toHaveLength(4);
  });

  it("부위를 고르면 그 부위를 다루는 운동만 남는다(여러 부위 운동은 각 탭에 모두 나온다)", () => {
    expect(summariesForPart(list, "발목", partsOf).map((x) => x.exerciseId).sort()).toEqual(["a", "b"]);
    expect(summariesForPart(list, "무릎", partsOf).map((x) => x.exerciseId)).toEqual(["b"]);
    expect(summariesForPart(list, "어깨", partsOf).map((x) => x.exerciseId)).toEqual(["c"]);
  });

  it("목록에 없는 운동(부위를 모르는 운동)은 전체에만 나온다", () => {
    for (const part of ["발목", "무릎", "어깨"] as const) {
      expect(summariesForPart(list, part, partsOf).some((x) => x.exerciseId === "zzz")).toBe(false);
    }
  });

  it("기록이 없는 부위는 빈 목록", () => {
    expect(summariesForPart([], "무릎", partsOf)).toEqual([]);
  });
});
