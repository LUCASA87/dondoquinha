import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { formatSupabaseError } from "@/lib/format-error";

export function db(): SupabaseClient {
  return createClient();
}

export async function runDb<T>(fn: (supabase: SupabaseClient) => Promise<T>): Promise<T> {
  try {
    return await fn(db());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro de conexão.";
    throw new Error(formatSupabaseError(message));
  }
}

export function mapDbError(err: unknown): { error: string } {
  const message = err instanceof Error ? err.message : "Erro de conexão.";
  return { error: formatSupabaseError(message) };
}

export function dbError(message: string): { error: string } {
  return { error: formatSupabaseError(message) };
}

export function mutationError(result: unknown): string | undefined {
  if (typeof result === "object" && result !== null && "error" in result) {
    const message = (result as { error?: unknown }).error;
    return typeof message === "string" && message.length > 0 ? message : undefined;
  }
  return undefined;
}

export async function safeDb<T>(fn: (supabase: SupabaseClient) => Promise<T>): Promise<T | { error: string }> {
  try {
    return await fn(db());
  } catch (err) {
    return mapDbError(err);
  }
}
