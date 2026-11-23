// Design Ref: §3.3 화면별 확인 목록, §11 시험 계획 — 공통 틀과 세 화면(시작, 유형, 입력) 시험.
// 클릭으로 화면이 바뀌는 동작은 브라우저에서 직접 확인하고, 여기서는 각 화면의 모습을 확인한다.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home from "../app/page";
import RootLayout from "../app/layout";
import { FORBIDDEN_TERMS } from "../lib/constants";
import { EMPTY_INTAKE, type IntakeState } from "../lib/intake";
import {
  NOTICE_AI_TRANSMISSION,
  NOTICE_NOT_MEDICAL,
  NOTICE_PROTOTYPE,
  SERVICE_NAME,
  SERVICE_TAGLINE,
} from "../lib/notices";
import { AiTransmissionNotice, CommonNotices } from "./Disclaimer";
import { DetailsStep } from "./DetailsStep";
import { HeroStep } from "./HeroStep";
import { TypeStep } from "./TypeStep";

function count(text: string, part: string): number {
  return text.split(part).length - 1;
}

function textOf(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

// 공통 틀 안에 첫 화면을 넣은, 실제 사용자가 처음 보는 전체 화면
function fullPage(): string {
  return renderToStaticMarkup(
    // LayoutProps는 Next가 만들어 주는 전역 타입이라 시험에서는 children만 넘긴다.
    <RootLayout {...({ children: <Home /> } as Parameters<typeof RootLayout>[0])} />,
  );
}

const noop = () => {};

function details(intake: IntakeState): string {
  return renderToStaticMarkup(
    <DetailsStep
      intake={intake}
      issues={[]}
      pending={false}
      onChange={noop}
      onTogglePart={noop}
      onSubmit={noop}
      onBack={noop}
      onChangeType={noop}
    />,
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
    expect(renderToStaticMarkup(<AiTransmissionNotice />)).toContain(NOTICE_AI_TRANSMISSION);
  });
});

