import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

declare global {
  interface Window {
    __DQ_SUPABASE__?: { url: string; key: string };
  }
}

let client: SupabaseClient | null = null;
let runtimeUrl: string | null = null;
let runtimeKey: string | null = null;
let configPromise: Promise<void> | null = null;

export function initSupabaseConfig(url: string, key: string): void {
  const nextUrl = url.trim();
  const nextKey = key.trim();
  if (!nextUrl || !nextKey) return;
  if (runtimeUrl === nextUrl && runtimeKey === nextKey) return;
  runtimeUrl = nextUrl;
  runtimeKey = nextKey;
  client = null;
}

function readConfig(): { url: string; key: string } {
  if (typeof window !== "undefined" && window.__DQ_SUPABASE__) {
    const { url, key } = window.__DQ_SUPABASE__;
    if (url?.trim() && key?.trim()) {
      return { url: url.trim(), key: key.trim() };
    }
  }

  return {
    url: runtimeUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    key: runtimeKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  };
}

export function getSupabaseConfigStatus():
  | { ok: true; url: string; key: string }
  | { ok: false; message: string } {
  const { url, key } = readConfig();
  if (!url || !key) {
    return {
      ok: false,
      message:
        "Supabase não configurado. Na Vercel, confira NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY e faça redeploy.",
    };
  }
  return { ok: true, url, key };
}

async function loadConfigFromApi(): Promise<void> {
  const response = await fetch("/api/runtime-config", { cache: "no-store" });
  const data = (await response.json()) as { url?: string; key?: string; error?: string };

  if (!response.ok || !data.url || !data.key) {
    throw new Error(data.error ?? "Não foi possível carregar a configuração do Supabase.");
  }

  initSupabaseConfig(data.url, data.key);
}

export async function ensureSupabaseConfig(): Promise<void> {
  const status = getSupabaseConfigStatus();
  if (status.ok) return;

  if (typeof window === "undefined") return;

  if (!configPromise) {
    configPromise = loadConfigFromApi().catch((err) => {
      configPromise = null;
      throw err;
    });
  }

  await configPromise;
}

export function createClient(): SupabaseClient {
  const status = getSupabaseConfigStatus();
  if (!status.ok) {
    throw new Error(status.message);
  }

  if (!client) {
    client = createSupabaseClient(status.url, status.key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return client;
}

export async function getSupabaseClient(): Promise<SupabaseClient> {
  await ensureSupabaseConfig();
  return createClient();
}
