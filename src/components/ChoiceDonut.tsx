"use client";

import { useRef, useState } from "react";

export type DonutSlice = { label: string; count: number; color: string };

// Géométrie du camembert (donut).
function polar(cx: number, cy: number, r: number, angle: number): [number, number] {
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}
function slicePath(cx: number, cy: number, R: number, r: number, a0: number, a1: number): string {
  const [x0o, y0o] = polar(cx, cy, R, a0);
  const [x1o, y1o] = polar(cx, cy, R, a1);
  const [x1i, y1i] = polar(cx, cy, r, a1);
  const [x0i, y0i] = polar(cx, cy, r, a0);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${x0o} ${y0o} A ${R} ${R} 0 ${large} 1 ${x1o} ${y1o} `
    + `L ${x1i} ${y1i} A ${r} ${r} 0 ${large} 0 ${x0i} ${y0i} Z`;
}

// Camembert (donut) interactif : survol d'une tranche → elle ressort + tooltip stylé qui
// suit le curseur, les autres tranches s'atténuent. La légende partage le même survol.
export default function ChoiceDonut({
  slices,
  total,
  unit,
}: {
  slices: DonutSlice[];
  total: number;
  unit: string;
}) {
  const R = 92;
  const r = 56;
  const cx = 100;
  const cy = 100;
  const start = -Math.PI / 2;

  const [active, setActive] = useState<number | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const visible = slices.filter((s) => s.count > 0);
  const single = visible.length === 1;

  let angle = start;
  const arcs = visible.map((s) => {
    const frac = s.count / total;
    const a0 = angle;
    const a1 = angle + frac * Math.PI * 2;
    angle = a1;
    return { ...s, a0, a1, mid: (a0 + a1) / 2, pct: Math.round(frac * 1000) / 10 };
  });

  function track(e: React.MouseEvent) {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (rect) setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  const tip = active !== null ? arcs[active] : null;

  return (
    <div
      ref={wrapRef}
      className="relative flex flex-wrap items-center gap-5"
      onMouseLeave={() => {
        setActive(null);
        setPos(null);
      }}
    >
      <svg
        viewBox="0 0 200 200"
        className="h-52 w-52 shrink-0 overflow-visible"
        role="img"
        aria-label={`Répartition : ${arcs.map((a) => `${a.label} ${a.pct}%`).join(", ")}`}
      >
        {single ? (
          <circle
            cx={cx}
            cy={cy}
            r={(R + r) / 2}
            fill="none"
            stroke={arcs[0].color}
            strokeWidth={R - r}
            style={{ cursor: "pointer" }}
            onMouseEnter={(e) => {
              setActive(0);
              track(e);
            }}
            onMouseMove={track}
          />
        ) : (
          arcs.map((a, i) => {
            const isActive = active === i;
            const dim = active !== null && !isActive;
            const off = isActive ? 7 : 0;
            return (
              <path
                key={i}
                d={slicePath(cx, cy, R, r, a.a0, a.a1)}
                fill={a.color}
                stroke="#ffffff"
                strokeWidth={2}
                style={{
                  cursor: "pointer",
                  opacity: dim ? 0.45 : 1,
                  transform: `translate(${Math.cos(a.mid) * off}px, ${Math.sin(a.mid) * off}px)`,
                  transition: "transform 160ms ease, opacity 160ms ease",
                  filter: isActive ? "drop-shadow(0 1px 3px rgba(0,0,0,0.28))" : "none",
                }}
                onMouseEnter={(e) => {
                  setActive(i);
                  track(e);
                }}
                onMouseMove={track}
              />
            );
          })
        )}
        <text x={cx} y={cy - 4} textAnchor="middle" className="fill-zinc-900" style={{ fontSize: 26, fontWeight: 700 }}>
          {total}
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" className="fill-zinc-500" style={{ fontSize: 11 }}>
          {unit}
        </text>
      </svg>

      <ul className="min-w-[9rem] flex-1 space-y-0.5">
        {arcs.map((a, i) => (
          <li
            key={a.label}
            className={`flex items-center gap-2 rounded-md px-1.5 py-1 text-sm transition-colors ${
              active === i ? "bg-zinc-100" : ""
            } ${active !== null && active !== i ? "opacity-45" : ""}`}
            style={{ cursor: "pointer" }}
            onMouseEnter={() => {
              setActive(i);
              setPos(null);
            }}
          >
            <span className="inline-block h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: a.color }} aria-hidden />
            <span className="flex-1 text-zinc-700">{a.label}</span>
            <span className="tabular-nums font-medium text-zinc-900">{a.count}</span>
            <span className="tabular-nums text-zinc-400">{a.pct}%</span>
          </li>
        ))}
      </ul>

      {tip && pos && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-zinc-900/95 px-2.5 py-1.5 text-xs text-white shadow-lg ring-1 ring-black/5"
          style={{ left: pos.x, top: pos.y - 10 }}
          role="tooltip"
        >
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: tip.color }} aria-hidden />
            <span className="font-medium">{tip.label}</span>
          </div>
          <div className="mt-0.5 whitespace-nowrap">
            <span className="font-semibold tabular-nums">{tip.count}</span>{" "}
            <span className="text-zinc-300">({tip.pct}%)</span>
          </div>
          <span
            className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-4 border-t-4 border-x-transparent border-t-zinc-900/95"
            aria-hidden
          />
        </div>
      )}
    </div>
  );
}
