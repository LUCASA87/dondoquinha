import { montarComprovanteVenda } from "@/lib/comprovante-venda-data";
import { nomeClienteDaVenda } from "@/lib/cliente-venda-nome";
import { runDb, mapDbError, dbError } from "@/lib/db/helpers";
import {
  baixarEstoqueVenda,
  devolverEstoqueVenda,
  validarEstoqueVenda,
} from "@/lib/db/estoque-venda";
import { formatItemNome } from "@/lib/format";
import { validarDatasParcelas } from "@/lib/parcelas-datas";
import { invalidateAfterVendasChange } from "@/lib/queries/page-cache";
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
  try {
    const result = await runDb(async (supabase) => {
    const estoqueOk = await validarEstoqueVenda(supabase, data.itens);
    if ("error" in estoqueOk) return estoqueOk;

    const valor_total = data.itens.reduce(
      (sum, item) => sum + item.quantidade * item.preco_unitario,
      0
    );

    const parcelas = Math.max(1, data.parcelas);
    const datasOk = validarDatasParcelas(parcelas, data.datas_vencimento);
    if (!datasOk.ok) return { error: datasOk.error };

    const { data: cliente } = await supabase
      .from("clientes")
      .select("nome")
      .eq("id", data.cliente_id)
      .single();

    const { data: venda, error: vendaError } = await supabase
      .from("vendas")
      .insert({
        cliente_id: data.cliente_id,
        cliente_nome: cliente?.nome ?? null,
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
      return dbError(vendaError?.message ?? "Erro ao criar venda");
    }

    const numeroPedido = venda.id.replace(/-/g, "").slice(0, 8).toUpperCase();
    const dataCompra = new Date().toISOString().split("T")[0];

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
    if (itensError) return dbError(itensError.message, itensError.code);

    const baixa = await baixarEstoqueVenda(supabase, data.itens);
    if ("error" in baixa) return baixa;

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

    return { success: true as const, comprovante };
  });

    if ("success" in result && result.success) {
      invalidateAfterVendasChange();
    }
    return result;
  } catch (err) {
    return mapDbError(err);
  }
}

export async function updateVendaStatus(
  vendaId: string,
  status: "pago" | "pendente"
) {
  try {
    const result = await runDb(async (supabase) => {
      if (status !== "pago" && status !== "pendente") {
        return { error: "Situação inválida." };
      }

      const { data: venda, error: vendaErr } = await supabase
        .from("vendas")
        .select("id, status")
        .eq("id", vendaId)
        .single();

      if (vendaErr || !venda) {
        return dbError(vendaErr?.message ?? "Venda não encontrada.");
      }

      if (venda.status === status) return { success: true as const };

      const { error: upVenda } = await supabase
        .from("vendas")
        .update({ status })
        .eq("id", vendaId);

      if (upVenda) return dbError(upVenda.message);

      const { data: parcelas, error: parcErr } = await supabase
        .from("parcelas_vendas")
        .select("id, valor_parcela")
        .eq("venda_id", vendaId);

      if (parcErr) return dbError(parcErr.message);

      if (status === "pago") {
        for (const p of parcelas ?? []) {
          const { error } = await supabase
            .from("parcelas_vendas")
            .update({
              status: "pago",
              valor_pago: Number(p.valor_parcela),
            })
            .eq("id", p.id);
          if (error) return dbError(error.message);
        }
      } else {
        const { error: delPag } = await supabase
          .from("pagamentos_crediario")
          .delete()
          .eq("venda_id", vendaId);
        if (delPag) return dbError(delPag.message);

        for (const p of parcelas ?? []) {
          const { error } = await supabase
            .from("parcelas_vendas")
            .update({
              status: "pendente",
              valor_pago: 0,
            })
            .eq("id", p.id);
          if (error) return dbError(error.message);
        }
      }

      return { success: true as const };
    });

    if ("success" in result && result.success) {
      invalidateAfterVendasChange();
    }
    return result;
  } catch (err) {
    return mapDbError(err);
  }
}

export async function deleteVenda(vendaId: string) {
  try {
    const result = await runDb(async (supabase) => {
      const { data: venda, error: vendaErr } = await supabase
        .from("vendas")
        .select("id")
        .eq("id", vendaId)
        .single();

      if (vendaErr || !venda) {
        return dbError(vendaErr?.message ?? "Venda não encontrada.");
      }

      const devolucao = await devolverEstoqueVenda(supabase, vendaId);
      if ("error" in devolucao) return devolucao;

      const { error } = await supabase.from("vendas").delete().eq("id", vendaId);
      if (error) return dbError(error.message);

      return { success: true as const };
    });

    if ("success" in result && result.success) {
      invalidateAfterVendasChange();
    }
    return result;
  } catch (err) {
    return mapDbError(err);
  }
}

export async function getUltimaVendaComprovante(
  clienteId: string
): Promise<{ comprovante: ComprovanteVendaData } | { error: string }> {
  try {
    return await runDb(async (supabase) => {
    const { data: venda, error } = await supabase
      .from("vendas")
      .select(
        "*, clientes(nome), venda_itens(descricao, quantidade, preco_unitario, produtos(nome)), parcelas_vendas(numero_parcela, valor_parcela, valor_pago, data_vencimento, status)"
      )
      .eq("cliente_id", clienteId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return dbError(error.message);
    if (!venda) return { error: "Nenhuma compra encontrada para esta cliente." };

    const comprovante = montarComprovanteVenda({
      vendaId: venda.id,
      dataCompra: venda.data_venda,
      clienteNome: nomeClienteDaVenda(venda),
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
    });
  } catch (err) {
    return mapDbError(err);
  }
}
