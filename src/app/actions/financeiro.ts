"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function darBaixaParcela(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("parcelas_vendas")
    .update({ status: "pago" })
    .eq("id", id);

  if (error) return { error: error.message };

  const { data: parcela } = await supabase
    .from("parcelas_vendas")
    .select("venda_id")
    .eq("id", id)
    .single();

  if (parcela) {
    const { data: pendentes } = await supabase
      .from("parcelas_vendas")
      .select("id")
      .eq("venda_id", parcela.venda_id)
      .eq("status", "pendente");

    if (!pendentes || pendentes.length === 0) {
      await supabase
        .from("vendas")
        .update({ status: "pago" })
        .eq("id", parcela.venda_id);
    }
  }

  revalidatePath("/financeiro");
  return { success: true };
}

export async function getParcelasPendentes(filtroPagamento?: string) {
  const supabase = await createClient();

  let query = supabase
    .from("parcelas_vendas")
    .select("*, vendas(*, clientes(nome))")
    .eq("status", "pendente")
    .order("data_vencimento");

  const { data, error } = await query;

  if (error) return [];

  if (filtroPagamento && filtroPagamento !== "todos") {
    return data.filter(
      (p) => p.vendas && p.vendas.forma_pagamento === filtroPagamento
    );
  }

  return data;
}

export async function createContaAPagar(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.from("contas_a_pagar").insert({
    descricao: formData.get("descricao") as string,
    valor: Number(formData.get("valor")),
    data_vencimento: formData.get("data_vencimento") as string,
    status: "pendente",
  });

  if (error) return { error: error.message };

  revalidatePath("/financeiro");
  return { success: true };
}

export async function darBaixaConta(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("contas_a_pagar")
    .update({ status: "pago" })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/financeiro");
  return { success: true };
}

export async function getContasAPagar() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contas_a_pagar")
    .select("*")
    .order("data_vencimento");

  if (error) return [];
  return data;
}

export async function getTotalBoletosMesAtual() {
  const supabase = await createClient();
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  const { data, error } = await supabase
    .from("contas_a_pagar")
    .select("valor")
    .eq("status", "pendente")
    .gte("data_vencimento", inicioMes)
    .lte("data_vencimento", fimMes);

  if (error || !data) return 0;
  return data.reduce((sum, c) => sum + Number(c.valor), 0);
}

export async function createCartao(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.from("cartoes_credito").insert({
    nome_cartao: formData.get("nome_cartao") as string,
    dia_vencimento: Number(formData.get("dia_vencimento")),
    limite: formData.get("limite") ? Number(formData.get("limite")) : null,
  });

  if (error) return { error: error.message };

  revalidatePath("/financeiro");
  return { success: true };
}

export async function getCartoes() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cartoes_credito")
    .select("*")
    .order("nome_cartao");

  if (error) return [];
  return data;
}

export async function createFaturaCartao(data: {
  cartao_id: string;
  descricao: string;
  valor_total: number;
  parcelas_totais: number;
  data_compra: string;
}) {
  const supabase = await createClient();

  const { data: cartao } = await supabase
    .from("cartoes_credito")
    .select("dia_vencimento")
    .eq("id", data.cartao_id)
    .single();

  if (!cartao) return { error: "Cartão não encontrado" };

  const valorParcela = Math.round((data.valor_total / data.parcelas_totais) * 100) / 100;
  const compraDate = new Date(data.data_compra + "T12:00:00");

  for (let i = 1; i <= data.parcelas_totais; i++) {
    const vencimento = new Date(
      compraDate.getFullYear(),
      compraDate.getMonth() + i,
      cartao.dia_vencimento
    );

    await supabase.from("faturas_cartao").insert({
      cartao_id: data.cartao_id,
      descricao: `${data.descricao} (${i}/${data.parcelas_totais})`,
      valor_total: valorParcela,
      parcelas_totais: data.parcelas_totais,
      parcela_atual: i,
      data_vencimento_fatura: vencimento.toISOString().split("T")[0],
      status: "pendente",
    });
  }

  revalidatePath("/financeiro");
  return { success: true };
}

export async function getFaturasCartao() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("faturas_cartao")
    .select("*, cartoes_credito(nome_cartao, dia_vencimento)")
    .order("data_vencimento_fatura");

  if (error) return [];
  return data;
}

export async function getResumoFaturasCartao() {
  const supabase = await createClient();
  const hoje = new Date();
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();

  const { data: cartoes } = await supabase.from("cartoes_credito").select("*");
  const { data: faturas } = await supabase
    .from("faturas_cartao")
    .select("*")
    .eq("status", "pendente");

  if (!cartoes || !faturas) return [];

  return cartoes.map((cartao) => {
    const faturasMes = faturas.filter((f) => {
      if (f.cartao_id !== cartao.id) return false;
      const d = new Date(f.data_vencimento_fatura + "T12:00:00");
      return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
    });

    const total = faturasMes.reduce((sum, f) => sum + Number(f.valor_total), 0);

    return {
      cartao,
      total,
      diaVencimento: cartao.dia_vencimento,
    };
  });
}

export async function darBaixaFatura(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("faturas_cartao")
    .update({ status: "pago" })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/financeiro");
  return { success: true };
}
