// Cliente da API do GoatCounter (https://www.goatcounter.com/api).
// Corre só no servidor: o token nunca chega ao navegador.

export type DayStat = { day: string; daily: number };

export type Hit = {
  path: string;
  title: string;
  event: boolean;
  count: number;
  stats: DayStat[];
};

export type Stat = { id: string; name: string; count: number };

export type RawData = {
  demo: boolean;
  start: string;
  end: string;
  total: number;
  totalPrev: number;
  totalDaily: DayStat[];
  hits: Hit[];
  refs: Stat[];
  locations: Stat[];
  sizes: Stat[];
};

/* eslint-disable @typescript-eslint/no-explicit-any */
const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : Number(value) || 0);

// O dia mais recente pode vir com "daily" ainda a 0 e as visitas só em "hourly".
const toDayStats = (list: any): DayStat[] =>
  Array.isArray(list)
    ? list.map((s: any) => {
        const hourly = Array.isArray(s.hourly) ? s.hourly.reduce((sum: number, n: unknown) => sum + num(n), 0) : 0;
        return { day: String(s.day ?? "").slice(0, 10), daily: Math.max(num(s.daily), hourly) };
      })
    : [];

const toStats = (json: any): Stat[] =>
  Array.isArray(json?.stats)
    ? json.stats.map((s: any) => ({
        id: String(s.id ?? s.name ?? ""),
        name: String(s.name ?? ""),
        count: num(s.count ?? s.count_unique)
      }))
    : [];

export function isoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

async function gc(path: string, params: Record<string, string>): Promise<any> {
  const site = process.env.GOATCOUNTER_SITE || "andersonneto";
  const url = new URL(`https://${site}.goatcounter.com/api/v0${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.GOATCOUNTER_TOKEN}`,
      "Content-Type": "application/json"
    },
    // A API tem limite de pedidos: cada resposta fica em cache 5 minutos.
    next: { revalidate: 300 }
  });
  if (!res.ok) {
    throw new Error(`GoatCounter ${path} respondeu ${res.status}`);
  }
  return res.json();
}

// Listas secundárias (países, dispositivos…) não devem derrubar o painel.
async function optional<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

export function hasToken() {
  return Boolean(process.env.GOATCOUNTER_TOKEN);
}

export async function loadData(days: number): Promise<RawData> {
  const today = new Date();
  const end = isoDay(today);
  const start = isoDay(addDays(today, -(days - 1)));
  const prevEnd = isoDay(addDays(today, -days));
  const prevStart = isoDay(addDays(today, -(2 * days - 1)));

  if (!hasToken()) {
    return demoData(days, start, end);
  }

  // Datas completas: com só "2026-10-23", a API trata o fim como meia-noite e deixa o próprio dia de fora.
  const range = { start: `${start}T00:00:00Z`, end: `${end}T23:59:59Z` };
  const prevRange = { start: `${prevStart}T00:00:00Z`, end: `${prevEnd}T23:59:59Z` };
  // Pedidos em série: a API do GoatCounter limita pedidos em paralelo.
  const totalJson = await gc("/stats/total", range);
  const hitsJson = await gc("/stats/hits", { ...range, limit: "100" });
  const prevJson = await optional(gc("/stats/total", prevRange), null);
  const refs = await optional(gc("/stats/toprefs", { ...range, limit: "50" }).then(toStats), []);
  const locations = await optional(gc("/stats/locations", { ...range, limit: "20" }).then(toStats), []);
  const sizes = await optional(gc("/stats/sizes", range).then(toStats), []);

  const hits: Hit[] = Array.isArray(hitsJson?.hits)
    ? hitsJson.hits.map((h: any) => ({
        path: String(h.path ?? ""),
        title: String(h.title ?? ""),
        event: Boolean(h.event),
        count: num(h.count ?? h.count_unique),
        stats: toDayStats(h.stats)
      }))
    : [];

  return {
    demo: false,
    start,
    end,
    total: num(totalJson?.total ?? totalJson?.total_utc),
    totalPrev: num(prevJson?.total ?? prevJson?.total_utc),
    totalDaily: toDayStats(totalJson?.stats),
    hits,
    refs,
    locations,
    sizes
  };
}

/* ---------- Dados de demonstração (sem token configurado) ---------- */

function demoData(days: number, start: string, end: string): RawData {
  // Pseudo-aleatório determinístico: o mesmo desenho a cada recarga.
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const totalDaily: DayStat[] = [];
  for (let i = 0; i < days; i += 1) {
    const date = addDays(new Date(`${start}T00:00:00Z`), i);
    const weekday = date.getUTCDay();
    const base = weekday === 0 || weekday === 6 ? 3 : 9;
    totalDaily.push({ day: isoDay(date), daily: Math.round(base + rand() * 10 + i * 0.08) });
  }
  const total = totalDaily.reduce((sum, d) => sum + d.daily, 0);
  const scale = (n: number) => Math.max(1, Math.round((n * total) / 300));

  const page = (path: string, title: string, share: number): Hit => ({
    path,
    title,
    event: false,
    count: Math.round(total * share),
    stats: totalDaily.map((d) => ({ day: d.day, daily: Math.round(d.daily * share) }))
  });
  const event = (path: string, count: number): Hit => ({ path, title: "/", event: true, count: scale(count), stats: [] });

  return {
    demo: true,
    start,
    end,
    total,
    totalPrev: Math.round(total * 0.82),
    totalDaily,
    hits: [
      page("/", "Anderson Neto | Full-Stack Developer", 0.68),
      page("/en.html", "Anderson Neto | Full-Stack Developer", 0.21),
      page("/freelancer.html", "Anderson Neto | Sites, aplicações e sistemas", 0.11),
      event("detalhes-saas-servicos", 38),
      event("detalhes-garimpo", 27),
      event("detalhes-brand22-crm", 19),
      event("detalhes-stp-market", 11),
      event("detalhes-cimat", 8),
      event("cv-download", 31),
      event("formulario-enviado", 6),
      event("whatsapp", 5),
      event("email", 4),
      event("linkedin", 14),
      event("github", 17),
      event("ver-projeto-garimpo-xi-ten.vercel.app", 12)
    ],
    refs: [
      { id: "1", name: "linkedin", count: scale(96) },
      { id: "2", name: "", count: scale(71) },
      { id: "3", name: "www.google.com", count: scale(44) },
      { id: "4", name: "github", count: scale(29) },
      { id: "5", name: "cv", count: scale(18) },
      { id: "6", name: "talkdesk", count: 3 },
      { id: "7", name: "outsystems", count: 2 },
      { id: "8", name: "whatsapp", count: scale(9) },
      { id: "9", name: "sword-health", count: 1 }
    ],
    locations: [
      { id: "PT", name: "Portugal", count: scale(181) },
      { id: "BR", name: "Brazil", count: scale(52) },
      { id: "ES", name: "Spain", count: scale(17) },
      { id: "GB", name: "United Kingdom", count: scale(12) },
      { id: "DE", name: "Germany", count: scale(7) }
    ],
    sizes: [
      { id: "desktop", name: "Desktop", count: scale(162) },
      { id: "phone", name: "Phones", count: scale(118) },
      { id: "tablet", name: "Tablets", count: scale(9) }
    ]
  };
}
