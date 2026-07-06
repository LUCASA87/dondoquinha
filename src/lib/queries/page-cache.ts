const CACHE_TTL_MS = 2 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  ts: number;
}

const store = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export const PAGE_CACHE_KEYS = {
  dashboard: "page:dashboard",
  dashboardResumo: "page:dashboard:resumo",
  dashboardParcelas: "page:dashboard:parcelas",
  estoque: "page:estoque",
  clientes: "page:clientes",
  vendas: "page:vendas",
  financeiro: "page:financeiro",
} as const;

export function readPageCache<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    store.delete(key);
    return null;
  }
  return entry.data as T;
}

export function writePageCache<T>(key: string, data: T): void {
  store.set(key, { data, ts: Date.now() });
}

export function invalidatePageCache(key?: string): void {
  if (key) {
    store.delete(key);
    inflight.delete(key);
    return;
  }
  store.clear();
  inflight.clear();
}

/** Busca com cache em memória e deduplicação de requisições simultâneas. */
export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { force?: boolean }
): Promise<T> {
  if (!options?.force) {
    const cached = readPageCache<T>(key);
    if (cached) return cached;
  }

  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const promise = fetcher()
    .then((data) => {
      writePageCache(key, data);
      inflight.delete(key);
      return data;
    })
    .catch((err) => {
      inflight.delete(key);
      throw err;
    });

  inflight.set(key, promise);
  return promise;
}

/** Pré-carrega em segundo plano (não bloqueia a UI). */
export function prefetchPageCache<T>(key: string, fetcher: () => Promise<T>): void {
  if (readPageCache<T>(key) || inflight.has(key)) return;
  void fetchWithCache(key, fetcher).catch(() => {});
}

export const PAGE_PREFETCHERS: Record<string, () => Promise<unknown>> = {};

export function registerPagePrefetcher(
  key: string,
  fetcher: () => Promise<unknown>
): void {
  PAGE_PREFETCHERS[key] = fetcher;
}

export function prefetchAllPages(): void {
  Object.entries(PAGE_PREFETCHERS).forEach(([key, fetcher]) => {
    prefetchPageCache(key, fetcher);
  });
}

export function prefetchPageByRoute(href: string): void {
  const map: Record<string, string> = {
    "/dashboard": PAGE_CACHE_KEYS.dashboard,
    "/estoque": PAGE_CACHE_KEYS.estoque,
    "/clientes": PAGE_CACHE_KEYS.clientes,
    "/vendas": PAGE_CACHE_KEYS.vendas,
    "/financeiro": PAGE_CACHE_KEYS.financeiro,
  };
  const cacheKey = map[href];
  const fetcher = cacheKey ? PAGE_PREFETCHERS[cacheKey] : undefined;
  if (cacheKey && fetcher) prefetchPageCache(cacheKey, fetcher);
}

export function invalidateAfterEstoqueChange(): void {
  invalidatePageCache(PAGE_CACHE_KEYS.estoque);
  invalidatePageCache(PAGE_CACHE_KEYS.vendas);
  invalidatePageCache(PAGE_CACHE_KEYS.dashboardResumo);
}

export function invalidateAfterClientesChange(): void {
  invalidatePageCache(PAGE_CACHE_KEYS.clientes);
  invalidatePageCache(PAGE_CACHE_KEYS.vendas);
}

export function invalidateAfterVendasChange(): void {
  invalidatePageCache(PAGE_CACHE_KEYS.vendas);
  invalidatePageCache(PAGE_CACHE_KEYS.financeiro);
  invalidatePageCache(PAGE_CACHE_KEYS.dashboardResumo);
  invalidatePageCache(PAGE_CACHE_KEYS.dashboardParcelas);
  invalidatePageCache(PAGE_CACHE_KEYS.estoque);
}

export function invalidateAfterFinanceiroChange(): void {
  invalidatePageCache(PAGE_CACHE_KEYS.financeiro);
  invalidatePageCache(PAGE_CACHE_KEYS.dashboardResumo);
  invalidatePageCache(PAGE_CACHE_KEYS.dashboardParcelas);
}
