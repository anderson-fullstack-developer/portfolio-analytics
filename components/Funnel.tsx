import type { Row } from "@/lib/analytics";
import { formatInt, formatPercent } from "@/lib/format";

// Cada etapa mede-se contra a primeira (visitas), em barras da mesma cor.
export function Funnel({ steps }: { steps: Row[] }) {
  const first = steps[0]?.value || 0;

  return (
    <ol className="funnel">
      {steps.map((step, i) => {
        const share = first ? step.value / first : 0;
        return (
          <li key={step.label}>
            <div className="funnel-head">
              <span className="funnel-step">{String(i + 1).padStart(2, "0")}</span>
              <span className="funnel-label">{step.label}</span>
              <span className="funnel-value">{formatInt(step.value)}</span>
            </div>
            <div className="funnel-track" aria-hidden="true">
              <span className="funnel-bar" style={{ width: `${Math.max(Math.min(share, 1) * 100, step.value ? 1.5 : 0)}%` }} />
            </div>
            {i > 0 && <span className="funnel-share">{formatPercent(share)} das visitas</span>}
          </li>
        );
      })}
    </ol>
  );
}
