"use server";

import { revalidateVendas } from "@/lib/revalidate-app";
import { getSupabase } from "@/lib/supabase/data";
import { formatItemNome } from "@/lib/format";
import { montarComprovanteVenda } from "@/lib/comprovante-venda-data";
import { validarDatasParcelas } from "@/lib/parcelas-datas";
import type { ComprovanteVendaData } from "@/lib/store";

interface ItemVenda {
  produto_id: string | null;
  nome: string;
  quantidade: number;
  preco_unitario: number;
  preco_custo?: number | null;
}

export async function createVenda(data: {
  cliente_id: string;
  parcelas: number;
  datas_vencimento?: string[];
  obs?: string;
  itens: ItemVenda[];
}) {
  const supabase = getSupabase();

  const valor_total = data.itens.reduce(
    (sum, item) => sum + item.quantidade * item.preco_unitario,
    0
  );

  const parcelas = Math.max(1, data.parcelas);
  const datasOk = validarDatasParcelas(parcelas, data.datas_vencimento);
  if (!datasOk.ok) return { error: datasOk.error };

  const { data: venda, error: vendaError } = await supabase
    .from("vendas")
    .insert({
      cliente_id: data.cliente_id,
      valor_total,
      forma_pagamento: "crediario",
      parcelas,
      status: "pendente",
      obs: data.obs?.trim() || null,
      data_venda: new Date().toISOString().split("T")[0],
    })
    .select("id")
    .single();

  if (vendaError || !venda) {
    return { error: vendaError?.message ?? "Erro ao criar venda" };
  }

  const numeroPedido = venda.id.replace(/-/g, "").slice(0, 8).toUpperCase();
  const dataCompra = new Date().toISOString().split("T")[0];

  const { data: cliente } = await supabase
    .from("clientes")
    .select("nome")
    .eq("id", data.cliente_id)
    .single();

  const itensInsert = data.itens.map((item) => ({
    venda_id: venda.id,
    produto_id: item.produto_id,
    descricao: formatItemNome(item.nome),
    quantidade: item.quantidade,
    preco_unitario: item.preco_unitario,
    preco_custo:
      item.preco_custo != null && item.preco_custo > 0 ? item.preco_custo : null,
  }));

  const { error: itensError } = await supabase.from("venda_itens").insert(itensInsert);
  if (itensError) return { error: itensError.message };

  const produtoIds = [
    ...new Set(data.itens.map((i) => i.produto_id).filter(Boolean) as string[]),
  ];

  if (produtoIds.length > 0) {
    const { data: produtos } = await supabase
      .from("produtos")
      .select("id, quantidade")
      .in("id", produtoIds);

    const qtdPorProduto = new Map<string, number>();
    for (const item of data.itens) {
      if (!item.produto_id) continue;
      qtdPorProduto.set(
        item.produto_id,
        (qtdPorProduto.get(item.produto_id) ?? 0) + item.quantidade
      );
    }

    await Promise.all(
      (produtos ?? []).map((produto) => {
        const baixar = qtdPorProduto.get(produto.id) ?? 0;
        if (baixar < 1) return Promise.resolve();
        return supabase
          .from("produtos")
          .update({ quantidade: produto.quantidade - baixar })
          .eq("id", produto.id);
      })
    );
  }

  const valorParcela = Math.round((valor_total / parcelas) * 100) / 100;
  const parcelasComprovante: ComprovanteVendaData["parcelas"] = [];
  const parcelasInsert = [];

  for (let i = 1; i <= parcelas; i++) {
    const dataVenc = datasOk.datas[i - 1];

    parcelasInsert.push({
      venda_id: venda.id,
      numero_parcela: i,
      valor_parcela: valorParcela,
      valor_pago: 0,
      data_vencimento: dataVenc,
      status: "pendente" as const,
    });

    parcelasComprovante.push({
      numero: i,
      valor: valorParcela,
      dataVencimento: dataVenc,
      status: "pendente",
      doc: `PED${numeroPedido}-${String(i).padStart(2, "0")}`,
    });
  }

  await supabase.from("parcelas_vendas").insert(parcelasInsert);

  revalidateVendas();

  const comprovante = montarComprovanteVenda({
    vendaId: venda.id,
    dataCompra,
    clienteNome: cliente?.nome ?? "—",
    obs: data.obs?.trim() || null,
    parcelasTotal: parcelas,
    statusVenda: "pendente",
    valorTotal: valor_total,
    itens: data.itens.map((item) => ({
      descricao: formatItemNome(item.nome),
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
    })),
    parcelas: parcelasComprovante.map((p) => ({
      numero_parcela: p.numero,
      valor_parcela: p.valor,
      valor_pago: 0,
      data_vencimento: p.dataVencimento,
      status: "pendente",
    })),
  });

  return { success: true, comprovante };
}

export async function getUltimaVendaComprovante(
  clienteId: string
): Promise<{ comprovante: ComprovanteVendaData } | { error: string }> {
  const supabase = getSupabase();

  const { data: venda, error } = await supabase
    .from("vendas")
    .select(
      "*, clientes(nome), venda_itens(descricao, quantidade, preco_unitario, produtos(nome)), parcelas_vendas(numero_parcela, valor_parcela, valor_pago, data_vencimento, status)"
    )
    .eq("cliente_id", clienteId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!venda) return { error: "Nenhuma compra encontrada para esta cliente." };

  const comprovante = montarComprovanteVenda({
    vendaId: venda.id,
    dataCompra: venda.data_venda,
    clienteNome: (venda.clientes as { nome: string } | null)?.nome ?? "—",
    obs: venda.obs ?? null,
    parcelasTotal: venda.parcelas,
    statusVenda: venda.status as "pago" | "pendente",
    valorTotal: Number(venda.valor_total),
    itens: (venda.venda_itens ?? []) as Array<{
      descricao?: string | null;
      quantidade: number;
      preco_unitario: number;
      produtos?: { nome: string } | null;
    }>,
    parcelas: (venda.parcelas_vendas ?? []) as Array<{
      numero_parcela: number;
      valor_parcela: number;
      valor_pago?: number;
      data_vencimento: string;
      status: string;
    }>,
  });

  return { comprovante };
}

export async function getVendas(limit = 5) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("vendas")
    .select("*, clientes(nome)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return data;
}
