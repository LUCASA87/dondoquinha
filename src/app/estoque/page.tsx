"use client";

import { useEffect, useState } from "react";
import { fetchProdutos } from "@/lib/queries/fetch-page-data";
import { ProdutosTable } from "@/components/estoque/produtos-table";
import { PageLoading } from "@/components/ui/page-loading";

export default function EstoquePage() {
  const [produtos, setProdutos] = useState<Awaited<ReturnType<typeof fetchProdutos>> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchProdutos().then((result) => {
      if (!cancelled) setProdutos(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!produtos) return <PageLoading />;
  return <ProdutosTable produtos={produtos} />;
}
