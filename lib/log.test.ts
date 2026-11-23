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
  summarizeByExercisePart,
  logHref,
  partFromSlug,
  partSlug,
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
  it("기록에는 운동 번호·부위·날짜·운동 전후 통증·시각만 담긴다", () => {
    const e = makeEntry("ankle-01", "발목", 0, 3, at("2026-11-23T10:00:00"));
    expect(Object.keys(e).sort()).toEqual(["at", "date", "exerciseId", "id", "pain", "painBefore", "part"]);
    expect(e.date).toBe("2026-11-23");
    expect(localDate(at("2026-01-05T23:59:00"))).toBe("2026-01-05");
  });

  it("저장했다가 다시 읽으면 같은 기록이 나온다", () => {
    const entries = addEntry([], makeEntry("a", "발목", 0, 2, at("2026-11-23T10:00:00")));
    expect(parseLog(serializeLog(entries))).toEqual(entries);
  });

  it("비었거나 깨진 저장 글자는 빈 목록이 된다", () => {
    expect(parseLog(null)).toEqual([]);
    expect(parseLog("")).toEqual([]);
    expect(parseLog("{깨짐")).toEqual([]);
    expect(parseLog('{"a":1}')).toEqual([]);
  });

  it("모양이 틀린 기록(통증 범위 밖·소수·날짜 형식)은 버리고 맞는 것만 남긴다", () => {
    const good = makeEntry("a", "발목", 0, 4, at("2026-11-23T10:00:00"));
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
      entries = addEntry(entries, makeEntry("a", "발목", 0, 1, new Date(2026, 0, 1, 0, 0, i)));
    }
    expect(entries).toHaveLength(MAX_LOG_ENTRIES);
    expect(entries[entries.length - 1].at).toBe(new Date(2026, 0, 1, 0, 0, MAX_LOG_ENTRIES + 19).getTime());
  });

  it("기록을 하나 지운다", () => {
    const a = makeEntry("a", "발목", 0, 1, at("2026-11-23T10:00:00"));
    const b = makeEntry("b", "발목", 0, 2, at("2026-11-23T11:00:00"));
    expect(removeEntry([a, b], a.id)).toEqual([b]);
  });
});

describe("운동+부위별 요약(기록 첫 화면)", () => {
  const e1 = makeEntry("a", "발목", 0, 5, at("2026-11-21T09:00:00"));
  const e2 = makeEntry("b", "무릎", 0, 7, at("2026-11-22T10:00:00"));
  const e3 = makeEntry("a", "발목", 0, 3, at("2026-11-23T09:00:00"));
  const e4 = makeEntry("a", "발목", 0, 2, at("2026-11-23T18:00:00"));
  const e5 = makeEntry("a", "무릎", 0, 4, at("2026-11-24T09:00:00"));

  it("같은 운동·같은 부위는 하나로 묶고 기록 개수와 가장 최근 날짜를 알려 준다", () => {
    const list = summarizeByExercisePart([e1, e2, e3, e4]);
    expect(list).toHaveLength(2);
    expect(list.find((x) => x.exerciseId === "a")).toEqual({ exerciseId: "a", part: "발목", count: 3, lastDate: "2026-11-23" });
    expect(list.find((x) => x.exerciseId === "b")).toEqual({ exerciseId: "b", part: "무릎", count: 1, lastDate: "2026-11-22" });
  });

  it("같은 운동이어도 부위가 다르면 따로 묶는다", () => {
    const list = summarizeByExercisePart([e1, e3, e5]);
    expect(list).toHaveLength(2);
    expect(list.find((x) => x.part === "발목")?.count).toBe(2);
    expect(list.find((x) => x.part === "무릎")?.count).toBe(1);
  });

  it("가장 최근에 기록한 것이 위에 온다", () => {
    expect(summarizeByExercisePart([e1, e2]).map((x) => x.exerciseId)).toEqual(["b", "a"]);
    expect(summarizeByExercisePart([e1, e2, e3]).map((x) => x.exerciseId)).toEqual(["a", "b"]);
  });

  it("기록 순서가 섞여 들어와도 가장 최근 날짜를 고른다", () => {
    expect(summarizeByExercisePart([e4, e1, e3])[0].lastDate).toBe("2026-11-23");
  });

  it("기록이 없으면 빈 목록", () => {
    expect(summarizeByExercisePart([])).toEqual([]);
  });
});

describe("부위 탭", () => {
  const list = summarizeByExercisePart([
    makeEntry("a", "발목", 0, 1, at("2026-11-21T09:00:00")),
    makeEntry("b", "발목", 0, 1, at("2026-11-22T09:00:00")),
    makeEntry("b", "무릎", 0, 1, at("2026-11-22T10:00:00")),
    makeEntry("c", "어깨", 0, 1, at("2026-11-23T09:00:00")),
  ]);

  it("전체(null)는 모든 줄이다", () => {
    expect(summariesForPart(list, null)).toHaveLength(4);
  });

  it("부위를 고르면 그 부위의 기록만 남는다(같은 운동의 다른 부위 기록은 그 부위 탭에 따로 나온다)", () => {
    expect(summariesForPart(list, "발목").map((x) => x.exerciseId).sort()).toEqual(["a", "b"]);
    expect(summariesForPart(list, "무릎").map((x) => x.exerciseId)).toEqual(["b"]);
    expect(summariesForPart(list, "어깨").map((x) => x.exerciseId)).toEqual(["c"]);
  });

  it("기록이 없는 부위는 빈 목록", () => {
    expect(summariesForPart([], "무릎")).toEqual([]);
  });
});

describe("옛 기록(부위 없음) 불러오기", () => {
  const legacy = { id: "1-a", exerciseId: "a", date: "2026-11-21", painBefore: 2, pain: 3, at: 1 };

  it("부위를 알려 주는 함수가 있으면 그 운동의 첫 부위로 채운다", () => {
    const list = parseLog(JSON.stringify([legacy]), () => "무릎");
    expect(list).toEqual([{ ...legacy, part: "무릎" }]);
  });

  it("부위를 알 수 없으면 버린다", () => {
    expect(parseLog(JSON.stringify([legacy]))).toEqual([]);
    expect(parseLog(JSON.stringify([legacy]), () => undefined)).toEqual([]);
  });

  it("부위가 이미 있으면 그대로 두고, 잘못된 부위는 첫 부위로 바꾼다", () => {
    expect(parseLog(JSON.stringify([{ ...legacy, part: "어깨" }]), () => "무릎")[0].part).toBe("어깨");
    expect(parseLog(JSON.stringify([{ ...legacy, part: "허리" }]), () => "무릎")[0].part).toBe("무릎");
  });
});

describe("운동별 기록 주소", () => {
  it("부위 이름표는 영어이고 서로 다르며 되돌릴 수 있다", () => {
    expect(["발목", "무릎", "어깨"].map((p) => partSlug(p as "발목"))).toEqual(["ankle", "knee", "shoulder"]);
    expect(partFromSlug("knee")).toBe("무릎");
    expect(partFromSlug("nope")).toBeUndefined();
  });

  it("주소는 운동 번호와 부위 이름표로 만든다", () => {
    expect(logHref("ex-1", "어깨")).toBe("/log/ex-1/shoulder");
  });
});
