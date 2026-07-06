import { createClient } from "@/lib/supabase/client";
import {
  queryClientes,
  queryContasAPagar,
  queryDashboardStats,
  queryParcelasAbertas,
  queryParcelasAVencer,
  queryProdutos,
  queryTotalAReceber,
  queryVendas,
} from "@/lib/queries/page-queries";

/** Busca dados direto no Supabase pelo navegador — sem passar pelo servidor Next.js. */
export async function fetchDashboardPageData() {
  const supabase = createClient();
  const [stats, contas, totalAReceber, parcelas] = await Promise.all([
    queryDashboardStats(supabase),
    queryContasAPagar(supabase),
    queryTotalAReceber(supabase),
    queryParcelasAVencer(supabase, 30, { buscarProdutos: true, limiteProdutos: 5 }),
  ]);

  return {
    stats,
    totalAPagar: contas.reduce((sum, c) => sum + Number(c.valor), 0),
    totalAReceber,
    parcelas,
  };
}

export async function fetchVendasPageData() {
  const supabase = createClient();
  const [clientes, produtos, vendas] = await Promise.all([
    queryClientes(supabase),
    queryProdutos(supabase),
    queryVendas(supabase),
  ]);
  return { clientes, produtos, vendas };
}

export async function fetchFinanceiroPageData() {
  const supabase = createClient();
  const [parcelas, contas] = await Promise.all([
    queryParcelasAbertas(supabase),
    queryContasAPagar(supabase),
  ]);

  return {
    parcelas,
    contas,
    totalAPagarMes: contas.reduce((sum, c) => sum + Number(c.valor), 0),
  };
}

export async function fetchProdutos() {
  return queryProdutos(createClient());
}

export async function fetchClientes() {
  return queryClientes(createClient());
}
