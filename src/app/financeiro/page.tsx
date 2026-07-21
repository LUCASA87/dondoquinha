"use client";

import { fetchFinanceiroPageData } from "@/lib/queries/fetch-page-data";
import { PAGE_CACHE_KEYS } from "@/lib/queries/page-cache";
import { usePageData } from "@/hooks/use-page-data";
import { FinanceiroModule } from "@/components/financeiro/financeiro-module";

export default function FinanceiroPage() {
  const { data } = usePageData(PAGE_CACHE_KEYS.financeiro, fetchFinanceiroPageData);

  return (
    <FinanceiroModule
      parcelas={data?.parcelas ?? []}
      contas={data?.contas ?? []}
    />
  );
}
