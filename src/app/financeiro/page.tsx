"use client";

import { fetchFinanceiroPageData } from "@/lib/queries/fetch-page-data";
import { PAGE_CACHE_KEYS } from "@/lib/queries/page-cache";
import { usePageData } from "@/hooks/use-page-data";
import { FinanceiroModule } from "@/components/financeiro/financeiro-module";
import { PageLoading } from "@/components/ui/page-loading";

export default function FinanceiroPage() {
  const data = usePageData(PAGE_CACHE_KEYS.financeiro, fetchFinanceiroPageData);

  if (!data) return <PageLoading />;
  return (
    <FinanceiroModule
      parcelas={data.parcelas}
      contas={data.contas}
      totalAPagarMes={data.totalAPagarMes}
    />
  );
}
