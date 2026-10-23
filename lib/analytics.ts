import { addDays, isoDay, type RawData, type Stat } from "./goatcounter";

export type Row = { label: string; value: number; hint?: string };
export type Point = { key: string; label: string; value: number };

export type Model = {
  demo: boolean;
  days: number;
  start: string;
  end: string;
  visits: number;
  visitsPrev: number;
  series: Point[];
  bucket: "day" | "week";
  cvDownloads: number;
  messages: number;
  projectsOpened: number;
  funnel: Row[];
  sources: Row[];
  applications: Row[];
  projects: Row[];
  pages: Row[];
  countries: Row[];
  devices: Row[];
  contactClicks: Row[];
};

export const RANGES = [
  { days: 7, label: "7 dias" },
  { days: 30, label: "30 dias" },
  { days: 90, label: "90 dias" },
  { days: 365, label: "1 ano" }
] as const;

export function parseRange(value: string | undefined) {
  const days = Number(value);
  return RANGES.some((r) => r.days === days) ? days : 30;
}

const PROJECTS: Record<string, string> = {
  "saas-servicos": "SaaS de gestão",
  "brand22-crm": "Brand22 CRM",
  cimat: "Assistente CIMAT",
  garimpo: "Garimpo",
  "rhneto-pro": "RHNeto Pro",
  "stp-market": "STP Market",
  amat: "Assistente AMAT",
  "brand22-chatbot": "Chatbot Brand22"
};

const PAGES: Record<string, string> = {
  "/": "Portfólio (PT)",
  "/index.html": "Portfólio (PT)",
  "/en.html": "Portfolio (EN)",
  "/freelancer.html": "Freelancer"
};

const CONTACT_EVENTS: Record<string, string> = {
  "formulario-enviado": "Formulário (portfólio)",
  "orcamento-enviado": "Pedido de orçamento",
  whatsapp: "WhatsApp",
  email: "Email",
  "copiar-email": "Copiou o email",
  "copiar-telefone": "Copiou o telefone"
};

// Origens conhecidas: tudo o resto sem domínio é uma etiqueta ?ref= de candidatura.
const KNOWN_SOURCES: [RegExp, string][] = [
  [/linkedin|lnkd\.in/, "LinkedIn"],
  [/github/, "GitHub"],
  [/google/, "Google"],
  [/bing/, "Bing"],
  [/duckduckgo/, "DuckDuckGo"],
  [/whatsapp|wa\.me/, "WhatsApp"],
  [/^cv$/, "CV (PDF)"],
  [/^e?-?mail/, "Email"],
  [/instagram/, "Instagram"],
  [/facebook|fb\.com/, "Facebook"],
  [/^t\.co$|twitter|^x\.com/, "X / Twitter"],
  [/telegram|t\.me/, "Telegram"]
];

const DIRECT = "Direto / link sem origem";

function classifyRef(name: string): { kind: "source" | "application"; label: string } {
  const value = name.trim().toLowerCase();
  if (!value || value === "(no data)" || value === "direct") {
    return { kind: "source", label: DIRECT };
  }
  for (const [pattern, label] of KNOWN_SOURCES) {
    if (pattern.test(value)) {
      return { kind: "source", label };
    }
  }
  if (!value.includes(".") && !value.includes(" ")) {
    return { kind: "application", label: name.trim() };
  }
  return { kind: "source", label: value.replace(/^www\./, "") };
}

function mergeRows(rows: Row[]) {
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.label, (map.get(row.label) ?? 0) + row.value);
  }
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value);
}

function deviceLabel(stat: Stat) {
  const key = `${stat.id} ${stat.name}`.toLowerCase();
  if (key.includes("phone")) return "Telemóvel";
  if (key.includes("tablet")) return "Tablet";
  if (key.includes("desktop") || key.includes("computer")) return "Computador";
  return "Outro";
}

const COUNTRY_NAMES = new Intl.DisplayNames(["pt-PT"], { type: "region" });

function countryLabel(stat: Stat) {
  if (/^[A-Z]{2}$/.test(stat.id)) {
    try {
      return COUNTRY_NAMES.of(stat.id) ?? stat.name;
    } catch {
      return stat.name;
    }
  }
  return stat.name || "Desconhecido";
}

