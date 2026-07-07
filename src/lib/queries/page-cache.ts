const CACHE_TTL_MS = 2 * 60 * 1000;
const PERSIST_TTL_MS = 5 * 60 * 1000;
const STORAGE_PREFIX = "dq_cache_";

interface CacheEntry<T> {
  data: T;
  ts: number;
}

const store = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();
const cacheListeners = new Map<string, Set<() => void>>();

export function subscribePageCache(key: string, listener: () => void): () => void {
  let listeners = cacheListeners.get(key);
  if (!listeners) {
    listeners = new Set();
    cacheListeners.set(key, listeners);
  }
  listeners.add(listener);
  return () => {
    listeners?.delete(listener);
    if (listeners?.size === 0) cacheListeners.delete(key);
  };
}

function notifyPageCacheInvalidated(key: string): void {
  cacheListeners.get(key)?.forEach((listener) => listener());
}

export const PAGE_CACHE_KEYS = {
  dashboard: "page:dashboard",
  dashboardResumo: "page:dashboard:resumo",
  dashboardParcelas: "page:dashboard:parcelas",
  estoque: "page:estoque",
  clientes: "page:clientes",
  vendas: "page:vendas",
  financeiro: "page:financeiro",
} as const;

const PERSIST_KEYS = new Set<string>([
  PAGE_CACHE_KEYS.dashboardResumo,
  PAGE_CACHE_KEYS.dashboardParcelas,
  PAGE_CACHE_KEYS.estoque,
  PAGE_CACHE_KEYS.clientes,
  PAGE_CACHE_KEYS.vendas,
  PAGE_CACHE_KEYS.financeiro,
]);

function readPersistedCache<T>(key: string): T | null {
  if (typeof window === "undefined" || !PERSIST_KEYS.has(key)) return null;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - entry.ts > PERSIST_TTL_MS) {
      localStorage.removeItem(STORAGE_PREFIX + key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function writePersistedCache<T>(key: string, data: T): void {
  if (typeof window === "undefined" || !PERSIST_KEYS.has(key)) return;
  try {
    localStorage.setItem(
      STORAGE_PREFIX + key,
      JSON.stringify({ data, ts: Date.now() } satisfies CacheEntry<T>)
    );
  } catch {
    // localStorage cheio ou indisponível
  }
}

function clearPersistedCache(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
    // ignore
  }
}

export function readPageCache<T>(key: string): T | null {
  const entry = store.get(key);
  if (entry) {
    if (Date.now() - entry.ts > CACHE_TTL_MS) {
      store.delete(key);
    } else {
      return entry.data as T;
    }
  }

  const persisted = readPersistedCache<T>(key);
  if (persisted) {
    store.set(key, { data: persisted, ts: Date.now() });
    return persisted;
  }

  return null;
}

export function writePageCache<T>(key: string, data: T): void {
  store.set(key, { data, ts: Date.now() });
  writePersistedCache(key, data);
}

export function invalidatePageCache(key?: string): void {
  if (key) {
    store.delete(key);
    inflight.delete(key);
    clearPersistedCache(key);
    notifyPageCacheInvalidated(key);
    return;
  }
  const keys = new Set<string>([...store.keys(), ...PERSIST_KEYS]);
  store.clear();
  inflight.clear();
  if (typeof window !== "undefined") {
    for (const k of PERSIST_KEYS) {
      clearPersistedCache(k);
    }
  }
  keys.forEach(notifyPageCacheInvalidated);
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
  prefetchDashboardFirst();
  Object.entries(PAGE_PREFETCHERS).forEach(([key, fetcher]) => {
    if (
      key === PAGE_CACHE_KEYS.dashboardResumo ||
      key === PAGE_CACHE_KEYS.dashboardParcelas
    ) {
      return;
    }
    prefetchPageCache(key, fetcher);
  });
}

export function prefetchDashboardFirst(): void {
  const resumo = PAGE_PREFETCHERS[PAGE_CACHE_KEYS.dashboardResumo];
  const parcelas = PAGE_PREFETCHERS[PAGE_CACHE_KEYS.dashboardParcelas];
  if (resumo) prefetchPageCache(PAGE_CACHE_KEYS.dashboardResumo, resumo);
  if (parcelas) prefetchPageCache(PAGE_CACHE_KEYS.dashboardParcelas, parcelas);
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
