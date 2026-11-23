// Design Ref: PRD nice "진행 기록 화면" — 기록 저장·불러오기·통증 안내 규칙 시험.
import { describe, expect, it } from "vitest";
import { PAIN_BLOCK_THRESHOLD } from "./constants";
import {
  MAX_LOG_ENTRIES,
  addEntry,
  describeChange,
  groupByDate,
  localDate,
  makeEntry,
  parseLog,
  previousPain,
  removeEntry,
  serializeLog,
  shouldAdviseStop,
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

describe("통증 변화와 날짜별 묶음", () => {
  const e1 = makeEntry("a", 0, 5, at("2026-11-21T09:00:00"));
  const e2 = makeEntry("a", 0, 3, at("2026-11-22T09:00:00"));
  const e3 = makeEntry("b", 0, 7, at("2026-11-22T10:00:00"));
  const e4 = makeEntry("a", 0, 3, at("2026-11-23T09:00:00"));
  const all = [e1, e2, e3, e4];

  it("같은 운동의 바로 이전 기록과 비교한다", () => {
    expect(previousPain(all, e1)).toBeNull();
    expect(previousPain(all, e2)).toBe(5);
    expect(previousPain(all, e3)).toBeNull();
    expect(previousPain(all, e4)).toBe(3);
  });

  it("변화 문장은 숫자 차이만 말하고 판단하지 않는다", () => {
    expect(describeChange(5, null)).toBe("첫 기록");
    expect(describeChange(3, 5)).toBe("지난 기록보다 2점 낮음");
    expect(describeChange(6, 4)).toBe("지난 기록보다 2점 높음");
    expect(describeChange(4, 4)).toBe("지난 기록과 같음");
  });

  it("날짜별로 묶고 최근 날짜·최근 기록이 위에 온다", () => {
    const days = groupByDate(all);
    expect(days.map((d) => d.date)).toEqual(["2026-11-23", "2026-11-22", "2026-11-21"]);
    expect(days[1].entries.map((e) => e.exerciseId)).toEqual(["b", "a"]);
  });
});
