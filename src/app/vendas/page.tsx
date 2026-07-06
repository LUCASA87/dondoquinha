"use client";

import { useEffect, useState } from "react";
import { fetchVendasPageData } from "@/lib/queries/fetch-page-data";
import { VendasModule } from "@/components/vendas/vendas-module";
import { PageLoading } from "@/components/ui/page-loading";

export default function VendasPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchVendasPageData>> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchVendasPageData().then((result) => {
      if (!cancelled) setData(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) return <PageLoading />;
  return (
    <VendasModule clientes={data.clientes} produtos={data.produtos} vendas={data.vendas} />
  );
}
