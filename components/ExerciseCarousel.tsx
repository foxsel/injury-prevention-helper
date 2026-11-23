"use client";

// Design Ref: §3.1 결과 영역 — 추천 운동을 비디오테이프처럼 휘어진 선반 위에 세우고, 좌우로 돌려 고른다.
// Plan SC: 카드에는 이름만 보이고, 주의사항은 이 화면과 상세 화면 모두에 보인다.
// 모든 움직임은 requestAnimationFrame 한 개가 계산한다(스프링). 값은 DOM에 바로 써서 React가 매 프레임 다시 그리지 않는다.

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Exercise } from "../lib/exercises/types";
import { NOTICE_NOT_MEDICAL, NOTICE_PROTOTYPE } from "../lib/notices";
import { ExerciseDetail } from "./ExerciseDetail";
import { CoverArt, SpineArt, tagLine } from "./TapeArt";

/** 추천된 모든 운동에 똑같이 들어 있는 중단 기준(한 번만 보여 준다) */
export function commonStopCriteria(exercises: Exercise[]): string[] {
  if (exercises.length === 0) return [];
  return exercises[0].stopCriteria.filter((c) => exercises.every((e) => e.stopCriteria.includes(c)));
}

/** 가상 테이프 v가 지금 위치 s에서 얼마나 떨어져 있는지(원형, -V/2 이상 V/2 미만). 0이 가운데. */
export function rel(v: number, s: number, total: number): number {
  let x = (((v - s) % total) + total) % total;
  if (x >= total / 2) x -= total;
  return x;
}

/** 가상 테이프 개수: 운동 수의 배수로, 선반 양옆을 채울 만큼 늘린다. */
export function virtualCount(n: number): number {
  return n * Math.ceil(24 / n);
}

const smooth = (t: number) => t * t * (3 - 2 * t);
const P = 1400; // CSS perspective(px)

interface Geo {
  H: number;
  ws: number;
  d: number;
  gap: number;
  U: number;
  xs: number[];
}

function measure(): Geo {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const phone = w < 768;
  const H = phone ? Math.min(0.68 * w, 0.4 * h) : Math.min(0.47 * h, 0.33 * w);
  const U = H * (phone ? 1.05 : 1.3);
  const xs = [0];
  for (let u = 2; u <= 3 * U; u += 2) {
    const mid = u - 1;
    xs.push(xs[xs.length - 1] + 2 / (1 + Math.pow(mid / U, 1.6)));
  }
  return { H, ws: (H * 142) / 840, d: (H * 474) / 900, gap: H * 0.035, U, xs };
}

const BTN =
  "inline-flex h-9 items-center rounded-full bg-surface px-4 text-[11px] font-semibold tracking-[0.14em] ring-1 ring-foreground/80 transition hover:bg-accent hover:text-on-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground";
const ARROW =
  "absolute top-[18px] z-20 flex size-11 items-center justify-center rounded-full ring-1 ring-foreground/80 bg-surface/80 transition hover:bg-accent hover:text-on-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground";

