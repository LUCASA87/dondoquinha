export function formatConnectionError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("failed to fetch") ||
    lower.includes("fetch failed") ||
    lower.includes("networkerror") ||
    lower.includes("network request failed")
  ) {
    return "Falha de conexão com o banco. Verifique a internet e, se persistir, confira as variáveis do Supabase na Vercel.";
  }
  if (lower.includes("supabase não configurado")) {
    return message;
  }
  return message;
}

export function formatSupabaseError(message: string): string {
  return formatConnectionError(message);
}
