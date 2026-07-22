"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { DollarSign, Eye, EyeOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppMessages } from "@/components/ui/app-messages";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { SelecaoParcelaDebito } from "@/components/ui/selecao-botoes";
import {
  apagarTudoCrediarioReceber,
  registrarPagamentoCrediario,
  excluirParcelaCrediario,
} from "@/lib/mutations/financeiro";
import { ComprovantePagamento } from "@/components/financeiro/comprovante-pagamento";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  nomeClienteDaVenda,
  selectParcelasPorStatusComCliente,
} from "@/lib/cliente-venda-nome";
import { cn } from "@/lib/utils";
import { filtrarParcelasPagaveis } from "@/lib/parcelas-utils";
import {
  invalidateAfterFinanceiroChange,
  invalidateAfterVendasChange,
} from "@/lib/queries/page-cache";
import { mutationError } from "@/lib/db/helpers";
import { verificarSenhaLogin } from "@/lib/verificar-senha-login";
import type { ParcelaVenda } from "@/types/database";
import type { ComprovantePagamentoData } from "@/lib/store";

interface ParcelaAberta extends ParcelaVenda {
  saldo_parcela: number;
}

interface CrediarioReceberProps {
  parcelas: ParcelaAberta[];
}

const LIMITE_PARCELAS_PAGINA = 5;

type AmostraReceber = "receber" | "pago";

function mapParcelas(
  rows: Awaited<ReturnType<typeof selectParcelasPorStatusComCliente>>["data"]
): ParcelaAberta[] {
  if (!rows) return [];
  return rows.map((p) => {
    const valorPago = Number(p.valor_pago ?? 0);
    const valorParcela = Number(p.valor_parcela);
    return {
      ...(p as ParcelaVenda),
      valor_pago: valorPago,
      saldo_parcela: Math.max(0, valorParcela - valorPago),
    };
  });
}

