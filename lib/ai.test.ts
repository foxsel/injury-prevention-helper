// Design Ref: §11 시험 계획 — AI 응답 읽기 시험. (실제 AI 호출은 이 시험에서 하지 않는다.)
import { describe, expect, it, vi } from "vitest";
import { parseAiIds } from "./ai";
import { AiFailedError } from "./aiErrors";

// 'server-only'는 서버 컴포넌트 환경이 아니면 불러올 때 오류를 내는 잠금이다. 시험 환경에서는 비워 둔다.
vi.mock("server-only", () => ({}));

describe("parseAiIds", () => {
  it("약속한 JSON에서 id 목록을 꺼낸다", () => {
    expect(parseAiIds('{"exercise_ids":["a","b"]}')).toEqual(["a", "b"]);
  });

  it("빈 목록도 그대로 돌려준다", () => {
    expect(parseAiIds('{"exercise_ids":[]}')).toEqual([]);
  });

  it("JSON이 아니면 AiFailedError", () => {
    expect(() => parseAiIds("추천은 이렇습니다")).toThrow(AiFailedError);
  });

  it("항목이 없거나 모양이 다르면 AiFailedError", () => {
    expect(() => parseAiIds("{}")).toThrow(AiFailedError);
    expect(() => parseAiIds('{"exercise_ids":"a"}')).toThrow(AiFailedError);
    expect(() => parseAiIds('{"exercise_ids":[1,2]}')).toThrow(AiFailedError);
  });
});
