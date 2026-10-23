import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  if (await isAuthed()) {
    redirect("/");
  }
  const { erro } = await searchParams;

  return (
    <main className="login">
      <form className="card login-card" action="/api/login" method="post">
        <span className="logo-mark" aria-hidden="true">AN</span>
        <h1>Estatísticas do portfólio</h1>
        <p className="muted">Área privada. Introduza a password para continuar.</p>
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required autoFocus />
        {erro && (
          <p className="form-error" role="alert">
            Password incorreta. Tente novamente.
          </p>
        )}
        <button className="btn btn-primary" type="submit">
          Entrar
        </button>
      </form>
    </main>
  );
}
