"use client";

import { useEffect, useState } from "react";
import { initSupabaseConfig } from "@/lib/supabase/client";

interface SupabaseProviderProps {
  url: string;
  anonKey: string;
  children: React.ReactNode;
}

export function SupabaseProvider({ url, anonKey, children }: SupabaseProviderProps) {
  const [ready, setReady] = useState(() => !!(url.trim() && anonKey.trim()));

  useEffect(() => {
    if (url.trim() && anonKey.trim()) {
      initSupabaseConfig(url, anonKey);
      setReady(true);
      return;
    }

    let cancelled = false;

    fetch("/api/runtime-config", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { url?: string; key?: string }) => {
        if (cancelled) return;
        if (data.url && data.key) {
          initSupabaseConfig(data.url, data.key);
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [url, anonKey]);

  if (!ready) return null;

  return children;
}
