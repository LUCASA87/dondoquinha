"use server";

import { revalidateFinanceiro, revalidateVendas } from "@/lib/revalidate-app";
import type { LinhaRelatorioConta } from "@/lib/relatorio-contas-pagar-pdf";
import { getSupabase } from "@/lib/supabase/data";
import { devolverEstoqueVenda } from "@/lib/db/estoque-venda";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ComprovantePagamentoData } from "@/lib/store";
import type { ClienteDebitoResumo, StatusPagamento, ParcelaAVencer, ParcelaVenda } from "@/types/database";
import { filtrarParcelasPagaveis } from "@/lib/parcelas-utils";
import {
  agruparNomesItensPorVenda,
  buscarItensVendas,
  mapItensComprovante,
} from "@/lib/venda-itens";
import { formatCPF } from "@/lib/format";
import {
  nomeClienteDaVenda,
  selectParcelasAbertasComCliente,
} from "@/lib/cliente-venda-nome";

async function getTotalPagoVenda(supabase: SupabaseClient, vendaId: string) {
  const { data } = await supabase
    .from("pagamentos_crediario")
    .select("valor_pago")
    .eq("venda_id", vendaId);

  return (data ?? []).reduce((sum, p) => sum + Number(p.valor_pago), 0);
}

export async function registrarPagamentoCrediario(data: {
  parcela_id: string;
  valor_pago: number;
  obs?: string;
}) {
  const supabase = getSupabase();
  const valorPago = Math.round(data.valor_pago * 100) / 100;

  if (valorPago < 0.01) {
    return { error: "Informe um valor de pelo menos R$0,01." };
  }

  const { data: parcela, error: parcelaError } = await supabase
    .from("parcelas_vendas")
    .select("*, vendas(*, clientes(nome))")
    .eq("id", data.parcela_id)
    .single();

  if (parcelaError || !parcela || !parcela.vendas) {
    return { error: "Parcela não encontrada." };
  }

  const venda = parcela.vendas;
  const valorTotalVenda = Number(venda.valor_total);

  const { data: todasParcelas, error: parcelasError } = await supabase
    .from("parcelas_vendas")
    .select("*")
    .eq("venda_id", venda.id)
    .order("numero_parcela");

  if (parcelasError || !todasParcelas?.length) {
    return { error: "Parcelas da venda não encontradas." };
  }

  const parcelasComSaldo = todasParcelas
    .map((p) => ({
      ...p,
      saldo: Number(p.valor_parcela) - Number(p.valor_pago ?? 0),
    }))
    .filter((p) => p.saldo > 0.001);

  const proximaParcela = parcelasComSaldo[0];
  if (!proximaParcela || proximaParcela.id !== data.parcela_id) {
    const num = proximaParcela?.numero_parcela ?? 1;
    return { error: `Pague a ${num}ª parcela antes. Não é permitido pular parcelas.` };
  }

  const totalJaPagoAntes = todasParcelas.reduce(
    (sum, p) => sum + Number(p.valor_pago ?? 0),
    0
  );
  const saldoRestanteAntes = valorTotalVenda - totalJaPagoAntes;

  if (saldoRestanteAntes <= 0.001) {
    return { error: "Esta venda já está quitada." };
  }

  if (valorPago > saldoRestanteAntes + 0.001) {
    return {
      error: `Valor máximo: R$ ${saldoRestanteAntes.toFixed(2).replace(".", ",")}`,
    };
  }

  const dataPagamento = new Date().toISOString().split("T")[0];
  const parcelaInicialNumero = parcela.numero_parcela;
  let restante = valorPago;
  let saldoParcelaRestante = 0;

  for (const p of todasParcelas) {
    if (restante <= 0.001) break;

    const saldo = Number(p.valor_parcela) - Number(p.valor_pago ?? 0);
    if (saldo <= 0.001) continue;

    const aplicar = Math.round(Math.min(restante, saldo) * 100) / 100;
    const novoValorPago = Number(p.valor_pago ?? 0) + aplicar;
    const quitada = novoValorPago >= Number(p.valor_parcela) - 0.001;

    const { error: pagamentoError } = await supabase.from("pagamentos_crediario").insert({
      venda_id: venda.id,
      parcela_id: p.id,
      valor_pago: aplicar,
      obs: data.obs?.trim() || null,
      data_pagamento: dataPagamento,
    });

    if (pagamentoError) return { error: pagamentoError.message };

    const { error: updateError } = await supabase
      .from("parcelas_vendas")
      .update({
        valor_pago: novoValorPago,
        status: quitada ? "pago" : "pendente",
      })
      .eq("id", p.id);

    if (updateError) return { error: updateError.message };

    if (p.numero_parcela === parcelaInicialNumero) {
      saldoParcelaRestante = Math.max(0, Number(p.valor_parcela) - novoValorPago);
    }

    restante = Math.round((restante - aplicar) * 100) / 100;
  }

  const totalJaPago = totalJaPagoAntes + valorPago;
  const saldoRestante = Math.max(0, valorTotalVenda - totalJaPago);

  if (saldoRestante <= 0.001) {
    await supabase.from("vendas").update({ status: "pago" }).eq("id", venda.id);
  }

  const numeroPedido = venda.id.replace(/-/g, "").slice(0, 8).toUpperCase();

  const itensRows = await buscarItensVendas(supabase, [venda.id]);
  const itens = mapItensComprovante(itensRows);

  revalidateFinanceiro();

  const comprovante: ComprovantePagamentoData = {
    numeroPedido,
    dataPagamento,
    clienteNome: nomeClienteDaVenda(venda),
    parcelaNumero: parcelaInicialNumero,
    parcelasTotal: venda.parcelas,
    valorPagoAgora: valorPago,
    obs: data.obs?.trim() || null,
    valorTotalVenda,
    totalJaPago,
    saldoRestante,
    saldoParcela: saldoParcelaRestante,
    itens,
  };

  return { success: true, comprovante };
}

