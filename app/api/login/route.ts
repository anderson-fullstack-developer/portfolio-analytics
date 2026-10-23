import { NextResponse } from "next/server";
import { passwordMatches, sessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";

export async function POST(request: Request) {
  const form = await request.formData();
  const password = String(form.get("password") ?? "");

  if (!passwordMatches(password)) {
    // Atraso fixo: torna tentativas em massa lentas.
    await new Promise((resolve) => setTimeout(resolve, 700));
    return NextResponse.redirect(new URL("/login?erro=1", request.url), 303);
  }

  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.set(SESSION_COOKIE, sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE
  });
  return response;
}
