import { PageHeader } from "@/components/layout/page-header";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { ParcelasAVencer } from "@/components/dashboard/parcelas-a-vencer";
import { NovaCompraButton } from "@/components/dashboard/nova-compra-button";
import { getDashboardStats } from "@/lib/queries/dashboard";
import {
  getTotalBoletosMesAtual,
  getResumoFaturasCartao,
  getTotalAReceber,
  getParcelasAVencer,
} from "@/app/actions/financeiro";

export default async function DashboardPage() {
  const [stats, totalBoletosMes, resumoCartoes, totalAReceber, parcelasAVencer] =
    await Promise.all([
    getDashboardStats(),
    getTotalBoletosMesAtual(),
    getResumoFaturasCartao(),
    getTotalAReceber(),
    getParcelasAVencer(),
  ]);

  const totalCartaoMes = resumoCartoes.reduce((sum, r) => sum + r.total, 0);
  const totalAPagar = totalBoletosMes + totalCartaoMes;

  return (
    <div className="space-y-4">
      <div className="fixed right-4 top-4 z-40 lg:hidden">
        <NovaCompraButton />
      </div>

      <PageHeader
        title="Olá! 👋"
        description="Resumo do estoque, crediário e contas a pagar."
        action={
          <div className="hidden lg:block">
            <NovaCompraButton />
          </div>
        }
      />
      <StatsCards
        initialStats={stats}
        totalAPagar={totalAPagar}
        totalAReceber={totalAReceber}
      />
      <ParcelasAVencer initialParcelas={parcelasAVencer} />
    </div>
  );
}