export async function getParcelasAbertas(): Promise<
  (ParcelaVenda & { saldo_parcela: number })[]
> {
  const supabase = getSupabase();
  const { data, error } = await selectParcelasAbertasComCliente(supabase);

  if (error || !data) return [];

  return data
    .map((p) => ({
      ...p,
      valor_pago: Number(p.valor_pago ?? 0),
      saldo_parcela: Number(p.valor_parcela) - Number(p.valor_pago ?? 0),
    }))
    .filter((p) => p.saldo_parcela > 0.001) as unknown as (ParcelaVenda & {
    saldo_parcela: number;
  })[];
}

export async function excluirParcelaCrediario(parcelaId: string) {
  const supabase = getSupabase();

  const { data: parcela, error: parcelaError } = await supabase
    .from("parcelas_vendas")
    .select("*, vendas(id, valor_total, parcelas)")
    .eq("id", parcelaId)
    .single();

  if (parcelaError || !parcela) {
    return { error: "Parcela não encontrada." };
  }

  const vendaId = parcela.venda_id;
  const venda = parcela.vendas as { id: string; valor_total: number; parcelas: number } | null;
  const valorParcela = Number(parcela.valor_parcela);

  const { error: deleteError } = await supabase
    .from("parcelas_vendas")
    .delete()
    .eq("id", parcelaId);

  if (deleteError) return { error: deleteError.message };

  const { data: restantes } = await supabase
    .from("parcelas_vendas")
    .select("valor_parcela, valor_pago, status")
    .eq("venda_id", vendaId)
    .order("numero_parcela");

  if (!restantes?.length) {
    const devolucao = await devolverEstoqueVenda(supabase, vendaId);
    if ("error" in devolucao) return devolucao;

    const { error: vendaError } = await supabase
      .from("vendas")
      .delete()
      .eq("id", vendaId);
    if (vendaError) return { error: vendaError.message };

    revalidateFinanceiro();
    revalidateVendas();
    return { success: true };
  }

  if (venda) {
    const novoTotal = Math.max(0, Math.round((Number(venda.valor_total) - valorParcela) * 100) / 100);
    const totalPago = restantes.reduce((sum, p) => sum + Number(p.valor_pago ?? 0), 0);
    const quitada = totalPago >= novoTotal - 0.001;

    await supabase
      .from("vendas")
      .update({
        valor_total: novoTotal,
        parcelas: restantes.length,
        status: quitada ? "pago" : "pendente",
      })
      .eq("id", vendaId);
  }

  revalidateFinanceiro();

  return { success: true };
}

