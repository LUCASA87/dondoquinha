"use client";

import { useEffect, useState, useTransition } from "react";
import { DollarSign, FileDown, Loader2, Search, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getDebitoCliente,
  getRelatorioClienteCompras,
  registrarPagamentoCrediario,
  type FiltroParcelasClientePDF,
} from "@/lib/mutations/financeiro";
import { ComprovantePagamento } from "@/components/financeiro/comprovante-pagamento";
import { ComprovanteVenda } from "@/components/vendas/comprovante-venda";
import { getUltimaVendaComprovante } from "@/lib/mutations/vendas";
import { useAppMessages } from "@/components/ui/app-messages";
import { InputMoeda } from "@/components/ui/input-moeda";
import { WhatsAppButton } from "@/components/ui/whatsapp-button";
import { formatCurrency, formatDate, formatCPF, formatPhone } from "@/lib/format";
import {
  mensagemCobrancaDebito,
  mensagemCobrancaParcela,
  mensagemWhatsAppCliente,
} from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { baixarRelatorioClienteComprasPDF } from "@/lib/relatorio-cliente-compras-pdf";
import { filtrarParcelasPagaveis } from "@/lib/parcelas-utils";
import { mutationError } from "@/lib/db/helpers";
import { SelecaoParcelaDebito } from "@/components/ui/selecao-botoes";
import type { ClienteDebitoResumo, ParcelaDebito } from "@/types/database";
import type { ComprovantePagamentoData } from "@/lib/store";
import type { ComprovanteVendaData } from "@/lib/store";

interface ClienteDebitoPanelProps {
  clienteId: string;
  onAtualizado?: () => void;
  onComprovanteVisivel?: (visivel: boolean) => void;
}

