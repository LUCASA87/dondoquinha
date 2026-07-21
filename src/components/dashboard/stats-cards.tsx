"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Package,
  TrendingUp,
  DollarSign,
  Receipt,
  Wallet,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

function mesAtualInput(): string {
  const agora = new Date();
  const y = agora.getFullYear();
  const m = String(agora.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function intervaloDoMes(mesAno: string): { inicio: string; fim: string } {
  const [y, m] = mesAno.split("-").map(Number);
  const ultimoDia = new Date(y, m, 0).getDate();
  const mm = String(m).padStart(2, "0");
  return {
    inicio: `${y}-${mm}-01`,
    fim: `${y}-${mm}-${String(ultimoDia).padStart(2, "0")}`,
  };
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
          {item.description ? (
            <p className="text-[9px] text-brand-black/40 leading-tight mt-0.5 truncate">
              {item.description}
            </p>
          ) : null}
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
  const [mesFiltro, setMesFiltro] = useState(mesAtualInput);
  const [aEntrarMes, setAEntrarMes] = useState(0);
  const [qtdParcelasMes, setQtdParcelasMes] = useState(0);
  const [carregandoMes, setCarregandoMes] = useState(false);

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

  const fetchAEntrarMes = useCallback(async (mesAno: string) => {
    setCarregandoMes(true);
    try {
      const supabase = createClient();
      const { inicio, fim } = intervaloDoMes(mesAno);
      const { data } = await supabase
        .from("parcelas_vendas")
        .select("valor_parcela, valor_pago")
        .eq("status", "pendente")
        .gte("data_vencimento", inicio)
        .lte("data_vencimento", fim);

      if (!data) {
        setAEntrarMes(0);
        setQtdParcelasMes(0);
        return;
      }

      let total = 0;
      let qtd = 0;
      for (const p of data) {
        const saldo = Number(p.valor_parcela) - Number(p.valor_pago ?? 0);
        if (saldo > 0.001) {
          total += saldo;
          qtd += 1;
        }
      }
      setAEntrarMes(total);
      setQtdParcelasMes(qtd);
    } finally {
      setCarregandoMes(false);
    }
  }, []);

  useEffect(() => {
    setStats(initialStats);
  }, [initialStats]);

  useEffect(() => {
    setTotalAReceber(initialAReceber);
  }, [initialAReceber]);

  useEffect(() => {
    void fetchAEntrarMes(mesFiltro);
  }, [mesFiltro, fetchAEntrarMes]);

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
        () => {
          fetchAReceber();
          void fetchAEntrarMes(mesFiltro);
        }
      )
      .subscribe();

    const channelPagamentos = supabase
      .channel("dashboard-pagamentos")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pagamentos_crediario" },
        () => {
          fetchAReceber();
          void fetchAEntrarMes(mesFiltro);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelEstoque);
      supabase.removeChannel(channelParcelas);
      supabase.removeChannel(channelPagamentos);
    };
  }, [fetchEstoque, fetchAReceber, fetchAEntrarMes, mesFiltro]);

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
      title: "Valor bruto, estoque",
      value: formatCurrency(stats.totalVenda),
      description: "Se vender o estoque atual",
      icon: DollarSign,
      color: "text-brand-red",
      bg: "bg-brand-red/10",
      accent: "border-l-brand-red",
      valueColor: "text-brand-red",
    },
    {
      title: "Lucro do estoque",
      value: formatCurrency(stats.lucroEstimado),
      description: "Venda menos custo do estoque",
      icon: TrendingUp,
      color: "text-green-700",
      bg: "bg-green-50",
      accent: "border-l-green-600",
      valueColor: "text-green-700",
    },
  ];

  const aEntrarCard: StatItem = {
    title: `A entrar em ${formatMesAno(`${mesFiltro}-01`)}`,
    value: formatCurrency(aEntrarMes),
    description:
      qtdParcelasMes === 0
        ? "Nenhuma parcela neste mês"
        : `${qtdParcelasMes} parcela${qtdParcelasMes > 1 ? "s" : ""} do crediário`,
    icon: CalendarDays,
    color: "text-green-700",
    bg: "bg-green-50",
    accent: "border-l-green-600",
    valueColor: "text-green-700",
    href: "/financeiro",
  };

  const receberCard: StatItem = {
    title: "A receber (tudo)",
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
        <div className="mb-1.5 flex flex-wrap items-end justify-between gap-2">
          <SectionLabel>Previsto no mês</SectionLabel>
          <div className="flex items-center gap-2">
            <Label
              htmlFor="filtro_mes_entrar"
              className="text-[10px] font-medium text-brand-black/55"
            >
              Mês
            </Label>
            <Input
              id="filtro_mes_entrar"
              type="month"
              value={mesFiltro}
              onChange={(e) => setMesFiltro(e.target.value)}
              className="h-8 w-[9.5rem] px-2 text-xs"
            />
          </div>
        </div>
        <StatCard item={aEntrarCard} isLoading={isLoading || carregandoMes} />
        <p className="mt-1.5 text-[10px] leading-relaxed text-brand-black/45">
          Soma das parcelas do crediário com vencimento no mês escolhido — não
          depende do estoque.
        </p>
      </div>

      <div>
        <SectionLabel>Estoque</SectionLabel>
        <div className="grid gap-2 grid-cols-2 lg:grid-cols-3">
          {estoqueCards.map((item) => (
            <StatCard key={item.title} item={item} isLoading={isLoading} />
          ))}
        </div>
        <p className="mt-1.5 text-[10px] leading-relaxed text-brand-black/45">
          Valores do estoque atual. Se zerar os produtos, estes números ficam
          R$0,00.
        </p>
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