export async function getParcelasAVencer(
  diasAhead = 30,
  opcoes?: { buscarProdutos?: boolean; limiteProdutos?: number }
): Promise<ParcelaAVencer[]> {
  const buscarProdutos = opcoes?.buscarProdutos ?? true;
  const limiteProdutos = opcoes?.limiteProdutos ?? 0;

  const supabase = getSupabase();
  const hoje = new Date();
  hoje.setHours(12, 0, 0, 0);
  const limite = new Date(hoje);
  limite.setDate(limite.getDate() + diasAhead);
  const hojeStr = hoje.toISOString().split("T")[0];
  const limiteStr = limite.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("parcelas_vendas")
    .select("*, vendas(id, parcelas, cliente_nome, clientes(id, nome, telefone))")
    .eq("status", "pendente")
    .lte("data_vencimento", limiteStr)
    .order("data_vencimento");

  if (error || !data) return [];

  const comSaldo = data
    .map((p) => ({
      ...p,
      valor_pago: Number(p.valor_pago ?? 0),
      saldo_parcela: Number(p.valor_parcela) - Number(p.valor_pago ?? 0),
    }))
    .filter((p) => p.saldo_parcela > 0.001);

  const proximas = filtrarParcelasPagaveis(comSaldo);

  let produtosPorVenda = new Map<string, string[]>();
  if (buscarProdutos && proximas.length > 0) {
    const idsBase = proximas.map(
      (p) => p.venda_id ?? (p.vendas as { id: string } | null)?.id
    ).filter(Boolean) as string[];
    const vendaIds =
      limiteProdutos > 0
        ? [...new Set(idsBase)].slice(0, limiteProdutos)
        : [...new Set(idsBase)];
    const itensRows = await buscarItensVendas(supabase, vendaIds);
    produtosPorVenda = agruparNomesItensPorVenda(itensRows);
  }

  return proximas
    .map((p) => {
      const venda = p.vendas as {
        id: string;
        parcelas: number;
        cliente_nome?: string | null;
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
        cliente_nome: nomeClienteDaVenda(venda),
        cliente_telefone: cliente?.telefone ?? null,
        produtos: produtosPorVenda.get(vendaId) ?? [],
        status_vencimento,
      };
    })
    .sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento));
}

export async function getDebitoCliente(clienteId: string): Promise<ClienteDebitoResumo | null> {
  const supabase = getSupabase();

  const { data: cliente } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", clienteId)
    .single();

  if (!cliente) return null;

  const { data: vendas } = await supabase
    .from("vendas")
    .select("*, parcelas_vendas(*)")
    .eq("cliente_id", clienteId)
    .order("data_venda", { ascending: false });

  let totalDevido = 0;
  let totalPago = 0;
  let totalCompras = 0;
  const vendasResumo = [];
  const vendaIds = (vendas ?? []).map((v) => v.id);
  const itensRows = await buscarItensVendas(supabase, vendaIds);
  const produtosPorVenda = agruparNomesItensPorVenda(itensRows);

  for (const venda of vendas ?? []) {
    const parcelasRaw = (venda.parcelas_vendas ?? []) as Array<{
      id: string;
      venda_id: string;
      numero_parcela: number;
      valor_parcela: number;
      valor_pago?: number;
      data_vencimento: string;
      status: string;
    }>;

    const pago = parcelasRaw.reduce(
      (sum, p) => sum + Number(p.valor_pago ?? 0),
      0
    );
    const valorTotal = Number(venda.valor_total);
    const saldo = Math.max(0, valorTotal - pago);

    totalCompras += valorTotal;
    totalPago += pago;
    totalDevido += saldo;

    const parcelas = parcelasRaw
      .sort((a, b) => a.numero_parcela - b.numero_parcela)
      .map((p) => {
        const valorPago = Number(p.valor_pago ?? 0);
        const saldoParcela = Number(p.valor_parcela) - valorPago;
        return {
          ...p,
          status: p.status as StatusPagamento,
          valor_pago: valorPago,
          saldo_parcela: saldoParcela,
          vendas: {
            ...venda,
            clientes: { nome: cliente.nome },
          },
        };
      })
      .filter((p) => p.saldo_parcela > 0.001);

    if (saldo > 0.001) {
      vendasResumo.push({
        id: venda.id,
        numeroPedido: venda.id.replace(/-/g, "").slice(0, 8).toUpperCase(),
        data_venda: venda.data_venda,
        valor_total: valorTotal,
        totalPago: pago,
        saldoRestante: saldo,
        parcelasTotal: venda.parcelas,
        obs: venda.obs ?? null,
        produtos: produtosPorVenda.get(venda.id) ?? [],
        parcelas,
      });
    }
  }

  return {
    cliente,
    totalDevido,
    totalPago,
    totalCompras,
    vendas: vendasResumo,
  };
}

