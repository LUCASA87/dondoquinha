import {
  getParcelasAbertas,
  getContasAPagar,
  getTotalBoletosMesAtual,
  getResumoFaturasCartao,
  buscarClientesComSaldo,
} from "@/app/actions/financeiro";
import { FinanceiroModule } from "@/components/financeiro/financeiro-module";

export default async function FinanceiroPage() {
  const [parcelas, contas, totalBoletosMes, resumoCartoes, clientesComSaldo] =
    await Promise.all([
      getParcelasAbertas(),
      getContasAPagar(),
      getTotalBoletosMesAtual(),
      getResumoFaturasCartao(),
      buscarClientesComSaldo(""),
    ]);

  const totalCartaoMes = resumoCartoes.reduce((sum, r) => sum + r.total, 0);
  const totalAPagarMes = totalBoletosMes + totalCartaoMes;

  return (
    <FinanceiroModule
      parcelas={parcelas}
      clientesComSaldo={clientesComSaldo}
      contas={contas}
      totalAPagarMes={totalAPagarMes}
    />
  );
}
