// Design Ref: PRD nice "진행 기록 화면" — 한 운동의 운동 전·후 통증 변화를 선 그래프로 그린다.
// 라이브러리 없이 SVG만 쓴다. 상태가 없는 순수 컴포넌트라 서버에서도 그릴 수 있다.

import { PAIN_BLOCK_THRESHOLD, PAIN_MAX, PAIN_MIN } from "../lib/constants";
import type { LogEntry } from "../lib/log";

const W = 640;
const H = 280;
const M = { left: 40, right: 16, top: 16, bottom: 36 };
/** 그래프에는 읽기 좋도록 최근 기록만 그린다. */
export const CHART_MAX_POINTS = 20;

const y = (pain: number) =>
  M.top + ((PAIN_MAX - pain) / (PAIN_MAX - PAIN_MIN)) * (H - M.top - M.bottom);

function shortDate(date: string): string {
  return date.slice(5); // MM-DD
}

export function PainChart({ entries }: { entries: LogEntry[] }) {
  const points = entries.slice(-CHART_MAX_POINTS);
  const n = points.length;
  const x = (i: number) =>
    n === 1 ? (M.left + (W - M.right)) / 2 : M.left + (i / (n - 1)) * (W - M.left - M.right);

  const afterPath = points.map((e, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(e.pain)}`).join(" ");
  const beforePoints = points
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.painBefore !== undefined);
  const beforePath = beforePoints
    .map(({ e, i }, k) => `${k === 0 ? "M" : "L"}${x(i)},${y(e.painBefore as number)}`)
    .join(" ");

  // 아래쪽 날짜 이름표는 6개 안팎만 보여 준다.
  const labelEvery = Math.max(1, Math.ceil(n / 6));
  const last = points[n - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`운동 전·후 통증 변화 그래프. 기록 ${n}개, 가장 최근 운동 후 통증 ${last?.pain ?? 0}점`}
      className="h-auto w-full"
    >
      {/* 눈금: 0, 2, 4 ... 10점 */}
      {[0, 2, 4, 6, 8, 10].map((p) => (
        <g key={p}>
          <line x1={M.left} x2={W - M.right} y1={y(p)} y2={y(p)} className="stroke-line" strokeWidth={1} />
          <text x={M.left - 8} y={y(p) + 4} textAnchor="end" className="fill-muted text-[11px]">
            {p}
          </text>
        </g>
      ))}

      {/* 중단 기준선(6점) */}
      <line
        x1={M.left}
        x2={W - M.right}
        y1={y(PAIN_BLOCK_THRESHOLD)}
        y2={y(PAIN_BLOCK_THRESHOLD)}
        className="stroke-foreground"
        strokeWidth={1.5}
        strokeDasharray="6 5"
      />
      <text
        x={W - M.right - 4}
        y={y(PAIN_BLOCK_THRESHOLD) - 6}
        textAnchor="end"
        className="fill-foreground text-[11px] font-semibold"
      >
        {PAIN_BLOCK_THRESHOLD}점 · 병원 상담 기준
      </text>

      {/* 운동 전 통증: 점선 + 속이 빈 점 */}
      {beforePoints.length > 1 ? (
        <path d={beforePath} className="fill-none stroke-muted" strokeWidth={2} strokeDasharray="2 5" strokeLinecap="round" />
      ) : null}
      {beforePoints.map(({ e, i }) => (
        <circle
          key={`b-${e.id}`}
          cx={x(i)}
          cy={y(e.painBefore as number)}
          r={4}
          className="fill-surface stroke-muted"
          strokeWidth={2}
        />
      ))}

      {/* 운동 후 통증: 실선 + 채운 점 */}
      {n > 1 ? <path d={afterPath} className="fill-none stroke-foreground" strokeWidth={2.5} strokeLinejoin="round" /> : null}
      {points.map((e, i) => (
        <circle key={`a-${e.id}`} cx={x(i)} cy={y(e.pain)} r={4.5} className="fill-foreground" />
      ))}

      {/* 날짜 */}
      {points.map((e, i) =>
        i % labelEvery === 0 || i === n - 1 ? (
          <text key={`d-${e.id}`} x={x(i)} y={H - 12} textAnchor="middle" className="fill-muted text-[11px]">
            {shortDate(e.date)}
          </text>
        ) : null,
      )}
    </svg>
  );
}
