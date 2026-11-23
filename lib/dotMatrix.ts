// Design Ref: 첫 화면 "점으로 그린 두 손" 배경 — 그림을 그리지 않는 계산 부분만 모았다(화면 없이 시험할 수 있다).
// Plan SC: 두 손이 천천히 움직이고, 가끔 점 단위로 다른 자세로 바뀌었다가 돌아오며(20초 반복),
//          글이 있는 곳과 손끝이 만나는 가운데에는 점이 생기지 않는다.
//
// 실제로 캔버스에 그리는 일은 components/DotHands.tsx가 하고, 이 파일의 값을 가져다 쓴다.

/** 한 바퀴 도는 시간(초). 이 시간이 지나면 처음 자세로 정확히 돌아온다. */
export const LOOP = 20;

/** 점 크기 단계. 0은 점을 그리지 않는다. */
export const LEVELS = [0, 0.26, 0.52, 0.78, 1] as const;

/** 손 그림 묶음(시트)에서 네 손을 잘라 내는 위치 [x, y, 너비, 높이] (시트 크기에 대한 비율) */
export const SRC = {
  LA: [0, 0.06, 0.47, 0.4],
  RA: [0.53, 0.06, 0.47, 0.4],
  LB: [0, 0.55, 0.47, 0.4],
  RB: [0.53, 0.55, 0.47, 0.4],
} as const;

