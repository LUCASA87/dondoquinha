import type { SupabaseClient } from "@supabase/supabase-js";

/** Nome da cliente na venda: cadastro atual ou nome guardado após exclusão. */
export function nomeClienteDaVenda(venda?: {
  cliente_nome?: string | null;
  clientes?: { nome?: string | null } | null;
} | null): string {
  const atual = venda?.clientes?.nome?.trim();
  if (atual) return atual;
  const guardado = venda?.cliente_nome?.trim();
  if (guardado) return guardado;
  return "—";
}

/** Select de parcelas com cliente_nome; se a coluna ainda não existir, tenta sem ela. */
export async function selectParcelasPorStatusComCliente(
  supabase: SupabaseClient,
  status: "pendente" | "pago",
  ordem: "asc" | "desc" = status === "pago" ? "desc" : "asc"
) {
  const comNome =
    "id, venda_id, numero_parcela, valor_parcela, valor_pago, data_vencimento, status, vendas(id, valor_total, parcelas, cliente_nome, clientes(nome))";
  const semNome =
    "id, venda_id, numero_parcela, valor_parcela, valor_pago, data_vencimento, status, vendas(id, valor_total, parcelas, clientes(nome))";

  const primeiro = await supabase
    .from("parcelas_vendas")
    .select(comNome)
    .eq("status", status)
    .order("data_vencimento", { ascending: ordem === "asc" });

  if (!primeiro.error) return primeiro;

  return supabase
    .from("parcelas_vendas")
    .select(semNome)
    .eq("status", status)
    .order("data_vencimento", { ascending: ordem === "asc" });
}

export async function selectParcelasAbertasComCliente(
  supabase: SupabaseClient
) {
  return selectParcelasPorStatusComCliente(supabase, "pendente", "asc");
}
