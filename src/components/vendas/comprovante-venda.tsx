"use client";

import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ComprovanteActions } from "@/components/comprovante/comprovante-actions";
import { formatCurrency, formatDate, formatItemNome } from "@/lib/format";
import {
  comprovanteVendaHtml,
  comprovanteVendaTexto,
} from "@/lib/comprovante-utils";
import { LOJA, type ComprovanteVendaData } from "@/lib/store";

interface ComprovanteVendaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ComprovanteVendaData | null;
  telefoneCliente?: string | null;
}

function statusLabel(status: "pago" | "pendente") {
  return status === "pago" ? "QUITADA" : "PENDENTE";
}

export function ComprovanteVenda({
  open,
  onOpenChange,
  data,
  telefoneCliente,
}: ComprovanteVendaProps) {
  if (!data) return null;

  const logoUrl =
    typeof window !== "undefined" ? `${window.location.origin}${LOJA.logo}` : LOJA.logo;
  const html = comprovanteVendaHtml(data, logoUrl);
  const texto = comprovanteVendaTexto(data);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        stackOnTop
        className="max-w-md max-h-[90vh] overflow-y-auto overscroll-contain p-0 gap-0 border-0 shadow-none bg-brand-cream"
      >
        <div className="sticky top-0 z-10 bg-brand-cream/95 backdrop-blur-sm p-6 pb-3 pr-12">
          <DialogHeader>
            <DialogTitle>Carnê da Venda</DialogTitle>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 flex flex-col items-center gap-4">
          <ComprovanteActions
            html={html}
            texto={texto}
            nomeArquivo={`comprovante-venda-${data.numeroPedido}`}
            telefoneCliente={telefoneCliente}
            onFechar={() => onOpenChange(false)}
          />
          <p className="text-xs text-brand-black/50 text-center">
            Role para ver o carnê completo · use o X para fechar
          </p>

          <div className="w-full max-w-[320px] border border-brand-black/10 rounded-lg shadow-sm">
            <ReciboConteudo data={data} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReciboConteudo({ data }: { data: ComprovanteVendaData }) {
  return (
    <div className="bg-white text-black text-xs font-mono p-4 leading-relaxed">
      <div className="text-center border-b border-dashed border-black/30 pb-3 mb-3">
        <div className="flex justify-center mb-2">
          <Image
            src={LOJA.logo}
            alt={LOJA.nomeCompleto}
            width={56}
            height={56}
            className="rounded-full"
          />
        </div>
        <p className="font-serif text-lg italic font-semibold">{LOJA.nome}</p>
        <p className="text-[9px] tracking-[0.2em] text-black/70">{LOJA.subtitulo}</p>
      </div>

      <p className="text-center font-bold text-sm mb-3">RESUMO DO PEDIDO</p>

      <div className="space-y-1 mb-3">
        <Linha label="Data da compra" valor={formatDate(data.dataCompra)} />
        <Linha label="Pedido" valor={data.numeroPedido} />
        <Linha label="Cliente" valor={data.clienteNome} />
        <Linha label="Crediário" valor={`${data.parcelasTotal}x`} />
        {data.obs && <Linha label="Observação" valor={data.obs} />}
      </div>

      <table className="w-full mb-2 text-[10px]">
        <thead>
          <tr className="border-b border-black/20">
            <th className="text-left py-1 font-bold">Descrição</th>
            <th className="text-right py-1 font-bold w-10">Qtd</th>
            <th className="text-right py-1 font-bold w-14">Valor</th>
            <th className="text-right py-1 font-bold w-14">Total</th>
          </tr>
        </thead>
        <tbody>
          {data.itens.map((item, i) => (
            <tr key={i} className="border-b border-black/10">
              <td className="py-1 pr-1 align-top uppercase">{formatItemNome(item.descricao)}</td>
              <td className="text-right py-1 align-top">
                {item.quantidade.toFixed(2).replace(".", ",")}
              </td>
              <td className="text-right py-1 align-top">
                {item.valorUnitario.toFixed(2).replace(".", ",")}
              </td>
              <td className="text-right py-1 align-top">
                {item.total.toFixed(2).replace(".", ",")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end mb-4 font-bold text-sm">
        <span>Total Final:&nbsp;</span>
        <span>{formatCurrency(data.valorTotal)}</span>
      </div>

      {data.parcelas.length > 0 && (
        <div className="border-t border-dashed border-black/30 pt-3 space-y-4">
          <p className="font-bold text-center text-[11px]">PARCELAS</p>
          {data.parcelas.map((p) => (
            <div key={p.numero} className="border border-black/15 p-2 rounded">
              <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                <span className="text-black/60">Data da parcela:</span>
                <span className="text-right">{formatDate(p.dataVencimento)}</span>
                <span className="text-black/60">Valor:</span>
                <span className="text-right">{formatCurrency(p.valor)}</span>
                <span className="text-black/60">Status:</span>
                <span className="text-right font-bold">{statusLabel(p.status)}</span>
                <span className="text-black/60">Doc:</span>
                <span className="text-right text-[9px]">{p.doc}</span>
                <span className="text-black/60">Parcela:</span>
                <span className="text-right">
                  {p.numero} de {data.parcelasTotal}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-dashed border-black/30">
        <div className="border-b border-black/40 mb-1 h-8" />
        <p className="text-center text-[10px]">Assinatura do Cliente</p>
      </div>

      <p className="text-center text-[9px] text-black/50 mt-4">
        Obrigada pela preferência!
      </p>
    </div>
  );
}

function Linha({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-black/60 shrink-0">{label}:</span>
      <span className="text-right font-medium">{valor}</span>
    </div>
  );
}
