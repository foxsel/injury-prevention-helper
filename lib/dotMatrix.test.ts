// Design Ref: 첫 화면 점 배경 — 계산 함수 시험.
import { describe, expect, it } from "vitest";
import {
  LEVELS,
  LOOP,
  approachLayout,
  cellSeed,
  clamp,
  dotRadius,
  dotValue,
  glitchFront,
  handPlacement,
  handsLayout,
  hash,
  mixAt,
  poseMix,
  quantise,
  quietFactor,
  rowShift,
  smooth,
} from "./dotMatrix";

describe("smooth / mixAt / clamp", () => {
  it("smooth는 양 끝에서 0과 1이고 가운데는 0.5다", () => {
    expect(smooth(2, 4, 1)).toBe(0);
    expect(smooth(2, 4, 5)).toBe(1);
    expect(smooth(2, 4, 3)).toBeCloseTo(0.5);
  });

  it("clamp는 범위 밖 값을 끝으로 맞춘다", () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-5, 0, 1)).toBe(0);
    expect(clamp(0.3, 0, 1)).toBe(0.3);
  });

  it("mixAt은 켜질 때 올라가고 꺼질 때 내려간다", () => {
    expect(mixAt(0, 2, 8, 1)).toBe(0);
    expect(mixAt(5, 2, 8, 1)).toBe(1);
    expect(mixAt(12, 2, 8, 1)).toBe(0);
    expect(mixAt(2.5, 2, 8, 1)).toBeGreaterThan(0);
    expect(mixAt(2.5, 2, 8, 1)).toBeLessThan(1);
  });
});

describe("poseMix: 20초 반복", () => {
  it("처음과 끝(20초)에서는 두 손 모두 첫 자세(0)다", () => {
    for (const side of ["left", "right"] as const) {
      expect(poseMix(0, side)).toBe(0);
      expect(poseMix(LOOP - 0.001, side)).toBe(0);
    }
  });

  it("오른손은 2.4초, 왼손은 6.2초부터 바뀌기 시작한다", () => {
    expect(poseMix(2.3, "right")).toBe(0);
    expect(poseMix(3, "right")).toBeGreaterThan(0);
    expect(poseMix(6.1, "left")).toBe(0);
    expect(poseMix(7, "left")).toBeGreaterThan(0);
  });

  it("한가운데에서는 둘째 자세(1)가 된다", () => {
    expect(poseMix(8, "right")).toBe(1);
    expect(poseMix(10, "left")).toBe(1);
  });
});