export async function buscarClientesComSaldo(termo: string) {
  const supabase = getSupabase();

  let query = supabase
    .from("clientes")
    .select("id, nome, cpf")
    .order("nome")
    .limit(30);

  if (termo.trim()) {
    query = query.ilike("nome", `%${termo.trim()}%`);
  }

  const { data: clientes, error } = await query;
  if (error || !clientes?.length) return [];

  const clienteIds = clientes.map((c) => c.id);
  const { data: vendas } = await supabase
    .from("vendas")
    .select("id, cliente_id")
    .in("cliente_id", clienteIds);

  const vendaIds = (vendas ?? []).map((v) => v.id);
  if (vendaIds.length === 0) {
    return clientes.map((c) => ({
      id: c.id,
      nome: c.nome,
      cpf: c.cpf,
      totalDevido: 0,
    }));
  }

  const { data: parcelas } = await supabase
    .from("parcelas_vendas")
    .select("venda_id, valor_parcela, valor_pago")
    .in("venda_id", vendaIds);

  const vendaPorCliente = new Map(
    (vendas ?? []).map((v) => [v.id, v.cliente_id as string])
  );
  const devidoPorCliente = new Map<string, number>();

  for (const parcela of parcelas ?? []) {
    const saldo =
      Number(parcela.valor_parcela) - Number(parcela.valor_pago ?? 0);
    if (saldo <= 0.001) continue;
    const clienteId = vendaPorCliente.get(parcela.venda_id);
    if (!clienteId) continue;
    devidoPorCliente.set(
      clienteId,
      (devidoPorCliente.get(clienteId) ?? 0) + saldo
    );
  }

  return clientes.map((c) => ({
    id: c.id,
    nome: c.nome,
    cpf: c.cpf,
    totalDevido: devidoPorCliente.get(c.id) ?? 0,
  }));
}

export async function getTotalAReceber() {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("parcelas_vendas")
    .select("valor_parcela, valor_pago")
    .eq("status", "pendente");

  if (error || !data) return 0;

  return data.reduce((sum, p) => {
    const saldo = Number(p.valor_parcela) - Number(p.valor_pago ?? 0);
    return sum + (saldo > 0.001 ? saldo : 0);
  }, 0);
}

export async function createContaAPagar(formData: FormData) {
  const supabase = getSupabase();

  const descricao = (formData.get("descricao") as string)?.trim();
  const valorTotal = Number(formData.get("valor"));
  const parcelas = Math.max(1, Math.min(12, Number(formData.get("parcelas") ?? 1)));
  const dataBase = formData.get("data_vencimento") as string;

  if (!descricao) {
    return { error: "Informe o fornecedor ou descrição." };
  }

  if (!valorTotal || valorTotal <= 0) {
    return { error: "Informe um valor maior que zero." };
  }

  if (!dataBase) {
    return { error: "Informe a data de vencimento." };
  }

  const valorParcela = Math.round((valorTotal / parcelas) * 100) / 100;
  const vencimentoInicial = new Date(dataBase + "T12:00:00");
  const registros = [];

  for (let i = 1; i <= parcelas; i++) {
    const vencimento = new Date(vencimentoInicial);
    vencimento.setDate(vencimento.getDate() + 30 * (i - 1));

    registros.push({
      descricao: parcelas > 1 ? `${descricao} (${i}/${parcelas})` : descricao,
      valor: valorParcela,
      data_vencimento: vencimento.toISOString().split("T")[0],
      status: "pendente" as const,
      parcelas_totais: parcelas,
      parcela_atual: i,
    });
  }

  const { data: inseridas, error } = await supabase
    .from("contas_a_pagar")
    .insert(registros)
    .select();

  if (error) return { error: error.message };

  revalidateFinanceiro();
  return { success: true, contas: inseridas ?? [] };
}

