// Design Ref: §6 API 명세, §10 보안 — 추천 API가 JSON이 아닌 요청을 AI 호출 전에 거절하는지 확인한다.
// 아래 요청은 모두 AI를 부르기 전에 끝나므로 OpenAI 키 없이도 안전하게 시험할 수 있다.
import { describe, expect, it, vi } from "vitest";
import { POST } from "./route";

// 'server-only'는 서버 컴포넌트 환경이 아니면 불러올 때 오류를 내는 잠금이다. 시험 환경에서는 비워 둔다.
vi.mock("server-only", () => ({}));

function req(body: string, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/recommend", { method: "POST", body, headers });
}

describe("POST /api/recommend 요청 형식", () => {
  it("text/plain 요청은 415로 거절한다(다른 사이트의 몰래 호출 차단)", async () => {
    const res = await POST(req('{"a":1}', { "Content-Type": "text/plain" }));
    expect(res.status).toBe(415);
    expect(await res.json()).toMatchObject({ status: "error", code: "INVALID_INPUT" });
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("Content-Type이 없는 요청도 415로 거절한다", async () => {
    const res = await POST(new Request("http://localhost/api/recommend", { method: "POST", body: "{}" }));
    // Request는 문자열 본문에 text/plain을 자동으로 붙이므로 어느 쪽이든 JSON이 아니다.
    expect(res.status).toBe(415);
  });

  it("application/json이면 형식 검사를 통과해 입력 검사까지 간다(깨진 JSON은 400)", async () => {
    const res = await POST(req("{깨짐", { "Content-Type": "application/json" }));
    expect(res.status).toBe(400);
  });

  it("charset이 붙은 application/json도 받아들인다", async () => {
    const res = await POST(req("{깨짐", { "Content-Type": "application/json; charset=utf-8" }));
    expect(res.status).toBe(400); // 415가 아니라 입력 검사에서 막힌다
  });
});
