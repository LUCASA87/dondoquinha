"use client";

import { useEffect, useState } from "react";
import {
  fetchWithCache,
  readPageCache,
  writePageCache,
} from "@/lib/queries/page-cache";

/**
 * Mostra cache na hora (se existir) e atualiza em segundo plano.
 */
export function usePageData<T>(cacheKey: string, fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(() => readPageCache<T>(cacheKey));

  useEffect(() => {
    let cancelled = false;
    const hadCache = Boolean(readPageCache<T>(cacheKey));

    fetchWithCache(cacheKey, fetcher, { force: hadCache })
      .then((fresh) => {
        if (!cancelled) setData(fresh);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [cacheKey, fetcher]);

  return data;
}

/** Atualiza cache após mutações (create, update, delete). */
export function patchPageCache<T>(cacheKey: string, patch: (prev: T) => T): void {
  const prev = readPageCache<T>(cacheKey);
  if (prev) writePageCache(cacheKey, patch(prev));
}

export { invalidatePageCache } from "@/lib/queries/page-cache";