export async function darBaixaConta(id: string) {
  const supabase = getSupabase();
  const hoje = new Date().toISOString().split("T")[0];

  const { error } = await supabase
    .from("contas_a_pagar")
    .update({ status: "pago", data_pagamento: hoje })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidateFinanceiro();
  return { success: true };
}

export async function getContasAPagar() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("contas_a_pagar")
    .select("*")
    .eq("status", "pendente")
    .order("data_vencimento");

  if (error) return [];
  return data;
}

export type PeriodoRelatorioContas = "mes" | "3meses" | "90dias";

function dataReferenciaPagamentoConta(conta: {
  data_pagamento: string | null;
  data_vencimento: string;
}) {
  return conta.data_pagamento ?? conta.data_vencimento;
}

function tituloRelatorioContas(periodo: PeriodoRelatorioContas): string {
  const hoje = new Date();
  const mes = [
    "JAN", "FEV", "MAR", "ABR", "MAI", "JUN",
    "JUL", "AGO", "SET", "OUT", "NOV", "DEZ",
  ][hoje.getMonth()];
  const ano = hoje.getFullYear();

  if (periodo === "mes") return `Pagas em ${mes}/${ano}`;
  if (periodo === "3meses") return "Pagas nos últimos 3 meses";
  return "Pagas nos últimos 90 dias";
}

export type ResultadoRelatorioContas =
  | { error: string }
  | { titulo: string; contas: LinhaRelatorioConta[]; total: number };

export async function getContasPagasRelatorio(
  periodo: PeriodoRelatorioContas
): Promise<ResultadoRelatorioContas> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("contas_a_pagar")
    .select("*")
    .eq("status", "pago")
    .order("data_pagamento", { ascending: false });

  if (error) return { error: error.message };

  const hoje = new Date();
  hoje.setHours(12, 0, 0, 0);
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const inicio3Meses = new Date(hoje);
  inicio3Meses.setMonth(inicio3Meses.getMonth() - 3);
  const inicio90Dias = new Date(hoje);
  inicio90Dias.setDate(inicio90Dias.getDate() - 90);

  const contas = (data ?? [])
    .filter((c) => {
      const ref = dataReferenciaPagamentoConta(c);
      const dataPag = new Date(`${ref}T12:00:00`);
      if (periodo === "mes") return dataPag >= inicioMes;
      if (periodo === "3meses") return dataPag >= inicio3Meses;
      return dataPag >= inicio90Dias;
    })
    .sort((a, b) =>
      dataReferenciaPagamentoConta(b).localeCompare(dataReferenciaPagamentoConta(a))
    );

  const linhas = contas.map((c) => ({
    descricao: c.descricao,
    parcela:
      (c.parcelas_totais ?? 1) > 1
        ? `${c.parcela_atual ?? 1}/${c.parcelas_totais}`
        : "—",
    dataPagamento: dataReferenciaPagamentoConta(c),
    valor: Number(c.valor),
  }));

  const total = linhas.reduce((sum, c) => sum + c.valor, 0);

  return {
    titulo: tituloRelatorioContas(periodo),
    contas: linhas,
    total,
  };
}

export type ResultadoRecebimentosCrediario =
  | { error: string }
  | {
      dataInicio: string;
      dataFim: string;
      linhas: import("@/lib/relatorio-crediario-recebido-pdf").LinhaRecebimentoCrediario[];
      total: number;
    };

