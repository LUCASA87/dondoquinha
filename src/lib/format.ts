const MOEDA = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const MESES = [
  "JAN",
  "FEV",
  "MAR",
  "ABR",
  "MAI",
  "JUN",
  "JUL",
  "AGO",
  "SET",
  "OUT",
  "NOV",
  "DEZ",
] as const;

/** Formata valor como R$0,01 (sem espaço após R$). */
export function formatCurrency(value: number): string {
  return MOEDA.format(value).replace(/^R\$\s*/, "R$");
}

/** Converte texto digitado (ex: "R$10,50") em número. */
export function parseMoedaInput(valor: string): number {
  const apenasNumeros = valor.replace(/\D/g, "");
  if (!apenasNumeros) return 0;
  return Number(apenasNumeros) / 100;
}

/** Formata número para exibição no campo (ex: R$0,01). */
export function formatMoedaInput(valor: number): string {
  return formatCurrency(valor);
}

/** Data no formato dd/MMM/aaaa com mês em caixa alta. */
export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date + "T12:00:00") : date;
  const day = String(d.getDate()).padStart(2, "0");
  const month = MESES[d.getMonth()];
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/** Mês/ano em caixa alta (ex: JUL/2026). */
export function formatMesAno(date: string | Date = new Date()): string {
  const d = typeof date === "string" ? new Date(date + "T12:00:00") : date;
  return `${MESES[d.getMonth()]}/${d.getFullYear()}`;
}

/** Caixa alta durante digitação (preserva espaços). */
export function formatItemNomeInput(text: string): string {
  return text.toLocaleUpperCase("pt-BR");
}

/** Normaliza nome de produto para salvar e exibir. */
export function formatItemNome(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLocaleUpperCase("pt-BR");
}

export function formatCPF(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim();
  }
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim();
}

export const FORMAS_PAGAMENTO = [
  { value: "pix", label: "Pix" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "credito", label: "Crédito" },
  { value: "boleto", label: "Boleto" },
  { value: "cheque", label: "Cheque" },
] as const;

export const FORMAS_PARCELADAS = ["credito", "boleto", "cheque"] as const;

export const PAGAMENTO_LABELS: Record<string, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  credito: "Crédito",
  boleto: "Boleto",
  cheque: "Cheque",
};
