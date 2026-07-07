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
 * Recarrega automaticamente quando o cache da página é invalidado (após cadastros).
 */
export function usePageData<T>(cacheKey: string, fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(() => readPageCache<T>(cacheKey));

  const reload = useCallback(
    (force = true) => {
      return fetchWithCache(cacheKey, fetcher, { force })
        .then((fresh) => {
          setData(fresh);
          return fresh;
        })
        .catch(() => null as T | null);
    },
    [cacheKey, fetcher]
  );

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
      void reload(true);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [cacheKey, fetcher, reload]);

  return data;
}

/** Atualiza cache após mutações (create, update, delete). */
export function patchPageCache<T>(cacheKey: string, patch: (prev: T) => T): void {
  const prev = readPageCache<T>(cacheKey);
  if (prev) writePageCache(cacheKey, patch(prev));
}

export { invalidatePageCache } from "@/lib/queries/page-cache";
