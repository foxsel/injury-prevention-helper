// Design Ref: §3.1 `/` 첫 화면 — 서비스 소개와 AI 전송 안내.
// 입력 영역과 결과 영역은 PLAN 7번 이후에 이 화면에 이어서 붙인다.

import { Card } from "../components/Card";
import { AiTransmissionNotice } from "../components/Disclaimer";
import {
  PainVisual,
  ResultVisual,
  StepCard,
  TypeVisual,
} from "../components/StepCard";

const SAFETY_TIPS = [
  "통증이 높거나 발을 딛기 어려울 때는 운동 대신 전문가(병원) 상담을 권합니다.",
  "운동 중 통증이 6점 이상이거나 운동 전보다 심해지면 즉시 멈추세요.",
  "이 서비스는 병명을 알려 주거나 치료를 대신하지 않는 참고용 안내입니다.",
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-10">
      <section aria-labelledby="intro-heading" className="flex flex-col gap-4">
        <h1
          id="intro-heading"
          className="max-w-2xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl"
        >
          내 상태에 맞는 <span className="text-accent">부상 예방·회복 운동</span>을
          찾아보세요
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-muted">
          종목과 아픈 부위, 통증 정도를 알려 주시면 미리 정리해 둔 예방·회복 운동
          중에서 알맞은 운동을 골라 방법과 주의사항을 함께 안내합니다. 로그인 없이
          바로 사용할 수 있습니다.
        </p>
      </section>

      <section aria-labelledby="how-heading" className="flex flex-col gap-4">
        <h2 id="how-heading" className="text-2xl font-bold">
          이렇게 사용해요
        </h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          <StepCard
            step={1}
            title="유형 고르기"
            description="아직 다치지 않았다면 예방형, 치료 후 회복 중이라면 회복형을 고릅니다."
            visual={<TypeVisual />}
          />
          <StepCard
            step={2}
            title="종목·부위·통증 알려주기"
            description="종목과 부위를 고르고, 부위마다 통증이 어느 정도인지 알려 줍니다."
            visual={<PainVisual />}
          />
          <StepCard
            step={3}
            title="추천 운동 확인하기"
            description="추천된 운동의 방법과 주의사항, 중단 기준을 살펴봅니다."
            visual={<ResultVisual />}
          />
        </ol>
      </section>

      <section aria-labelledby="safety-heading">
        <Card className="flex flex-col gap-4">
          <h2 id="safety-heading" className="text-2xl font-bold">
            안전하게 이용하려면
          </h2>
          <ul className="flex flex-col gap-3">
            {SAFETY_TIPS.map((tip) => (
              <li key={tip} className="flex items-start gap-3 leading-7">
                <span
                  aria-hidden="true"
                  className="mt-2 size-2.5 shrink-0 rounded-full bg-accent"
                />
                {tip}
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <AiTransmissionNotice />
    </main>
  );
}
