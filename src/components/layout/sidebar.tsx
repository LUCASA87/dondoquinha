"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  Wallet,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/app/actions/auth";
import { TrocarSenhaDialog } from "@/components/auth/trocar-senha-dialog";
import { useNavigation } from "./navigation-context";

const navItems = [
  { href: "/dashboard", label: "Início", icon: LayoutDashboard },
  { href: "/estoque", label: "Estoque", icon: Package },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/vendas", label: "Vendas", icon: ShoppingCart },
  { href: "/financeiro", label: "Financeiro", icon: Wallet },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    navItems.forEach(({ href }) => router.prefetch(href));
  }, [router]);

  function handleNavClick() {
    startNavigation();
    setOpen(false);
  }

  function handleLogout() {
    startTransition(async () => {
      await logoutAction();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-lg border border-brand-red/20 bg-white p-2 shadow-md shadow-brand-red/10 lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-6 w-6 text-brand-red" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-brand-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-brand-red/15 bg-white shadow-lg shadow-brand-red/5 transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="w-1 shrink-0 bg-brand-red absolute inset-y-0 left-0" aria-hidden />

        <div className="relative border-b-2 border-brand-red/20 bg-gradient-to-br from-brand-cream via-brand-cream/80 to-white px-6 py-5">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={handleNavClick}>
            <Image
              src="/logo.png"
              alt="Dondoquinha Moda e Beleza"
              width={52}
              height={52}
              className="rounded-full ring-2 ring-brand-red/40 ring-offset-2 ring-offset-brand-cream"
            />
            <div>
              <p className="font-serif text-lg leading-tight text-brand-black">Dondoquinha</p>
              <p className="text-[10px] font-semibold tracking-[0.2em] text-brand-red">
                MODA E BELEZA
              </p>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-5 rounded-lg p-1 lg:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5 text-brand-black/60" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                prefetch
                onClick={handleNavClick}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-medium transition-all",
                  active
                    ? "bg-brand-red text-white shadow-md shadow-brand-red/25"
                    : "text-brand-black/70 hover:bg-brand-cream hover:text-brand-red"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5",
                    active ? "text-white" : "text-brand-red/70 group-hover:text-brand-red"
                  )}
                />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-brand-red/15 bg-brand-cream/50 p-4 space-y-3">
          <TrocarSenhaDialog />
          <Button
            type="button"
            variant="outline"
            className="w-full justify-center gap-2 border-brand-red/20 text-brand-red hover:bg-brand-red/5"
            onClick={handleLogout}
            disabled={pending}
          >
            <LogOut className="h-4 w-4" />
            {pending ? "Saindo..." : "Sair"}
          </Button>
          <p className="text-center text-xs font-medium text-brand-red/60">
            Dondoquinha · Gestão
          </p>
        </div>
      </aside>
    </>
  );
}
