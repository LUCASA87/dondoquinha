"use client";

import { fetchVendasPageData } from "@/lib/queries/fetch-page-data";
import { PAGE_CACHE_KEYS, invalidateAfterVendasChange } from "@/lib/queries/page-cache";
import { usePageData } from "@/hooks/use-page-data";
import { VendasModule } from "@/components/vendas/vendas-module";

export default function VendasPage() {
  const { data, revalidate } = usePageData(PAGE_CACHE_KEYS.vendas, fetchVendasPageData);

  async function refreshVendas() {
    invalidateAfterVendasChange();
    await revalidate();
  }

  return (
    <VendasModule
      clientes={data?.clientes ?? []}
      produtos={data?.produtos ?? []}
      vendas={data?.vendas ?? []}
      onRefresh={refreshVendas}
    />
  );
}
