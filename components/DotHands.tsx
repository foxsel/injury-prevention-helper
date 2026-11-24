"use client";

// Design Ref: 첫 화면 "점으로 그린 두 손" 배경 — 사진의 밝기를 가로줄 점(LED 전광판 느낌)으로 바꿔 매 프레임 그린다.
// 영상이나 GIF가 아니라 캔버스에 실시간으로 그리며, 두 손이 천천히 움직이고 가끔 점 단위로 다른 자세로 바뀐다.
// 계산(위치·점 크기·바뀌는 순서)은 lib/dotMatrix.ts에 있고, 이 파일은 그리는 일만 한다.

import { useEffect, useRef } from "react";
import {
  LOOP,
  SRC,
  approachLayout,
  cellSeed,
  clamp,
  dotRadius,
  dotValue,
  glitchFront,
  handPlacement,
  handsLayout,
  hash,
  poseMix,
  quantise,
  quietFactor,
  rowShift,
  type HandsMode,
} from "../lib/dotMatrix";

/**
 * 손 사진 묶음(2×2, 흰 배경 위 흑백 손 네 장)의 주소.
 * 브라우저에서 읽어 점으로 바꾸는 재료로만 쓴다. 파일을 못 읽으면 손 없이 글과 버튼만 보인다.
 * 방문자 정보가 제3자 서버로 나가지 않도록 외부 주소가 아니라 프로젝트의 public/hands.webp를 쓴다.
 */
export const HANDS_SHEET_URL = "/hands.webp";

const TILE_WIDTH = 420;
type TileKey = keyof typeof SRC;

interface Engine {
  /** 화면(단계)이 바뀌었을 때 호출 */
  modeChanged: () => void;
}

