import { formatItemNome } from "@/lib/format";

export function normalizeCPF(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11);
}

export function normalizePhone(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11);
}

export function isValidCPF(value: string): boolean {
  const cpf = normalizeCPF(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(cpf[i]) * (10 - i);
  }
  let digit1 = (sum * 10) % 11;
  if (digit1 === 10) digit1 = 0;
  if (digit1 !== Number(cpf[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += Number(cpf[i]) * (11 - i);
  }
  let digit2 = (sum * 10) % 11;
  if (digit2 === 10) digit2 = 0;
  return digit2 === Number(cpf[10]);
}

export function parseClienteForm(
  formData: FormData
):
  | { ok: true; nome: string; cpf: string | null; telefone: string | null; endereco: string | null }
  | { ok: false; error: string } {
  const nome = (formData.get("nome") as string)?.trim() ?? "";
  if (!nome) {
    return { ok: false, error: "Informe o nome da cliente." };
  }

  const cpfDigits = normalizeCPF((formData.get("cpf") as string) ?? "");
  if (cpfDigits && !isValidCPF(cpfDigits)) {
    return { ok: false, error: "CPF inválido. Verifique os números digitados." };
  }

  return {
    ok: true,
    nome,
    cpf: cpfDigits || null,
    telefone: (formData.get("telefone") as string)?.trim() || null,
    endereco: (formData.get("endereco") as string)?.trim() || null,
  };
}

export function validateProdutoNome(nomeRaw: string):
  | { ok: true; nome: string }
  | { ok: false; error: string } {
  const nome = formatItemNome(nomeRaw);
  if (!nome) {
    return { ok: false, error: "Informe o nome do produto." };
  }
  if (nome.length <= 3) {
    return { ok: false, error: "O nome do produto deve ter mais de 3 caracteres." };
  }
  return { ok: true, nome };
}
