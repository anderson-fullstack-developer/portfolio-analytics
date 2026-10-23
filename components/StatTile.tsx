import { formatCompact, formatPercent } from "@/lib/format";

type Props = {
  label: string;
  value: number;
  hint: string;
  change?: number | null;
  hero?: boolean;
};

export function StatTile({ label, value, hint, change, hero = false }: Props) {
  const up = (change ?? 0) >= 0;
  return (
    <article className={`card tile${hero ? " tile-hero" : ""}`}>
      <p className="tile-label">{label}</p>
      <p className="tile-value">{formatCompact(value)}</p>
      <p className="tile-hint">
        {change !== undefined && change !== null && (
          <span className={`delta ${up ? "delta-up" : "delta-down"}`}>
            <span aria-hidden="true">{up ? "↑" : "↓"}</span>
            {formatPercent(Math.abs(change))}
            <span className="sr-only">{up ? " de aumento" : " de descida"}</span>
          </span>
        )}
        {hint}
      </p>
    </article>
  );
}
