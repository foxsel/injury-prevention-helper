// Design Ref: §5 데이터 모델, §9 폴더 구조 — 미리 정리해 둔 운동 목록.
// Plan SC: AI는 이 목록에 있는 운동의 id만 고를 수 있고, 화면의 운동 문장은 모두 여기서 나온다.
//
// 작성 원칙 (PRD 7번)
// - 공개된 자료를 읽고 우리 말로 요약한다. 원문 문장을 그대로 옮기지 않는다.
// - 운동마다 참고한 자료를 source에 적는다. 근거를 찾지 못한 조합은 채우지 않는다.
// - 이 목록은 전문가 검토 전의 시제품 자료다.
//
// 현재 채워진 범위
// - 발목 회복 운동 4개 (모든 지원 종목 공통)  ← AAFP 발목 염좌 환자 안내
// - 발목·무릎 예방 운동 6개 (모든 지원 종목 공통) ← FIFA 11+ 부상 예방 소책자
// - 무릎 회복 운동 3개, 어깨 회복 운동 4개 (모든 지원 종목 공통) ← 분당서울대병원 수술 후 운동교육
// - 어깨 예방 운동: 근거 자료를 찾지 못해 현재 없음(가상 샘플 4개는 만들어 두었지만 내보내지 않는다)
//
// ⚠ 가상 샘플 데이터 (source가 SAMPLE_SOURCE인 운동)
//   근거 자료를 찾지 못해 실습용으로 임의로 만든 데이터다. 횟수·세트도 임의 값이다.
//   실제 서비스에 내보내기 전에 반드시 근거 자료와 전문가 검토로 교체해야 한다.
//   → 근거 자료를 확인한 뒤 같은 형식으로 추가한다.

import { SPORTS, STOP_CRITERIA_TEXT } from "../constants";
import type { Exercise } from "./types";

// ───────────────────────────────────────────────────────────────
// 발목 회복 운동
// 참고 자료: 미국가정의학회(AAFP) 발목 염좌 환자 안내(2025).
// 횟수·세트·유지 시간은 이 안내의 수치를 따르고, 동작 설명 문장은 우리가 쓴 것이다.
// ───────────────────────────────────────────────────────────────
const AAFP_ANKLE_SPRAIN = "AAFP 발목 염좌 환자 안내(2025)";

// 같은 안내에서 "다음 단계로 넘어가면 안 되는 경우"로 든 신호를 요약한 공통 주의사항
const ANKLE_HOLD_BACK_WARNING =
  "발목이 꺾이는 느낌이 들거나 같은 곳이 자꾸 붓거나 평소와 다른 통증이 있으면 더 어려운 단계로 넘어가지 않는다.";

// 같은 안내에서 "의사에게 연락해야 하는 경우"로 든 신호를 요약한 공통 중단 기준
const ANKLE_CONSULT_WARNING =
  "통증과 부기가 나아지지 않거나 발을 위아래로 움직이지 못하면 운동을 멈추고 의사에게 문의한다.";

// ───────────────────────────────────────────────────────────────
// 발목·무릎 예방 운동
// 참고 자료: FIFA 11+ 부상 예방 소책자. 원래 축구용이지만 어떤 종목에도 맞춰 쓸 수 있다고
// 소개하는 자료이며, 횟수·세트·시간은 이 자료의 수치를 따른다.
// 우리가 정한 것: 운동별 부위(발목/무릎) 표기, 부연설명 문장, 아래 두 가지 추가 주의 문구.
// (이 자료에는 운동별 대상 부위와 통증 중단 기준이 적혀 있지 않다.)
// ───────────────────────────────────────────────────────────────
const FIFA_11_PLUS = "FIFA 11+ 부상 예방 소책자(ortho.wustl.edu 배포본)";

// 자료가 모든 운동에서 반복해서 강조한 바른 자세
const KNEE_ALIGNMENT_CAUTION =
  "무릎이 안쪽으로 꺾이지 않게 하고, 엉덩이·무릎·발끝이 일직선이 되게 한다.";
const PELVIS_LEVEL_CAUTION = "골반은 수평으로 유지하고 옆으로 기울이지 않는다.";
const SOFT_LANDING_CAUTION = "발볼로 무릎을 굽히며 부드럽게 착지한다.";

