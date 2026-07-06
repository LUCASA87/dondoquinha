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
  comprovantePagamentoHtml,
  comprovantePagamentoTexto,
} from "@/lib/comprovante-utils";
import { LOJA, type ComprovantePagamentoData } from "@/lib/store";

interface ComprovantePagamentoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ComprovantePagamentoData | null;
  telefoneCliente?: string | null;
}

export function ComprovantePagamento({
  open,
  onOpenChange,
  data,
  telefoneCliente,
}: ComprovantePagamentoProps) {
  if (!data) return null;

  const logoUrl =
    typeof window !== "undefined" ? `${window.location.origin}${LOJA.logo}` : LOJA.logo;
  const html = comprovantePagamentoHtml(data, logoUrl);
  const texto = comprovantePagamentoTexto(data);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) onOpenChange(true);
      }}
    >
      <DialogContent
        stackOnTop
        hideClose
        className="max-w-sm p-0 gap-0 border-0 shadow-none bg-brand-cream"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="p-4 pb-0">
          <DialogHeader>
            <DialogTitle className="text-base">Comprovante de Pagamento</DialogTitle>
          </DialogHeader>
        </div>

        <div className="p-4 flex flex-col items-center gap-3">
          <p className="text-xs text-brand-black/50 text-center w-full">
            Baixe ou envie o comprovante para voltar
          </p>
          <div className="w-full max-w-[280px] border border-brand-black/10 rounded-lg overflow-hidden shadow-sm">
            <ReciboPagamento data={data} />
          </div>

          <ComprovanteActions
            html={html}
            texto={texto}
            nomeArquivo={`comprovante-pagamento-${data.numeroPedido}`}
            telefoneCliente={telefoneCliente}
            onFechar={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReciboPagamento({ data }: { data: ComprovantePagamentoData }) {
  return (
    <div className="bg-white text-black text-[11px] font-mono p-3 leading-snug">
      <div className="text-center border-b border-dashed border-black/20 pb-2 mb-2">
        <div className="flex justify-center mb-1">
          <Image
            src={LOJA.logo}
            alt={LOJA.nomeCompleto}
            width={40}
            height={40}
            className="rounded-full"
          />
        </div>
        <p className="font-serif text-base italic font-semibold">{LOJA.nome}</p>
        <p className="text-[8px] tracking-[0.15em] text-black/60">{LOJA.subtitulo}</p>
      </div>

      <p className="text-center font-bold text-xs mb-2">COMPROVANTE DE PAGAMENTO</p>

      <div className="space-y-0.5 mb-2">
        <Linha label="Data" valor={formatDate(data.dataPagamento)} />
        <Linha label="Pedido" valor={data.numeroPedido} />
        <Linha label="Cliente" valor={data.clienteNome} />
        <Linha label="Parcela" valor={`${data.parcelaNumero}/${data.parcelasTotal}`} />
        {data.obs && <Linha label="Como pagou" valor={data.obs} />}
      </div>

      {data.itens.length > 0 && (
        <div className="mb-2 border-t border-dashed border-black/15 pt-2">
          <p className="text-[9px] uppercase text-black/50 mb-1">Produtos</p>
          <ul className="space-y-0.5">
            {data.itens.map((item, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span className="uppercase font-medium">{formatItemNome(item.descricao)}</span>
                <span className="text-black/60 shrink-0">x{item.quantidade}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-black/5 rounded p-2 space-y-1">
        <Linha label="Pago agora" valor={formatCurrency(data.valorPagoAgora)} />
        <Linha label="Total compra" valor={formatCurrency(data.valorTotalVenda)} />
        <Linha label="Já pago" valor={formatCurrency(data.totalJaPago)} />
        {data.saldoRestante <= 0.001 ? (
          <div className="mt-1.5 rounded-md bg-brand-black text-white text-center py-2 font-bold text-xs">
            COMPRA QUITADA
          </div>
        ) : (
          <div className="mt-1.5 rounded-md bg-brand-red text-white text-center py-2">
            <p className="text-[9px] uppercase opacity-90">Ainda falta pagar</p>
            <p className="text-base font-bold">{formatCurrency(data.saldoRestante)}</p>
            {data.saldoParcela > 0.001 && (
              <p className="text-[9px] mt-1 opacity-90">
                Nesta parcela: {formatCurrency(data.saldoParcela)}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Linha({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-black/55 shrink-0">{label}:</span>
      <span className="text-right font-medium">{valor}</span>
    </div>
  );
}
