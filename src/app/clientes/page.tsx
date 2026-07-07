"use client";

import { loadClientes } from "@/lib/queries/fetch-page-data";
import { PAGE_CACHE_KEYS, invalidateAfterClientesChange } from "@/lib/queries/page-cache";
import { usePageData } from "@/hooks/use-page-data";
import { ClientesTable } from "@/components/clientes/clientes-table";

export default function ClientesPage() {
  const { data: clientes, revalidate } = usePageData(PAGE_CACHE_KEYS.clientes, loadClientes);

  async function refreshClientes() {
    invalidateAfterClientesChange();
    await revalidate();
  }

  return <ClientesTable clientes={clientes ?? []} onRefresh={refreshClientes} />;
}
