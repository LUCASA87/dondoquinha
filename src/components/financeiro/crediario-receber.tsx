"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DollarSign, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppMessages } from "@/components/ui/app-messages";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { InputMoeda } from "@/components/ui/input-moeda";
import { ListaPaginacao } from "@/components/ui/lista-paginacao";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SelecaoParcelaDebito } from "@/components/ui/selecao-botoes";
import { registrarPagamentoCrediario, excluirParcelaCrediario } from "@/app/actions/financeiro";
import { ComprovantePagamento } from "@/components/financeiro/comprovante-pagamento";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { filtrarParcelasPagaveis } from "@/lib/parcelas-utils";
import type { ParcelaVenda } from "@/types/database";
import type { ComprovantePagamentoData } from "@/lib/store";

interface ParcelaAberta extends ParcelaVenda {
  saldo_parcela: number;
}

interface CrediarioReceberProps {
  parcelas: ParcelaAberta[];
}

const LIMITE_PARCELAS_PAGINA = 5;

export function CrediarioReceber({ parcelas: initialParcelas }: CrediarioReceberProps) {
  const router = useRouter();
  const { confirm, toast } = useAppMessages();
  const [paginaParcelas, setPaginaParcelas] = useState(1);
  const [showPagamento, setShowPagamento] = useState(false);
  const [parcelaSelecionadaId, setParcelaSelecionadaId] = useState<string | null>(null);
  const [valorPago, setValorPago] = useState(0);
  const [obs, setObs] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [comprovante, setComprovante] = useState<ComprovantePagamentoData | null>(null);
  const [showComprovante, setShowComprovante] = useState(false);
  const [pending, startTransition] = useTransition();

  const parcelasPagaveis = filtrarParcelasPagaveis(initialParcelas);
  const parcelaSelecionada = parcelasPagaveis.find((p) => p.id === parcelaSelecionadaId) ?? null;

  const totalPaginas = Math.max(
    1,
    Math.ceil(initialParcelas.length / LIMITE_PARCELAS_PAGINA)
  );
  const paginaAtual = Math.min(paginaParcelas, totalPaginas);
  const inicioParcelas = (paginaAtual - 1) * LIMITE_PARCELAS_PAGINA;
  const parcelasVisiveis = initialParcelas.slice(
    inicioParcelas,
    inicioParcelas + LIMITE_PARCELAS_PAGINA
  );

  useEffect(() => {
    if (paginaParcelas > totalPaginas) {
      setPaginaParcelas(totalPaginas);
    }
  }, [paginaParcelas, totalPaginas]);

  function abrirPagamento() {
    setParcelaSelecionadaId(null);
    setValorPago(0);
    setObs("");
    setError(null);
    setShowPagamento(true);
  }

  function fecharPagamento() {
    setShowPagamento(false);
    setParcelaSelecionadaId(null);
    setValorPago(0);
    setObs("");
    setError(null);
  }

  function confirmarPagamento() {
    if (!parcelaSelecionada) {
      setError("Selecione a parcela.");
      return;
    }

    if (valorPago < 0.01) {
      setError("Informe o valor pago (mínimo R$0,01).");
      return;
    }

    startTransition(async () => {
      const result = await registrarPagamentoCrediario({
        parcela_id: parcelaSelecionada.id,
        valor_pago: valorPago,
        obs: obs.trim() || undefined,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.comprovante) {
        setComprovante(result.comprovante);
        setShowComprovante(true);
      }

      fecharPagamento();
      router.refresh();
    });
  }

  async function handleExcluirParcela(p: ParcelaAberta) {
    const cliente = p.vendas?.clientes?.nome ?? "cliente";
    const parcelaLabel = `${p.numero_parcela}/${p.vendas?.parcelas ?? "?"}`;

    const ok = await confirm({
      title: "Excluir parcela",
      message: `Excluir a parcela ${parcelaLabel} de ${cliente} (${formatCurrency(p.saldo_parcela)} em aberto)? Esta ação não pode ser desfeita.`,
      confirmLabel: "Excluir",
      variant: "danger",
    });
    if (!ok) return;

    startTransition(async () => {
      const result = await excluirParcelaCrediario(p.id);
      if (result.error) {
        toast(result.error, "error");
        return;
      }
      toast("Parcela excluída.", "success");
      router.refresh();
    });
  }

  return (
    <>
      <ComprovantePagamento
        open={showComprovante}
        onOpenChange={setShowComprovante}
        data={comprovante}
      />

      {!showComprovante && (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 py-3 px-4">
          <CardTitle className="text-base">Crediário — A Receber</CardTitle>
          {parcelasPagaveis.length > 0 && (
            <Button size="sm" onClick={abrirPagamento} disabled={pending}>
              <DollarSign className="h-4 w-4" />
              Registrar Pagamento
            </Button>
          )}
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {initialParcelas.length === 0 ? (
            <p className="text-brand-black/50 py-6 text-center text-sm">
              Nenhuma parcela em aberto. 🎉
            </p>
          ) : (
            <>
              <div className="rounded-xl border border-brand-red/15 bg-gradient-to-br from-brand-red/[0.08] via-brand-cream/70 to-brand-cream shadow-sm shadow-brand-red/[0.05] [&>div]:border-0 [&>div]:rounded-none">
                <Table className="text-xs bg-transparent">
                  <TableHeader className="bg-brand-red/[0.06]">
                    <TableRow>
                      <TableHead className="h-8 px-2 py-1 text-[10px]">Cliente</TableHead>
                      <TableHead className="h-8 px-2 py-1 text-[10px]">Parcela</TableHead>
                      <TableHead className="h-8 px-2 py-1 text-[10px]">Vencimento</TableHead>
                      <TableHead className="h-8 px-2 py-1 text-[10px]">Valor</TableHead>
                      <TableHead className="h-8 px-2 py-1 text-[10px]">Já pago</TableHead>
                      <TableHead className="h-8 px-2 py-1 text-[10px]">Falta</TableHead>
                      <TableHead className="h-8 px-2 py-1 text-[10px] text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="bg-transparent">
                    {parcelasVisiveis.map((p) => {
                      const podePagar = parcelasPagaveis.some((pp) => pp.id === p.id);
                      return (
                        <TableRow
                          key={p.id}
                          className="h-11 hover:bg-brand-red/[0.06]"
                        >
                          <TableCell
                            className={cn(
                              "px-2 py-2 align-middle max-w-[100px] truncate",
                              !podePagar && "text-brand-black/50"
                            )}
                          >
                            {p.vendas?.clientes?.nome ?? "—"}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "px-2 py-2 align-middle",
                              !podePagar && "text-brand-black/50"
                            )}
                          >
                            <div className="leading-tight">
                              <span>
                                {p.numero_parcela}/{p.vendas?.parcelas ?? "—"}
                              </span>
                              <span
                                className={cn(
                                  "block text-[9px] text-brand-black/50",
                                  podePagar && "invisible"
                                )}
                              >
                                Aguardando anterior
                              </span>
                            </div>
                          </TableCell>
                          <TableCell
                            className={cn(
                              "px-2 py-2 align-middle",
                              !podePagar && "text-brand-black/50"
                            )}
                          >
                            {formatDate(p.data_vencimento)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "px-2 py-2 align-middle tabular-nums",
                              !podePagar && "text-brand-black/50"
                            )}
                          >
                            {formatCurrency(Number(p.valor_parcela))}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "px-2 py-2 align-middle tabular-nums",
                              !podePagar && "text-brand-black/50"
                            )}
                          >
                            {formatCurrency(Number(p.valor_pago ?? 0))}
                          </TableCell>
                          <TableCell className="px-2 py-2 align-middle font-medium text-brand-red tabular-nums">
                            {formatCurrency(p.saldo_parcela)}
                          </TableCell>
                          <TableCell className="px-2 py-2 align-middle text-right w-10">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-brand-red hover:bg-brand-red/10 touch-manipulation"
                              onClick={() => handleExcluirParcela(p)}
                              disabled={pending}
                              title="Excluir parcela"
                              aria-label="Excluir parcela"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {initialParcelas.length > LIMITE_PARCELAS_PAGINA && (
                <ListaPaginacao
                  paginaAtual={paginaAtual}
                  totalPaginas={totalPaginas}
                  onSelecionarPagina={setPaginaParcelas}
                  onProximaPagina={() =>
                    setPaginaParcelas((p) => Math.min(p + 1, totalPaginas))
                  }
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
      )}

      <Dialog open={showPagamento} onOpenChange={(open) => !open && fecharPagamento()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <SelecaoParcelaDebito
              label="Próxima parcela a pagar"
              parcelas={parcelasPagaveis.map((p) => ({
                id: p.id,
                numero: p.numero_parcela,
                saldo: p.saldo_parcela,
                labelExtra: p.vendas?.clientes?.nome ?? "",
              }))}
              value={parcelaSelecionadaId}
              onChange={setParcelaSelecionadaId}
              formatCurrency={formatCurrency}
            />

            {parcelaSelecionada && (
              <div className="rounded-xl bg-brand-cream/50 p-4 text-sm space-y-1">
                <p>
                  <strong>Cliente:</strong> {parcelaSelecionada.vendas?.clientes?.nome}
                </p>
                <p>
                  <strong>Vencimento:</strong> {formatDate(parcelaSelecionada.data_vencimento)}
                </p>
                <p>
                  <strong>Falta nesta parcela:</strong>{" "}
                  {formatCurrency(parcelaSelecionada.saldo_parcela)}
                </p>
                <p className="text-brand-black/60 text-xs pt-1">
                  Se pagar mais, o excedente abate as próximas parcelas automaticamente.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="valor_pago">Quanto foi pago?</Label>
              <InputMoeda
                id="valor_pago"
                value={valorPago}
                onChange={setValorPago}
                placeholder="R$0,01"
                disabled={!parcelaSelecionada}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="obs">Como pagou? (observação)</Label>
              <Textarea
                id="obs"
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                placeholder="Ex: Pix, dinheiro..."
                rows={3}
                disabled={!parcelaSelecionada}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button
              onClick={confirmarPagamento}
              disabled={pending || !parcelaSelecionada}
              className="w-full"
            >
              {pending ? "Salvando..." : "Confirmar e Gerar Comprovante"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
