// Design Ref: §3.3 화면별 확인 목록(첫 화면), §11 시험 계획 — 공통 틀과 첫 화면 시험.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home from "../app/page";
import RootLayout from "../app/layout";
import { FORBIDDEN_TERMS } from "../lib/constants";
import {
  NOTICE_AI_TRANSMISSION,
  NOTICE_NOT_MEDICAL,
  NOTICE_PROTOTYPE,
  SERVICE_NAME,
  SERVICE_TAGLINE,
} from "../lib/notices";
import { AiTransmissionNotice, CommonNotices } from "./Disclaimer";

function count(text: string, part: string): number {
  return text.split(part).length - 1;
}

// 공통 틀 안에 첫 화면을 넣은, 실제 사용자가 보는 전체 화면
function fullPage(): string {
  return renderToStaticMarkup(
    // LayoutProps는 Next가 만들어 주는 전역 타입이라 시험에서는 children만 넘긴다.
    <RootLayout {...({ children: <Home /> } as Parameters<typeof RootLayout>[0])} />,
  );
}

describe("고정 문구는 PRD 원문과 같다", () => {
  it("공통 안내 문구 2종", () => {
    expect(NOTICE_NOT_MEDICAL).toBe("의료 행위를 대신하지 않습니다");
    expect(NOTICE_PROTOTYPE).toBe("전문가 검토 전 시제품입니다");
  });

  it("AI 전송 안내 문구", () => {
    expect(NOTICE_AI_TRANSMISSION).toBe(
      "입력한 내용(종목·부위·통증 점수)은 AI 서비스로 전송되어 답변을 만드는 데 사용됩니다",
    );
  });
});

describe("안내 문구 컴포넌트", () => {
  it("공통 안내 2종이 모두 보인다", () => {
    const html = renderToStaticMarkup(<CommonNotices />);
    expect(html).toContain(NOTICE_NOT_MEDICAL);
    expect(html).toContain(NOTICE_PROTOTYPE);
    expect(html).not.toContain(NOTICE_AI_TRANSMISSION);
  });

  it("AI 전송 안내가 보인다", () => {
    const html = renderToStaticMarkup(<AiTransmissionNotice />);
    expect(html).toContain(NOTICE_AI_TRANSMISSION);
  });
});

describe("전체 화면(공통 틀 + 첫 화면)", () => {
  const html = fullPage();

  it("한국어 문서이고 서비스 이름과 한 줄 소개가 보인다", () => {
    expect(html).toContain('lang="ko"');
    expect(html).toContain(SERVICE_NAME);
    expect(html).toContain(SERVICE_TAGLINE);
  });

  it("공통 안내 2종이 한 화면에 한 번씩만 나온다", () => {
    expect(count(html, NOTICE_NOT_MEDICAL)).toBe(1);
    expect(count(html, NOTICE_PROTOTYPE)).toBe(1);
  });

  it("AI 전송 안내가 첫 화면에 한 번만 나온다", () => {
    expect(count(html, NOTICE_AI_TRANSMISSION)).toBe(1);
  });

  it("공통 틀만 그리면 AI 전송 안내는 나오지 않는다(첫 화면에만 보이도록)", () => {
    const layoutOnly = renderToStaticMarkup(
      <RootLayout {...({ children: null } as Parameters<typeof RootLayout>[0])} />,
    );
    expect(layoutOnly).toContain(NOTICE_NOT_MEDICAL);
    expect(layoutOnly).not.toContain(NOTICE_AI_TRANSMISSION);
  });

  it("서비스 소개, 이용 방법 3단계, 안전 안내 영역이 있다", () => {
    // 제목 안에 강조(<span>)가 섞여 있으므로 태그를 뺀 글자로 확인한다.
    const text = html.replace(/<[^>]*>/g, "");
    expect(text).toContain("내 상태에 맞는 부상 예방·회복 운동을 찾아보세요");
    expect(text).toContain("이렇게 사용해요");
    expect(text).toContain("유형 고르기");
    expect(text).toContain("종목·부위·통증 알려주기");
    expect(text).toContain("추천 운동 확인하기");
    expect(text).toContain("안전하게 이용하려면");
  });

  it("화면 문장에 금지 표현(진단·처방·효과 보장)이 없다", () => {
    for (const term of FORBIDDEN_TERMS) {
      expect(html, `금지 표현 "${term}"`).not.toContain(term);
    }
  });
});
