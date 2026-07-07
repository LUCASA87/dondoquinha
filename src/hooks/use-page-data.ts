"use client";

import { useCallback, useLayoutEffect, useState } from "react";
import {
  fetchWithCache,
  readPageCache,
  subscribePageCache,
  writePageCache,
} from "@/lib/queries/page-cache";

/**
 * Mostra cache na hora e atualiza em segundo plano.
 * Use `revalidate()` após cadastros para atualizar a lista na hora.
 */
export function usePageData<T>(cacheKey: string, fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(() => readPageCache<T>(cacheKey));

  const revalidate = useCallback(async () => {
    const fresh = await fetchWithCache(cacheKey, fetcher, { force: true });
    setData(fresh);
    return fresh;
  }, [cacheKey, fetcher]);

  useLayoutEffect(() => {
    let cancelled = false;
    const hadCache = Boolean(readPageCache<T>(cacheKey));

    fetchWithCache(cacheKey, fetcher, { force: hadCache })
      .then((fresh) => {
        if (!cancelled) setData(fresh);
      })
      .catch(() => {});

    const unsubscribe = subscribePageCache(cacheKey, () => {
      if (cancelled) return;
      void revalidate().catch(() => {});
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [cacheKey, fetcher, revalidate]);

  return { data, revalidate };
}

/** Atualiza cache após mutações (create, update, delete). */
export function patchPageCache<T>(cacheKey: string, patch: (prev: T) => T): void {
  const prev = readPageCache<T>(cacheKey);
  if (prev) writePageCache(cacheKey, patch(prev));
}

export { invalidatePageCache } from "@/lib/queries/page-cache";
