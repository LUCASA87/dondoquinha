/** Nome da cliente na venda: cadastro atual ou nome guardado após exclusão. */
export function nomeClienteDaVenda(venda?: {
  cliente_nome?: string | null;
  clientes?: { nome?: string | null } | null;
} | null): string {
  const atual = venda?.clientes?.nome?.trim();
  if (atual) return atual;
  const guardado = venda?.cliente_nome?.trim();
  if (guardado) return guardado;
  return "—";
}
