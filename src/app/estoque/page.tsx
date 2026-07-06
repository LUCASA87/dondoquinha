"use client";

import { fetchProdutos } from "@/lib/queries/fetch-page-data";
import { PAGE_CACHE_KEYS } from "@/lib/queries/page-cache";
import { usePageData } from "@/hooks/use-page-data";
import { ProdutosTable } from "@/components/estoque/produtos-table";
import { PageLoading } from "@/components/ui/page-loading";

export default function EstoquePage() {
  const produtos = usePageData(PAGE_CACHE_KEYS.estoque, fetchProdutos);

  if (!produtos) return <PageLoading />;
  return <ProdutosTable produtos={produtos} />;
}
