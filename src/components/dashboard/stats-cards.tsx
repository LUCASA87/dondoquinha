"use client";

import { useEffect, useState, useCallback } from "react";
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
    <div className="mb-1 flex items-center gap-1">
      <span className="h-0.5 w-2.5 rounded-full bg-brand-red" />
      <p className="text-[9px] font-semibold uppercase tracking-wider text-brand-red">
        {children}
      </p>
    </div>
  );
}

export function StatsCards({
  initialStats,
  totalAReceber: initialAReceber,
  isLoading = false,
}: StatsCardsProps) {
  const [stats, setStats] = useState(initialStats);
  const [totalAReceber, setTotalAReceber] = useState(initialAReceber);
  const [modoFiltro, setModoFiltro] = useState<ModoFiltroFinanceiro>("mes");
  const [mesFiltro, setMesFiltro] = useState(mesAtualInput);
  const mesPadrao = intervaloDoMes(mesAtualInput());
  const [dataInicio, setDataInicio] = useState(mesPadrao.inicio);
  const [dataFim, setDataFim] = useState(mesPadrao.fim);
  const [totalAPagarAbertoMes, setTotalAPagarAbertoMes] = useState(0);
  const [totalAPagarPagasMes, setTotalAPagarPagasMes] = useState(0);
  const [brutoVendasMes, setBrutoVendasMes] = useState(0);
  const [lucroVendasMes, setLucroVendasMes] = useState(0);
  const [recebidoMes, setRecebidoMes] = useState(0);
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
        return;
      }

      // Em aberto = pendentes com vencimento no período (mês seguinte não entra).
      // Pagas = quitadas no período do filtro.
      let abertoMes = 0;
      let pagasMes = 0;

      for (const c of data) {
        const valor = Number(c.valor);
        if (c.status === "pago") {
          const ref = c.data_pagamento ?? c.data_vencimento;
          if (ref >= inicio && ref <= fim) {
            pagasMes += valor;
          }
        } else if (
          c.status === "pendente" &&
          c.data_vencimento >= inicio &&
          c.data_vencimento <= fim
        ) {
          abertoMes += valor;
        }
      }

      setTotalAPagarAbertoMes(abertoMes);
      setTotalAPagarPagasMes(pagasMes);
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

      const [{ data: itens }, { data: pagamentos }] = await Promise.all([
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

  const custoVendasMes = Math.max(0, brutoVendasMes - lucroVendasMes);
  const liquidoMes = lucroVendasMes;

  const valorBrutoEstoque = stats.totalVenda;

  const estoqueLinhas = [
    {
      label: "Custo",
      value: formatCurrency(stats.totalCusto),
      rowClass: "bg-brand-cream",
      labelClass: "text-brand-black/60",
      valueClass: "text-brand-black",
    },
    {
      label: "Preço venda",
      value: formatCurrency(valorBrutoEstoque),
      rowClass: "bg-brand-red/[0.06]",
      labelClass: "text-brand-red",
      valueClass: "text-brand-red",
    },
    {
      label: "Valor bruto",
      value: formatCurrency(valorBrutoEstoque),
      rowClass: "bg-brand-red/[0.06]",
      labelClass: "text-brand-red",
      valueClass: "text-brand-red",
    },
    {
      label: "Lucro estoque",
      value: formatCurrency(stats.lucroEstimado),
      rowClass: "bg-green-50",
      labelClass: "text-green-700",
      valueClass: "text-green-700",
    },
  ] as const;

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

        <Card
          className={cn(
            "overflow-hidden rounded-lg border-l-2 border-l-brand-red bg-white",
            (isLoading || carregandoMes) && "opacity-80"
          )}
        >
          <div className="space-y-1.5 px-2 py-1.5">
            <p className="text-[9px] font-medium text-brand-black/50">
              Vendas − custo = líquido · {periodoLabel}
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              <div className="rounded-md bg-brand-red/[0.06] px-1.5 py-1.5">
                <p className="text-[8px] font-semibold uppercase text-brand-red">
                  Vendas
                </p>
                <p
                  className={cn(
                    "text-[13px] font-bold tabular-nums text-brand-red",
                    (isLoading || carregandoMes) && "animate-pulse"
                  )}
                >
                  {formatCurrency(brutoVendasMes)}
                </p>
              </div>
              <div className="rounded-md bg-brand-cream px-1.5 py-1.5">
                <p className="text-[8px] font-semibold uppercase text-brand-black/60">
                  (−) Custo
                </p>
                <p
                  className={cn(
                    "text-[13px] font-bold tabular-nums text-brand-black",
                    (isLoading || carregandoMes) && "animate-pulse"
                  )}
                >
                  {formatCurrency(custoVendasMes)}
                </p>
              </div>
              <div className="rounded-md bg-green-50 px-1.5 py-1.5">
                <p className="text-[8px] font-semibold uppercase text-green-700">
                  (=) Líquido
                </p>
                <p
                  className={cn(
                    "text-[13px] font-bold tabular-nums",
                    liquidoMes < 0 ? "text-brand-red" : "text-green-700",
                    (isLoading || carregandoMes) && "animate-pulse"
                  )}
                >
                  {formatCurrency(liquidoMes)}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <div className="mt-1.5 grid grid-cols-2 gap-1">
          <Card
            className={cn(
              "overflow-hidden rounded-md border-l-2 border-l-green-600 bg-white",
              (isLoading || carregandoMes) && "opacity-80"
            )}
          >
            <div className="space-y-0.5 px-1.5 py-1">
              <p className="truncate text-[8px] font-medium text-brand-black/50">
                Crediário · {periodoLabel}
              </p>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between gap-1 rounded bg-brand-red/[0.06] px-1 py-0.5">
                  <span className="text-[7px] font-semibold uppercase text-brand-red">
                    Em aberto
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-bold tabular-nums text-brand-red",
                      isLoading && "animate-pulse"
                    )}
                  >
                    {formatCurrency(totalAReceber)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-1 rounded bg-green-50 px-1 py-0.5">
                  <span className="text-[7px] font-semibold uppercase text-green-700">
                    Recebido
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-bold tabular-nums text-green-700",
                      (isLoading || carregandoMes) && "animate-pulse"
                    )}
                  >
                    {formatCurrency(recebidoMes)}
                  </span>
                </div>
              </div>
            </div>
          </Card>
          <Card
            className={cn(
              "overflow-hidden rounded-md border-l-2 border-l-brand-red bg-white",
              (isLoading || carregandoPagar) && "opacity-80"
            )}
          >
            <div className="space-y-0.5 px-1.5 py-1">
              <p className="truncate text-[8px] font-medium text-brand-black/50">
                A pagar · {periodoLabel}
              </p>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between gap-1 rounded bg-brand-red/[0.06] px-1 py-0.5">
                  <span className="text-[7px] font-semibold uppercase text-brand-red">
                    Em aberto
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-bold tabular-nums text-brand-red",
                      (isLoading || carregandoPagar) && "animate-pulse"
                    )}
                  >
                    {formatCurrency(totalAPagarAbertoMes)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-1 rounded bg-green-50 px-1 py-0.5">
                  <span className="text-[7px] font-semibold uppercase text-green-700">
                    Pagas
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-bold tabular-nums text-green-700",
                      (isLoading || carregandoPagar) && "animate-pulse"
                    )}
                  >
                    {formatCurrency(totalAPagarPagasMes)}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="border-t border-brand-red/10 pt-2">
        <SectionLabel>Estoque atual</SectionLabel>

        <Card
          className={cn(
            "overflow-hidden rounded-md border-l-2 border-l-brand-black bg-white",
            isLoading && "opacity-80"
          )}
        >
          <div className="flex flex-col gap-0.5 px-1.5 py-1">
            {estoqueLinhas.map((linha) => (
              <div
                key={linha.label}
                className={cn(
                  "flex items-center justify-between gap-1 rounded px-1 py-0.5",
                  linha.rowClass
                )}
              >
                <span
                  className={cn(
                    "text-[7px] font-semibold uppercase",
                    linha.labelClass
                  )}
                >
                  {linha.label}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-bold tabular-nums",
                    linha.valueClass,
                    isLoading && "animate-pulse"
                  )}
                >
                  {linha.value}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