// 자료에는 없고 우리가 덧붙인 안전 문구: 충격이 큰 점프 운동용
const HIGH_IMPACT_CAUTION =
  "충격이 큰 운동이다. 발목이나 무릎에 통증이나 불편감이 있으면 이 운동은 건너뛴다.";

// ───────────────────────────────────────────────────────────────
// 무릎·어깨 회복 운동
// 참고 자료: 분당서울대병원 재활의학과 환자교육 "무릎관절 수술후 운동교육",
// "어깨관절 수술후 운동교육". 인공관절 수술을 받은 환자를 위한 시기별 프로그램이다.
// 횟수·세트·유지 시간은 이 자료의 수치를 따르고, 자료에 없는 값은 만들지 않았다.
// 우리가 정한 것: 운동 선택, 부연설명 문장, 아래 수술 관련 안내 문구.
// (이 자료에는 통증 중단 기준과 병원 방문 기준이 적혀 있지 않다.)
// ───────────────────────────────────────────────────────────────
const SNUBH_KNEE = "분당서울대병원 재활의학과 환자교육: 무릎관절 수술후 운동교육";
const SNUBH_SHOULDER = "분당서울대병원 재활의학과 환자교육: 어깨관절 수술후 운동교육";

// 자료에는 없고 우리가 덧붙인 안전 문구: 수술 후 프로그램을 참고했기 때문
const SURGERY_CAUTION =
  "수술을 받았다면 담당 의료진이 정한 시기와 운동 범위를 먼저 따른다.";

// ───────────────────────────────────────────────────────────────
// 가상 샘플 데이터 (어깨 예방)
// 근거 자료 없이 실습용으로 만든 운동이다. 일반적으로 가볍다고 알려진 동작만 골랐지만
// 어떤 자료로도 확인하지 않았고, 횟수·세트는 임의 값이다.
// ───────────────────────────────────────────────────────────────
export const SAMPLE_SOURCE = "가상 샘플 데이터(근거 자료 없음, 실습용)";

// 사용자 화면에도 보이도록 주의사항 맨 앞에 넣는다.
const SAMPLE_CAUTION =
  "이 운동은 근거 자료 없이 실습용으로 만든 가상 샘플이다. 실제 서비스 전에 근거 자료와 전문가 검토로 바꿔야 한다.";