describe("hash / cellSeed", () => {
  it("같은 입력이면 항상 같은 값이고 0~1 사이다", () => {
    expect(hash(3, 7)).toBe(hash(3, 7));
    for (let i = 0; i < 50; i++) {
      const value = hash(i, i * 2 + 1);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("점마다 값이 다르다(모두 같지 않다)", () => {
    const values = new Set<number>();
    for (let i = 0; i < 20; i++) values.add(cellSeed(i, 3));
    expect(values.size).toBeGreaterThan(10);
  });
});

describe("밝기 → 점", () => {
  it("흰 배경(밝기 1)에는 점이 없고, 어두운 곳은 가장 진하다", () => {
    expect(dotValue(1)).toBe(0);
    expect(dotValue(0)).toBe(1);
  });

  it("진하기는 5단계 중 하나로 맞춰진다", () => {
    expect(quantise(0)).toBe(0);
    expect(quantise(0.05)).toBe(0);
    expect(quantise(0.2)).toBe(LEVELS[1]);
    expect(quantise(0.5)).toBe(LEVELS[2]);
    expect(quantise(0.8)).toBe(LEVELS[3]);
    expect(quantise(1)).toBe(1);
    for (let v = 0; v <= 1; v += 0.05) {
      expect(LEVELS).toContain(quantise(v));
    }
  });

  it("반지름: 0단계는 그리지 않고, 가장 작은 단계는 0.38배, 가장 큰 단계는 1배", () => {
    expect(dotRadius(0, 10)).toBe(0);
    expect(dotRadius(LEVELS[1], 10)).toBeCloseTo(3.8);
    expect(dotRadius(1, 10)).toBe(10);
  });
});

describe("glitchFront / rowShift", () => {
  it("바뀌는 중이 아니면 영향이 없다", () => {
    expect(glitchFront(0.5, 0, 0.9)).toBe(1);
    expect(glitchFront(0.5, 1, 0.9)).toBe(1);
  });

  it("경계에서 멀면 영향이 없고, 가까우면 얇아진다", () => {
    expect(glitchFront(0.9, 0.5, 0.9)).toBe(1);
    expect(glitchFront(0.5, 0.5, 0.9)).toBe(0);
    expect(glitchFront(0.55, 0.5, 0.9)).toBeLessThan(1);
  });

  it("경계 가까이의 일부 점은 더 얇게 깜빡인다", () => {
    expect(glitchFront(0.55, 0.5, 0.2)).toBeLessThan(glitchFront(0.55, 0.5, 0.9));
  });

  it("대부분의 줄은 밀리지 않고, 밀리는 줄도 8칸 안쪽이다", () => {
    let moved = 0;
    for (let j = 0; j < 400; j++) {
      const shift = rowShift(j, 12);
      if (shift !== 0) moved++;
      expect(Math.abs(shift)).toBeLessThanOrEqual(4);
    }
    expect(moved).toBeLessThan(40);
  });
});

describe("손 배치", () => {
  const layout = handsLayout("hero", false);

  it("왼손은 왼쪽 가장자리 근처, 오른손은 오른쪽 가장자리 근처에서 시작한다", () => {
    const left = handPlacement("left", 0, 1440, 900, layout);
    const right = handPlacement("right", 0, 1440, 900, layout);
    expect(left.x).toBeLessThan(0.1 * 1440);
    expect(right.x + right.w).toBeGreaterThan(0.9 * 1440);
  });

  it("두 손은 서로 반대 박자로 다가갔다 물러난다", () => {
    const W = 1440;
    // 안쪽(가운데 쪽)으로 얼마나 들어와 있는지: 왼손은 오른쪽으로, 오른손은 왼쪽으로 움직인 양
    const inward = (t: number) => {
      const l = handPlacement("left", t, W, 900, layout);
      const r = handPlacement("right", t, W, 900, layout);
      const baseR = W - r.w + W * 0.045;
      return { left: l.x + W * 0.045, right: baseR - r.x };
    };
    const at5 = inward(5);
    expect(at5.left * at5.right).toBeLessThan(0);
    const at15 = inward(15);
    expect(at15.left * at15.right).toBeLessThan(0);
  });

  it("20초 뒤에는 같은 자리로 돌아온다", () => {
    const a = handPlacement("left", 3, 1440, 900, layout);
    const b = handPlacement("left", 3 + LOOP, 1440, 900, layout);
    expect(b.x).toBeCloseTo(a.x, 6);
    expect(b.scale).toBeCloseTo(a.scale, 6);
  });

  it("손 한 장의 가로세로 비율은 원본과 같다", () => {
    const p = handPlacement("left", 0, 1000, 800, layout);
    expect(p.h / p.w).toBeCloseTo((0.4 * 1520) / (0.47 * 2688), 6);
  });
});

describe("화면별 배치", () => {
  it("입력 화면에서는 손이 없다(alpha 0)", () => {
    expect(handsLayout("details", false).alpha).toBe(0);
    expect(handsLayout("details", true).alpha).toBe(0);
  });

  it("유형 화면의 손은 첫 화면보다 아래에 있고 작다", () => {
    const hero = handsLayout("hero", false);
    const type = handsLayout("type", false);
    expect(type.cy).toBeGreaterThan(hero.cy);
    expect(type.hw).toBeLessThan(hero.hw);
  });

  it("목표 배치로 조금씩 다가가고, 충분히 지나면 거의 도착한다", () => {
    const from = handsLayout("hero", false);
    const to = handsLayout("details", false);
    const step = approachLayout(from, to, 0.016);
    expect(step.alpha).toBeLessThan(from.alpha);
    expect(step.alpha).toBeGreaterThan(to.alpha);
    let cur = from;
    for (let i = 0; i < 300; i++) cur = approachLayout(cur, to, 0.016);
    expect(cur.alpha).toBeLessThan(0.01);
  });
});

describe("quietFactor: 글이 있는 곳과 손끝이 만나는 곳은 비운다", () => {
  const layout = handsLayout("hero", false);

  it("가운데 손끝이 만나는 곳은 점이 없다", () => {
    expect(quietFactor(100, 205, 500, 900, layout)).toBe(0);
  });

  it("글 영역 안은 점이 없고, 멀리 떨어진 곳은 그대로다", () => {
    const cols = 205;
    const rowY = 0.385 * 900;
    expect(quietFactor(Math.floor(cols * 0.4), cols, rowY, 900, layout)).toBe(0);
    expect(quietFactor(5, cols, 0.85 * 900, 900, layout)).toBe(1);
  });
});
