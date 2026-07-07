import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { SupabaseProvider } from "@/components/providers/supabase-provider";
import { PwaBootstrap } from "@/components/pwa/pwa-bootstrap";
import { pwaHeadScript } from "@/lib/pwa-head-script";
import Script from "next/script";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["italic"],
});

export const metadata: Metadata = {
  title: "Dondoquinha | Gestão Comercial",
  description: "Sistema de gestão comercial e financeira - Dondoquinha Moda e Beleza",
  applicationName: "Dondoquinha",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Dondoquinha",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const supabaseBootstrap = JSON.stringify({ url: supabaseUrl, key: supabaseAnonKey });

  return (
    <html lang="pt-BR" className={`${inter.variable} ${playfair.variable} h-full`}>
      <head>
        <Script id="pwa-install-capture" strategy="beforeInteractive">
          {pwaHeadScript}
        </Script>
        <Script id="supabase-runtime-config" strategy="beforeInteractive">
          {`window.__DQ_SUPABASE__=${supabaseBootstrap};`}
        </Script>
      </head>
      <body className="min-h-full antialiased">
        <PwaBootstrap />
        <SupabaseProvider url={supabaseUrl} anonKey={supabaseAnonKey}>
          <AppShell>{children}</AppShell>
        </SupabaseProvider>
      </body>
    </html>
  );
}
