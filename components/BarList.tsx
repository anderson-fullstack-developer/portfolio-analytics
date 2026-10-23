import type { Row } from "@/lib/analytics";
import { formatInt, formatPercent } from "@/lib/format";

type Props = {
  rows: Row[];
  empty: string;
  limit?: number;
  // Base para a percentagem: por defeito, a soma das linhas.
  total?: number;
};

export function BarList({ rows, empty, limit = 8, total }: Props) {
  if (!rows.length) {
    return <p className="empty">{empty}</p>;
  }
  const shown = rows.slice(0, limit);
  const max = Math.max(...shown.map((r) => r.value), 1);
  const base = total ?? rows.reduce((sum, r) => sum + r.value, 0);

  return (
    <ul className="bar-list">
      {shown.map((row) => {
        const share = base ? row.value / base : 0;
        return (
          <li key={row.label} title={`${row.label}: ${formatInt(row.value)} (${formatPercent(share)})`}>
            <div className="bar-list-text">
              <span className="bar-list-label">{row.label}</span>
              <span className="bar-list-value">
                {formatInt(row.value)}
                <span className="bar-list-share">{formatPercent(share)}</span>
              </span>
            </div>
            <span className="bar-list-track" aria-hidden="true">
              <span className="bar-list-bar" style={{ width: `${Math.max((row.value / max) * 100, 1.5)}%` }} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
