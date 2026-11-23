// Design Ref: §5 데이터 모델, §9 폴더 구조 — 미리 정리해 둔 운동 목록.
// Plan SC: AI는 이 목록에 있는 운동의 id만 고를 수 있고, 화면의 운동 문장은 모두 여기서 나온다.
//
// 작성 원칙 (PRD 7번)
// - 공개된 자료를 읽고 우리 말로 요약한다. 원문 문장을 그대로 옮기지 않는다.
// - 운동마다 참고한 자료를 source에 적는다. 근거를 찾지 못한 조합은 채우지 않는다.
// - 이 목록은 전문가 검토 전의 시제품 자료다.
//
// 현재 채워진 범위: 발목 회복 운동 4개 (모든 지원 종목에 공통)
// 아직 비어 있는 범위: 발목 예방, 무릎(예방·회복), 어깨(예방·회복)
//   → 근거 자료를 확인한 뒤 같은 형식으로 추가한다.

import { SPORTS, STOP_CRITERIA_TEXT } from "../constants";
import type { Exercise } from "./types";

// 참고 자료: 미국가정의학회(AAFP) 발목 염좌 환자 안내(2025).
// 횟수·세트·유지 시간은 이 안내의 수치를 따르고, 동작 설명 문장은 우리가 쓴 것이다.
const AAFP_ANKLE_SPRAIN = "AAFP 발목 염좌 환자 안내(2025)";

// 같은 안내에서 "다음 단계로 넘어가면 안 되는 경우"로 든 신호를 요약한 공통 주의사항
const ANKLE_HOLD_BACK_WARNING =
  "발목이 꺾이는 느낌이 들거나 같은 곳이 자꾸 붓거나 평소와 다른 통증이 있으면 더 어려운 단계로 넘어가지 않는다.";

// 같은 안내에서 "의사에게 연락해야 하는 경우"로 든 신호를 요약한 공통 중단 기준
const ANKLE_CONSULT_WARNING =
  "통증과 부기가 나아지지 않거나 발을 위아래로 움직이지 못하면 운동을 멈추고 의사에게 문의한다.";

export const EXERCISES: Exercise[] = [
  {
    id: "ankle-pump-circle-01",
    name: "발목 펌프와 발목 원 돌리기",
    sports: [...SPORTS],
    bodyParts: ["발목"],
    purpose: "회복",
    steps: [
      "앉거나 누워서 다리를 편하게 뻗는다.",
      "발끝을 몸 쪽으로 당겼다가 멀리 밀어내는 동작을 천천히 반복한다(발목 펌프).",
      "발목으로 크게 원을 그리듯 천천히 돌린다(발목 원 돌리기).",
      "아프지 않은 범위 안에서만 움직인다.",
    ],
    reps: "각 15회",
    sets: "2세트",
    cautions: [
      "통증이 느껴지는 범위까지 억지로 움직이지 않는다.",
      ANKLE_HOLD_BACK_WARNING,
    ],
    stopCriteria: [STOP_CRITERIA_TEXT, ANKLE_CONSULT_WARNING],
    source: AAFP_ANKLE_SPRAIN,
  },
  {
    id: "ankle-band-resistance-01",
    name: "밴드 저항 발목 운동",
    sports: [...SPORTS],
    bodyParts: ["발목"],
    purpose: "회복",
    steps: [
      "앉아서 다리를 뻗고, 발 앞쪽에 탄력 밴드를 건 뒤 양손으로 끝을 잡는다.",
      "발목을 발등 쪽으로 천천히 당겼다가 돌아온다.",
      "같은 방식으로 발바닥 쪽, 안쪽, 바깥쪽 방향도 한 번씩 천천히 움직인다.",
      "처음에는 약한 밴드로 시작해 아프지 않은 범위에서만 움직인다.",
    ],
    reps: "방향마다 10회",
    sets: "3세트",
    cautions: [
      "밴드 저항이 너무 세면 발목이 흔들릴 수 있으니 약한 것부터 쓴다.",
      ANKLE_HOLD_BACK_WARNING,
    ],
    stopCriteria: [STOP_CRITERIA_TEXT, ANKLE_CONSULT_WARNING],
    source: AAFP_ANKLE_SPRAIN,
  },
  {
    id: "ankle-heel-raise-01",
    name: "까치발·뒤꿈치 들기",
    sports: [...SPORTS],
    bodyParts: ["발목"],
    purpose: "회복",
    steps: [
      "의자나 벽을 잡고 두 발로 바르게 선다.",
      "뒤꿈치를 천천히 들어 올려 3~5초 유지한 뒤 천천히 내린다(까치발).",
      "이어서 발끝을 들고 뒤꿈치로 서서 3~5초 유지한 뒤 내린다(뒤꿈치 들기).",
      "균형이 흔들리면 잡은 손에 의지해도 된다.",
    ],
    reps: "10회 (한 번에 3~5초 유지)",
    sets: "3세트",
    cautions: [
      "처음에는 두 발로 하고, 안정되면 점차 아픈 쪽 발에 실리는 힘을 늘린다.",
      ANKLE_HOLD_BACK_WARNING,
    ],
    stopCriteria: [STOP_CRITERIA_TEXT, ANKLE_CONSULT_WARNING],
    source: AAFP_ANKLE_SPRAIN,
  },
  {
    id: "ankle-single-leg-balance-01",
    name: "한 발 서기 균형 운동",
    sports: [...SPORTS],
    bodyParts: ["발목"],
    purpose: "회복",
    steps: [
      "붙잡을 수 있는 벽이나 의자 옆에서 아픈 쪽 발 하나로 선다.",
      "눈을 뜬 채로 30초 동안 균형을 유지한다.",
      "안정되면 같은 방식으로 눈을 감고 30초 동안 균형을 유지한다.",
      "평평한 바닥에서 충분히 안정된 뒤에 울퉁불퉁한 면으로 넘어간다.",
    ],
    reps: "30초 유지를 3회",
    sets: "눈 뜨고, 눈 감고 각각 1세트",
    cautions: [
      "넘어질 수 있으니 반드시 바로 붙잡을 수 있는 곳 옆에서 한다.",
      "눈을 감는 단계는 눈을 뜨고도 흔들림 없이 설 수 있을 때만 한다.",
      ANKLE_HOLD_BACK_WARNING,
    ],
    stopCriteria: [STOP_CRITERIA_TEXT, ANKLE_CONSULT_WARNING],
    source: AAFP_ANKLE_SPRAIN,
  },
];
