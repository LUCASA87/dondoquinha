"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ListaPaginacao } from "@/components/ui/lista-paginacao";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WhatsAppButton } from "@/components/ui/whatsapp-button";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/format";
import { mensagemCobrancaParcela } from "@/lib/whatsapp";
import { filtrarParcelasPagaveis } from "@/lib/parcelas-utils";
import { agruparNomesItensPorVenda, buscarItensVendas } from "@/lib/venda-itens";
import type { ParcelaAVencer } from "@/types/database";

interface ParcelasAVencerProps {
  initialParcelas: ParcelaAVencer[];
}

const LIMITE_PARCELAS_DASHBOARD = 5;

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

function statusBadge(status: ParcelaAVencer["status_vencimento"]) {
  if (status === "vencida") {
    return <Badge variant="default">Vencida</Badge>;
  }
  if (status === "hoje") {
    return <Badge variant="warning">Hoje</Badge>;
  }
  return <Badge variant="secondary">A vencer</Badge>;
}

export function ParcelasAVencer({ initialParcelas }: ParcelasAVencerProps) {
  const [parcelas, setParcelas] = useState(initialParcelas);
  const [paginaParcelas, setPaginaParcelas] = useState(1);

  const recarregar = useCallback(async () => {
    const supabase = createClient();
    const hoje = new Date();
    hoje.setHours(12, 0, 0, 0);
    const limite = new Date(hoje);
    limite.setDate(limite.getDate() + 30);
    const hojeStr = hoje.toISOString().split("T")[0];
    const limiteStr = limite.toISOString().split("T")[0];

    const { data } = await supabase
      .from("parcelas_vendas")
      .select("*, vendas(id, parcelas, clientes(id, nome, telefone))")
      .eq("status", "pendente")
      .lte("data_vencimento", limiteStr)
      .order("data_vencimento");

    if (!data) return;

    const comSaldo = data
      .map((p) => ({
        ...p,
        valor_pago: Number(p.valor_pago ?? 0),
        saldo_parcela: Number(p.valor_parcela) - Number(p.valor_pago ?? 0),
      }))
      .filter((p) => p.saldo_parcela > 0.001);

    const proximas = filtrarParcelasPagaveis(comSaldo);
    const vendaIdsVisiveis = [
      ...new Set(
        proximas
          .slice(0, LIMITE_PARCELAS_DASHBOARD)
          .map((p) => {
            const venda = p.vendas as { id: string } | null;
            return venda?.id ?? p.venda_id;
          })
          .filter(Boolean)
      ),
    ] as string[];
    const itensRows =
      vendaIdsVisiveis.length > 0
        ? await buscarItensVendas(supabase, vendaIdsVisiveis)
        : [];
    const produtosPorVenda = agruparNomesItensPorVenda(itensRows);

    setParcelas(
      proximas
        .map((p) => {
          const venda = p.vendas as {
            id: string;
            parcelas: number;
            clientes: { id: string; nome: string; telefone: string | null } | null;
          } | null;
          const cliente = venda?.clientes;
          const venc = p.data_vencimento;

          let status_vencimento: ParcelaAVencer["status_vencimento"];
          if (venc < hojeStr) status_vencimento = "vencida";
          else if (venc === hojeStr) status_vencimento = "hoje";
          else status_vencimento = "a_vencer";

          const vendaId = venda?.id ?? p.venda_id;

          return {
            id: p.id,
            venda_id: vendaId,
            numero_parcela: p.numero_parcela,
            parcelas_total: venda?.parcelas ?? 1,
            saldo_parcela: p.saldo_parcela,
            data_vencimento: venc,
            numero_pedido: vendaId.replace(/-/g, "").slice(0, 8).toUpperCase(),
            cliente_id: cliente?.id ?? "",
            cliente_nome: cliente?.nome ?? "—",
            cliente_telefone: cliente?.telefone ?? null,
            produtos: produtosPorVenda.get(vendaId) ?? [],
            status_vencimento,
          };
        })
        .sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento))
    );
  }, []);

  useEffect(() => {
    setParcelas(initialParcelas);
  }, [initialParcelas]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("dashboard-parcelas-vencer")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "parcelas_vendas" },
        () => recarregar()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pagamentos_crediario" },
        () => recarregar()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [recarregar]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(parcelas.length / LIMITE_PARCELAS_DASHBOARD)
  );
  const paginaAtual = Math.min(paginaParcelas, totalPaginas);
  const inicioParcelas = (paginaAtual - 1) * LIMITE_PARCELAS_DASHBOARD;
  const parcelasVisiveis = parcelas.slice(
    inicioParcelas,
    inicioParcelas + LIMITE_PARCELAS_DASHBOARD
  );

  useEffect(() => {
    if (paginaParcelas > totalPaginas) {
      setPaginaParcelas(totalPaginas);
    }
  }, [paginaParcelas, totalPaginas]);

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <SectionLabel>Parcelas a vencer</SectionLabel>
        <Link
          href="/financeiro"
          className="text-[10px] text-brand-red hover:underline font-medium"
        >
          Ver financeiro
        </Link>
      </div>

      {parcelas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-brand-red/20 bg-gradient-to-br from-brand-red/[0.07] via-brand-cream/80 to-brand-cream px-4 py-6 text-center">
          <CalendarClock className="h-5 w-5 mx-auto text-brand-black/30 mb-2" />
          <p className="text-sm text-brand-black/50">
            Nenhuma parcela vencida ou a vencer nos próximos 30 dias.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-brand-red/15 bg-gradient-to-br from-brand-red/[0.08] via-brand-cream/70 to-brand-cream shadow-sm shadow-brand-red/[0.05] [&>div]:border-0 [&>div]:rounded-none">
          <Table className="text-xs bg-transparent">
            <TableHeader className="bg-brand-red/[0.06]">
              <TableRow>
                <TableHead className="h-8 px-2 py-1 text-[10px]">Cliente</TableHead>
                <TableHead className="h-8 px-2 py-1 text-[10px]">Produtos</TableHead>
                <TableHead className="h-8 px-2 py-1 text-[10px]">Parcela</TableHead>
                <TableHead className="h-8 px-2 py-1 text-[10px]">Vencimento</TableHead>
                <TableHead className="h-8 px-2 py-1 text-[10px]">Valor</TableHead>
                <TableHead className="h-8 px-2 py-1 text-[10px]">Status</TableHead>
                <TableHead className="h-8 px-2 py-1 text-[10px] text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-transparent">
              {parcelasVisiveis.map((p) => (
                <TableRow key={p.id} className="hover:bg-brand-red/[0.06]">
                  <TableCell className="px-2 py-1.5 font-medium max-w-[100px] truncate">
                    {p.cliente_nome}
                  </TableCell>
                  <TableCell className="px-2 py-1.5 text-brand-black/70 max-w-[100px]">
                    <span className="line-clamp-1 uppercase">
                      {p.produtos.length > 0 ? p.produtos.join(", ") : "—"}
                    </span>
                  </TableCell>
                  <TableCell className="px-2 py-1.5 tabular-nums">
                    {p.numero_parcela}/{p.parcelas_total}
                  </TableCell>
                  <TableCell className="px-2 py-1.5">{formatDate(p.data_vencimento)}</TableCell>
                  <TableCell className="px-2 py-1.5 font-semibold tabular-nums">
                    {formatCurrency(p.saldo_parcela)}
                  </TableCell>
                  <TableCell className="px-2 py-1.5">
                    <span className="[&_span]:text-[10px] [&_span]:px-1.5 [&_span]:py-0">
                      {statusBadge(p.status_vencimento)}
                    </span>
                  </TableCell>
                  <TableCell className="px-2 py-1.5 text-right w-[80px]">
                    <div className="flex justify-end touch-manipulation">
                      <WhatsAppButton
                        telefone={p.cliente_telefone}
                        mensagem={mensagemCobrancaParcela({
                          clienteNome: p.cliente_nome,
                          valor: p.saldo_parcela,
                          dataVencimento: p.data_vencimento,
                          numeroParcela: p.numero_parcela,
                          parcelasTotal: p.parcelas_total,
                          numeroPedido: p.numero_pedido,
                          produtos: p.produtos,
                        })}
                        label="Cobrar"
                        size="xs"
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {parcelas.length > LIMITE_PARCELAS_DASHBOARD && (
        <ListaPaginacao
          paginaAtual={paginaAtual}
          totalPaginas={totalPaginas}
          onSelecionarPagina={setPaginaParcelas}
          onProximaPagina={() => setPaginaParcelas((p) => Math.min(p + 1, totalPaginas))}
        />
      )}
    </div>
  );
}
