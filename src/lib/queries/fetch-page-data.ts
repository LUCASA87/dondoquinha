import { createClient, ensureSupabaseConfig } from "@/lib/supabase/client";
import {
  PAGE_CACHE_KEYS,
  fetchWithCache,
  prefetchPageCache,
  registerPagePrefetcher,
} from "@/lib/queries/page-cache";
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
import type { DashboardStats } from "@/types/database";

interface DashboardResumoRpc {
  total_custo: number;
  total_venda: number;
  lucro_estimado: number;
  total_a_receber: number;
  total_a_pagar: number;
}

async function queryDashboardResumoRpc(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase.rpc("get_dashboard_resumo");
  if (error || !data) return null;

  const r = data as DashboardResumoRpc;
  return {
    stats: {
      totalCusto: Number(r.total_custo),
      totalVenda: Number(r.total_venda),
      lucroEstimado: Number(r.lucro_estimado),
    } satisfies DashboardStats,
    totalAPagar: Number(r.total_a_pagar),
    totalAReceber: Number(r.total_a_receber),
  };
}

async function queryDashboardResumoFallback(supabase: ReturnType<typeof createClient>) {
  const [stats, contas, totalAReceber] = await Promise.all([
    queryDashboardStats(supabase),
    queryContasAPagar(supabase),
    queryTotalAReceber(supabase),
  ]);
  return {
    stats,
    totalAPagar: contas.reduce((sum, c) => sum + Number(c.valor), 0),
    totalAReceber,
  };
}

/** Cards do dashboard — consulta única via RPC quando disponível. */
export async function fetchDashboardResumo() {
  return fetchWithCache(PAGE_CACHE_KEYS.dashboardResumo, async () => {
    await ensureSupabaseConfig();
    const supabase = createClient();
    const rpc = await queryDashboardResumoRpc(supabase);
    if (rpc) return rpc;
    return queryDashboardResumoFallback(supabase);
  });
}

export async function fetchDashboardParcelas() {
  return fetchWithCache(PAGE_CACHE_KEYS.dashboardParcelas, async () => {
    await ensureSupabaseConfig();
    return queryParcelasAVencer(createClient(), 30, {
      buscarProdutos: false,
    });
  });
}

/** Busca dados direto no Supabase pelo navegador — com cache em memória. */
export async function fetchDashboardPageData() {
  return fetchWithCache(PAGE_CACHE_KEYS.dashboard, async () => {
    const [resumo, parcelas] = await Promise.all([
      fetchDashboardResumo(),
      fetchDashboardParcelas(),
    ]);
    return { ...resumo, parcelas };
  });
}

export async function fetchVendasPageData() {
  return fetchWithCache(PAGE_CACHE_KEYS.vendas, async () => {
    await ensureSupabaseConfig();
    const supabase = createClient();
    const [clientes, produtos, vendas] = await Promise.all([
      loadClientes(),
      loadProdutos(),
      queryVendas(supabase),
    ]);
    return { clientes, produtos, vendas };
  });
}

export async function fetchFinanceiroPageData() {
  return fetchWithCache(PAGE_CACHE_KEYS.financeiro, async () => {
    await ensureSupabaseConfig();
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
  });
}

export async function loadProdutos() {
  await ensureSupabaseConfig();
  return queryProdutos(createClient());
}

export async function loadClientes() {
  await ensureSupabaseConfig();
  return queryClientes(createClient());
}

export async function fetchProdutos() {
  return fetchWithCache(PAGE_CACHE_KEYS.estoque, loadProdutos);
}

export async function fetchClientes() {
  return fetchWithCache(PAGE_CACHE_KEYS.clientes, loadClientes);
}

registerPagePrefetcher(PAGE_CACHE_KEYS.dashboard, fetchDashboardPageData);
registerPagePrefetcher(PAGE_CACHE_KEYS.dashboardResumo, fetchDashboardResumo);
registerPagePrefetcher(PAGE_CACHE_KEYS.dashboardParcelas, fetchDashboardParcelas);
registerPagePrefetcher(PAGE_CACHE_KEYS.estoque, fetchProdutos);
registerPagePrefetcher(PAGE_CACHE_KEYS.clientes, fetchClientes);
registerPagePrefetcher(PAGE_CACHE_KEYS.vendas, fetchVendasPageData);
registerPagePrefetcher(PAGE_CACHE_KEYS.financeiro, fetchFinanceiroPageData);

export async function fetchAllAppData(timeoutMs = 15000): Promise<void> {
  const loading = Promise.all([
    fetchDashboardResumo(),
    fetchDashboardParcelas(),
    fetchProdutos(),
    fetchClientes(),
    fetchVendasPageData(),
    fetchFinanceiroPageData(),
  ]);

  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    await Promise.race([
      loading,
      new Promise<void>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
      }),
    ]);
  } catch {
    // Prefetch parcial ou lento — as telas carregam depois sob demanda.
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Prefetch em segundo plano — não bloqueia login nem navegação. */
export function prefetchAllAppData(): void {
  void fetchAllAppData().catch(() => {});
}

export function prefetchDashboardResumo() {
  prefetchPageCache(PAGE_CACHE_KEYS.dashboardResumo, fetchDashboardResumo);
}

export function prefetchDashboardParcelas() {
  prefetchPageCache(PAGE_CACHE_KEYS.dashboardParcelas, fetchDashboardParcelas);
}