export function CrediarioReceber({ parcelas: initialParcelas }: CrediarioReceberProps) {
  const { confirm, toast } = useAppMessages();
  const [parcelas, setParcelas] = useState(initialParcelas);
  const [parcelasPagas, setParcelasPagas] = useState<ParcelaAberta[]>([]);
  const [amostra, setAmostra] = useState<AmostraReceber>("receber");
  const [paginaParcelas, setPaginaParcelas] = useState(1);
  const [showPagamento, setShowPagamento] = useState(false);
  const [showApagarTudo, setShowApagarTudo] = useState(false);
  const [senhaApagar, setSenhaApagar] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erroApagar, setErroApagar] = useState<string | null>(null);
  const [parcelaSelecionadaId, setParcelaSelecionadaId] = useState<string | null>(null);
  const [valorPago, setValorPago] = useState(0);
  const [obs, setObs] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [comprovante, setComprovante] = useState<ComprovantePagamentoData | null>(null);
  const [showComprovante, setShowComprovante] = useState(false);
  const [carregandoPagas, setCarregandoPagas] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setParcelas(initialParcelas);
  }, [initialParcelas]);

  const fetchParcelasPagas = useCallback(async () => {
    setCarregandoPagas(true);
    try {
      const supabase = createClient();
      const { data, error } = await selectParcelasPorStatusComCliente(
        supabase,
        "pago",
        "desc"
      );
      if (error) {
        setParcelasPagas([]);
        return;
      }
      setParcelasPagas(mapParcelas(data));
    } finally {
      setCarregandoPagas(false);
    }
  }, []);

  useEffect(() => {
    void fetchParcelasPagas();
  }, [fetchParcelasPagas]);

  const totalReceber = useMemo(
    () => parcelas.reduce((sum, p) => sum + p.saldo_parcela, 0),
    [parcelas]
  );
  const totalPago = useMemo(
    () => parcelasPagas.reduce((sum, p) => sum + Number(p.valor_pago ?? p.valor_parcela), 0),
    [parcelasPagas]
  );

  const listaAtual = amostra === "receber" ? parcelas : parcelasPagas;
  const parcelasPagaveis = filtrarParcelasPagaveis(parcelas);
  const parcelaSelecionada = parcelasPagaveis.find((p) => p.id === parcelaSelecionadaId) ?? null;

  const totalPaginas = Math.max(
    1,
    Math.ceil(listaAtual.length / LIMITE_PARCELAS_PAGINA)
  );
  const paginaAtual = Math.min(paginaParcelas, totalPaginas);
  const inicioParcelas = (paginaAtual - 1) * LIMITE_PARCELAS_PAGINA;
  const parcelasVisiveis = listaAtual.slice(
    inicioParcelas,
    inicioParcelas + LIMITE_PARCELAS_PAGINA
  );

  useEffect(() => {
    setPaginaParcelas(1);
  }, [amostra]);

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

  function fecharApagarTudo() {
    setShowApagarTudo(false);
    setSenhaApagar("");
    setMostrarSenha(false);
    setErroApagar(null);
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
      const parcelaId = parcelaSelecionada.id;
      const valor = valorPago;

      const result = await registrarPagamentoCrediario({
        parcela_id: parcelaId,
        valor_pago: valor,
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

      setParcelas((prev) =>
        prev
          .map((p) => {
            if (p.id !== parcelaId) return p;
            const novoPago = Number(p.valor_pago ?? 0) + valor;
            const saldo = Number(p.valor_parcela) - novoPago;
            if (saldo <= 0.001) return null;
            return {
              ...p,
              valor_pago: novoPago,
              saldo_parcela: saldo,
            };
          })
          .filter(Boolean) as ParcelaAberta[]
      );

      void fetchParcelasPagas();
      invalidateAfterFinanceiroChange();
      fecharPagamento();
    });
  }

  async function handleExcluirParcela(p: ParcelaAberta) {
    const cliente = nomeClienteDaVenda(p.vendas);
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
      const err = mutationError(result);
      if (err) {
        toast(err, "error");
        return;
      }
      toast(
        "vendaApagada" in result && result.vendaApagada
          ? "Venda excluída e estoque devolvido."
          : "Parcela excluída.",
        "success"
      );
      invalidateAfterFinanceiroChange();
      invalidateAfterVendasChange();
      setParcelas((prev) => prev.filter((item) => item.id !== p.id));
    });
  }

  function confirmarApagarTudo() {
    setErroApagar(null);

    startTransition(async () => {
      const validacao = await verificarSenhaLogin(senhaApagar);
      if (!validacao.ok) {
        setErroApagar(validacao.error);
        return;
      }

      const result = await apagarTudoCrediarioReceber();
      const err = mutationError(result);
      if (err) {
        setErroApagar(err);
        return;
      }

      setParcelas([]);
      setPaginaParcelas(1);
      invalidateAfterFinanceiroChange();
      invalidateAfterVendasChange();
      fecharApagarTudo();
      toast("Tudo a receber foi apagado.", "success");
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
        <CardHeader className="flex flex-col gap-3 py-3 px-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Crediário</CardTitle>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            {amostra === "receber" && parcelas.length > 0 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-10 w-full border-red-200 text-red-700 hover:bg-red-50 sm:w-auto"
                onClick={() => setShowApagarTudo(true)}
                disabled={pending}
              >
                <Trash2 className="h-4 w-4" />
                Apagar tudo
              </Button>
            )}
            {amostra === "receber" && parcelasPagaveis.length > 0 && (
              <Button
                size="sm"
                className="h-10 w-full sm:w-auto"
                onClick={abrirPagamento}
                disabled={pending}
              >
                <DollarSign className="h-4 w-4" />
                Registrar Pagamento
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAmostra("receber")}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-left transition-colors touch-manipulation",
                amostra === "receber"
                  ? "border-brand-red bg-brand-red/10"
                  : "border-brand-black/10 bg-white hover:bg-brand-cream/60"
              )}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-red">
                A receber
              </p>
              <p className="mt-0.5 text-xl font-bold tabular-nums text-brand-red">
                {formatCurrency(totalReceber)}
              </p>
              <p className="text-[10px] text-brand-black/45">
                {parcelas.length === 0
                  ? "Nenhuma"
                  : `${parcelas.length} parcela${parcelas.length > 1 ? "s" : ""}`}
              </p>
            </button>
            <button
              type="button"
              onClick={() => setAmostra("pago")}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-left transition-colors touch-manipulation",
                amostra === "pago"
                  ? "border-green-600 bg-green-50"
                  : "border-brand-black/10 bg-white hover:bg-brand-cream/60"
              )}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-green-700">
                Pago
              </p>
              <p
                className={cn(
                  "mt-0.5 text-xl font-bold tabular-nums text-green-700",
                  carregandoPagas && "animate-pulse"
                )}
              >
                {formatCurrency(totalPago)}
              </p>
              <p className="text-[10px] text-brand-black/45">
                {parcelasPagas.length === 0
                  ? "Nenhuma"
                  : `${parcelasPagas.length} parcela${parcelasPagas.length > 1 ? "s" : ""}`}
              </p>
            </button>
          </div>

          {listaAtual.length === 0 ? (
            <p className="py-6 text-center text-sm text-brand-black/50">
              {amostra === "pago"
                ? "Nenhuma parcela paga ainda."
                : "Nenhuma parcela em aberto. 🎉"}
            </p>
          ) : (
            <>
              <div className="rounded-xl border border-brand-red/15 bg-gradient-to-br from-brand-red/[0.08] via-brand-cream/70 to-brand-cream shadow-sm shadow-brand-red/[0.05] [&>div]:border-0 [&>div]:rounded-none">
                <Table className="bg-transparent text-xs">
                  <TableHeader className="bg-brand-red/[0.06]">
                    <TableRow>
                      <TableHead className="h-8 px-2 py-1 text-[10px]">Cliente</TableHead>
                      <TableHead className="h-8 px-2 py-1 text-[10px]">Parcela</TableHead>
                      <TableHead className="h-8 px-2 py-1 text-[10px]">Vencimento</TableHead>
                      <TableHead className="h-8 px-2 py-1 text-[10px]">Valor</TableHead>
                      <TableHead className="h-8 px-2 py-1 text-[10px]">
                        {amostra === "pago" ? "Pago" : "Já pago"}
                      </TableHead>
                      {amostra === "receber" ? (
                        <>
                          <TableHead className="h-8 px-2 py-1 text-[10px]">Falta</TableHead>
                          <TableHead className="h-8 px-2 py-1 text-right text-[10px]">
                            Ação
                          </TableHead>
                        </>
                      ) : (
                        <TableHead className="h-8 px-2 py-1 text-[10px]">Status</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody className="bg-transparent">
                    {parcelasVisiveis.map((p) => {
                      const podePagar =
                        amostra === "receber" &&
                        parcelasPagaveis.some((pp) => pp.id === p.id);
                      return (
                        <TableRow
                          key={p.id}
                          className="h-11 hover:bg-brand-red/[0.06]"
                        >
                          <TableCell
                            className={cn(
                              "max-w-[100px] truncate px-2 py-2 align-middle",
                              amostra === "receber" && !podePagar && "text-brand-black/50"
                            )}
                          >
                            {nomeClienteDaVenda(p.vendas)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "px-2 py-2 align-middle",
                              amostra === "receber" && !podePagar && "text-brand-black/50"
                            )}
                          >
                            <div className="leading-tight">
                              <span>
                                {p.numero_parcela}/{p.vendas?.parcelas ?? "—"}
                              </span>
                              {amostra === "receber" && (
                                <span
                                  className={cn(
                                    "block text-[9px] text-brand-black/50",
                                    podePagar && "invisible"
                                  )}
                                >
                                  Aguardando anterior
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell
                            className={cn(
                              "px-2 py-2 align-middle",
                              amostra === "receber" && !podePagar && "text-brand-black/50"
                            )}
                          >
                            {formatDate(p.data_vencimento)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "px-2 py-2 align-middle tabular-nums",
                              amostra === "receber" && !podePagar && "text-brand-black/50"
                            )}
                          >
                            {formatCurrency(Number(p.valor_parcela))}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "px-2 py-2 align-middle tabular-nums",
                              amostra === "pago"
                                ? "font-medium text-green-700"
                                : !podePagar && "text-brand-black/50"
                            )}
                          >
                            {formatCurrency(Number(p.valor_pago ?? 0))}
                          </TableCell>
                          {amostra === "receber" ? (
                            <>
                              <TableCell className="px-2 py-2 align-middle font-medium tabular-nums text-brand-red">
                                {formatCurrency(p.saldo_parcela)}
                              </TableCell>
                              <TableCell className="w-10 px-2 py-2 text-right align-middle">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-brand-red touch-manipulation hover:bg-brand-red/10"
                                  onClick={() => handleExcluirParcela(p)}
                                  disabled={pending}
                                  title="Excluir parcela"
                                  aria-label="Excluir parcela"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </>
                          ) : (
                            <TableCell className="px-2 py-2 align-middle">
                              <Badge variant="success" className="px-1.5 py-0 text-[10px]">
                                Paga
                              </Badge>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {listaAtual.length > LIMITE_PARCELAS_PAGINA && (
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
        <DialogContent className="max-w-lg">
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
                labelExtra: nomeClienteDaVenda(p.vendas),
              }))}
              value={parcelaSelecionadaId}
              onChange={setParcelaSelecionadaId}
              formatCurrency={formatCurrency}
            />

            {parcelaSelecionada && (
              <div className="rounded-lg bg-brand-cream/80 p-3 text-sm space-y-1">
                <p>
                  <span className="text-brand-black/60">Cliente:</span>{" "}
                  {nomeClienteDaVenda(parcelaSelecionada.vendas)}
                </p>
                <p>
                  <span className="text-brand-black/60">Saldo da parcela:</span>{" "}
                  <strong className="text-brand-red">
                    {formatCurrency(parcelaSelecionada.saldo_parcela)}
                  </strong>
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="valor_pago">Quanto foi pago?</Label>
              <InputMoeda
                id="valor_pago"
                value={valorPago}
                onChange={setValorPago}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="obs_pag">Observação (opcional)</Label>
              <Textarea
                id="obs_pag"
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                rows={2}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={fecharPagamento}>
                Cancelar
              </Button>
              <Button onClick={confirmarPagamento} disabled={pending}>
                {pending ? "Registrando..." : "Confirmar Pagamento"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showApagarTudo} onOpenChange={(open) => !open && fecharApagarTudo()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Apagar tudo a receber</DialogTitle>
            <DialogDescription>
              Isso apaga todas as vendas com parcelas em aberto e devolve o estoque.
              Não dá para desfazer. Digite a senha de login para confirmar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="senha_apagar_tudo">Senha</Label>
              <div className="relative">
                <Input
                  id="senha_apagar_tudo"
                  type={mostrarSenha ? "text" : "password"}
                  value={senhaApagar}
                  onChange={(e) => setSenhaApagar(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") confirmarApagarTudo();
                  }}
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-black/50"
                  onClick={() => setMostrarSenha((v) => !v)}
                  tabIndex={-1}
                >
                  {mostrarSenha ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {erroApagar && <p className="text-sm text-red-600">{erroApagar}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={fecharApagarTudo}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={confirmarApagarTudo}
                disabled={pending || !senhaApagar.trim()}
              >
                {pending ? "Apagando..." : "Apagar tudo"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