export async function getRecebimentosCrediario(
  dataInicio: string,
  dataFim: string
): Promise<ResultadoRecebimentosCrediario> {
  if (!dataInicio || !dataFim) {
    return { error: "Informe a data inicial e a data final." };
  }
  if (dataInicio > dataFim) {
    return { error: "A data inicial não pode ser depois da data final." };
  }

  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("pagamentos_crediario")
    .select("valor_pago, data_pagamento, obs, venda_id, vendas(cliente_nome, clientes(nome))")
    .gte("data_pagamento", dataInicio)
    .lte("data_pagamento", dataFim)
    .order("data_pagamento", { ascending: false });

  if (error) return { error: error.message };

  const linhas = (data ?? []).map((p) => {
    const venda = p.vendas as unknown as { clientes: { nome: string } | null } | null;
    const pedido = String(p.venda_id).replace(/-/g, "").slice(0, 8).toUpperCase();
    return {
      data: p.data_pagamento as string,
      cliente: nomeClienteDaVenda(venda),
      pedido,
      valor: Number(p.valor_pago),
      obs: (p.obs as string | null) ?? "",
    };
  });

  const total = linhas.reduce((sum, l) => sum + l.valor, 0);

  return { dataInicio, dataFim, linhas, total };
}

export type FiltroParcelasClientePDF = "pagas" | "abertas";

export type ResultadoRelatorioClienteCompras =
  | { error: string }
  | import("@/lib/relatorio-cliente-compras-pdf").DadosRelatorioClienteComprasPDF;

export async function getRelatorioClienteCompras(
  clienteId: string,
  filtro: FiltroParcelasClientePDF
): Promise<ResultadoRelatorioClienteCompras> {
  const supabase = getSupabase();

  const { data: cliente } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", clienteId)
    .single();

  if (!cliente) return { error: "Cliente não encontrada." };

  const { data: vendas } = await supabase
    .from("vendas")
    .select("*, parcelas_vendas(*)")
    .eq("cliente_id", clienteId)
    .order("data_venda", { ascending: false });

  const vendaIds = (vendas ?? []).map((v) => v.id);
  const itensRows = await buscarItensVendas(supabase, vendaIds);
  const produtosPorVenda = agruparNomesItensPorVenda(itensRows);

  let totalCompras = 0;
  let totalPago = 0;
  let totalAberto = 0;
  const vendasPdf = [];

  for (const venda of vendas ?? []) {
    const pagoVenda = await getTotalPagoVenda(supabase, venda.id);
    const valorTotal = Number(venda.valor_total);
    totalCompras += valorTotal;
    totalPago += pagoVenda;
    totalAberto += Math.max(0, valorTotal - pagoVenda);

    const parcelasRaw = (venda.parcelas_vendas ?? []) as Array<{
      numero_parcela: number;
      valor_parcela: number;
      valor_pago?: number;
      data_vencimento: string;
      status: string;
    }>;

    const parcelas = parcelasRaw
      .sort((a, b) => a.numero_parcela - b.numero_parcela)
      .map((p) => {
        const valorPago = Number(p.valor_pago ?? 0);
        const saldo = Number(p.valor_parcela) - valorPago;
        const quitada = saldo <= 0.001;
        return {
          numero: p.numero_parcela,
          totalParcelas: venda.parcelas,
          vencimento: p.data_vencimento,
          valor: Number(p.valor_parcela),
          pago: valorPago,
          saldo: Math.max(0, saldo),
          status: quitada ? "PAGA" : "EM ABERTO",
        };
      })
      .filter((p) => (filtro === "pagas" ? p.saldo <= 0.001 : p.saldo > 0.001));

    if (parcelas.length === 0) continue;

    vendasPdf.push({
      numeroPedido: venda.id.replace(/-/g, "").slice(0, 8).toUpperCase(),
      dataCompra: venda.data_venda,
      produtos: produtosPorVenda.get(venda.id) ?? [],
      valorTotal,
      parcelas,
    });
  }

  return {
    clienteNome: cliente.nome,
    clienteCpf: formatCPF(cliente.cpf),
    filtroLabel: filtro === "pagas" ? "Parcelas pagas" : "Parcelas em aberto",
    vendas: vendasPdf,
    totalCompras,
    totalPago,
    totalAberto,
  };
}