describe("처음 화면(공통 틀 + 시작 화면)", () => {
  const html = fullPage();
  const text = textOf(html);

  it("한국어 문서이고 서비스 이름과 한 줄 소개가 보인다", () => {
    expect(html).toContain('lang="ko"');
    expect(html).toContain(SERVICE_NAME);
    expect(html).toContain(SERVICE_TAGLINE);
  });

  it("공통 안내 2종이 한 번씩만 나온다", () => {
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

  it("제목과 [시작하기] 버튼이 있고, 입력 칸은 아직 없다", () => {
    expect(text).toContain("내 상태에 맞는");
    expect(text).toContain("부상 예방·회복 운동");
    expect(text).toContain("시작하기");
    expect(html).toContain("<button");
    expect(count(html, 'type="radio"')).toBe(0);
    expect(count(html, 'type="checkbox"')).toBe(0);
    expect(count(html, 'type="range"')).toBe(0);
  });

  it("손을 그리는 캔버스가 있고 화면 읽기 도구에서는 숨겨져 있다", () => {
    expect(html).toMatch(/<canvas[^>]*aria-hidden="true"/);
  });

  it("지원 종목 5개가 한 줄로 보인다", () => {
    for (const sport of ["축구", "농구", "배구", "야구", "헬스"]) {
      expect(text, sport).toContain(sport);
    }
  });

  it("화면 문장에 금지 표현(진단·처방·효과 보장)이 없다", () => {
    for (const term of FORBIDDEN_TERMS) {
      expect(html, `금지 표현 "${term}"`).not.toContain(term);
    }
  });
});

describe("왼쪽 위 [처음으로]·[참고] 버튼", () => {
  it("공통 틀에 [처음으로] 링크와 [참고] 버튼이 함께 있다", () => {
    const html = fullPage();
    expect(html).toMatch(/<a[^>]*href="\/"[^>]*>(?:<span[^>]*>⌂<\/span>)?처음으로<\/a>/);
    expect(textOf(html)).toContain("참고");
  });
});

describe("시작 화면", () => {
  it("[시작하기]는 눌러서 쓰는 버튼이다", () => {
    const html = renderToStaticMarkup(<HeroStep onStart={noop} />);
    expect(html).toMatch(/<button[^>]*type="button"[^>]*>시작하기<\/button>/);
  });
});

describe("유형 고르기 화면", () => {
  it("예방형·회복형 카드 두 개와 [처음으로] 버튼이 있다", () => {
    const html = renderToStaticMarkup(
      <TypeStep selected={null} onSelect={noop} onBack={noop} />,
    );
    const text = textOf(html);
    expect(text).toContain("어떤 운동이 필요하세요?");
    expect(text).toContain("예방형");
    expect(text).toContain("회복형");
    expect(count(html, 'aria-pressed="false"')).toBe(2);
    expect(text).toContain("처음으로");
  });

  it("고른 유형은 눌린 상태로 표시된다", () => {
    const html = renderToStaticMarkup(
      <TypeStep selected="회복형" onSelect={noop} onBack={noop} />,
    );
    expect(count(html, 'aria-pressed="true"')).toBe(1);
    expect(count(html, 'aria-pressed="false"')).toBe(1);
  });
});

describe("나머지 입력 화면", () => {
  it("처음에는 종목 5개(라디오)와 부위 3개(체크박스)만 보인다", () => {
    const html = details({ ...EMPTY_INTAKE, userType: "예방형" });
    expect(count(html, 'type="radio"')).toBe(5);
    expect(count(html, 'type="checkbox"')).toBe(3);
    expect(count(html, 'type="range"')).toBe(0);
    const text = textOf(html);
    expect(text).toContain("나머지 정보를 알려 주세요");
    expect(text).toContain("추천받기");
    expect(text).not.toContain("통증은 어느 정도인가요?");
    expect(text).not.toContain("체중을 싣기 어려운가요?");
    expect(text).not.toContain("운동해도 된다는 안내를 받았나요?");
  });

  it("선택한 유형이 위에 표시된다", () => {
    const text = textOf(details({ ...EMPTY_INTAKE, userType: "회복형" }));
    expect(text).toContain("선택한 유형");
    expect(text).toContain("회복형");
  });

  it("회복형이면 치료 후 운동 허가 질문(예/아니오)이 추가된다", () => {
    const html = details({ ...EMPTY_INTAKE, userType: "회복형" });
    expect(textOf(html)).toContain("운동해도 된다는 안내를 받았나요?");
    expect(count(html, 'type="radio"')).toBe(7);
  });

  it("어깨를 고르면 통증 슬라이더만 나오고 체중 질문은 나오지 않는다", () => {
    const html = details({
      ...EMPTY_INTAKE,
      userType: "예방형",
      selectedParts: ["어깨"],
    });
    expect(count(html, 'type="range"')).toBe(1);
    expect(textOf(html)).toContain("통증은 어느 정도인가요?");
    expect(textOf(html)).not.toContain("체중을 싣기 어려운가요?");
  });

  it("발목이나 무릎을 고르면 부위마다 슬라이더와 체중 질문이 나온다", () => {
    const html = details({
      ...EMPTY_INTAKE,
      userType: "예방형",
      selectedParts: ["발목", "무릎"],
      pains: { 발목: 2, 무릎: 7 },
    });
    expect(count(html, 'type="range"')).toBe(2);
    expect(textOf(html)).toContain("7점");
    expect(textOf(html)).toContain("체중을 싣기 어려운가요?");
    expect(count(html, 'type="radio"')).toBe(7);
  });

  it("빠진 항목 안내가 있으면 경고 영역에 보인다", () => {
    const html = renderToStaticMarkup(
      <DetailsStep
        intake={{ ...EMPTY_INTAKE, userType: "예방형" }}
        issues={[{ field: "sport", message: "종목을 선택해 주세요." }]}
        pending={false}
        onChange={noop}
        onTogglePart={noop}
        onSubmit={noop}
        onBack={noop}
        onChangeType={noop}
      />,
    );
    expect(html).toContain('role="alert"');
    expect(textOf(html)).toContain("종목을 선택해 주세요.");
  });

  it("요청 중에는 버튼이 눌리지 않고 문구가 바뀐다", () => {
    const html = renderToStaticMarkup(
      <DetailsStep
        intake={{ ...EMPTY_INTAKE, userType: "예방형" }}
        issues={[]}
        pending
        onChange={noop}
        onTogglePart={noop}
        onSubmit={noop}
        onBack={noop}
        onChangeType={noop}
      />,
    );
    expect(textOf(html)).toContain("불러오는 중...");
    expect(html).toMatch(/<button[^>]*disabled[^>]*>불러오는 중/);
  });
});
