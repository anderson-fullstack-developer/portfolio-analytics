import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "pa_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

// Sem password definida, o painel só abre em desenvolvimento.
export function authDisabled() {
  return !process.env.DASHBOARD_PASSWORD && process.env.NODE_ENV !== "production";
}

function sign(value: string) {
  const secret = process.env.SESSION_SECRET || process.env.DASHBOARD_PASSWORD || "";
  return createHmac("sha256", secret).update(value).digest("hex");
}

function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

// A sessão muda se a password mudar: trocar a password termina todas as sessões.
export function sessionToken() {
  return sign(`session:${process.env.DASHBOARD_PASSWORD ?? ""}`);
}

export function passwordMatches(input: string) {
  const expected = process.env.DASHBOARD_PASSWORD;
  return Boolean(expected) && safeEqual(sign(`pw:${input}`), sign(`pw:${expected}`));
}

export async function isAuthed() {
  if (authDisabled()) {
    return true;
  }
  if (!process.env.DASHBOARD_PASSWORD) {
    return false;
  }
  const value = (await cookies()).get(SESSION_COOKIE)?.value ?? "";
  return safeEqual(value, sessionToken());
}
