"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { AppMessagesProvider } from "@/components/ui/app-messages";
import { NavigationProvider } from "./navigation-context";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/login";

  useEffect(() => {
    if (isLogin) return;
    const rotas = ["/dashboard", "/estoque", "/clientes", "/vendas", "/financeiro"];
    rotas.forEach((href) => router.prefetch(href));
  }, [router, isLogin]);

  if (isLogin) {
    return <AppMessagesProvider>{children}</AppMessagesProvider>;
  }

  return (
    <AppMessagesProvider>
      <NavigationProvider>
        <div className="flex min-h-screen bg-brand-bg">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            <div className="mx-auto max-w-6xl px-4 py-8 pt-20 lg:px-8 lg:py-10 lg:pt-10">
              {children}
            </div>
          </main>
        </div>
      </NavigationProvider>
    </AppMessagesProvider>
  );
}