/** 원본 시트 크기(2688×1520)에서 손 한 장의 가로세로 비율 */
const HAND_ASPECT = (0.4 * 1520) / (0.47 * 2688);

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** a 이하에서는 0, b 이상에서는 1, 사이에서는 부드럽게 올라가는 값 */
export function smooth(a: number, b: number, x: number): number {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

/** on초에 0→1로 바뀌기 시작해 off초에 1→0으로 되돌아오는 값. 바뀌는 데 dur초가 걸린다. */
export function mixAt(t: number, on: number, off: number, dur: number): number {
  return smooth(on, on + dur, t) * (1 - smooth(off, off + dur, t));
}

/** 같은 입력이면 항상 같은 0~1 사이 값을 돌려주는 가짜 난수 */
export function hash(a: number, b: number): number {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** 점마다 정해진 "언제 바뀔지" 값. 대부분 무작위이고 줄마다 조금씩 치우쳐 가로로 줄무늬처럼 바뀐다. */
export function cellSeed(i: number, j: number): number {
  return 0.55 * hash(i, j) + 0.45 * hash(j * 3.1, 7.7);
}

/** 사진의 밝기(0~1)를 점의 진하기(0~1)로 바꾼다. 흰 배경은 0, 그림자가 진할수록 1에 가깝다. */
export function dotValue(luminance: number): number {
  return clamp((1 - luminance - 0.16) / 0.42, 0, 1);
}

/** 진하기를 5단계 중 하나로 맞춘다. 반환값은 LEVELS 중 하나다. */
export function quantise(value: number): number {
  for (let k = LEVELS.length - 1; k >= 0; k--) {
    if (value >= LEVELS[k] - 0.13) {
      return LEVELS[k];
    }
  }
  return 0;
}

/** 단계에 맞는 점 반지름. 가장 작은 단계는 아주 작은 점으로 그린다. */
export function dotRadius(level: number, baseRadius: number): number {
  if (level === 0) return 0;
  return level === LEVELS[1] ? baseRadius * 0.38 : baseRadius * level;
}

/** 왼손(left)과 오른손(right)이 각각 두 번째 자세(펼친 손)로 바뀌어 있는 정도(0~1) */
export function poseMix(t: number, side: "left" | "right"): number {
  return side === "left" ? mixAt(t, 6.2, 14.6, 1.6) : mixAt(t, 2.4, 10.4, 1.6);
}

/** 바뀌는 중인 줄의 경계에서 점이 깜빡이며 얇아지는 정도(0~1). 바뀌는 중이 아니면 1 */
export function glitchFront(seed: number, mix: number, flicker: number): number {
  if (mix <= 0.001 || mix >= 0.999) return 1;
  const distance = Math.abs(seed - mix);
  if (distance >= 0.12) return 1;
  const thin = distance / 0.12;
  return flicker <= 0.4 ? thin * 0.3 : thin;
}

/** 초당 7번 바뀌는 무늬에서, 이 줄이 옆으로 밀려야 하는 칸 수(대부분 0) */
export function rowShift(j: number, tick: number): number {
  return hash(j, tick) > 0.965 ? Math.round((hash(tick, j) - 0.5) * 8) : 0;
}

// ── 손의 위치와 화면별 배치 ────────────────────────────────────

/** 화면(단계)마다 달라지는 손 배치. 값은 모두 화면 크기에 대한 비율이다. */
export interface HandsLayout {
  /** 손이 놓이는 세로 중심 */
  cy: number;
  /** 손 한 장의 너비 */
  hw: number;
  /** 전체 진하기(0이면 그리지 않는다) */
  alpha: number;
  /** 점을 비워 두는 타원의 중심 세로 위치와 가로·세로 반지름 */
  quietY: number;
  quietRx: number;
  quietRy: number;
}

export type HandsMode = "hero" | "type" | "details";

export function handsLayout(mode: HandsMode, portrait: boolean): HandsLayout {
  switch (mode) {
    case "hero":
      return portrait
        ? { cy: 0.66, hw: 0.66, alpha: 1, quietY: 0.33, quietRx: 0.44, quietRy: 0.085 }
        : { cy: 0.54, hw: 0.53, alpha: 1, quietY: 0.385, quietRx: 0.2, quietRy: 0.085 };
    case "type":
      // 유형 고르기 화면: 손은 아래로 내려가 작아지고, 가운데 카드 영역은 비워 둔다.
      return portrait
        ? { cy: 0.9, hw: 0.7, alpha: 0.55, quietY: 0.5, quietRx: 0.5, quietRy: 0.36 }
        : { cy: 0.86, hw: 0.4, alpha: 0.8, quietY: 0.5, quietRx: 0.3, quietRy: 0.3 };
    case "details":
      // 입력 화면: 글을 읽기 편하도록 손을 없앤다.
      return portrait
        ? { cy: 0.9, hw: 0.7, alpha: 0, quietY: 0.5, quietRx: 0.5, quietRy: 0.5 }
        : { cy: 0.86, hw: 0.4, alpha: 0, quietY: 0.5, quietRx: 0.3, quietRy: 0.5 };
  }
}

/** 지금 배치를 목표 배치 쪽으로 부드럽게 옮긴다. dt는 지난 시간(초) */
export function approachLayout(
  current: HandsLayout,
  target: HandsLayout,
  dt: number,
  rate = 3.4,
): HandsLayout {
  const k = 1 - Math.exp(-rate * dt);
  const move = (a: number, b: number) => a + (b - a) * k;
  return {
    cy: move(current.cy, target.cy),
    hw: move(current.hw, target.hw),
    alpha: move(current.alpha, target.alpha),
    quietY: move(current.quietY, target.quietY),
    quietRx: move(current.quietRx, target.quietRx),
    quietRy: move(current.quietRy, target.quietRy),
  };
}

export interface HandPlacement {
  /** 그림 왼쪽 위 x, 세로 중심 cy, 너비 w, 높이 h (화면 좌표) */
  x: number;
  cy: number;
  w: number;
  h: number;
  scale: number;
  /** 돌리는 각도(라디안) */
  rot: number;
  /** 돌리고 키울 때 기준이 되는 가로 위치(왼손은 왼쪽 끝, 오른손은 오른쪽 끝) */
  pivotX: number;
}

/** 시간 t(초)에서 한 손의 위치. 두 손은 서로 반대 박자로 다가갔다 물러난다. */
export function handPlacement(
  side: "left" | "right",
  t: number,
  width: number,
  height: number,
  layout: Pick<HandsLayout, "cy" | "hw">,
): HandPlacement {
  const left = side === "left";
  const phase = left ? 0 : Math.PI;
  const a = (2 * Math.PI * t) / LOOP;
  const w = width * layout.hw;
  const h = w * HAND_ASPECT;
  const reach = (0.035 * Math.sin(a + phase) + 0.012 * Math.sin(2 * a + 1.3 + phase)) * width;
  const x = left ? reach - width * 0.045 : width - w + width * 0.045 - reach;
  return {
    x,
    cy: height * layout.cy,
    w,
    h,
    scale: 1 + 0.07 * Math.sin(a + 0.9 + phase),
    rot: (left ? 1 : -1) * 0.045 * Math.sin(a + 2.1 + phase),
    pivotX: left ? x : x + w,
  };
}

/** 가운데 손끝이 만나는 곳과 글이 있는 곳에서 점이 사라지는 정도(0~1) */
export function quietFactor(
  col: number,
  cols: number,
  rowCenterY: number,
  height: number,
  layout: Pick<HandsLayout, "quietY" | "quietRx" | "quietRy">,
): number {
  const cx = Math.abs((col + 0.5) / cols - 0.5);
  const fingerGap = smooth(0.035, 0.11, cx);
  const ex = cx / layout.quietRx;
  const ey = (rowCenterY / height - layout.quietY) / layout.quietRy;
  return fingerGap * smooth(0.85, 1.25, Math.hypot(ex, ey));
}