export function DotHands({ mode }: { mode: HandsMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef<HandsMode>(mode);
  const engineRef = useRef<Engine | null>(null);

  // 화면이 바뀌면 목표 배치를 바꾼다. 실제로 손이 옮겨가는 것은 아래 그리기 반복이 부드럽게 처리한다.
  useEffect(() => {
    modeRef.current = mode;
    engineRef.current?.modeChanged();
  }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const ctx: CanvasRenderingContext2D = context;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");

    let width = 0;
    let height = 0;
    let dpr = 1;
    let step = 0;
    let rowStep = 0;
    let cols = 0;
    let rows = 0;
    let fieldA: CanvasRenderingContext2D | null = null;
    let fieldB: CanvasRenderingContext2D | null = null;
    let tiles: Record<TileKey, HTMLCanvasElement> | null = null;
    let layout = handsLayout(modeRef.current, false);
    let dotColor = "#0d0d0d";
    let raf = 0;
    let lastNow = performance.now();
    const startedAt = lastNow;

    function readDotColor() {
      const value = getComputedStyle(document.documentElement).getPropertyValue("--dots").trim();
      dotColor = value || "#0d0d0d";
    }

    function makeField(): CanvasRenderingContext2D | null {
      const field = document.createElement("canvas");
      field.width = cols;
      field.height = rows;
      return field.getContext("2d", { willReadFrequently: true });
    }

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      step = Math.max(5, width / 205);
      rowStep = step * 2.05;
      cols = Math.ceil(width / step);
      rows = Math.ceil(height / rowStep);
      fieldA = makeField();
      fieldB = makeField();
    }

    function buildTiles(image: HTMLImageElement) {
      const built = {} as Record<TileKey, HTMLCanvasElement>;
      for (const key of Object.keys(SRC) as TileKey[]) {
        const [fx, fy, fw, fh] = SRC[key];
        const sx = fx * image.naturalWidth;
        const sy = fy * image.naturalHeight;
        const sw = fw * image.naturalWidth;
        const sh = fh * image.naturalHeight;
        const tile = document.createElement("canvas");
        tile.width = TILE_WIDTH;
        tile.height = Math.round(TILE_WIDTH * (sh / sw));
        const tileCtx = tile.getContext("2d");
        if (!tileCtx) return;
        tileCtx.imageSmoothingQuality = "high";
        tileCtx.drawImage(image, sx, sy, sw, sh, 0, 0, tile.width, tile.height);
        built[key] = tile;
      }
      tiles = built;
    }

    // 한 자세(두 손)를 작은 밑그림(한 점이 한 픽셀)에 그린다.
    function drawPose(
      field: CanvasRenderingContext2D,
      leftTile: HTMLCanvasElement,
      rightTile: HTMLCanvasElement,
      t: number,
    ) {
      field.setTransform(1, 0, 0, 1, 0, 0);
      field.fillStyle = "#fff";
      field.fillRect(0, 0, cols, rows);
      for (const [side, tile] of [
        ["left", leftTile],
        ["right", rightTile],
      ] as const) {
        const p = handPlacement(side, t, width, height, layout);
        field.setTransform(cols / width, 0, 0, rows / height, 0, 0);
        field.translate(p.pivotX, p.cy);
        field.rotate(p.rot);
        field.scale(p.scale, p.scale);
        field.translate(-p.pivotX, -p.cy);
        field.drawImage(tile, p.x, p.cy - p.h / 2, p.w, p.h);
      }
      field.setTransform(1, 0, 0, 1, 0, 0);
    }

    function render(rawT: number, dt: number) {
      layout = approachLayout(layout, handsLayout(modeRef.current, height > width), dt);
      ctx.clearRect(0, 0, width, height);
      if (!tiles || !fieldA || !fieldB || layout.alpha < 0.01) return;

      const t = ((rawT % LOOP) + LOOP) % LOOP;
      drawPose(fieldA, tiles.LA, tiles.RA, t);
      drawPose(fieldB, tiles.LB, tiles.RB, t);
      const dataA = fieldA.getImageData(0, 0, cols, rows).data;
      const dataB = fieldB.getImageData(0, 0, cols, rows).data;

      const mixLeft = poseMix(t, "left");
      const mixRight = poseMix(t, "right");
      const tick = Math.floor(t * 7);
      const baseRadius = step * 0.46;

      ctx.globalAlpha = layout.alpha;
      ctx.fillStyle = dotColor;
      ctx.beginPath();

      for (let j = 0; j < rows; j++) {
        const shift = rowShift(j, tick);
        const cy = (j + 0.5) * rowStep;
        for (let i = 0; i < cols; i++) {
          const seed = cellSeed(i, j);
          const mix = i < cols / 2 ? mixLeft : mixRight;
          const data = seed < mix ? dataB : dataA;
          const sampleCol = clamp(i - shift, 0, cols - 1);
          const luminance = data[(j * cols + sampleCol) * 4] / 255;

          let v = dotValue(luminance);
          if (v <= 0) continue;
          v *= glitchFront(seed, mix, hash(i + tick, j));
          v *= 0.86 + 0.14 * Math.sin(t * 3.2 + seed * 40);
          v *= quietFactor(i, cols, cy, height, layout);

          const radius = dotRadius(quantise(v), baseRadius);
          if (radius <= 0) continue;
          const cx = (i + 0.5) * step;
          ctx.moveTo(cx + radius, cy);
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        }
      }
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    function frame(now: number) {
      const dt = Math.min(0.1, (now - lastNow) / 1000);
      lastNow = now;
      render((now - startedAt) / 1000, dt);
      raf = requestAnimationFrame(frame);
    }

    // 움직임을 줄이는 설정이면 멈춘 그림 한 장만 그린다.
    function drawStill() {
      layout = handsLayout(modeRef.current, height > width);
      render(0, 0);
    }

    function start() {
      cancelAnimationFrame(raf);
      if (reduceMotion.matches) {
        drawStill();
      } else {
        lastNow = performance.now();
        raf = requestAnimationFrame(frame);
      }
    }

    engineRef.current = {
      modeChanged: () => {
        if (reduceMotion.matches) drawStill();
      },
    };

    readDotColor();
    resize();
    layout = handsLayout(modeRef.current, height > width);

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      buildTiles(image);
      start();
    };
    image.onerror = () => {
      // 그림을 읽지 못하면 손 없이 글과 버튼만 보인다.
      tiles = null;
    };
    image.src = HANDS_SHEET_URL;

    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (reduceMotion.matches) drawStill();
    });
    resizeObserver.observe(canvas);

    const onScheme = () => {
      readDotColor();
      if (reduceMotion.matches) drawStill();
    };
    colorScheme.addEventListener("change", onScheme);
    reduceMotion.addEventListener("change", start);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      colorScheme.removeEventListener("change", onScheme);
      reduceMotion.removeEventListener("change", start);
      image.onload = null;
      image.onerror = null;
      engineRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 block h-full w-full"
    />
  );
}
