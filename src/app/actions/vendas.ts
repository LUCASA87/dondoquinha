"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { FORMAS_PARCELADAS } from "@/lib/format";
import type { FormaPagamento } from "@/types/database";

interface ItemVenda {
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
}

export async function createVenda(data: {
  cliente_id: string;
  forma_pagamento: FormaPagamento;
  parcelas: number;
  itens: ItemVenda[];
}) {
  const supabase = await createClient();

  const valor_total = data.itens.reduce(
    (sum, item) => sum + item.quantidade * item.preco_unitario,
    0
  );

  const isParcelado = FORMAS_PARCELADAS.includes(
    data.forma_pagamento as (typeof FORMAS_PARCELADAS)[number]
  );
  const parcelas = isParcelado ? data.parcelas : 1;
  const status = isParcelado ? "pendente" : "pago";

  const { data: venda, error: vendaError } = await supabase
    .from("vendas")
    .insert({
      cliente_id: data.cliente_id,
      valor_total,
      forma_pagamento: data.forma_pagamento,
      parcelas,
      status,
      data_venda: new Date().toISOString().split("T")[0],
    })
    .select("id")
    .single();

  if (vendaError || !venda) return { error: vendaError?.message ?? "Erro ao criar venda" };

  const itensInsert = data.itens.map((item) => ({
    venda_id: venda.id,
    produto_id: item.produto_id,
    quantidade: item.quantidade,
    preco_unitario: item.preco_unitario,
  }));

  const { error: itensError } = await supabase.from("venda_itens").insert(itensInsert);
  if (itensError) return { error: itensError.message };

  for (const item of data.itens) {
    const { data: produto } = await supabase
      .from("produtos")
      .select("quantidade")
      .eq("id", item.produto_id)
      .single();

    if (produto) {
      await supabase
        .from("produtos")
        .update({ quantidade: produto.quantidade - item.quantidade })
        .eq("id", item.produto_id);
    }
  }

  if (isParcelado && parcelas > 1) {
    const valorParcela = Math.round((valor_total / parcelas) * 100) / 100;
    const parcelasInsert = [];
    const hoje = new Date();

    for (let i = 1; i <= parcelas; i++) {
      const vencimento = new Date(hoje);
      vencimento.setDate(vencimento.getDate() + 30 * i);
      parcelasInsert.push({
        venda_id: venda.id,
        numero_parcela: i,
        valor_parcela: valorParcela,
        data_vencimento: vencimento.toISOString().split("T")[0],
        status: "pendente" as const,
      });
    }

    await supabase.from("parcelas_vendas").insert(parcelasInsert);
  } else if (isParcelado && parcelas === 1) {
    const vencimento = new Date();
    vencimento.setDate(vencimento.getDate() + 30);
    await supabase.from("parcelas_vendas").insert({
      venda_id: venda.id,
      numero_parcela: 1,
      valor_parcela: valor_total,
      data_vencimento: vencimento.toISOString().split("T")[0],
      status: "pendente",
    });
  }

  revalidatePath("/vendas");
  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
  revalidatePath("/estoque");
  return { success: true };
}

export async function getVendas() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendas")
    .select("*, clientes(nome)")
    .order("data_venda", { ascending: false });

  if (error) return [];
  return data;
}