export function ExerciseCarousel({
  exercises,
  onBack,
}: {
  exercises: Exercise[];
  onBack: () => void;
}) {
  const n = exercises.length;
  const total = virtualCount(n);
  const start = Math.floor(total / (2 * n)) * n;
  const common = commonStopCriteria(exercises);

  const [active, setActive] = useState(0);
  const [dir, setDir] = useState(1);
  const [detail, setDetail] = useState<{ index: number; rect: DOMRect } | null>(null);

  const shelf = useRef<HTMLDivElement>(null);
  const tapes = useRef<(HTMLDivElement | null)[]>([]);
  const dot = useRef<HTMLSpanElement>(null);
  const geo = useRef<Geo | null>(null);
  const st = useRef({
    s: start,
    T: start,
    active: 0,
    lift: [] as number[],
    hover: -1,
    tiltX: 0,
    tiltY: 0,
    mx: -1,
    my: -1,
    locked: false,
    dotX: 0,
    drag: null as null | { x: number; T0: number; moved: boolean; v: number },
    snap: 0 as ReturnType<typeof setTimeout> | 0,
  });

  const go = useCallback((delta: number) => {
    const S = st.current;
    if (S.locked) return;
    S.T = Math.round(S.T) + delta;
  }, []);

  const openAt = useCallback(
    (v: number) => {
      const S = st.current;
      const vv = ((v % total) + total) % total;
      const cover = tapes.current[vv]?.lastElementChild as HTMLElement | null;
      if (!cover || S.locked) return;
      S.locked = true;
      setDetail({ index: ((Math.round(S.s) % n) + n) % n, rect: cover.getBoundingClientRect() });
    },
    [n, total],
  );

  // 크기 재기 + 매 프레임 계산
  useEffect(() => {
    const S = st.current;
    const el = shelf.current!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const applySize = () => {
      const g = measure();
      geo.current = g;
      el.style.setProperty("--H", `${g.H}px`);
      el.style.setProperty("--ws", `${g.ws}px`);
      el.style.setProperty("--d", `${g.d}px`);
    };
    applySize();
    window.addEventListener("resize", applySize);

    const onMove = (e: PointerEvent) => {
      S.mx = e.clientX;
      S.my = e.clientY;
      const g = geo.current!;
      const dr = S.drag;
      if (dr) {
        const dx = e.clientX - dr.x;
        if (Math.abs(dx) > 5) dr.moved = true;
        if (dr.moved) S.T = dr.T0 - dx / (g.ws + g.gap);
      }
    };
    const onUp = () => {
      const dr = S.drag;
      if (!dr) return;
      S.drag = null;
      if (dr.moved) {
        S.T = Math.round(S.T);
      } else if (dr.v >= 0) {
        const r = rel(dr.v, S.s, total);
        if (Math.abs(r) < 0.5) openAt(dr.v);
        else S.T = Math.round(S.T + r);
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const g = geo.current!;
      const { H, ws, d, gap, U, xs } = g;

      // 스프링
      const k = S.drag?.moved ? 18 : 5.2;
      S.s = reduce ? S.T : S.s + (S.T - S.s) * (1 - Math.exp(-k * dt));
      if (Math.abs(S.T - S.s) < 1e-4) S.s = S.T;

      // 지금 가운데 운동
      const a = ((Math.round(S.s) % n) + n) % n;
      if (a !== S.active) {
        S.active = a;
        setDir(S.T - S.s >= 0 ? 1 : -1);
        setActive(a);
      }

      // 가운데 카드 기울이기
      const box = el.getBoundingClientRect();
      const cx = box.left + box.width / 2;
      const cy = box.top + box.height / 2;
      const settled = Math.abs(S.T - S.s) < 0.3 && !S.locked;
      const onCover =
        settled && S.mx >= 0 && Math.abs(S.mx - cx) < 0.55 * d && Math.abs(S.my - cy) < 0.55 * H;
      const ty = onCover ? ((S.mx - cx) / (0.55 * d)) * 8 : S.mx >= 0 ? ((S.mx - cx) / box.width) * 4 : 0;
      const tx = onCover ? (-(S.my - cy) / (H / 2)) * 5 : 0;
      const ek = reduce ? 1 : 1 - Math.exp(-7 * dt);
      S.tiltY += (ty - S.tiltY) * ek;
      S.tiltX += (tx - S.tiltX) * ek;

      const F = (r: number) => {
        const B = Math.abs(r) < 1 ? (r + Math.sin(Math.PI * r) / Math.PI) / 2 : Math.sign(r) * 0.5;
        return r * (ws + gap) + (d - ws + 1.4 * gap) * B;
      };
      const scl = (u: number) => 1 / (1 + Math.pow(Math.abs(u) / U, 1.6));
      const xsc = (u: number) => {
        const f = Math.abs(u) / 2;
        const i = Math.min(xs.length - 2, Math.floor(f));
        return Math.sign(u) * (xs[i] + (xs[i + 1] - xs[i]) * (f - i));
      };

      for (let v = 0; v < total; v++) {
        const tape = tapes.current[v];
        if (!tape) continue;
        const r = rel(v, S.s, total);
        const u = F(r);
        if (Math.abs(u) > U * 1.95) {
          tape.style.display = "none";
          continue;
        }
        tape.style.display = "";
        // 마우스를 올린 옆 테이프는 살짝 올라온다.
        const target = S.hover === v && Math.abs(r) > 0.5 && !S.drag?.moved ? 1 : 0;
        S.lift[v] = (S.lift[v] ?? 0) + (target - (S.lift[v] ?? 0)) * (reduce ? 1 : 1 - Math.exp(-12 * dt));

        const o = smooth(Math.max(0, 1 - Math.abs(r)));
        const sc = scl(u);
        const kk = 1 / sc;
        const z = P * (1 - kk) + o * H * 0.1;
        const x = xsc(u) * kk;
        const y = (H * 0.5 * (1 - sc) * 0.42 + o * H * 0.012 - (S.lift[v] ?? 0) * H * 0.05) * kk;
        const ry =
          Math.sign(u) * Math.min(1, Math.abs(u) / U) * 26 * (1 - o) - 90 * o + S.tiltY * o;
        tape.style.transform = `translate3d(${x}px,${y}px,${z}px) rotateX(${S.tiltX * o}deg) rotateY(${ry}deg)`;
        tape.style.zIndex = String(Math.round(3000 + z));
        (tape.firstElementChild as HTMLElement).style.setProperty(
          "--shade",
          String(Math.min(0.6, o * 0.55 + (1 - sc) * 0.32)),
        );
        (tape.lastElementChild as HTMLElement).style.setProperty("--shade", String((1 - o) * 0.82));
      }

      // 아래 눈금의 점
      if (dot.current) {
        const goal = n > 1 ? a / (n - 1) : 0.5;
        S.dotX += (goal - S.dotX) * (reduce ? 1 : 1 - Math.exp(-14 * dt));
        dot.current.style.left = `${S.dotX * 100}%`;
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", applySize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (S.snap) clearTimeout(S.snap);
    };
  }, [n, total, openAt]);

  // 방향키: 한 칸씩 돌린다. Enter: 가운데 운동을 연다.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (st.current.locked) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "Enter" && tag !== "BUTTON" && tag !== "A") openAt(Math.round(st.current.s));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, openAt]);

  const getCloseRect = useCallback(() => {
    const vv = ((Math.round(st.current.s) % total) + total) % total;
    const cover = tapes.current[vv]?.lastElementChild as HTMLElement | null;
    return cover ? cover.getBoundingClientRect() : new DOMRect(0, 0, 0, 0);
  }, [total]);

  const onClosed = useCallback(() => {
    st.current.locked = false;
    setDetail(null);
  }, []);

  const current = exercises[active];

  return (
    <section
      aria-labelledby="step-heading"
      className="paper-grain relative flex min-h-[760px] flex-1 flex-col overflow-hidden bg-background"
    >
      {/* 뒤쪽에 크게 깔린 점 글자 */}
      <span aria-hidden="true" className="halftone-word left-[2.4vw] top-[13vh]">
        추천
      </span>
      <span aria-hidden="true" className="halftone-word right-[2.4vw] top-[9vh]">
        운동
      </span>

      {/* 위쪽 줄 */}
      <div className="relative z-30 flex h-[76px] items-center justify-end px-5 sm:px-9">
        <button type="button" onClick={onBack} className={BTN}>
          ← 다시 입력하기
        </button>
      </div>

      {/* 선반 */}
      <div
        ref={shelf}
        className="relative z-10 touch-pan-y select-none [--H:320px] [--d:168px] [--ws:54px]"
        style={{ height: "calc(var(--H) + 100px)", perspective: "1400px" }}
        onPointerDown={(e) => {
          if (st.current.locked) return;
          const t = (e.target as HTMLElement).closest<HTMLElement>("[data-v]");
          st.current.drag = {
            x: e.clientX,
            T0: st.current.T,
            moved: false,
            v: t ? Number(t.dataset.v) : -1,
          };
        }}
        onPointerOver={(e) => {
          const t = (e.target as HTMLElement).closest<HTMLElement>("[data-v]");
          st.current.hover = t ? Number(t.dataset.v) : -1;
        }}
        onPointerLeave={() => {
          st.current.hover = -1;
        }}
        onWheel={(e) => {
          const S = st.current;
          if (S.locked || !geo.current) return;
          const dlt = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
          S.T += (dlt / (geo.current.ws + geo.current.gap)) * 0.5;
          if (S.snap) clearTimeout(S.snap);
          S.snap = setTimeout(() => {
            S.T = Math.round(S.T);
          }, 160);
        }}
      >
        {/* 바닥 그림자 */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            top: "calc(50% + var(--H) * .47)",
            width: "min(96vw, calc(var(--H) * 3.6))",
            height: "calc(var(--H) * .26)",
            background:
              "radial-gradient(50% 50% at 50% 40%, rgba(40,32,20,.30), rgba(40,32,20,.10) 55%, transparent 72%)",
          }}
        />
        <div className="absolute left-1/2 top-1/2 size-0 [transform-style:preserve-3d]">
          {Array.from({ length: total }, (_, v) => {
            const i = v % n;
            return (
              <div
                key={v}
                data-v={v}
                aria-hidden="true"
                ref={(el) => {
                  tapes.current[v] = el;
                }}
                className="absolute left-0 top-0 size-0 cursor-pointer [transform-style:preserve-3d]"
              >
                {/* 옆면(spine) */}
                <div
                  className="absolute overflow-hidden rounded-[2px] [backface-visibility:hidden]"
                  style={{
                    width: "var(--ws)",
                    height: "var(--H)",
                    left: "calc(var(--ws) / -2)",
                    top: "calc(var(--H) / -2)",
                    transform: "translateZ(calc(var(--d) / 2))",
                    fontSize: "calc(var(--H) / 18)",
                  }}
                >
                  <SpineArt exercise={exercises[i]} index={i} />
                  <i className="absolute inset-0 bg-black" style={{ opacity: "var(--shade, 0)" }} />
                </div>
                {/* 앞면(cover) */}
                <div
                  className="absolute overflow-hidden rounded-[2px] shadow-[0_34px_60px_-30px_rgba(20,16,10,0.6)] [backface-visibility:hidden]"
                  style={{
                    width: "var(--d)",
                    height: "var(--H)",
                    left: "calc(var(--d) / -2)",
                    top: "calc(var(--H) / -2)",
                    transform: "rotateY(90deg) translateZ(calc(var(--ws) / 2))",
                    fontSize: "calc(var(--H) / 18)",
                  }}
                >
                  <CoverArt exercise={exercises[i]} index={i} total={n} />
                  <i className="absolute inset-0 bg-black" style={{ opacity: "var(--shade, 0.82)" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 설명 줄 */}
      <div className="relative z-20 mt-[clamp(6px,2.4vh,30px)] flex flex-col items-center text-center">
        <button
          type="button"
          aria-label="이전 운동"
          onClick={() => go(-1)}
          className={`${ARROW} left-[max(16px,calc(50%-min(19vw,250px)-22px))] max-md:left-4 max-md:top-[104px]`}
        >
          <svg width="24" height="12" viewBox="0 0 25 12" fill="none" aria-hidden="true">
            <path d="M6 1L1 6l5 5M1 6h23" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="다음 운동"
          onClick={() => go(1)}
          className={`${ARROW} right-[max(16px,calc(50%-min(19vw,250px)-22px))] max-md:right-4 max-md:top-[104px]`}
        >
          <svg width="24" height="12" viewBox="0 0 25 12" fill="none" aria-hidden="true">
            <path d="M19 1l5 5-5 5M24 6H1" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>

        <div key={active} className="grid gap-2.5" style={{ ["--dir" as string]: dir }}>
          <div className="overflow-hidden px-1 pb-1">
            <h2
              id="step-heading"
              tabIndex={-1}
              aria-live="polite"
              className="cap-line max-w-[min(80vw,640px)] text-[clamp(28px,3.4vw,46px)] font-semibold leading-[1.15] tracking-[-0.025em] outline-none"
            >
              {current.name}
            </h2>
          </div>
          <div className="overflow-hidden">
            <p className="cap-line text-[11px] font-semibold tracking-[0.2em]">{tagLine(current)}</p>
          </div>
          <span aria-hidden="true" className="mx-auto h-px w-[18px] bg-foreground" />
          <button
            type="button"
            onClick={() => openAt(Math.round(st.current.s))}
            className="mx-auto text-[12px] font-medium tracking-[0.08em] text-muted underline underline-offset-4 transition hover:text-foreground"
          >
            자세히 보기 ↗
          </button>
        </div>
      </div>

      <div className="min-h-6 flex-1" />

      {/* 아래 눈금: 몇 번째 운동인지 */}
      <div
        className="relative z-20 mx-5 h-10 cursor-pointer sm:mx-9"
        onClick={(e) => {
          const S = st.current;
          if (S.locked || n < 2) return;
          const box = e.currentTarget.getBoundingClientRect();
          const f = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width));
          const target = Math.round(f * (n - 1));
          let delta = target - (((Math.round(S.T) % n) + n) % n);
          if (delta > n / 2) delta -= n;
          if (delta < -n / 2) delta += n;
          S.T = Math.round(S.T) + delta;
        }}
      >
        <span aria-hidden="true" className="absolute inset-x-0 top-3 h-px bg-foreground/75" />
        {exercises.map((_, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="absolute top-3 flex -translate-x-1/2 flex-col items-center"
            style={{ left: `${(n > 1 ? i / (n - 1) : 0.5) * 100}%` }}
          >
            <span className="h-[13px] w-px bg-foreground/75" />
            <span className="mt-1 text-[9.5px] font-medium tracking-[0.08em]">
              {String(i + 1).padStart(2, "0")}
            </span>
          </span>
        ))}
        <span
          ref={dot}
          aria-hidden="true"
          className="absolute top-3 size-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground"
          style={{ left: n > 1 ? "0%" : "50%" }}
        />
      </div>

      {/* 주의사항: 카드가 모두 보이는 이 화면에서도 보여 준다. */}
      <div
        role="note"
        className="relative z-20 mx-5 mb-2 mt-3 border border-foreground/80 bg-surface/80 px-4 py-3 text-xs leading-5 backdrop-blur sm:mx-9"
      >
        <p>
          <span className="font-semibold tracking-[0.08em]">운동할 때 꼭 지켜 주세요 · </span>
          {common.length > 0 ? common.join(" ") : "운동 중 통증이 심해지면 바로 멈추세요."}
        </p>
      </div>
      <p className="relative z-20 px-4 pb-4 text-center text-[10.5px] font-semibold tracking-[0.12em] text-muted">
        {NOTICE_NOT_MEDICAL} · {NOTICE_PROTOTYPE}
      </p>

      {detail
        ? createPortal(
            <ExerciseDetail
              exercise={exercises[detail.index]}
              index={detail.index}
              total={n}
              common={common}
              originRect={detail.rect}
              getCloseRect={getCloseRect}
              onClosed={onClosed}
            />,
            document.body,
          )
        : null}
    </section>
  );
}
