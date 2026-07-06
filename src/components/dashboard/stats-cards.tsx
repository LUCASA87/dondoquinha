"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Package,
  TrendingUp,
  DollarSign,
  Receipt,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatMesAno } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DashboardStats } from "@/types/database";

interface StatsCardsProps {
  initialStats: DashboardStats;
  totalAPagar: number;
  totalAReceber: number;
  isLoading?: boolean;
}

interface StatItem {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  accent: string;
  valueColor?: string;
  href?: string;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      <span className="h-0.5 w-3 rounded-full bg-brand-red" />
      <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-red">
        {children}
      </p>
    </div>
  );
}

function StatCard({ item, isLoading }: { item: StatItem; isLoading?: boolean }) {
  const content = (
    <Card
      className={cn(
        "overflow-hidden rounded-xl border-l-2 bg-gradient-to-br from-white to-brand-cream/20 transition-shadow",
        item.accent,
        item.href && "hover:shadow-sm hover:shadow-brand-red/10",
        isLoading && "opacity-80"
      )}
    >
      <div className="flex items-center gap-2 px-2.5 py-2">
        <div className={cn("rounded-md p-1 shrink-0", item.bg)}>
          <item.icon className={cn("h-3.5 w-3.5", item.color)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium text-brand-black/55 leading-tight truncate">
            {item.title}
          </p>
          <p
            className={cn(
              "text-sm font-bold tabular-nums leading-tight mt-0.5",
              item.valueColor ?? "text-brand-black",
              isLoading && "animate-pulse"
            )}
          >
            {item.value}
          </p>
        </div>
      </div>
    </Card>
  );

  if (item.href) {
    return (
      <Link href={item.href} className="block h-full">
        {content}
      </Link>
    );
  }

  return content;
}

export function StatsCards({
  initialStats,
  totalAPagar,
  totalAReceber: initialAReceber,
  isLoading = false,
}: StatsCardsProps) {
  const [stats, setStats] = useState(initialStats);
  const [totalAReceber, setTotalAReceber] = useState(initialAReceber);

  const fetchEstoque = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("produtos")
      .select("quantidade, preco_custo, preco_venda");

    if (!data) return;

    let totalCusto = 0;
    let totalVenda = 0;

    for (const p of data) {
      totalCusto += Number(p.quantidade) * Number(p.preco_custo);
      totalVenda += Number(p.quantidade) * Number(p.preco_venda);
    }

    setStats({
      totalCusto,
      totalVenda,
      lucroEstimado: totalVenda - totalCusto,
    });
  }, []);

  const fetchAReceber = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("parcelas_vendas")
      .select("valor_parcela, valor_pago")
      .eq("status", "pendente");

    if (!data) return;

    const total = data.reduce((sum, p) => {
      const saldo = Number(p.valor_parcela) - Number(p.valor_pago ?? 0);
      return sum + (saldo > 0.001 ? saldo : 0);
    }, 0);

    setTotalAReceber(total);
  }, []);

  useEffect(() => {
    setStats(initialStats);
  }, [initialStats]);

  useEffect(() => {
    setTotalAReceber(initialAReceber);
  }, [initialAReceber]);

  useEffect(() => {
    const supabase = createClient();

    const channelEstoque = supabase
      .channel("dashboard-produtos")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "produtos" },
        () => fetchEstoque()
      )
      .subscribe();

    const channelParcelas = supabase
      .channel("dashboard-parcelas")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "parcelas_vendas" },
        () => fetchAReceber()
      )
      .subscribe();

    const channelPagamentos = supabase
      .channel("dashboard-pagamentos")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pagamentos_crediario" },
        () => fetchAReceber()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelEstoque);
      supabase.removeChannel(channelParcelas);
      supabase.removeChannel(channelPagamentos);
    };
  }, [fetchEstoque, fetchAReceber]);

  const estoqueCards: StatItem[] = [
    {
      title: "Custo do estoque",
      value: formatCurrency(stats.totalCusto),
      description: "Investido em produtos",
      icon: Package,
      color: "text-brand-black",
      bg: "bg-brand-cream",
      accent: "border-l-brand-black",
    },
    {
      title: "Valor bruto, venda",
      value: formatCurrency(stats.totalVenda),
      description: "Se vender tudo",
      icon: DollarSign,
      color: "text-brand-red",
      bg: "bg-brand-red/10",
      accent: "border-l-brand-red",
      valueColor: "text-brand-red",
    },
    {
      title: "Lucro estimado",
      value: formatCurrency(stats.lucroEstimado),
      description: "Venda menos custo",
      icon: TrendingUp,
      color: "text-green-700",
      bg: "bg-green-50",
      accent: "border-l-green-600",
      valueColor: "text-green-700",
    },
  ];

  const receberCard: StatItem = {
    title: "A receber",
    value: formatCurrency(totalAReceber),
    description: "Crediário em aberto",
    icon: Wallet,
    color: "text-green-700",
    bg: "bg-green-50",
    accent: "border-l-green-600",
    valueColor: "text-green-700",
    href: "/financeiro",
  };

  const pagarCard: StatItem = {
    title: "A pagar",
    value: formatCurrency(totalAPagar),
    description: `Contas de ${formatMesAno()}`,
    icon: Receipt,
    color: "text-brand-red",
    bg: "bg-brand-red/10",
    accent: "border-l-brand-red",
    valueColor: "text-brand-red",
    href: "/financeiro",
  };

  return (
    <div className="space-y-3">
      <div>
        <SectionLabel>Estoque</SectionLabel>
        <div className="grid gap-2 grid-cols-2 lg:grid-cols-3">
          {estoqueCards.map((item) => (
            <StatCard key={item.title} item={item} isLoading={isLoading} />
          ))}
        </div>
      </div>

      <div className="grid gap-2 grid-cols-2">
        <div>
          <SectionLabel>A receber</SectionLabel>
          <StatCard item={receberCard} isLoading={isLoading} />
        </div>
        <div>
          <SectionLabel>A pagar</SectionLabel>
          <StatCard item={pagarCard} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
