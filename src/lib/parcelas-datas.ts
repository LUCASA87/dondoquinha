/** Gera datas padrão: 1ª em 30 dias, 2ª em 60, etc. */
export function datasPadraoParcelas(quantidade: number): string[] {
  const hoje = new Date();
  hoje.setHours(12, 0, 0, 0);

  return Array.from({ length: Math.max(1, quantidade) }, (_, i) => {
    const d = new Date(hoje);
    d.setDate(d.getDate() + 30 * (i + 1));
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
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