const SHORT_DATE = new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "short", timeZone: "UTC" });

function buildSeries(raw: RawData, days: number): { series: Point[]; bucket: "day" | "week" } {
  // Total diário do GoatCounter; se a API não o devolver, soma as páginas vistas.
  const byDay = new Map<string, number>();
  const source = raw.totalDaily.length
    ? raw.totalDaily
    : raw.hits.filter((h) => !h.event).flatMap((h) => h.stats);
  for (const stat of source) {
    byDay.set(stat.day, (byDay.get(stat.day) ?? 0) + stat.daily);
  }

  const daily: Point[] = [];
  const first = new Date(`${raw.start}T00:00:00Z`);
  for (let i = 0; i < days; i += 1) {
    const date = addDays(first, i);
    const key = isoDay(date);
    daily.push({ key, label: SHORT_DATE.format(date), value: byDay.get(key) ?? 0 });
  }

  if (days <= 90) {
    return { series: daily, bucket: "day" };
  }

  // Um ano dia a dia dá barras ilegíveis: agrupa por semana.
  const weeks: Point[] = [];
  for (let i = 0; i < daily.length; i += 7) {
    const chunk = daily.slice(i, i + 7);
    weeks.push({
      key: chunk[0].key,
      label: `Semana de ${chunk[0].label}`,
      value: chunk.reduce((sum, p) => sum + p.value, 0)
    });
  }
  return { series: weeks, bucket: "week" };
}

export function buildModel(raw: RawData, days: number): Model {
  const events = raw.hits.filter((h) => h.event);
  const pageviews = raw.hits.filter((h) => !h.event);
  const eventCount = (name: string) =>
    events.filter((e) => e.path.replace(/^\//, "") === name).reduce((sum, e) => sum + e.count, 0);

  const projects = mergeRows(
    events
      .filter((e) => e.path.replace(/^\//, "").startsWith("detalhes-"))
      .map((e) => {
        const id = e.path.replace(/^\/?detalhes-/, "");
        return { label: PROJECTS[id] ?? id, value: e.count };
      })
  );

  const contactClicks = mergeRows(
    Object.entries(CONTACT_EVENTS).map(([event, label]) => ({ label, value: eventCount(event) }))
  );

  const sources: Row[] = [];
  const applications: Row[] = [];
  for (const ref of raw.refs) {
    const { kind, label } = classifyRef(ref.name);
    (kind === "application" ? applications : sources).push({ label, value: ref.count });
  }

  const { series, bucket } = buildSeries(raw, days);
  const visits = raw.total || series.reduce((sum, p) => sum + p.value, 0);

  // O GoatCounter não lista as visitas sem origem: são o que sobra do total.
  const withSource = [...sources, ...applications].reduce((sum, r) => sum + r.value, 0);
  const alreadyDirect = sources.some((r) => r.label === DIRECT);
  if (!alreadyDirect && visits > withSource) {
    sources.push({ label: DIRECT, value: visits - withSource });
  }
  const projectsOpened = projects.reduce((sum, p) => sum + p.value, 0);
  const cvDownloads = eventCount("cv-download");
  const messages = eventCount("formulario-enviado") + eventCount("orcamento-enviado");
  const contacted = messages + eventCount("whatsapp") + eventCount("email");

  return {
    demo: raw.demo,
    days,
    start: raw.start,
    end: raw.end,
    visits,
    visitsPrev: raw.totalPrev,
    series,
    bucket,
    cvDownloads,
    messages,
    projectsOpened,
    funnel: [
      { label: "Visitaram o portfólio", value: visits },
      { label: "Abriram detalhes de projetos", value: projectsOpened },
      { label: "Descarregaram o CV", value: cvDownloads },
      { label: "Entraram em contacto", value: contacted }
    ],
    sources: mergeRows(sources),
    applications: mergeRows(applications),
    projects,
    pages: mergeRows(pageviews.map((p) => ({ label: PAGES[p.path] ?? p.path, value: p.count }))),
    countries: mergeRows(raw.locations.map((l) => ({ label: countryLabel(l), value: l.count }))),
    devices: mergeRows(raw.sizes.map((s) => ({ label: deviceLabel(s), value: s.count }))),
    contactClicks
  };
}
