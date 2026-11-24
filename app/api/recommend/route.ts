// Design Ref: §6 API 명세 — POST /api/recommend (서버 전용 추천 API)
// 실제 처리는 lib/recommend.ts가 하고, 이 파일은 요청을 받아 넘기고 응답을 돌려주는 얇은 껍데기다.

import { pickExerciseIds } from "../../../lib/ai";
import { MAX_REQUEST_BYTES } from "../../../lib/constants";
import { handleRecommend } from "../../../lib/recommend";

// AI 호출 제한 시간(15초)보다 넉넉하게 잡는다. (배포 환경이 이 값을 참고한다)
export const maxDuration = 30;

// 건강 정보가 담긴 응답이므로 어디에도 저장(캐시)하지 않는다.
const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  // 우리 화면은 항상 JSON으로 보낸다. 다른 형식(예: 다른 사이트가 사전 확인 없이 보내는 text/plain)은
  // AI를 부르기 전에 거절해, 남의 사이트가 방문자 브라우저로 몰래 호출하는 길을 막는다.
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return Response.json(
      {
        status: "error",
        code: "INVALID_INPUT",
        issues: [{ field: "", message: "요청 형식이 올바르지 않습니다." }],
      },
      { status: 415, headers: NO_STORE },
    );
  }

  // 본문을 읽기 전에 선언된 크기부터 확인한다.
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return Response.json(
      {
        status: "error",
        code: "INVALID_INPUT",
        issues: [{ field: "", message: "요청이 너무 큽니다." }],
      },
      { status: 400, headers: NO_STORE },
    );
  }

  const rawBody = await request.text();
  const { httpStatus, body } = await handleRecommend(rawBody, pickExerciseIds);
  return Response.json(body, { status: httpStatus, headers: NO_STORE });
}
