// Design Ref: 첫 화면 — 큰 제목, 한 줄 설명, [시작하기] 버튼(무지개 빛), 아래쪽 안내.
// 점으로 그린 손은 Flow가 이 화면 뒤에 깔아 둔다. 글이 있는 곳은 점을 비워 두므로 글이 겹치지 않는다.

import { SPORTS } from "../lib/constants";
import { AiTransmissionNotice } from "./Disclaimer";

export function HeroStep({ onStart }: { onStart: () => void }) {
  return (
    <section
      aria-labelledby="step-heading"
      className="relative flex flex-1 flex-col"
    >
      <div className="absolute left-1/2 top-[22%] w-[min(92vw,720px)] -translate-x-1/2 text-center">
        <h1
          id="step-heading"
          tabIndex={-1}
          className="text-[clamp(36px,5vw,64px)] font-medium leading-[1.1] tracking-[-0.035em] outline-none"
        >
          <span className="block text-faint">내 상태에 맞는</span>
          <span className="block">부상 예방·회복 운동</span>
        </h1>
        <p className="mx-auto mt-5 max-w-[22rem] text-[clamp(14px,1.1vw,16px)] leading-6 text-muted">
          종목과 부위, 통증 정도를 알려 주시면 알맞은 운동의 방법과 주의사항을 안내해 드려요.
        </p>
        <div className="cta-glow mt-[clamp(28px,3.6vw,48px)]">
          <button
            type="button"
            onClick={onStart}
            className="relative z-10 rounded-full bg-accent px-8 py-3.5 text-[15px] font-medium text-on-accent transition hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
          >
            시작하기
          </button>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-[clamp(20px,5vh,48px)] flex flex-col items-center gap-3 px-4 text-center">
        <p className="text-[clamp(13px,1.1vw,15px)] font-medium text-faint">
          {SPORTS.join("  ·  ")}
        </p>
        <p className="max-w-[34rem] text-xs leading-5 text-muted">
          통증이 높거나 발을 딛기 어려울 땐 운동 대신 전문가(병원) 상담을 권해요.
        </p>
        <AiTransmissionNotice />
      </div>
    </section>
  );
}
