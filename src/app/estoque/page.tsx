import { getProdutos } from "@/app/actions/produtos";
import { ProdutosTable } from "@/components/estoque/produtos-table";

export default async function EstoquePage() {
  const produtos = await getProdutos();
  return <ProdutosTable produtos={produtos} />;
}