const SOURCED_EXERCISES: Exercise[] = [
  // ── 발목 회복 (AAFP) ─────────────────────────────────────────
  {
    id: "ankle-pump-circle-01",
    highImpact: false,
    name: "발목 펌프와 발목 원 돌리기",
    description:
      "굳은 발목을 위아래로 움직이고 돌려서 움직임 범위를 부드럽게 되찾는 가벼운 운동입니다. 아프지 않은 범위에서만 천천히 움직이는 것이 핵심입니다.",
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
    highImpact: false,
    name: "밴드 저항 발목 운동",
    description:
      "탄력 밴드의 저항을 이용해 발목을 네 방향으로 움직이며 발목 주변 근력을 키우는 운동입니다. 약한 밴드로 시작해 천천히 움직이세요.",
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
    highImpact: false,
    name: "까치발·뒤꿈치 들기",
    description:
      "발끝과 뒤꿈치로 번갈아 서서 종아리와 발목 주변의 힘을 기르는 운동입니다. 처음에는 잡을 곳을 잡고 두 발로 시작하세요.",
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
    highImpact: false,
    name: "한 발 서기 균형 운동",
    description:
      "한 발로 서서 흔들리는 발목을 스스로 잡아 주는 균형 감각을 되찾는 운동입니다. 눈을 감는 단계는 눈을 뜨고 안정적으로 선 다음에 하세요.",
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

  // ── 발목·무릎 예방 (FIFA 11+) ────────────────────────────────
  {
    id: "prevent-single-leg-stance-01",
    highImpact: false,
    name: "한 발 서기(공 잡고)",
    description:
      "한 발로 서서 발목과 무릎이 흔들리지 않게 버티는 균형 훈련입니다. 무릎이 안쪽으로 꺾이지 않는 자세를 몸에 익히는 것이 핵심입니다. 익숙해지면 뒤꿈치를 살짝 들거나 공을 허리 둘레로 돌려 난이도를 올릴 수 있습니다.",
    sports: [...SPORTS],
    bodyParts: ["발목", "무릎"],
    purpose: "예방",
    steps: [
      "한 발로 서서 무릎과 고관절을 살짝 굽히고, 공을 두 손으로 잡는다.",
      "체중을 발 앞쪽(발볼)에 싣고 30초 동안 균형을 유지한다.",
      "반대쪽 발로 바꿔 같은 방식으로 한다.",
    ],
    reps: "30초 유지",
    sets: "다리마다 2세트",
    cautions: [KNEE_ALIGNMENT_CAUTION, PELVIS_LEVEL_CAUTION],
    stopCriteria: [STOP_CRITERIA_TEXT],
    source: FIFA_11_PLUS,
  },
  {
    id: "prevent-squat-toe-raise-01",
    highImpact: false,
    name: "스쿼트와 발끝 들기",
    description:
      "무릎을 굽혔다 펴며 다리 근력과 균형을 기르는 기본 운동입니다. 상체를 곧게 앞으로 기울이고, 무릎이 안으로 꺾이지 않게 하는 것이 중요합니다.",
    sports: [...SPORTS],
    bodyParts: ["무릎", "발목"],
    purpose: "예방",
    steps: [
      "발을 엉덩이 너비로 벌리고 손을 허리에 둔다.",
      "엉덩이·무릎·발목을 굽혀 무릎이 90도가 될 때까지 천천히 앉으며 상체를 앞으로 기울인다.",
      "상체와 엉덩이·무릎을 펴면서 발끝으로 선다.",
      "천천히 내려온 뒤 다시 반복한다. 올라올 때는 내려갈 때보다 조금 빠르게 한다.",
    ],
    reps: "30초 동안 반복",
    sets: "2세트",
    cautions: [
      KNEE_ALIGNMENT_CAUTION,
      "상체를 앞으로 기울이되 등은 곧게 편다.",
    ],
    stopCriteria: [STOP_CRITERIA_TEXT],
    source: FIFA_11_PLUS,
  },
  {
    id: "prevent-walking-lunge-01",
    highImpact: false,
    name: "걷기 런지",
    description:
      "한 걸음씩 앞으로 내딛으며 다리 근력과 무릎을 조절하는 힘을 기르는 운동입니다. 앞무릎이 발끝을 넘지 않게 하는 것이 핵심입니다.",
    sports: [...SPORTS],
    bodyParts: ["무릎"],
    purpose: "예방",
    steps: [
      "발을 엉덩이 너비로 벌리고 손을 허리에 둔다.",
      "한 발을 앞으로 내딛으며 앞쪽 무릎이 90도가 될 때까지 일정한 속도로 천천히 굽힌다.",
      "상체는 곧게 세우고 골반은 수평을 유지한다.",
      "다리를 번갈아 가며 앞으로 걸어 나간다.",
    ],
    reps: "다리마다 10회",
    sets: "2세트",
    cautions: [
      "앞무릎이 안쪽으로 꺾이거나 발끝을 넘지 않게 한다.",
      "엉덩이를 비틀거나 옆으로 기울이지 않는다.",
    ],
    stopCriteria: [STOP_CRITERIA_TEXT],
    source: FIFA_11_PLUS,
  },
  {
    id: "prevent-single-leg-squat-01",
    highImpact: false,
    name: "한 발 스쿼트",
    description:
      "한 다리로 몸을 지탱하며 무릎을 굽혔다 펴는 난이도가 높은 운동입니다. 한 발 서기와 스쿼트가 안정된 뒤에 시도하세요.",
    sports: [...SPORTS],
    bodyParts: ["무릎"],
    purpose: "예방",
    steps: [
      "한 발로 서서 함께 하는 사람이나 안정적인 물건을 가볍게 잡는다.",
      "무릎을 천천히 굽힌다. 가능하면 90도까지 굽힌다.",
      "굽힐 때보다 조금 더 빠르게 다시 펴고 선다.",
      "반대쪽 다리도 같은 방식으로 한다.",
    ],
    reps: "다리마다 10회",
    sets: "2세트",
    cautions: [
      KNEE_ALIGNMENT_CAUTION,
      "상체는 앞을 향하고 골반은 수평으로 유지한다.",
      "넘어질 수 있으니 바로 붙잡을 수 있는 곳 옆에서 한다.",
    ],
    stopCriteria: [STOP_CRITERIA_TEXT],
    source: FIFA_11_PLUS,
  },
  {
    id: "prevent-vertical-jump-01",
    highImpact: true,
    name: "제자리 수직 점프",
    description:
      "무릎과 발목을 충분히 굽혀 부드럽게 착지하는 법을 익히는 점프 운동입니다. 높이 뛰는 것보다 착지 자세가 중요합니다.",
    sports: [...SPORTS],
    bodyParts: ["무릎", "발목"],
    purpose: "예방",
    steps: [
      "발을 엉덩이 너비로 벌리고 손을 허리에 둔다.",
      "엉덩이·무릎·발목을 무릎이 90도가 될 때까지 천천히 굽히고 상체를 앞으로 기울인 채 1초 멈춘다.",
      "최대한 높이 뛰어 온몸을 쭉 편다.",
      "두 발의 발볼로 무릎을 굽히며 부드럽게 착지하고, 이어서 반복한다.",
    ],
    reps: "30초 동안 반복",
    sets: "2세트",
    cautions: [
      "두 발로 같이 뛰고 두 발로 같이 착지한다.",
      SOFT_LANDING_CAUTION,
      KNEE_ALIGNMENT_CAUTION,
      HIGH_IMPACT_CAUTION,
    ],
    stopCriteria: [STOP_CRITERIA_TEXT],
    source: FIFA_11_PLUS,
  },
  {
    id: "prevent-lateral-single-leg-jump-01",
    highImpact: true,
    name: "좌우 한 발 점프",
    description:
      "한 발로 옆으로 뛰어 착지하며 발목과 무릎이 안정적으로 버티도록 훈련하는 난이도가 높은 운동입니다. 두 발 점프가 편해진 뒤에 시도하세요.",
    sports: [...SPORTS],
    bodyParts: ["발목", "무릎"],
    purpose: "예방",
    steps: [
      "한 발로 서서 엉덩이·무릎·발목을 살짝 굽히고 상체를 앞으로 기울인다.",
      "지탱하던 다리에서 옆으로 약 1m 떨어진 반대쪽 다리로 뛴다.",
      "발볼로 부드럽게 착지하며 엉덩이·무릎·발목을 굽히고 약 1초 멈춘다.",
      "이어서 반대쪽 다리로 되돌아 뛰는 동작을 좌우로 반복한다.",
    ],
    reps: "30초 동안 반복",
    sets: "2세트",
    cautions: [
      KNEE_ALIGNMENT_CAUTION,
      "상체는 앞을 향해 안정되게 유지하고 골반은 수평으로 유지한다.",
      SOFT_LANDING_CAUTION,
      HIGH_IMPACT_CAUTION,
    ],
    stopCriteria: [STOP_CRITERIA_TEXT],
    source: FIFA_11_PLUS,
  },

  // ── 무릎 회복 (분당서울대병원) ───────────────────────────────
  {
    id: "knee-heel-slide-01",
    highImpact: false,
    name: "발바닥 미끄러뜨려 무릎 굽히기",
    description:
      "누운 채 발을 바닥에 미끄러뜨려 무릎을 굽혔다 펴며 무릎이 움직이는 범위를 되찾는 운동입니다. 무릎 앞쪽에 약간의 압박감이 느껴지는 것은 자료에서 정상적인 느낌이라고 안내합니다.",
    sports: [...SPORTS],
    bodyParts: ["무릎"],
    purpose: "회복",
    steps: [
      "바닥에 누워 다리를 편하게 뻗는다.",
      "발을 바닥에 미끄러뜨리며 엉덩이 쪽으로 당겨 무릎을 굽힌다.",
      "5~10초 동안 유지한다.",
      "발을 다시 밀어 무릎을 충분히 펴고, 같은 동작을 반복한다.",
    ],
    reps: "5~10초 유지, 20회",
    sets: "하루 3세트",
    cautions: [
      SURGERY_CAUTION,
      "무릎 앞쪽의 약한 압박감은 있을 수 있다. 이 압박감과 달리 통증이 심해지면 중단 기준을 따른다.",
    ],
    stopCriteria: [STOP_CRITERIA_TEXT],
    source: SNUBH_KNEE,
  },
  {
    id: "knee-quad-set-01",
    highImpact: false,
    name: "허벅지 근육 조이기",
    description:
      "무릎을 쭉 편 채 허벅지 앞 근육에 힘을 꽉 주었다 푸는 기초 근력 운동입니다.",
    sports: [...SPORTS],
    bodyParts: ["무릎"],
    purpose: "회복",
    steps: [
      "앉거나 누워서 무릎을 충분히 쭉 편다.",
      "허벅지 근육에 최대한 힘을 준다.",
      "5~10초 동안 유지한 뒤 힘을 푼다.",
      "같은 동작을 2~3분 동안 반복한다.",
    ],
    reps: "5~10초 유지를 2~3분 동안 반복",
    sets: "정해진 세트 수 없음(2~3분 단위로 진행)",
    cautions: [
      SURGERY_CAUTION,
      "무릎을 완전히 편 상태에서 허벅지에 힘이 들어가는지 확인한다.",
    ],
    stopCriteria: [STOP_CRITERIA_TEXT],
    source: SNUBH_KNEE,
  },
  {
    id: "knee-mini-squat-01",
    highImpact: false,
    name: "벽에 기대 쪼그리기(미니 스쿼트)",
    description:
      "벽에 어깨를 대고 살짝 쪼그려 앉았다 일어나는 기초 하체 근력 운동입니다. 체중을 발 전체에 고르게 싣는 것이 핵심입니다.",
    sports: [...SPORTS],
    bodyParts: ["무릎"],
    purpose: "회복",
    steps: [
      "발을 어깨 너비로 벌리고, 어깨가 벽에 닿게 선다.",
      "엉덩이와 무릎을 굽혀 살짝 쪼그려 앉는다.",
      "체중이 발 전체에 고르게 실리게 한다.",
      "천천히 일어나 같은 동작을 반복한다.",
    ],
    reps: "10~15회",
    sets: "하루 3번",
    cautions: [
      SURGERY_CAUTION,
      "체중이 한쪽으로 쏠리지 않고 발 전체에 고르게 실리게 한다.",
    ],
    stopCriteria: [STOP_CRITERIA_TEXT],
    source: SNUBH_KNEE,
  },

  // ── 어깨 회복 (분당서울대병원) ───────────────────────────────
  {
    id: "shoulder-band-external-rotation-01",
    highImpact: false,
    name: "밴드 바깥돌림(외회전)",
    description:
      "탄력 밴드의 저항을 이용해 팔을 몸 바깥쪽으로 돌리며 어깨 주변 근육을 키우는 운동입니다. 팔꿈치 각도를 유지하고 통증 없는 범위에서만 움직이세요.",
    sports: [...SPORTS],
    bodyParts: ["어깨"],
    purpose: "회복",
    steps: [
      "탄력 밴드를 허리 높이에 고정하고, 안쪽돌림 운동과 반대쪽에 선다. (자료에서는 주로 노란색이나 주황색 밴드를 쓴다.)",
      "팔꿈치를 90도로 굽힌 자세를 유지한다.",
      "통증 없는 범위에서 팔을 몸 바깥쪽으로 천천히 당긴다.",
      "천천히 돌아온다.",
    ],
    reps: "10회",
    sets: "하루 3번",
    cautions: [
      SURGERY_CAUTION,
      "통증 없는 범위 안에서 천천히 당긴다.",
      "운동하는 동안 팔꿈치를 굽힌 각도를 바꾸지 않는다.",
    ],
    stopCriteria: [STOP_CRITERIA_TEXT],
    source: SNUBH_SHOULDER,
  },
  {
    id: "shoulder-band-internal-rotation-01",
    highImpact: false,
    name: "밴드 안쪽돌림(내회전)",
    description:
      "탄력 밴드의 저항을 이용해 팔을 몸 쪽으로 돌리며 어깨 주변 근육을 키우는 운동입니다. 팔꿈치 각도를 유지하고 통증 없는 범위에서만 움직이세요.",
    sports: [...SPORTS],
    bodyParts: ["어깨"],
    purpose: "회복",
    steps: [
      "탄력 밴드를 허리 높이에 고정한다. (자료에서는 주로 노란색이나 주황색 밴드를 쓴다.)",
      "팔꿈치를 90도로 굽힌 자세를 유지한다.",
      "통증 없는 범위에서 팔을 몸 쪽으로 천천히 당긴다.",
      "천천히 돌아온다.",
    ],
    reps: "10회",
    sets: "하루 3번",
    cautions: [
      SURGERY_CAUTION,
      "통증 없는 범위 안에서 천천히 당긴다.",
      "운동하는 동안 팔꿈치를 굽힌 각도를 바꾸지 않는다.",
    ],
    stopCriteria: [STOP_CRITERIA_TEXT],
    source: SNUBH_SHOULDER,
  },
  {
    id: "shoulder-towel-wall-slide-01",
    highImpact: false,
    name: "수건 벽 밀기",
    description:
      "수건으로 벽을 짚고 팔을 벽을 따라 밀어 올리며 어깨의 움직임 범위를 넓히는 운동입니다. 건강한 손이 아픈 팔의 팔꿈치를 받쳐 줍니다.",
    sports: [...SPORTS],
    bodyParts: ["어깨"],
    purpose: "회복",
    steps: [
      "벽을 향해 서서 아픈 쪽 손으로 수건을 잡고 벽에 댄다.",
      "건강한 손으로 아픈 쪽 팔꿈치를 받쳐 준다.",
      "수건을 벽을 따라 천천히 밀어 올린다.",
      "더 올라가지 않으면 몸을 벽에 가까이 붙여 조금 더 올리고 5초 동안 머문다.",
    ],
    reps: "10회",
    sets: "하루 3번",
    cautions: [
      SURGERY_CAUTION,
      "건강한 손으로 팔꿈치를 받쳐 아픈 팔에 무리가 가지 않게 한다.",
    ],
    stopCriteria: [STOP_CRITERIA_TEXT],
    source: SNUBH_SHOULDER,
  },
  {
    id: "shoulder-lower-trap-band-01",
    highImpact: false,
    name: "밴드 날개뼈 모으기(하부 승모근)",
    description:
      "날개뼈 아래쪽 근육을 써서 날개뼈를 모아 주는 운동입니다. 자료에서는 날개뼈 주변 근육이 약해지는 것을 막기 위한 운동으로 소개합니다.",
    sports: [...SPORTS],
    bodyParts: ["어깨"],
    purpose: "회복",
    steps: [
      "탄력 밴드를 양 손바닥에 감아 잡는다.",
      "팔꿈치를 90도로 굽혀 옆구리에 붙인다.",
      "날개뼈를 모으듯 가슴을 앞으로 내민다.",
      "천천히 돌아온다.",
    ],
    reps: "10회",
    sets: "하루 3번",
    cautions: [
      SURGERY_CAUTION,
      "팔꿈치를 90도로 굽혀 옆구리에 붙인 자세를 유지한다.",
    ],
    stopCriteria: [STOP_CRITERIA_TEXT],
    source: SNUBH_SHOULDER,
  },

];

// ── 어깨 예방 (가상 샘플 데이터) ─────────────────────────────
// 아래 4개는 근거 자료가 없어 화면에 내보내지 않는다(EXERCISES에 넣지 않음).
// 출처 있는 어깨 예방 운동으로 교체할 때 이 배열을 대체하거나 지운다.
const SAMPLE_EXERCISES: Exercise[] = [
  {
    id: "shoulder-sample-scapular-squeeze-01",
    highImpact: false,
    name: "날개뼈 모으기",
    description:
      "[가상 샘플] 서거나 앉아서 양쪽 날개뼈를 뒤로 모았다 푸는 가벼운 운동입니다. 어깨를 으쓱 올리지 않고 날개뼈만 모으는 느낌으로 하세요.",
    sports: [...SPORTS],
    bodyParts: ["어깨"],
    purpose: "예방",
    steps: [
      "의자에 앉거나 서서 팔을 편하게 내린다.",
      "어깨를 올리지 않은 채 양쪽 날개뼈를 등 가운데로 모은다.",
      "5초 동안 유지한 뒤 천천히 힘을 푼다.",
    ],
    reps: "10회",
    sets: "2세트",
    cautions: [SAMPLE_CAUTION, "어깨가 귀 쪽으로 올라가지 않게 한다."],
    stopCriteria: [STOP_CRITERIA_TEXT],
    source: SAMPLE_SOURCE,
  },
  {
    id: "shoulder-sample-arm-circle-01",
    highImpact: false,
    name: "팔 작은 원 돌리기",
    description:
      "[가상 샘플] 팔을 옆으로 벌리고 작은 원을 그리며 어깨를 부드럽게 푸는 준비 운동입니다. 크게 휘두르지 말고 작게 시작하세요.",
    sports: [...SPORTS],
    bodyParts: ["어깨"],
    purpose: "예방",
    steps: [
      "발을 어깨 너비로 벌리고 서서 양팔을 옆으로 어깨 높이까지 든다.",
      "팔을 쭉 편 채 작은 원을 그리며 앞으로 돌린다.",
      "같은 횟수만큼 뒤로 돌린다.",
    ],
    reps: "방향마다 10회",
    sets: "2세트",
    cautions: [
      SAMPLE_CAUTION,
      "처음에는 아주 작은 원으로 시작하고, 어깨에 불편감이 있으면 멈춘다.",
    ],
    stopCriteria: [STOP_CRITERIA_TEXT],
    source: SAMPLE_SOURCE,
  },
  {
    id: "shoulder-sample-wall-pushup-01",
    highImpact: false,
    name: "벽 짚고 팔굽혀펴기",
    description:
      "[가상 샘플] 벽에 손을 짚고 하는 가벼운 팔굽혀펴기로, 어깨와 날개뼈 주변을 안정적으로 쓰는 연습입니다. 바닥에서 하는 팔굽혀펴기보다 부담이 작은 방식입니다.",
    sports: [...SPORTS],
    bodyParts: ["어깨"],
    purpose: "예방",
    steps: [
      "벽에서 한 걸음쯤 떨어져 서서 어깨 너비로 벽에 두 손을 짚는다.",
      "몸을 곧게 편 채 팔꿈치를 굽혀 가슴을 벽 쪽으로 천천히 가져간다.",
      "팔을 펴며 천천히 돌아온다.",
    ],
    reps: "10회",
    sets: "2세트",
    cautions: [SAMPLE_CAUTION, "허리가 꺾이거나 엉덩이가 빠지지 않게 몸을 곧게 유지한다."],
    stopCriteria: [STOP_CRITERIA_TEXT],
    source: SAMPLE_SOURCE,
  },
  {
    id: "shoulder-sample-band-row-01",
    highImpact: false,
    name: "밴드 당기기(노 젓기)",
    description:
      "[가상 샘플] 탄력 밴드를 잡고 노를 젓듯 몸 쪽으로 당겨 어깨 뒤쪽과 등 근육을 쓰는 운동입니다. 약한 밴드로 시작하세요.",
    sports: [...SPORTS],
    bodyParts: ["어깨"],
    purpose: "예방",
    steps: [
      "탄력 밴드를 가슴 높이의 단단한 곳에 고정하고, 두 손으로 끝을 잡고 선다.",
      "팔꿈치를 몸 옆으로 붙이듯 굽히며 밴드를 가슴 쪽으로 당긴다.",
      "날개뼈를 모은 채 잠깐 멈춘 뒤 천천히 돌아온다.",
    ],
    reps: "10~12회",
    sets: "2세트",
    cautions: [SAMPLE_CAUTION, "처음에는 약한 밴드로 시작하고, 어깨가 앞으로 말리지 않게 한다."],
    stopCriteria: [STOP_CRITERIA_TEXT],
    source: SAMPLE_SOURCE,
  },
];

/**
 * 화면과 추천에 쓰는 운동 목록. 근거 자료가 확인된 운동만 들어 있다.
 * (가상 샘플은 제외 — 어깨 예방 운동은 근거 자료를 찾기 전까지 비어 있다.)
 */
export const EXERCISES: Exercise[] = SOURCED_EXERCISES;

/** 아직 내보내지 않는 가상 샘플 운동(시험에서 목록에 섞이지 않았는지 확인할 때 쓴다) */
export const UNUSED_SAMPLE_EXERCISES: readonly Exercise[] = SAMPLE_EXERCISES;
