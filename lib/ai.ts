// Design Ref: §4 데이터 흐름 ⑦·⑧, §6 API 명세, §10 보안 — AI 호출 (서버 전용).
// Plan SC: AI는 후보 목록의 운동 id만 고른다. 키는 .env(OPENAI_API_KEY)에서 서버 코드로만 읽는다.
//
// 이 파일은 서버 코드(추천 API)에서만 불러온다. 브라우저 코드가 불러오면 안 된다.
// 키 이름에 NEXT_PUBLIC_을 붙이지 않았으므로 브라우저에는 키가 전달되지 않는다.

// 서버 전용 잠금: 브라우저 코드가 이 파일을 불러오면 빌드가 실패해 키·OpenAI 도구가 화면 쪽에 섞이는 실수를 막는다.
import "server-only";
import OpenAI, { APIConnectionTimeoutError } from "openai";
import { z } from "zod";
import { MAX_RECOMMENDATIONS } from "./constants";
import { AiFailedError, AiTimeoutError } from "./aiErrors";
import type { Exercise } from "./exercises/types";
import type { RecommendRequest } from "./validate";

/** 기본 모델. 가볍고 빠른 모델이다. 필요하면 .env의 OPENAI_MODEL로 바꿀 수 있다. */
export const DEFAULT_MODEL = "gpt-4.1-mini";

/** AI 호출 제한 시간(밀리초). DESIGN 6번: 약 15초 */
export const AI_TIMEOUT_MS = 15_000;

/** 입력과 후보 운동을 받아 추천할 운동의 id를 돌려주는 함수의 모양 (시험에서 바꿔 끼울 수 있다) */
export type AiPicker = (
  request: RecommendRequest,
  candidates: Exercise[],
) => Promise<string[]>;

const answerSchema = z.object({
  exercise_ids: z.array(z.string()),
});

/**
 * AI가 돌려준 글자(JSON)를 읽어 운동 id 목록으로 바꾼다.
 * 약속한 모양이 아니면 AiFailedError를 던진다.
 */
export function parseAiIds(text: string): string[] {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new AiFailedError("AI 응답이 JSON이 아닙니다.");
  }
  const parsed = answerSchema.safeParse(json);
  if (!parsed.success) {
    throw new AiFailedError("AI 응답이 약속한 형식이 아닙니다.");
  }
  return parsed.data.exercise_ids;
}

// 오류 메시지에는 키의 일부가 들어 있을 수 있으므로 종류와 상태 번호만 기록한다.
function describeError(error: unknown): string {
  if (error instanceof OpenAI.APIError) {
    return `${error.name} status=${error.status ?? "없음"}`;
  }
  return error instanceof Error ? error.name : "알 수 없는 오류";
}

const INSTRUCTIONS = [
  "너는 운동 추천 도우미다. 사용자의 종목, 사용 유형, 부위별 통증을 보고 후보 운동 목록에서 알맞은 운동을 고른다.",
  `반드시 후보 목록에 있는 id만 골라야 하고, 최대 ${MAX_RECOMMENDATIONS}개까지만 고른다.`,
  "통증이 있는 부위의 운동을 먼저 고르고, 가장 알맞은 순서대로 나열한다.",
  "후보에 없는 운동을 만들어 내지 않는다. 설명은 쓰지 않고 지정된 JSON 형식으로만 답한다.",
].join("\n");

/**
 * OpenAI에 물어 후보 중 추천할 운동 id를 받는다.
 * AI에는 종목·부위·통증·유형과 후보의 id·이름만 보낸다. (PRD 7번, DESIGN 4번 ⑦)
 */
export const pickExerciseIds: AiPicker = async (request, candidates) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("[ai] OPENAI_API_KEY가 설정되어 있지 않습니다.");
    throw new AiFailedError("AI 설정이 없습니다.");
  }

  const client = new OpenAI({
    apiKey,
    timeout: AI_TIMEOUT_MS,
    maxRetries: 0, // 재시도로 제한 시간을 넘기지 않는다
  });

  const candidateIds = candidates.map((exercise) => exercise.id);

  const input = JSON.stringify({
    종목: request.sport,
    사용유형: request.userType,
    부위별통증: request.parts.map((entry) => ({ 부위: entry.part, 통증: entry.pain })),
    후보운동: candidates.map((exercise) => ({ id: exercise.id, 이름: exercise.name })),
  });

  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
      instructions: INSTRUCTIONS,
      input,
      store: false, // 입력 내용을 OpenAI 쪽에 대화 기록으로 남기지 않는다
      max_output_tokens: 500,
      text: {
        format: {
          type: "json_schema",
          name: "exercise_picks",
          strict: true,
          schema: {
            type: "object",
            properties: {
              exercise_ids: {
                type: "array",
                items: { type: "string", enum: candidateIds },
              },
            },
            required: ["exercise_ids"],
            additionalProperties: false,
          },
        },
      },
    });
    return parseAiIds(response.output_text);
  } catch (error) {
    if (error instanceof AiFailedError) {
      throw error;
    }
    if (error instanceof APIConnectionTimeoutError) {
      console.error("[ai] 호출 시간 초과");
      throw new AiTimeoutError();
    }
    console.error("[ai] 호출 실패:", describeError(error));
    throw new AiFailedError();
  }
};
