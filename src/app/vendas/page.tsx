import { getClientes } from "@/app/actions/clientes";
import { getProdutos } from "@/app/actions/produtos";
import { getVendas } from "@/app/actions/vendas";
import { VendasModule } from "@/components/vendas/vendas-module";

export default async function VendasPage() {
  const [clientes, produtos, vendas] = await Promise.all([
    getClientes(),
    getProdutos(),
    getVendas(),
  ]);

  return (
    <VendasModule clientes={clientes} produtos={produtos} vendas={vendas} />
  );
}
