"use client";

import { loadProdutos } from "@/lib/queries/fetch-page-data";
import { PAGE_CACHE_KEYS, invalidateAfterEstoqueChange } from "@/lib/queries/page-cache";
import { usePageData } from "@/hooks/use-page-data";
import { ProdutosTable } from "@/components/estoque/produtos-table";

export default function EstoquePage() {
  const { data: produtos, revalidate } = usePageData(PAGE_CACHE_KEYS.estoque, loadProdutos);

  async function refreshProdutos() {
    invalidateAfterEstoqueChange();
    await revalidate();
  }

  return <ProdutosTable produtos={produtos ?? []} onRefresh={refreshProdutos} />;
}
