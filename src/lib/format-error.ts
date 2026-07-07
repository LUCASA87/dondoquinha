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

function formatDuplicateError(message: string): string | null {
  const lower = message.toLowerCase();
  const isDuplicate =
    lower.includes("duplicate key") ||
    lower.includes("unique constraint") ||
    lower.includes("23505");

  if (!isDuplicate) return null;

  if (lower.includes("cpf")) {
    return "Este CPF já está cadastrado.";
  }
  if (lower.includes("telefone") || lower.includes("phone")) {
    return "Este telefone já está cadastrado.";
  }
  return "Já existe um cadastro com esses dados.";
}

export function formatSupabaseError(message: string, code?: string): string {
  if (code === "23505") {
    const duplicate = formatDuplicateError(message);
    if (duplicate) return duplicate;
    return "Já existe um cadastro com esses dados.";
  }

  const duplicate = formatDuplicateError(message);
  if (duplicate) return duplicate;

  return formatConnectionError(message);
}
