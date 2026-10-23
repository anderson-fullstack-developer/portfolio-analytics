import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Estatísticas · Anderson Neto",
  description: "Painel privado de estatísticas do portfólio.",
  robots: { index: false, follow: false }
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0C0D0F" },
    { media: "(prefers-color-scheme: light)", color: "#FAFAF9" }
  ]
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT">
      <body>{children}</body>
    </html>
  );
}
