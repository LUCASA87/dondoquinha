import { getClientes } from "@/app/actions/clientes";
import { ClientesTable } from "@/components/clientes/clientes-table";

export default async function ClientesPage() {
  const clientes = await getClientes();
  return <ClientesTable clientes={clientes} />;
}
