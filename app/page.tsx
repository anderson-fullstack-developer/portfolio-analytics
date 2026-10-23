import Link from "next/link";
import { redirect } from "next/navigation";
import { BarList } from "@/components/BarList";
import { Funnel } from "@/components/Funnel";
import { StatTile } from "@/components/StatTile";
import { VisitsChart } from "@/components/VisitsChart";
import { buildModel, parseRange, RANGES, type Model } from "@/lib/analytics";
import { authDisabled, isAuthed } from "@/lib/auth";
import { delta, formatDate, formatInt } from "@/lib/format";
import { loadData } from "@/lib/goatcounter";

export const dynamic = "force-dynamic";

const SITE = "https://andersonneto.gt.tc";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  if (!(await isAuthed())) {
    redirect("/login");
  }

  const { dias } = await searchParams;
  const days = parseRange(dias);

  let model: Model | null = null;
  let error = "";
  try {
    model = buildModel(await loadData(days), days);
  } catch (e) {
    error = e instanceof Error ? e.message : "Erro desconhecido";
  }

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <span className="logo-mark" aria-hidden="true">AN</span>
          <div>
            <p className="brand-title">Estatísticas do portfólio</p>
            <a className="brand-link" href={SITE} target="_blank" rel="noopener noreferrer">
              andersonneto.gt.tc ↗
            </a>
          </div>
        </div>

        <nav className="ranges" aria-label="Período">
          {RANGES.map((range) => (
            <Link
              key={range.days}
              href={`/?dias=${range.days}`}
              className={`range${range.days === days ? " is-active" : ""}`}
              aria-current={range.days === days ? "page" : undefined}
            >
              {range.label}
            </Link>
          ))}
        </nav>

        {!authDisabled() && (
          <form action="/api/logout" method="post">
            <button className="btn btn-ghost btn-sm" type="submit">
              Sair
            </button>
          </form>
        )}
      </header>

      {model?.demo && (
        <p className="banner">
          <strong>Dados de demonstração.</strong> Defina <code>GOATCOUNTER_TOKEN</code> para ver as visitas reais.
        </p>
      )}

      {error && (
        <p className="banner banner-error" role="alert">
          <strong>Não foi possível obter os dados do GoatCounter.</strong> {error}. Confirme o token e tente daqui a
          um minuto.
        </p>
      )}

      {model && <Content model={model} />}

      <footer className="footer">
        Dados do GoatCounter, sem cookies e sem guardar IPs · atualizados a cada 5 minutos
      </footer>
    </div>
  );
}

function Content({ model }: { model: Model }) {
  const period = `${formatDate(model.start)} – ${formatDate(model.end)}`;
  const unit = model.bucket === "week" ? "visitas por semana" : "visitas por dia";

  return (
    <main className="grid">
      <section className="tiles" aria-label="Resumo">
        <StatTile
          hero
          label="Visitas"
          value={model.visits}
          change={delta(model.visits, model.visitsPrev)}
          hint={`face aos ${model.days} dias anteriores`}
        />
        <StatTile label="Downloads do CV" value={model.cvDownloads} hint="botões do CV e Ctrl+K" />
        <StatTile label="Mensagens enviadas" value={model.messages} hint="formulário e pedidos de orçamento" />
        <StatTile label="Projetos abertos" value={model.projectsOpened} hint="janelas de detalhes abertas" />
      </section>

      <section className="card span-full">
        <div className="card-head">
          <div>
            <h2>Visitas ao longo do tempo</h2>
            <p className="muted">{period}</p>
          </div>
        </div>
        <VisitsChart points={model.series} unit="visitas" />
        <details className="table-view">
          <summary>Ver como tabela</summary>
          <table>
            <caption className="sr-only">{unit}</caption>
            <thead>
              <tr>
                <th scope="col">{model.bucket === "week" ? "Semana" : "Dia"}</th>
                <th scope="col">Visitas</th>
              </tr>
            </thead>
            <tbody>
              {model.series.map((p) => (
                <tr key={p.key}>
                  <td>{p.label}</td>
                  <td>{formatInt(p.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>

      <section className="card">
        <h2>Funil do recrutador</h2>
        <p className="muted">Da visita ao contacto.</p>
        <Funnel steps={model.funnel} />
      </section>

      <section className="card">
        <h2>De onde vêm</h2>
        <p className="muted">Origem das visitas, incluindo links com ?ref=.</p>
        <BarList rows={model.sources} empty="Ainda sem origens registadas." />
      </section>

      <section className="card card-accent">
        <h2>Candidaturas</h2>
        <p className="muted">Empresas que abriram o portfólio através do seu link.</p>
        <BarList rows={model.applications} empty="Ainda nenhuma candidatura com link próprio." limit={12} />
        <p className="tip">
          Envie em cada candidatura <code>andersonneto.gt.tc/?ref=nome-da-empresa</code> e ela aparece aqui.
        </p>
      </section>

      <section className="card">
        <h2>Projetos com mais interesse</h2>
        <p className="muted">Detalhes abertos por projeto.</p>
        <BarList rows={model.projects} empty="Ainda ninguém abriu os detalhes de um projeto." />
      </section>

      <section className="card">
        <h2>Páginas</h2>
        <BarList rows={model.pages} empty="Sem visitas neste período." />
      </section>

      <section className="card">
        <h2>Países</h2>
        <BarList rows={model.countries} empty="Sem dados de países." limit={6} />
      </section>

      <section className="card">
        <h2>Dispositivos</h2>
        <BarList rows={model.devices} empty="Sem dados de dispositivos." />
      </section>

      <section className="card span-full">
        <h2>Contactos diretos</h2>
        <p className="muted">Cliques e cópias que levam a uma conversa.</p>
        <BarList rows={model.contactClicks} empty="Ainda sem contactos neste período." />
      </section>
    </main>
  );
}
