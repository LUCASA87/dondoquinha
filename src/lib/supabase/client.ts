import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

declare global {
  interface Window {
    __DQ_SUPABASE__?: { url: string; key: string };
  }
}

let client: SupabaseClient | null = null;
let runtimeUrl: string | null = null;
let runtimeKey: string | null = null;

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
    return window.__DQ_SUPABASE__;
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
        "Supabase não configurado no servidor. Na Vercel, adicione NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY e faça redeploy.",
    };
  }
  return { ok: true, url, key };
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
