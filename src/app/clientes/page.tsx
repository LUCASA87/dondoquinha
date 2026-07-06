"use client";

import { useEffect, useState } from "react";
import { fetchClientes } from "@/lib/queries/fetch-page-data";
import { ClientesTable } from "@/components/clientes/clientes-table";
import { PageLoading } from "@/components/ui/page-loading";

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Awaited<ReturnType<typeof fetchClientes>> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchClientes().then((result) => {
      if (!cancelled) setClientes(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!clientes) return <PageLoading />;
  return <ClientesTable clientes={clientes} />;
}
