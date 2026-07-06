import { revalidatePath } from "next/cache";

export function revalidateFinanceiro() {
  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
}

export function revalidateVendas() {
  revalidatePath("/vendas");
  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
  revalidatePath("/estoque");
}

export function revalidateEstoque() {
  revalidatePath("/estoque");
  revalidatePath("/dashboard");
}

export function revalidateClientes() {
  revalidatePath("/clientes");
  revalidatePath("/vendas");
}
