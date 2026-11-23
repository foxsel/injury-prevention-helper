// Design Ref: §3.1 `/` 첫 화면 — 서비스 소개와 AI 전송 안내.
// 입력 영역과 결과 영역은 PLAN 7번 이후에 이 화면에 이어서 붙인다.

import { AiTransmissionNotice } from "../components/Disclaimer";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8">
      <section aria-labelledby="intro-heading" className="flex flex-col gap-3">
        <h1 id="intro-heading" className="text-2xl font-bold leading-snug">
          내 상태에 맞는 부상 예방·회복 운동을 찾아보세요
        </h1>
        <p className="leading-7 text-zinc-700 dark:text-zinc-300">
          종목과 아픈 부위, 통증 정도를 알려 주시면 미리 정리해 둔 예방·회복 운동
          중에서 알맞은 운동을 골라 방법과 주의사항을 함께 안내합니다. 로그인 없이
          바로 사용할 수 있습니다.
        </p>
      </section>

      <section aria-labelledby="how-heading" className="flex flex-col gap-3">
        <h2 id="how-heading" className="text-lg font-semibold">
          이렇게 사용해요
        </h2>
        <ol className="flex list-decimal flex-col gap-2 pl-6 leading-7 text-zinc-700 dark:text-zinc-300">
          <li>예방형(아직 다치지 않았어요)인지 회복형(치료 후 회복 중이에요)인지 고릅니다.</li>
          <li>종목과 부위를 고르고, 부위마다 통증이 어느 정도인지 알려 줍니다.</li>
          <li>추천된 운동을 확인하고, 운동마다 방법과 주의사항, 중단 기준을 살펴봅니다.</li>
        </ol>
      </section>

      <section aria-labelledby="safety-heading" className="flex flex-col gap-3">
        <h2 id="safety-heading" className="text-lg font-semibold">
          안전하게 이용하려면
        </h2>
        <ul className="flex list-disc flex-col gap-2 pl-6 leading-7 text-zinc-700 dark:text-zinc-300">
          <li>통증이 높거나 발을 딛기 어려울 때는 운동 대신 전문가(병원) 상담을 권합니다.</li>
          <li>운동 중 통증이 6점 이상이거나 운동 전보다 심해지면 즉시 멈추세요.</li>
          <li>이 서비스는 병명을 알려 주거나 치료를 대신하지 않는 참고용 안내입니다.</li>
        </ul>
      </section>

      <AiTransmissionNotice />
    </main>
  );
}