export function ClienteDebitoPanel({
  clienteId,
  onAtualizado,
  onComprovanteVisivel,
}: ClienteDebitoPanelProps) {
  const { toast } = useAppMessages();
  const [resumo, setResumo] = useState<ClienteDebitoResumo | null>(null);
  const [loading, setLoading] = useState(true);
  const [parcelaSelecionada, setParcelaSelecionada] = useState<ParcelaDebito | null>(null);
  const [parcelaSelecionadaId, setParcelaSelecionadaId] = useState<string | null>(null);
  const [valorPago, setValorPago] = useState(0);
  const [obs, setObs] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [comprovante, setComprovante] = useState<ComprovantePagamentoData | null>(null);
  const [showComprovante, setShowComprovante] = useState(false);
  const [comprovanteVenda, setComprovanteVenda] = useState<ComprovanteVendaData | null>(null);
  const [showComprovanteVenda, setShowComprovanteVenda] = useState(false);
  const [carregandoUltimaCompra, setCarregandoUltimaCompra] = useState(false);
  const [showPagamento, setShowPagamento] = useState(false);
  const [filtroPdfCliente, setFiltroPdfCliente] = useState<FiltroParcelasClientePDF>("abertas");
  const [gerandoPdfCliente, setGerandoPdfCliente] = useState(false);
  const [pending, startTransition] = useTransition();

  async function carregar() {
    setLoading(true);
    const data = await getDebitoCliente(clienteId);
    setResumo(data);
    setLoading(false);
  }

  useEffect(() => {
    carregar();
  }, [clienteId]);

  useEffect(() => {
    onComprovanteVisivel?.(showComprovante || showComprovanteVenda);
  }, [showComprovante, showComprovanteVenda, onComprovanteVisivel]);

  function abrirPagamento() {
    setParcelaSelecionada(null);
    setParcelaSelecionadaId(null);
    setValorPago(0);
    setObs("");
    setError(null);
    setShowPagamento(true);
  }

  function selecionarParcela(id: string) {
    const todas = resumo?.vendas.flatMap((v) => v.parcelas) ?? [];
    const parcela = todas.find((p) => p.id === id) ?? null;
    setParcelaSelecionadaId(id);
    setParcelaSelecionada(parcela);
  }

  function fecharPagamento() {
    setShowPagamento(false);
    setParcelaSelecionada(null);
    setParcelaSelecionadaId(null);
    setValorPago(0);
    setObs("");
    setError(null);
  }

  async function abrirUltimaCompra() {
    setCarregandoUltimaCompra(true);
    try {
      const result = await getUltimaVendaComprovante(clienteId);
      if ("error" in result) {
        toast(result.error, "error");
        return;
      }
      setComprovanteVenda(result.comprovante);
      setShowComprovanteVenda(true);
    } finally {
      setCarregandoUltimaCompra(false);
    }
  }

  async function gerarPdfComprasCliente() {
    setGerandoPdfCliente(true);
    try {
      const result = await getRelatorioClienteCompras(clienteId, filtroPdfCliente);
      if ("error" in result) {
        toast(result.error, "error");
        return;
      }
      if (result.vendas.length === 0) {
        toast(
          filtroPdfCliente === "pagas"
            ? "Nenhuma parcela paga para esta cliente."
            : "Nenhuma parcela em aberto para esta cliente.",
          "info"
        );
        return;
      }
      await baixarRelatorioClienteComprasPDF(result);
      toast("PDF das compras baixado.", "success");
    } catch {
      toast("Não foi possível gerar o PDF.", "error");
    } finally {
      setGerandoPdfCliente(false);
    }
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

      const err = mutationError(result);
      if (err) {
        setError(err);
        return;
      }

      if ("comprovante" in result && result.comprovante) {
        setComprovante(result.comprovante);
        setShowComprovante(true);
      }

      setParcelaSelecionada(null);
      setParcelaSelecionadaId(null);
      fecharPagamento();
      await carregar();
      onAtualizado?.();
    });
  }

  if (loading) {
    return <p className="text-brand-black/50 py-6 text-center">Carregando...</p>;
  }

  if (!resumo) {
    return <p className="text-red-600 py-6 text-center">Cliente não encontrada.</p>;
  }

  const todasParcelas = resumo.vendas.flatMap((v) => v.parcelas);
  const parcelasPagaveis = filtrarParcelasPagaveis(todasParcelas);

  return (
    <>
      <ComprovantePagamento
        open={showComprovante}
        onOpenChange={setShowComprovante}
        data={comprovante}
        telefoneCliente={resumo.cliente.telefone}
      />

      <ComprovanteVenda
        open={showComprovanteVenda}
        onOpenChange={setShowComprovanteVenda}
        data={comprovanteVenda}
        telefoneCliente={resumo.cliente.telefone}
      />

      {!(showComprovante || showComprovanteVenda) && (
      <div className="min-w-0 space-y-4">
        <div className="min-w-0 rounded-xl bg-brand-cream/50 p-3 sm:p-4">
          <div className="min-w-0 space-y-3">
            <div className="min-w-0">
              <h3 className="break-words font-semibold text-base leading-snug text-brand-black sm:text-lg">
                {resumo.cliente.nome}
              </h3>
              <div className="mt-1 space-y-0.5 text-sm text-brand-black/60">
                <p>CPF: {formatCPF(resumo.cliente.cpf)}</p>
                {resumo.cliente.telefone && (
                  <p>Tel: {formatPhone(resumo.cliente.telefone)}</p>
                )}
              </div>
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-11 w-full justify-center touch-manipulation"
                onClick={abrirUltimaCompra}
                disabled={carregandoUltimaCompra}
              >
                <Receipt className="h-4 w-4 shrink-0" />
                {carregandoUltimaCompra ? "Carregando..." : "Enviar última compra"}
              </Button>
              <div
                className={cn(
                  "grid min-w-0 gap-2",
                  resumo.totalDevido > 0 ? "grid-cols-2" : "grid-cols-1"
                )}
              >
                <WhatsAppButton
                  telefone={resumo.cliente.telefone}
                  mensagem={mensagemWhatsAppCliente(resumo.cliente.nome)}
                  label="WhatsApp"
                  size="sm"
                  className="h-11 w-full justify-center touch-manipulation"
                />
                {resumo.totalDevido > 0 && (
                  <WhatsAppButton
                    telefone={resumo.cliente.telefone}
                    mensagem={(() => {
                      const parcela = parcelasPagaveis[0];
                      const vendaParcela = parcela
                        ? resumo.vendas.find((v) =>
                            v.parcelas.some((p) => p.id === parcela.id)
                          )
                        : undefined;

                      if (parcela && vendaParcela) {
                        return mensagemCobrancaParcela({
                          clienteNome: resumo.cliente.nome,
                          valor: parcela.saldo_parcela,
                          dataVencimento: parcela.data_vencimento,
                          numeroParcela: parcela.numero_parcela,
                          parcelasTotal: vendaParcela.parcelasTotal,
                          numeroPedido: vendaParcela.numeroPedido,
                          produtos: vendaParcela.produtos,
                        });
                      }

                      return mensagemCobrancaDebito({
                        clienteNome: resumo.cliente.nome,
                        totalDevido: resumo.totalDevido,
                        produtos: [...new Set(resumo.vendas.flatMap((v) => v.produtos))],
                      });
                    })()}
                    label="Cobrar"
                    size="sm"
                    className="h-11 w-full justify-center touch-manipulation"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        <Card className="min-w-0 border-brand-red/15 bg-brand-cream/30">
          <CardContent className="space-y-3 pt-4 pb-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-red">
              PDF das compras desta cliente
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFiltroPdfCliente("pagas")}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm font-medium transition-colors touch-manipulation",
                  filtroPdfCliente === "pagas"
                    ? "bg-brand-red text-white"
                    : "border border-brand-black/15 bg-white text-brand-black/70"
                )}
              >
                Parcelas pagas
              </button>
              <button
                type="button"
                onClick={() => setFiltroPdfCliente("abertas")}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm font-medium transition-colors touch-manipulation",
                  filtroPdfCliente === "abertas"
                    ? "bg-brand-red text-white"
                    : "border border-brand-black/15 bg-white text-brand-black/70"
                )}
              >
                Em aberto
              </button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-11 w-full touch-manipulation"
              disabled={gerandoPdfCliente}
              onClick={gerarPdfComprasCliente}
            >
              {gerandoPdfCliente ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              Gerar PDF
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-3">
          <Card className="min-w-0">
            <CardContent className="pt-4">
              <p className="text-xs text-brand-black/60">Total em compras</p>
              <p className="text-xl font-bold break-all">{formatCurrency(resumo.totalCompras)}</p>
            </CardContent>
          </Card>
          <Card className="min-w-0">
            <CardContent className="pt-4">
              <p className="text-xs text-brand-black/60">Já pagou</p>
              <p className="text-xl font-bold break-all text-green-700">
                {formatCurrency(resumo.totalPago)}
              </p>
            </CardContent>
          </Card>
          <Card className="min-w-0 border-brand-red/30 bg-brand-red/5">
            <CardContent className="pt-4">
              <p className="text-xs text-brand-black/60">Ainda deve</p>
              <p className="text-2xl font-bold break-all text-brand-red">
                {formatCurrency(resumo.totalDevido)}
              </p>
            </CardContent>
          </Card>
        </div>

        {resumo.totalDevido <= 0 ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center text-green-700">
            Esta cliente não possui débitos em aberto. 🎉
          </div>
        ) : (
          <div className="min-w-0 space-y-4">
            <Button
              onClick={abrirPagamento}
              disabled={pending}
              size="lg"
              className="h-12 w-full touch-manipulation"
            >
              <DollarSign className="h-5 w-5" />
              Registrar Pagamento
            </Button>

            {resumo.vendas.map((venda) => (
              <Card key={venda.id} className="min-w-0 overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    <CardTitle className="break-words text-base">
                      Pedido {venda.numeroPedido} — {formatDate(venda.data_venda)}
                    </CardTitle>
                    <Badge variant="warning" className="w-fit shrink-0">
                      Falta {formatCurrency(venda.saldoRestante)}
                    </Badge>
                  </div>
                  {venda.obs && (
                    <p className="mt-1 break-words text-sm text-brand-black/60">Obs: {venda.obs}</p>
                  )}
                  {venda.produtos.length > 0 && (
                    <p className="mt-1 break-words text-xs uppercase text-brand-black/60">
                      Produtos: {venda.produtos.join(", ")}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="min-w-0 px-3 sm:px-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Parcela</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Falta</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {venda.parcelas.map((p) => {
                        const podePagar = parcelasPagaveis.some((pp) => pp.id === p.id);
                        return (
                          <TableRow key={p.id} className={!podePagar ? "opacity-50" : undefined}>
                            <TableCell>
                              {p.numero_parcela}/{venda.parcelasTotal}
                              {!podePagar && (
                                <span className="block text-[10px] text-brand-black/50">
                                  Aguardando parcela anterior
                                </span>
                              )}
                            </TableCell>
                            <TableCell>{formatDate(p.data_vencimento)}</TableCell>
                            <TableCell>{formatCurrency(Number(p.valor_parcela))}</TableCell>
                            <TableCell className="font-medium text-brand-red">
                              {formatCurrency(p.saldo_parcela)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      )}

      <Dialog open={showPagamento} onOpenChange={(open) => !open && fecharPagamento()}>
        <DialogContent>
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
                labelExtra: formatDate(p.data_vencimento),
              }))}
              value={parcelaSelecionadaId}
              onChange={selecionarParcela}
              formatCurrency={formatCurrency}
            />

            {parcelaSelecionada && (
              <>
                <div className="rounded-xl bg-brand-cream/50 p-4 text-sm space-y-1">
                  <p>
                    <strong>Falta nesta parcela:</strong>{" "}
                    {formatCurrency(parcelaSelecionada.saldo_parcela)}
                  </p>
                  <p className="text-brand-black/60 text-xs">
                    Se pagar mais, o excedente abate as próximas parcelas automaticamente.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valor_pago_panel">Quanto foi pago?</Label>
                  <InputMoeda
                    id="valor_pago_panel"
                    value={valorPago}
                    onChange={setValorPago}
                    placeholder="R$0,01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="obs_panel">Como pagou?</Label>
                  <Textarea
                    id="obs_panel"
                    value={obs}
                    onChange={(e) => setObs(e.target.value)}
                    placeholder="Ex: Pix, dinheiro..."
                    rows={2}
                  />
                </div>
              </>
            )}

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

interface ConsultaClienteDebitoProps {
  clientesIniciais?: { id: string; nome: string; cpf: string; totalDevido: number }[];
}

export function ConsultaClienteDebito({ clientesIniciais = [] }: ConsultaClienteDebitoProps) {
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState(clientesIniciais);
  const [clienteSelecionado, setClienteSelecionado] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function buscar() {
    startTransition(async () => {
      const { buscarClientesComSaldo } = await import("@/app/actions/financeiro");
      const data = await buscarClientesComSaldo(termo);
      setResultados(data);
      setClienteSelecionado(null);
    });
  }

  useEffect(() => {
    if (clientesIniciais.length > 0 && resultados.length === 0) {
      setResultados(clientesIniciais);
    }
  }, [clientesIniciais, resultados.length]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-brand-red" />
            Pesquisar Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              placeholder="Digite o nome da cliente..."
              onKeyDown={(e) => e.key === "Enter" && buscar()}
            />
            <Button onClick={buscar} disabled={pending}>
              {pending ? "Buscando..." : "Buscar"}
            </Button>
          </div>

          {resultados.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {resultados.map((c) => {
                const selecionado = clienteSelecionado === c.id;
                return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setClienteSelecionado(c.id)}
                  className={cn(
                    "flex items-center justify-between rounded-xl border p-4 text-left transition-colors",
                    selecionado
                      ? "border-brand-red bg-brand-red text-white shadow-sm"
                      : "border-brand-black/10 bg-white hover:bg-brand-cream/50"
                  )}
                >
                  <div>
                    <p className={cn("font-medium", selecionado ? "text-white" : "text-brand-black")}>
                      {c.nome}
                    </p>
                    <p className={cn("text-xs", selecionado ? "text-white/80" : "text-brand-black/50")}>
                      {formatCPF(c.cpf)}
                    </p>
                  </div>
                  {c.totalDevido > 0 ? (
                    <Badge
                      variant={selecionado ? "secondary" : "warning"}
                      className={selecionado ? "bg-white/20 text-white border-0" : ""}
                    >
                      {formatCurrency(c.totalDevido)}
                    </Badge>
                  ) : (
                    <Badge
                      variant={selecionado ? "secondary" : "success"}
                      className={selecionado ? "bg-white/20 text-white border-0" : ""}
                    >
                      Em dia
                    </Badge>
                  )}
                </button>
              );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {clienteSelecionado && (
        <Card>
          <CardHeader>
            <CardTitle>O que esta cliente deve</CardTitle>
          </CardHeader>
          <CardContent>
            <ClienteDebitoPanel clienteId={clienteSelecionado} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
