import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { formatConnectionError } from "@/lib/format-error";

export function db(): SupabaseClient {
  return createClient();
}

export async function runDb<T>(fn: (supabase: SupabaseClient) => Promise<T>): Promise<T> {
  try {
    return await fn(db());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro de conexão.";
    throw new Error(formatConnectionError(message));
  }
}

export function mapDbError(err: unknown): { error: string } {
  const message = err instanceof Error ? err.message : "Erro de conexão.";
  return { error: formatConnectionError(message) };
}

export async function safeDb<T>(fn: (supabase: SupabaseClient) => Promise<T>): Promise<T | { error: string }> {
  try {
    return await fn(db());
  } catch (err) {
    return mapDbError(err);
  }
}
