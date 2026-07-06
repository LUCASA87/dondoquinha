"use client";

import { useEffect, useState } from "react";
import { fetchDashboardPageData } from "@/lib/queries/fetch-page-data";
import { PageHeader } from "@/components/layout/page-header";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { ParcelasAVencer } from "@/components/dashboard/parcelas-a-vencer";
import { NovaCompraButton } from "@/components/dashboard/nova-compra-button";
import { StatsCardsSkeleton, ParcelasSkeleton } from "@/components/ui/page-loading";

export default function DashboardPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchDashboardPageData>> | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    fetchDashboardPageData().then((result) => {
      if (!cancelled) setData(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

      {!data ? (
        <>
          <StatsCardsSkeleton />
          <ParcelasSkeleton />
        </>
      ) : (
        <>
          <StatsCards
            initialStats={data.stats}
            totalAPagar={data.totalAPagar}
            totalAReceber={data.totalAReceber}
          />
          <ParcelasAVencer initialParcelas={data.parcelas} />
        </>
      )}
    </div>
  );
}
