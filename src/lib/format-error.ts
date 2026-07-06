export function formatConnectionError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("failed to fetch") ||
    lower.includes("fetch failed") ||
    lower.includes("networkerror") ||
    lower.includes("network request failed")
  ) {
    return "Falha de conexão. Verifique a internet e tente novamente.";
  }
  return message;
}
