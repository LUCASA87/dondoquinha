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
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Início", icon: LayoutDashboard },
  { href: "/estoque", label: "Estoque", icon: Package },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/vendas", label: "Vendas", icon: ShoppingCart },
  { href: "/financeiro", label: "Financeiro", icon: Wallet },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-lg bg-white p-2 shadow-md lg:hidden"
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
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-brand-red/10 bg-white transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-brand-red/10 px-6 py-5">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setOpen(false)}>
            <Image
              src="/logo.png"
              alt="Dondoquinha Moda e Beleza"
              width={48}
              height={48}
              className="rounded-full"
            />
            <div>
              <p className="font-serif text-lg leading-tight text-brand-black">Dondoquinha</p>
              <p className="text-[10px] font-medium tracking-widest text-brand-black/60">
                MODA E BELEZA
              </p>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg p-1 lg:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-medium transition-colors",
                  active
                    ? "bg-brand-red text-white shadow-sm"
                    : "text-brand-black/70 hover:bg-brand-cream hover:text-brand-black"
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-brand-red/10 p-4">
          <p className="text-center text-xs text-brand-black/40">
            Sistema de Gestão
          </p>
        </div>
      </aside>
    </>
  );
}
