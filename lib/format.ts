const INTEGER = new Intl.NumberFormat("pt-PT");
const COMPACT = new Intl.NumberFormat("pt-PT", { notation: "compact", maximumFractionDigits: 1 });
const PERCENT = new Intl.NumberFormat("pt-PT", { style: "percent", maximumFractionDigits: 0 });
const LONG_DATE = new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export const formatInt = (value: number) => INTEGER.format(value);

// Compacta a partir de 10 000 (12,9 mil), como pedem os valores de destaque.
export const formatCompact = (value: number) => (value >= 10000 ? COMPACT.format(value) : INTEGER.format(value));

export const formatPercent = (value: number) => PERCENT.format(value);

export const formatDate = (iso: string) => LONG_DATE.format(new Date(`${iso}T00:00:00Z`));

export function delta(current: number, previous: number) {
  if (!previous) {
    return null;
  }
  return (current - previous) / previous;
}
