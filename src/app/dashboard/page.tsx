import { getDashboardStats } from "@/lib/queries/dashboard";
import {
  getTotalAReceber,
  getParcelasAVencer,
  getContasAPagar,
} from "@/app/actions/financeiro";
import { PageHeader } from "@/components/layout/page-header";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { ParcelasAVencer } from "@/components/dashboard/parcelas-a-vencer";
import { NovaCompraButton } from "@/components/dashboard/nova-compra-button";

export default async function DashboardPage() {
  const [stats, contas, totalAReceber, parcelasAVencer] = await Promise.all([
    getDashboardStats(),
    getContasAPagar(),
    getTotalAReceber(),
    getParcelasAVencer(),
  ]);

  const totalAPagar = contas.reduce((sum, c) => sum + Number(c.valor), 0);

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