export async function getTotalBoletosMesAtual() {
  const supabase = getSupabase();
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  const { data, error } = await supabase
    .from("contas_a_pagar")
    .select("valor")
    .eq("status", "pendente")
    .gte("data_vencimento", inicioMes)
    .lte("data_vencimento", fimMes);

  if (error || !data) return 0;
  return data.reduce((sum, c) => sum + Number(c.valor), 0);
}

export async function createCartao(formData: FormData) {
  const supabase = getSupabase();

  const nome = (formData.get("nome_cartao") as string)?.trim();
  const dia = Number(formData.get("dia_vencimento"));
  const limiteRaw = (formData.get("limite") as string)?.trim();

  if (!nome) {
    return { error: "Informe o nome do cartão." };
  }

  if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
    return { error: "Informe o dia de vencimento (de 1 a 31)." };
  }

  const limite = limiteRaw ? Number(limiteRaw) : null;

  const { data, error } = await supabase
    .from("cartoes_credito")
    .insert({
      nome_cartao: nome,
      dia_vencimento: dia,
      limite: limite && limite > 0 ? limite : null,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidateFinanceiro();
  return { success: true, cartao: data };
}

export async function deleteCartao(id: string) {
  const supabase = getSupabase();

  const { error } = await supabase.from("cartoes_credito").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidateFinanceiro();
  return { success: true };
}

export async function getCartoes() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("cartoes_credito")
    .select("*")
    .order("nome_cartao");

  if (error) return [];
  return data;
}

export async function createFaturaCartao(data: {
  cartao_id: string;
  descricao: string;
  valor_total: number;
  parcelas_totais: number;
  data_compra: string;
}) {
  const supabase = getSupabase();

  const { data: cartao } = await supabase
    .from("cartoes_credito")
    .select("dia_vencimento")
    .eq("id", data.cartao_id)
    .single();

  if (!cartao) return { error: "Cartão não encontrado" };

  const valorParcela = Math.round((data.valor_total / data.parcelas_totais) * 100) / 100;
  const compraDate = new Date(data.data_compra + "T12:00:00");

  for (let i = 1; i <= data.parcelas_totais; i++) {
    const vencimento = new Date(
      compraDate.getFullYear(),
      compraDate.getMonth() + i,
      cartao.dia_vencimento
    );

    await supabase.from("faturas_cartao").insert({
      cartao_id: data.cartao_id,
      descricao: `${data.descricao} (${i}/${data.parcelas_totais})`,
      valor_total: valorParcela,
      parcelas_totais: data.parcelas_totais,
      parcela_atual: i,
      data_vencimento_fatura: vencimento.toISOString().split("T")[0],
      status: "pendente",
    });
  }

  revalidateFinanceiro();
  return { success: true };
}

export async function getFaturasCartao() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("faturas_cartao")
    .select("*, cartoes_credito(nome_cartao, dia_vencimento)")
    .order("data_vencimento_fatura");

  if (error) return [];
  return data;
}

export async function getResumoFaturasCartao() {
  const supabase = getSupabase();
  const hoje = new Date();
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();

  const { data: cartoes } = await supabase.from("cartoes_credito").select("*");
  const { data: faturas } = await supabase
    .from("faturas_cartao")
    .select("*")
    .eq("status", "pendente");

  if (!cartoes || !faturas) return [];

  return cartoes.map((cartao) => {
    const faturasMes = faturas.filter((f) => {
      if (f.cartao_id !== cartao.id) return false;
      const d = new Date(f.data_vencimento_fatura + "T12:00:00");
      return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
    });

    const total = faturasMes.reduce((sum, f) => sum + Number(f.valor_total), 0);

    return {
      cartao,
      total,
      diaVencimento: cartao.dia_vencimento,
    };
  });
}

export async function darBaixaFatura(id: string) {
  const supabase = getSupabase();

  const { error } = await supabase
    .from("faturas_cartao")
    .update({ status: "pago" })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidateFinanceiro();
  return { success: true };
}
