import type { SupabaseClient } from "@supabase/supabase-js";
import { filtrarParcelasPagaveis } from "@/lib/parcelas-utils";
import { agruparNomesItensPorVenda, buscarItensVendas } from "@/lib/venda-itens";
import type {
  Cliente,
  ContaAPagar,
  DashboardStats,
  ParcelaAVencer,
  ParcelaVenda,
  Produto,
  Venda,
} from "@/types/database";

export async function queryDashboardStats(
  supabase: SupabaseClient
): Promise<DashboardStats> {
  const { data, error } = await supabase
    .from("produtos")
    .select("quantidade, preco_custo, preco_venda");

  if (error || !data) {
    return { totalCusto: 0, totalVenda: 0, lucroEstimado: 0 };
  }

  let totalCusto = 0;
  let totalVenda = 0;

  for (const p of data) {
    totalCusto += Number(p.quantidade) * Number(p.preco_custo);
    totalVenda += Number(p.quantidade) * Number(p.preco_venda);
  }

  return {
    totalCusto,
    totalVenda,
    lucroEstimado: totalVenda - totalCusto,
  };
}

export async function queryContasAPagar(supabase: SupabaseClient): Promise<ContaAPagar[]> {
  const { data, error } = await supabase
    .from("contas_a_pagar")
    .select(
      "id, descricao, valor, data_vencimento, status, parcelas_totais, parcela_atual, data_pagamento, created_at"
    )
    .eq("status", "pendente")
    .order("data_vencimento");

  if (error) return [];
  return data as ContaAPagar[];
}

export async function queryTotalAReceber(supabase: SupabaseClient): Promise<number> {
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

export async function queryParcelasAVencer(
  supabase: SupabaseClient,
  diasAhead = 30,
  opcoes?: { buscarProdutos?: boolean; limiteProdutos?: number }
): Promise<ParcelaAVencer[]> {
  const buscarProdutos = opcoes?.buscarProdutos ?? true;
  const limiteProdutos = opcoes?.limiteProdutos ?? 0;

  const hoje = new Date();
  hoje.setHours(12, 0, 0, 0);
  const limite = new Date(hoje);
  limite.setDate(limite.getDate() + diasAhead);
  const hojeStr = hoje.toISOString().split("T")[0];
  const limiteStr = limite.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("parcelas_vendas")
    .select(
      "id, venda_id, numero_parcela, valor_parcela, valor_pago, data_vencimento, vendas(id, parcelas, clientes(id, nome, telefone))"
    )
    .eq("status", "pendente")
    .lte("data_vencimento", limiteStr)
    .order("data_vencimento")
    .limit(80);

  if (error || !data) return [];

  const comSaldo = data
    .map((p) => ({
      ...p,
      valor_pago: Number(p.valor_pago ?? 0),
      saldo_parcela: Number(p.valor_parcela) - Number(p.valor_pago ?? 0),
    }))
    .filter((p) => p.saldo_parcela > 0.001);

  const proximas = filtrarParcelasPagaveis(
    comSaldo as unknown as Parameters<typeof filtrarParcelasPagaveis>[0]
  );

  let produtosPorVenda = new Map<string, string[]>();
  if (buscarProdutos && proximas.length > 0) {
    const idsBase = proximas
      .map((p) => p.venda_id ?? (p.vendas as { id: string } | null)?.id)
      .filter(Boolean) as string[];
    const vendaIds =
      limiteProdutos > 0
        ? [...new Set(idsBase)].slice(0, limiteProdutos)
        : [...new Set(idsBase)];
    const itensRows = await buscarItensVendas(supabase, vendaIds);
    produtosPorVenda = agruparNomesItensPorVenda(itensRows);
  }

  return proximas
    .map((raw) => {
      const p = raw as unknown as (typeof comSaldo)[number];
      const venda = p.vendas as unknown as {
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

      const vendaId = venda?.id ?? p.venda_id ?? "";

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
    .sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento));
}

export async function queryParcelasAbertas(
  supabase: SupabaseClient
): Promise<(ParcelaVenda & { saldo_parcela: number })[]> {
  const { data, error } = await supabase
    .from("parcelas_vendas")
    .select(
      "id, venda_id, numero_parcela, valor_parcela, valor_pago, data_vencimento, status, vendas(id, valor_total, parcelas, cliente_nome, clientes(nome))"
    )
    .eq("status", "pendente")
    .order("data_vencimento");

  if (error) return [];

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

export async function queryProdutos(supabase: SupabaseClient): Promise<Produto[]> {
  const { data, error } = await supabase.from("produtos").select("*").order("nome");
  if (error) return [];
  return data as Produto[];
}

export async function queryClientes(supabase: SupabaseClient): Promise<Cliente[]> {
  const { data, error } = await supabase.from("clientes").select("*").order("nome");
  if (error) return [];
  return data as Cliente[];
}

export async function queryVendas(
  supabase: SupabaseClient,
  limit = 5
): Promise<(Venda & { clientes: { nome: string } | null })[]> {
  const { data, error } = await supabase
    .from("vendas")
    .select(
      "id, cliente_id, cliente_nome, valor_total, forma_pagamento, parcelas, status, obs, data_venda, created_at, clientes(nome)"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return data as unknown as (Venda & { clientes: { nome: string } | null })[];
}
