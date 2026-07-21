/** Formata Date local como YYYY-MM-DD. */
function formatarDataLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Gera datas padrão: 1ª em 30 dias, 2ª em 60, etc. */
export function datasPadraoParcelas(quantidade: number): string[] {
  const hoje = new Date();
  hoje.setHours(12, 0, 0, 0);
  return datasAPartirDaPrimeira(
    formatarDataLocal(
      new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 30)
    ),
    quantidade
  );
}

/**
 * A partir da 1ª data, gera as demais de 30 em 30 dias.
 * Ex.: 2026-08-20 → 2026-08-20, 2026-09-19, 2026-10-19...
 */
export function datasAPartirDaPrimeira(
  primeira: string,
  quantidade: number
): string[] {
  const n = Math.max(1, quantidade);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(primeira.trim())) {
    return datasPadraoParcelas(n);
  }

  const [y, m, d] = primeira.trim().split("-").map(Number);
  const base = new Date(y, m - 1, d, 12, 0, 0);

  return Array.from({ length: n }, (_, i) => {
    const data = new Date(base);
    data.setDate(data.getDate() + 30 * i);
    return formatarDataLocal(data);
  });
}

export function validarDatasParcelas(
  parcelas: number,
  datas?: string[]
): { ok: true; datas: string[] } | { ok: false; error: string } {
  if (!datas || datas.length !== parcelas) {
    return { ok: false, error: "Informe a data de vencimento de cada parcela." };
  }

  const datasValidas: string[] = [];

  for (let i = 0; i < parcelas; i++) {
    const raw = datas[i]?.trim() ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return { ok: false, error: `Informe a data da ${i + 1}ª parcela.` };
    }
    const [y, m, d] = raw.split("-").map(Number);
    const data = new Date(y, m - 1, d);
    if (
      data.getFullYear() !== y ||
      data.getMonth() !== m - 1 ||
      data.getDate() !== d
    ) {
      return { ok: false, error: `Data inválida na ${i + 1}ª parcela.` };
    }
    if (i > 0 && raw < datasValidas[i - 1]) {
      return {
        ok: false,
        error: `A ${i + 1}ª parcela deve vencer na mesma data ou depois da anterior.`,
      };
    }
    datasValidas.push(raw);
  }

  return { ok: true, datas: datasValidas };
}
