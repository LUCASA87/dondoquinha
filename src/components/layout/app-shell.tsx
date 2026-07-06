"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { AppMessagesProvider } from "@/components/ui/app-messages";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  if (isLogin) {
    return <AppMessagesProvider>{children}</AppMessagesProvider>;
  }

  return (
    <AppMessagesProvider>
      <div className="flex min-h-screen bg-brand-bg">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl px-4 py-8 pt-20 lg:px-8 lg:py-10 lg:pt-10">
            {children}
          </div>
        </main>
      </div>
    </AppMessagesProvider>
  );
}
