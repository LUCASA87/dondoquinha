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
import { StatsCardsSkeleton, ParcelasSkeleton } from "@/components/ui/page-loading";

export default function DashboardPage() {
  const resumo = usePageData(PAGE_CACHE_KEYS.dashboardResumo, fetchDashboardResumo);
  const parcelas = usePageData(PAGE_CACHE_KEYS.dashboardParcelas, fetchDashboardParcelas);

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

      {!resumo ? (
        <StatsCardsSkeleton />
      ) : (
        <StatsCards
          initialStats={resumo.stats}
          totalAPagar={resumo.totalAPagar}
          totalAReceber={resumo.totalAReceber}
        />
      )}

      {!parcelas ? <ParcelasSkeleton /> : <ParcelasAVencer initialParcelas={parcelas} />}
    </div>
  );
}
