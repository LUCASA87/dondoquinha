import { getParcelasAbertas, getContasAPagar } from "@/app/actions/financeiro";
import { FinanceiroModule } from "@/components/financeiro/financeiro-module";

export default async function FinanceiroPage() {
  const [parcelas, contas] = await Promise.all([
    getParcelasAbertas(),
    getContasAPagar(),
  ]);

  const totalAPagarMes = contas.reduce((sum, c) => sum + Number(c.valor), 0);

  return (
    <FinanceiroModule
      parcelas={parcelas}
      contas={contas}
      totalAPagarMes={totalAPagarMes}
    />
  );
}
