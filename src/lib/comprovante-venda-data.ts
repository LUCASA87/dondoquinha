import type { ComprovanteVendaData } from "@/lib/store";
import { mapItensComprovante } from "@/lib/venda-itens";

type ItemRow = {
  descricao?: string | null;
  quantidade?: number;
  preco_unitario?: number;
  produtos?: { nome: string } | null;
};

type ParcelaRow = {
  numero_parcela: number;
  valor_parcela: number;
  valor_pago?: number;
  data_vencimento: string;
  status: string;
};

export function montarComprovanteVenda(data: {
  vendaId: string;
  dataCompra: string;
  clienteNome: string;
  obs: string | null;
  parcelasTotal: number;
  statusVenda: "pago" | "pendente";
  valorTotal: number;
  itens: ItemRow[];
  parcelas: ParcelaRow[];
}): ComprovanteVendaData {
  const numeroPedido = data.vendaId.replace(/-/g, "").slice(0, 8).toUpperCase();

  return {
    numeroPedido,
    dataCompra: data.dataCompra,
    clienteNome: data.clienteNome,
    obs: data.obs,
    parcelasTotal: data.parcelasTotal,
    statusVenda: data.statusVenda,
    valorTotal: data.valorTotal,
    itens: mapItensComprovante(data.itens),
    parcelas: data.parcelas
      .sort((a, b) => a.numero_parcela - b.numero_parcela)
      .map((p) => {
        const saldo =
          Number(p.valor_parcela) - Number(p.valor_pago ?? 0);
        const quitada =
          p.status === "pago" || saldo <= 0.001;
        return {
          numero: p.numero_parcela,
          valor: Number(p.valor_parcela),
          dataVencimento: p.data_vencimento,
          status: quitada ? ("pago" as const) : ("pendente" as const),
          doc: `PED${numeroPedido}-${String(p.numero_parcela).padStart(2, "0")}`,
        };
      }),
  };
}
