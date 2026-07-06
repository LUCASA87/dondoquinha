"use client";

import { fetchClientes } from "@/lib/queries/fetch-page-data";
import { PAGE_CACHE_KEYS } from "@/lib/queries/page-cache";
import { usePageData } from "@/hooks/use-page-data";
import { ClientesTable } from "@/components/clientes/clientes-table";
import { PageLoading } from "@/components/ui/page-loading";

export default function ClientesPage() {
  const clientes = usePageData(PAGE_CACHE_KEYS.clientes, fetchClientes);

  if (!clientes) return <PageLoading />;
  return <ClientesTable clientes={clientes} />;
}
