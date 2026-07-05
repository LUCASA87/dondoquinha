import {
  getParcelasPendentes,
  getContasAPagar,
  getTotalBoletosMesAtual,
  getCartoes,
  getFaturasCartao,
  getResumoFaturasCartao,
} from "@/app/actions/financeiro";
import { FinanceiroModule } from "@/components/financeiro/financeiro-module";

export default async function FinanceiroPage() {
  const [parcelas, contas, totalBoletosMes, cartoes, faturas, resumoCartoes] =
    await Promise.all([
      getParcelasPendentes(),
      getContasAPagar(),
      getTotalBoletosMesAtual(),
      getCartoes(),
      getFaturasCartao(),
      getResumoFaturasCartao(),
    ]);

  return (
    <FinanceiroModule
      parcelas={parcelas as Parameters<typeof FinanceiroModule>[0]["parcelas"]}
      contas={contas}
      totalBoletosMes={totalBoletosMes}
      cartoes={cartoes}
      faturas={faturas as Parameters<typeof FinanceiroModule>[0]["faturas"]}
      resumoCartoes={resumoCartoes}
    />
  );
}
