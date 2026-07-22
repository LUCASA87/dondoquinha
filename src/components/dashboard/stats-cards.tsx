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
import { formatCurrency, formatDate, formatMesAno } from "@/lib/format";
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

type ModoFiltroFinanceiro = "mes" | "periodo";

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

function normalizarIntervalo(inicio: string, fim: string): { inicio: string; fim: string } {
  if (!inicio || !fim) return { inicio, fim };
  return inicio <= fim ? { inicio, fim } : { inicio: fim, fim: inicio };
}

function labelPeriodo(inicio: string, fim: string): string {
  if (!inicio || !fim) return "—";
  const { inicio: a, fim: b } = normalizarIntervalo(inicio, fim);
  return `${formatDate(a)} – ${formatDate(b)}`;
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
        "overflow-hidden rounded-xl border-l-2 bg-gradient-to-br from-white to-brand-cream/25 shadow-sm shadow-brand-black/[0.03]",
        item.accent,
        isLoading && "opacity-80"
      )}
    >
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className={cn("rounded-lg p-1.5 shrink-0", item.bg)}>
          <item.icon className={cn("h-3.5 w-3.5", item.color)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium text-brand-black/55 leading-tight truncate">
            {item.title}
          </p>
          <p
            className={cn(
              "mt-0.5 text-[15px] font-bold tabular-nums tracking-tight leading-tight",
              item.valueColor ?? "text-brand-black",
              isLoading && "animate-pulse"
            )}
          >
            {item.value}
          </p>
          {item.description ? (
            <p className="mt-0.5 truncate text-[9px] leading-tight text-brand-black/40">
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
  totalAReceber: initialAReceber,
  isLoading = false,
}: StatsCardsProps) {
  const [stats, setStats] = useState(initialStats);
  const [totalAReceber, setTotalAReceber] = useState(initialAReceber);
  const [totalContasPagas, setTotalContasPagas] = useState(0);
  const [modoFiltro, setModoFiltro] = useState<ModoFiltroFinanceiro>("mes");
  const [mesFiltro, setMesFiltro] = useState(mesAtualInput);
  const mesPadrao = intervaloDoMes(mesAtualInput());
  const [dataInicio, setDataInicio] = useState(mesPadrao.inicio);
  const [dataFim, setDataFim] = useState(mesPadrao.fim);
  const [totalAPagarAbertoMes, setTotalAPagarAbertoMes] = useState(0);
  const [totalAPagarPagasMes, setTotalAPagarPagasMes] = useState(0);
  const [qtdAbertoMes, setQtdAbertoMes] = useState(0);
  const [qtdPagasMes, setQtdPagasMes] = useState(0);
  const [aEntrarMes, setAEntrarMes] = useState(0);
  const [qtdParcelasMes, setQtdParcelasMes] = useState(0);
  const [brutoVendasMes, setBrutoVendasMes] = useState(0);
  const [lucroVendasMes, setLucroVendasMes] = useState(0);
  const [recebidoMes, setRecebidoMes] = useState(0);
  const [qtdRecebidoMes, setQtdRecebidoMes] = useState(0);
  const [carregandoMes, setCarregandoMes] = useState(false);
  const [carregandoPagar, setCarregandoPagar] = useState(false);

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

  const fetchAPagarPeriodo = useCallback(async (inicioRaw: string, fimRaw: string) => {
    const { inicio, fim } = normalizarIntervalo(inicioRaw, fimRaw);
    if (!inicio || !fim) return;

    setCarregandoPagar(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("contas_a_pagar")
        .select("valor, status, data_vencimento, data_pagamento");

      if (!data) {
        setTotalAPagarAbertoMes(0);
        setTotalAPagarPagasMes(0);
        setQtdAbertoMes(0);
        setQtdPagasMes(0);
        setTotalContasPagas(0);
        return;
      }

      let abertoMes = 0;
      let pagasMes = 0;
      let qtdAberto = 0;
      let qtdPagas = 0;
      let pagasTudo = 0;

      for (const c of data) {
        const valor = Number(c.valor);
        if (c.status === "pago") {
          pagasTudo += valor;
          const ref = c.data_pagamento ?? c.data_vencimento;
          if (ref >= inicio && ref <= fim) {
            pagasMes += valor;
            qtdPagas += 1;
          }
        } else if (
          c.status === "pendente" &&
          c.data_vencimento >= inicio &&
          c.data_vencimento <= fim
        ) {
          abertoMes += valor;
          qtdAberto += 1;
        }
      }

      setTotalAPagarAbertoMes(abertoMes);
      setTotalAPagarPagasMes(pagasMes);
      setQtdAbertoMes(qtdAberto);
      setQtdPagasMes(qtdPagas);
      setTotalContasPagas(pagasTudo);
    } finally {
      setCarregandoPagar(false);
    }
  }, []);

  const fetchResumoPeriodo = useCallback(async (inicioRaw: string, fimRaw: string) => {
    const { inicio, fim } = normalizarIntervalo(inicioRaw, fimRaw);
    if (!inicio || !fim) return;

    setCarregandoMes(true);
    try {
      const supabase = createClient();

      const [{ data: parcelas }, { data: itens }, { data: pagamentos }] =
        await Promise.all([
          supabase
            .from("parcelas_vendas")
            .select("valor_parcela, valor_pago, data_vencimento")
            .lte("data_vencimento", fim),
          supabase
            .from("venda_itens")
            .select("quantidade, preco_unitario, preco_custo, vendas!inner(data_venda)")
            .gte("vendas.data_venda", inicio)
            .lte("vendas.data_venda", fim),
          supabase
            .from("pagamentos_crediario")
            .select("valor_pago, data_pagamento")
            .gte("data_pagamento", inicio)
            .lte("data_pagamento", fim),
        ]);

      let totalEntrar = 0;
      let qtd = 0;
      for (const p of parcelas ?? []) {
        const saldo = Number(p.valor_parcela) - Number(p.valor_pago ?? 0);
        if (saldo <= 0.001) continue;
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

      let totalRecebido = 0;
      for (const p of pagamentos ?? []) {
        totalRecebido += Number(p.valor_pago ?? 0);
      }
      setRecebidoMes(totalRecebido);
      setQtdRecebidoMes(pagamentos?.length ?? 0);
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

  const intervaloAtivo = useCallback(() => {
    if (modoFiltro === "mes") return intervaloDoMes(mesFiltro);
    return normalizarIntervalo(dataInicio, dataFim);
  }, [modoFiltro, mesFiltro, dataInicio, dataFim]);

  useEffect(() => {
    const { inicio, fim } = intervaloAtivo();
    void fetchResumoPeriodo(inicio, fim);
    void fetchAPagarPeriodo(inicio, fim);
  }, [intervaloAtivo, fetchResumoPeriodo, fetchAPagarPeriodo]);

  useEffect(() => {
    const supabase = createClient();

    const refreshMes = () => {
      const { inicio, fim } = intervaloAtivo();
      void fetchResumoPeriodo(inicio, fim);
      void fetchAPagarPeriodo(inicio, fim);
    };

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

    const channelContas = supabase
      .channel("dashboard-contas-pagar")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contas_a_pagar" },
        () => {
          const { inicio, fim } = intervaloAtivo();
          void fetchAPagarPeriodo(inicio, fim);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelEstoque);
      supabase.removeChannel(channelParcelas);
      supabase.removeChannel(channelPagamentos);
      supabase.removeChannel(channelVendas);
      supabase.removeChannel(channelContas);
    };
  }, [
    fetchEstoque,
    fetchAReceber,
    fetchAPagarPeriodo,
    fetchResumoPeriodo,
    intervaloAtivo,
  ]);

  const periodoAtivo = intervaloAtivo();
  const periodoLabel =
    modoFiltro === "mes"
      ? formatMesAno(`${mesFiltro}-01`)
      : labelPeriodo(periodoAtivo.inicio, periodoAtivo.fim);

  const previstoCards: StatItem[] = [
    {
      title: `A entrar até ${modoFiltro === "mes" ? periodoLabel : formatDate(periodoAtivo.fim)}`,
      value: formatCurrency(aEntrarMes),
      description:
        qtdParcelasMes === 0
          ? "Nenhuma parcela em aberto até esta data"
          : `${qtdParcelasMes} parcela${qtdParcelasMes > 1 ? "s" : ""} (período + atrasadas)`,
      icon: CalendarDays,
      color: "text-green-700",
      bg: "bg-green-50",
      accent: "border-l-green-600",
      valueColor: "text-green-700",
    },
    {
      title: `Vendas · ${periodoLabel}`,
      value: formatCurrency(brutoVendasMes),
      description: "Total vendido no período",
      icon: DollarSign,
      color: "text-brand-red",
      bg: "bg-brand-red/10",
      accent: "border-l-brand-red",
      valueColor: "text-brand-red",
    },
    {
      title: `Lucro · ${periodoLabel}`,
      value: formatCurrency(lucroVendasMes),
      description: "Venda menos custo no período",
      icon: TrendingUp,
      color: "text-green-700",
      bg: "bg-green-50",
      accent: "border-l-green-600",
      valueColor: "text-green-700",
    },
  ];

  const valorBrutoEstoque = stats.totalVenda;
  // Valor bruto só desconta contas já pagas (não as em aberto).
  const valorBrutoLiquido = valorBrutoEstoque - totalContasPagas;

  const estoqueResumoCards: StatItem[] = [
    {
      title: "Valor bruto",
      value: formatCurrency(valorBrutoLiquido),
      description:
        totalContasPagas > 0
          ? `Menos contas pagas (${formatCurrency(totalContasPagas)})`
          : "Estoque a preço de venda",
      icon: DollarSign,
      color: "text-brand-red",
      bg: "bg-brand-red/10",
      accent: "border-l-brand-red",
      valueColor: "text-brand-red",
    },
    {
      title: "Lucro do estoque",
      value: formatCurrency(stats.lucroEstimado),
      description: "Venda menos custo",
      icon: TrendingUp,
      color: "text-green-700",
      bg: "bg-green-50",
      accent: "border-l-green-600",
      valueColor: "text-green-700",
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SectionLabel>Financeiro</SectionLabel>
            <div className="flex rounded-lg border border-brand-black/10 bg-white p-0.5">
              <button
                type="button"
                onClick={() => {
                  setModoFiltro("mes");
                  const { inicio, fim } = intervaloDoMes(mesFiltro);
                  setDataInicio(inicio);
                  setDataFim(fim);
                }}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[10px] font-semibold transition-colors",
                  modoFiltro === "mes"
                    ? "bg-brand-red text-white"
                    : "text-brand-black/55 hover:bg-brand-cream"
                )}
              >
                Mês
              </button>
              <button
                type="button"
                onClick={() => {
                  setModoFiltro("periodo");
                  const { inicio, fim } = intervaloDoMes(mesFiltro);
                  setDataInicio(inicio);
                  setDataFim(fim);
                }}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[10px] font-semibold transition-colors",
                  modoFiltro === "periodo"
                    ? "bg-brand-red text-white"
                    : "text-brand-black/55 hover:bg-brand-cream"
                )}
              >
                Período
              </button>
            </div>
          </div>

          {modoFiltro === "mes" ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
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
                onChange={(e) => {
                  const valor = e.target.value;
                  setMesFiltro(valor);
                  const { inicio, fim } = intervaloDoMes(valor);
                  setDataInicio(inicio);
                  setDataFim(fim);
                }}
                className="h-8 w-[9.5rem] px-2 text-xs"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label
                  htmlFor="filtro_data_inicio"
                  className="text-[10px] font-medium text-brand-black/55"
                >
                  De
                </Label>
                <Input
                  id="filtro_data_inicio"
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="h-8 px-2 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor="filtro_data_fim"
                  className="text-[10px] font-medium text-brand-black/55"
                >
                  Até
                </Label>
                <Input
                  id="filtro_data_fim"
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="h-8 px-2 text-xs"
                />
              </div>
            </div>
          )}
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

        <div className="mt-2 grid gap-2 grid-cols-1 sm:grid-cols-2">
          <Card
            className={cn(
              "overflow-hidden rounded-xl border-l-2 border-l-green-600 bg-gradient-to-br from-white to-brand-cream/25 shadow-sm shadow-brand-black/[0.03]",
              (isLoading || carregandoMes) && "opacity-80"
            )}
          >
            <div className="space-y-2.5 px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-1.5">
                <div className="shrink-0 rounded-lg bg-green-50 p-1.5">
                  <Wallet className="h-3.5 w-3.5 text-green-700" />
                </div>
                <p className="truncate text-[10px] font-medium text-brand-black/55">
                  Crediário · {periodoLabel}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-brand-red/15 bg-brand-red/[0.04] px-2.5 py-2">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-brand-red">
                    Em aberto
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 text-[15px] font-bold tabular-nums tracking-tight text-brand-red",
                      isLoading && "animate-pulse"
                    )}
                  >
                    {formatCurrency(totalAReceber)}
                  </p>
                  <p className="text-[9px] text-brand-black/40">A receber</p>
                </div>
                <div className="rounded-xl border border-green-200 bg-green-50/80 px-2.5 py-2">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-green-700">
                    Recebido
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 text-[15px] font-bold tabular-nums tracking-tight text-green-700",
                      (isLoading || carregandoMes) && "animate-pulse"
                    )}
                  >
                    {formatCurrency(recebidoMes)}
                  </p>
                  <p className="text-[9px] text-brand-black/40">
                    {qtdRecebidoMes === 0
                      ? "No período"
                      : `${qtdRecebidoMes} no período`}
                  </p>
                </div>
              </div>
            </div>
          </Card>
          <Card
            className={cn(
              "overflow-hidden rounded-xl border-l-2 border-l-brand-red bg-gradient-to-br from-white to-brand-cream/25 shadow-sm shadow-brand-black/[0.03]",
              (isLoading || carregandoPagar) && "opacity-80"
            )}
          >
            <div className="space-y-2.5 px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-1.5">
                <div className="shrink-0 rounded-lg bg-brand-red/10 p-1.5">
                  <Receipt className="h-3.5 w-3.5 text-brand-red" />
                </div>
                <p className="truncate text-[10px] font-medium text-brand-black/55">
                  A pagar · {periodoLabel}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-brand-red/15 bg-brand-red/[0.04] px-2.5 py-2">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-brand-red">
                    Em aberto
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 text-[15px] font-bold tabular-nums tracking-tight text-brand-red",
                      (isLoading || carregandoPagar) && "animate-pulse"
                    )}
                  >
                    {formatCurrency(totalAPagarAbertoMes)}
                  </p>
                  <p className="text-[9px] text-brand-black/40">
                    {qtdAbertoMes === 0
                      ? "Nenhuma"
                      : `${qtdAbertoMes} conta${qtdAbertoMes > 1 ? "s" : ""}`}
                  </p>
                </div>
                <div className="rounded-xl border border-green-200 bg-green-50/80 px-2.5 py-2">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-green-700">
                    Pagas
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 text-[15px] font-bold tabular-nums tracking-tight text-green-700",
                      (isLoading || carregandoPagar) && "animate-pulse"
                    )}
                  >
                    {formatCurrency(totalAPagarPagasMes)}
                  </p>
                  <p className="text-[9px] text-brand-black/40">
                    {qtdPagasMes === 0
                      ? "Nenhuma"
                      : `${qtdPagasMes} conta${qtdPagasMes > 1 ? "s" : ""}`}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="border-t border-brand-red/10 pt-3">
        <SectionLabel>Estoque atual</SectionLabel>

        <Card
          className={cn(
            "mb-2 overflow-hidden rounded-xl border border-brand-red/15 bg-gradient-to-br from-brand-cream/50 via-white to-white shadow-sm shadow-brand-red/[0.04]",
            isLoading && "opacity-80"
          )}
        >
          <div className="grid grid-cols-1 divide-y divide-brand-red/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <div className="px-3.5 py-3.5">
              <div className="mb-2 flex items-center gap-1.5">
                <div className="rounded-md bg-brand-cream p-1.5">
                  <Package className="h-3.5 w-3.5 text-brand-black" />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-black/55">
                  Preço de custo
                </p>
              </div>
              <p
                className={cn(
                  "text-xl font-bold tabular-nums tracking-tight text-brand-black sm:text-2xl",
                  isLoading && "animate-pulse"
                )}
              >
                {formatCurrency(stats.totalCusto)}
              </p>
              <p className="mt-1 text-[10px] text-brand-black/40">
                Investido no estoque
              </p>
            </div>

            <div className="bg-brand-red/[0.03] px-3.5 py-3.5">
              <div className="mb-2 flex items-center gap-1.5">
                <div className="rounded-md bg-brand-red/10 p-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-brand-red" />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-red">
                  Preço de venda
                </p>
              </div>
              <p
                className={cn(
                  "text-xl font-bold tabular-nums tracking-tight text-brand-red sm:text-2xl",
                  isLoading && "animate-pulse"
                )}
              >
                {formatCurrency(valorBrutoEstoque)}
              </p>
              <p className="mt-1 text-[10px] text-brand-black/40">
                Se vender o estoque
              </p>
            </div>
          </div>
        </Card>

        <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
          {estoqueResumoCards.map((item) => (
            <StatCard
              key={item.title}
              item={item}
              isLoading={isLoading || carregandoPagar}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
