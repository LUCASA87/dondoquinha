import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { PwaBootstrap } from "@/components/pwa/pwa-bootstrap";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${playfair.variable} h-full`}>
      <body className="min-h-full antialiased">
        <PwaBootstrap />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
