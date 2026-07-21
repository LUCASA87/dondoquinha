"use client";

import { useEffect, useState, useCallback } from "react";
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
  return (
    <Card
      className={cn(
        "overflow-hidden rounded-xl border-l-2 bg-gradient-to-br from-white to-brand-cream/20",
        item.accent,
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
  const [brutoVendasMes, setBrutoVendasMes] = useState(0);
  const [lucroVendasMes, setLucroVendasMes] = useState(0);
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
      .select("valor_parcela, valor_pago");

    if (!data) return;

    const total = data.reduce((sum, p) => {
      const saldo = Number(p.valor_parcela) - Number(p.valor_pago ?? 0);
      return sum + (saldo > 0.001 ? saldo : 0);
    }, 0);

    setTotalAReceber(total);
  }, []);

  const fetchResumoMes = useCallback(async (mesAno: string) => {
    setCarregandoMes(true);
    try {
      const supabase = createClient();
      const { inicio, fim } = intervaloDoMes(mesAno);

      const [{ data: parcelas }, { data: itens }] = await Promise.all([
        supabase
          .from("parcelas_vendas")
          .select("valor_parcela, valor_pago, data_vencimento")
          .lte("data_vencimento", fim),
        supabase
          .from("venda_itens")
          .select("quantidade, preco_unitario, preco_custo, vendas!inner(data_venda)")
          .gte("vendas.data_venda", inicio)
          .lte("vendas.data_venda", fim),
      ]);

      let totalEntrar = 0;
      let qtd = 0;
      for (const p of parcelas ?? []) {
        const saldo = Number(p.valor_parcela) - Number(p.valor_pago ?? 0);
        if (saldo <= 0.001) continue;
        // No mês: vence no mês OU já está atrasada (venceu antes)
        if (p.data_vencimento <= fim) {
          totalEntrar += saldo;
          qtd += 1;
        }
      }
      setAEntrarMes(totalEntrar);
      setQtdParcelasMes(qtd);

      let bruto = 0;
      let lucro = 0;
      for (const item of itens ?? []) {
        const q = Number(item.quantidade);
        const venda = Number(item.preco_unitario) * q;
        const custo = Number(item.preco_custo ?? 0) * q;
        bruto += venda;
        lucro += venda - custo;
      }
      setBrutoVendasMes(bruto);
      setLucroVendasMes(lucro);
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
    void fetchResumoMes(mesFiltro);
  }, [mesFiltro, fetchResumoMes]);

  useEffect(() => {
    const supabase = createClient();

    const refreshMes = () => void fetchResumoMes(mesFiltro);

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
          refreshMes();
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
          refreshMes();
        }
      )
      .subscribe();

    const channelVendas = supabase
      .channel("dashboard-vendas-itens")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "venda_itens" },
        refreshMes
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vendas" },
        refreshMes
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelEstoque);
      supabase.removeChannel(channelParcelas);
      supabase.removeChannel(channelPagamentos);
      supabase.removeChannel(channelVendas);
    };
  }, [fetchEstoque, fetchAReceber, fetchResumoMes, mesFiltro]);

  const mesLabel = formatMesAno(`${mesFiltro}-01`);

  const previstoCards: StatItem[] = [
    {
      title: `A entrar até ${mesLabel}`,
      value: formatCurrency(aEntrarMes),
      description:
        qtdParcelasMes === 0
          ? "Nenhuma parcela em aberto até este mês"
          : `${qtdParcelasMes} parcela${qtdParcelasMes > 1 ? "s" : ""} (mês + atrasadas)`,
      icon: CalendarDays,
      color: "text-green-700",
      bg: "bg-green-50",
      accent: "border-l-green-600",
      valueColor: "text-green-700",
    },
    {
      title: `Vendas em ${mesLabel}`,
      value: formatCurrency(brutoVendasMes),
      description: "Total vendido no mês",
      icon: DollarSign,
      color: "text-brand-red",
      bg: "bg-brand-red/10",
      accent: "border-l-brand-red",
      valueColor: "text-brand-red",
    },
    {
      title: `Lucro em ${mesLabel}`,
      value: formatCurrency(lucroVendasMes),
      description: "Venda menos custo das vendas do mês",
      icon: TrendingUp,
      color: "text-green-700",
      bg: "bg-green-50",
      accent: "border-l-green-600",
      valueColor: "text-green-700",
    },
  ];

  const estoqueCards: StatItem[] = [
    {
      title: "Custo do estoque",
      value: formatCurrency(stats.totalCusto),
      description: "Investido nos produtos que ainda tem",
      icon: Package,
      color: "text-brand-black",
      bg: "bg-brand-cream",
      accent: "border-l-brand-black",
    },
    {
      title: "Valor bruto, estoque",
      value: formatCurrency(stats.totalVenda),
      description: "Se vender o que ainda tem",
      icon: DollarSign,
      color: "text-brand-red",
      bg: "bg-brand-red/10",
      accent: "border-l-brand-red",
      valueColor: "text-brand-red",
    },
    {
      title: "Lucro do estoque",
      value: formatCurrency(stats.lucroEstimado),
      description: "Só do que ainda tem na loja",
      icon: TrendingUp,
      color: "text-green-700",
      bg: "bg-green-50",
      accent: "border-l-green-600",
      valueColor: "text-green-700",
    },
  ];

  const receberCard: StatItem = {
    title: "A receber (tudo)",
    value: formatCurrency(totalAReceber),
    description: "Crediário das clientes",
    icon: Wallet,
    color: "text-green-700",
    bg: "bg-green-50",
    accent: "border-l-green-600",
    valueColor: "text-green-700",
  };

  const pagarCard: StatItem = {
    title: "A pagar",
    value: formatCurrency(totalAPagar),
    description: `Contas da loja · ${formatMesAno()}`,
    icon: Receipt,
    color: "text-brand-red",
    bg: "bg-brand-red/10",
    accent: "border-l-brand-red",
    valueColor: "text-brand-red",
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1.5 flex flex-wrap items-end justify-between gap-2">
          <SectionLabel>Financeiro</SectionLabel>
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

        <div className="grid gap-2 grid-cols-1 sm:grid-cols-3">
          {previstoCards.map((item) => (
            <StatCard
              key={item.title}
              item={item}
              isLoading={isLoading || carregandoMes}
            />
          ))}
        </div>

        <div className="mt-2 grid gap-2 grid-cols-2">
          <StatCard item={receberCard} isLoading={isLoading} />
          <StatCard item={pagarCard} isLoading={isLoading} />
        </div>

        <p className="mt-1.5 text-[10px] leading-relaxed text-brand-black/45">
          A receber = crediário. A pagar = contas da loja (aluguel, fornecedor…).
          Nada disso vem do estoque.
        </p>
      </div>

      <div className="border-t border-brand-red/10 pt-3">
        <SectionLabel>Estoque atual</SectionLabel>
        <div className="grid gap-2 grid-cols-2 lg:grid-cols-3">
          {estoqueCards.map((item) => (
            <StatCard key={item.title} item={item} isLoading={isLoading} />
          ))}
        </div>
        <p className="mt-1.5 text-[10px] leading-relaxed text-brand-black/45">
          Só produtos que ainda tem na loja. Se zerar, fica R$0,00 — isso é
          normal e não mexe no a pagar.
        </p>
      </div>
    </div>
  );
}
