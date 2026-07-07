"use client";

import {
  fetchDashboardParcelas,
  fetchDashboardResumo,
} from "@/lib/queries/fetch-page-data";
import { PAGE_CACHE_KEYS } from "@/lib/queries/page-cache";
import { usePageData } from "@/hooks/use-page-data";
import { PageHeader } from "@/components/layout/page-header";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { ParcelasAVencer } from "@/components/dashboard/parcelas-a-vencer";
import { NovaCompraButton } from "@/components/dashboard/nova-compra-button";
import type { DashboardStats } from "@/types/database";

const RESUMO_VAZIO: DashboardStats = {
  totalCusto: 0,
  totalVenda: 0,
  lucroEstimado: 0,
};

export default function DashboardPage() {
  const { data: resumo } = usePageData(PAGE_CACHE_KEYS.dashboardResumo, fetchDashboardResumo);
  const { data: parcelas } = usePageData(PAGE_CACHE_KEYS.dashboardParcelas, fetchDashboardParcelas);

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
        initialStats={resumo?.stats ?? RESUMO_VAZIO}
        totalAPagar={resumo?.totalAPagar ?? 0}
        totalAReceber={resumo?.totalAReceber ?? 0}
        isLoading={!resumo}
      />

      <ParcelasAVencer initialParcelas={parcelas ?? []} />
    </div>
  );
}
