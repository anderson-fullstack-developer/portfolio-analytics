"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { Point } from "@/lib/analytics";
import { formatInt } from "@/lib/format";

const HEIGHT = 260;
const M = { top: 14, right: 8, bottom: 30, left: 40 };

// Escala com valores redondos (1, 2, 5 × 10ⁿ) e sempre inteiros.
function niceTicks(max: number) {
  const rough = Math.max(max / 4, 1);
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = Math.max(1, [1, 2, 5, 10].map((n) => n * power).find((n) => n >= rough) ?? power * 10);
  const ticks: number[] = [];
  for (let v = 0; v <= Math.max(max, step); v += step) {
    ticks.push(v);
  }
  if (ticks[ticks.length - 1] < max) {
    ticks.push(ticks[ticks.length - 1] + step);
  }
  return ticks;
}

// Coluna com topo arredondado (4px) e base reta, a crescer da linha de base.
function columnPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

export function VisitsChart({ points, unit }: { points: Point[]; unit: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(760);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.floor(entry.contentRect.width))));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const innerW = width - M.left - M.right;
  const innerH = HEIGHT - M.top - M.bottom;
  const max = Math.max(...points.map((p) => p.value), 0);
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  const band = innerW / Math.max(points.length, 1);
  const barW = Math.max(1, Math.min(24, band >= 8 ? band * 0.62 : band - 2));
  const y = (v: number) => M.top + innerH - (v / top) * innerH;

  // Poucas datas no eixo: início, meio e fim (e mais em ecrãs largos).
  const labelCount = Math.min(points.length, width < 520 ? 3 : 6);
  const labelIdx = new Set(
    Array.from({ length: labelCount }, (_, i) => Math.round((i * (points.length - 1)) / Math.max(labelCount - 1, 1)))
  );

  const onKey = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
      return;
    }
    event.preventDefault();
    const step = event.key === "ArrowRight" ? 1 : -1;
    setActive((current) => {
      const start = current ?? (step > 0 ? -1 : points.length);
      return Math.min(points.length - 1, Math.max(0, start + step));
    });
  };

  const activePoint = active === null ? null : points[active];
  const tipLeft = active === null ? 0 : Math.min(Math.max(M.left + band * (active + 0.5), 70), width - 70);

  return (
    <div className="chart" ref={wrapRef}>
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={`Gráfico de ${unit}: ${points.length} barras, máximo ${formatInt(max)}. Use as setas para percorrer.`}
        tabIndex={0}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
        onMouseLeave={() => setActive(null)}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line className="gridline" x1={M.left} x2={width - M.right} y1={y(tick)} y2={y(tick)} />
            <text className="tick" x={M.left - 8} y={y(tick)} dy="0.32em" textAnchor="end">
              {formatInt(tick)}
            </text>
          </g>
        ))}

        {points.map((p, i) => {
          const x = M.left + band * i + (band - barW) / 2;
          const h = Math.max(0, M.top + innerH - y(p.value));
          return (
            <g key={p.key}>
              {h > 0 && (
                <path
                  className={`bar${active !== null && active !== i ? " is-dim" : ""}`}
                  d={columnPath(x, y(p.value), barW, h)}
                />
              )}
              {/* Alvo de hover: a faixa inteira, maior do que a barra. */}
              <rect
                className="hit"
                x={M.left + band * i}
                y={M.top}
                width={band}
                height={innerH}
                onMouseEnter={() => setActive(i)}
              />
              {labelIdx.has(i) && (
                <text className="tick" x={M.left + band * (i + 0.5)} y={HEIGHT - 8} textAnchor="middle">
                  {p.label.replace("Semana de ", "")}
                </text>
              )}
            </g>
          );
        })}

        <line className="baseline" x1={M.left} x2={width - M.right} y1={M.top + innerH} y2={M.top + innerH} />
      </svg>

      {activePoint && (
        <div className="tooltip" style={{ left: tipLeft, top: Math.max(y(activePoint.value) - 12, 4) }} role="status">
          <span className="tooltip-label">{activePoint.label}</span>
          <strong>
            {formatInt(activePoint.value)} {activePoint.value === 1 ? unit.replace(/s$/, "") : unit}
          </strong>
        </div>
      )}
    </div>
  );
}
