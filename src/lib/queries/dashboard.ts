import { getSupabase } from "@/lib/supabase/data";
import type { DashboardStats } from "@/types/database";

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("produtos").select("quantidade, preco_custo, preco_venda");

  if (error || !data) {
    return { totalCusto: 0, totalVenda: 0, lucroEstimado: 0 };
  }

  let totalCusto = 0;
  let totalVenda = 0;

  for (const p of data) {
    totalCusto += Number(p.quantidade) * Number(p.preco_custo);
    totalVenda += Number(p.quantidade) * Number(p.preco_venda);
  }

  return {
    totalCusto,
    totalVenda,
    lucroEstimado: totalVenda - totalCusto,
  };
}
