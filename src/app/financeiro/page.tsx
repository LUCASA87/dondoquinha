"use client";

import { useEffect, useState } from "react";
import { fetchFinanceiroPageData } from "@/lib/queries/fetch-page-data";
import { FinanceiroModule } from "@/components/financeiro/financeiro-module";
import { PageLoading } from "@/components/ui/page-loading";

export default function FinanceiroPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchFinanceiroPageData>> | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    fetchFinanceiroPageData().then((result) => {
      if (!cancelled) setData(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) return <PageLoading />;
  return (
    <FinanceiroModule
      parcelas={data.parcelas}
      contas={data.contas}
      totalAPagarMes={data.totalAPagarMes}
    />
  );
}
