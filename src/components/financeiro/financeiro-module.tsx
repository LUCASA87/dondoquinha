"use client";

import { useEffect, useState, useTransition } from "react";
import { FileDown, Loader2, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListaPaginacao } from "@/components/ui/lista-paginacao";
import { useAppMessages } from "@/components/ui/app-messages";
import {
  createContaAPagar,
  darBaixaConta,
  getContasPagasRelatorio,
  type PeriodoRelatorioContas,
} from "@/lib/mutations/financeiro";
import { CrediarioReceber } from "@/components/financeiro/crediario-receber";
import { RelatorioCrediarioRecebido } from "@/components/financeiro/relatorio-crediario-recebido";
import { ConsultaClienteDebito } from "@/components/financeiro/consulta-cliente-debito";
import { SelecaoBotoes, OPCOES_PARCELAS } from "@/components/ui/selecao-botoes";
import { InputMoeda } from "@/components/ui/input-moeda";
import { baixarRelatorioContasPDF } from "@/lib/relatorio-contas-pagar-pdf";
import { formatCurrency, formatDate, formatMesAno } from "@/lib/format";
import { invalidateAfterFinanceiroChange } from "@/lib/queries/page-cache";
import { mutationError } from "@/lib/db/helpers";
import type { ParcelaVenda, ContaAPagar } from "@/types/database";

const LIMITE_CONTAS_PAGINA = 5;

const RELATORIOS_PAGAR: { id: PeriodoRelatorioContas; label: string }[] = [
  { id: "mes", label: "Pago do mês" },
  { id: "3meses", label: "Últimos 3 meses" },
  { id: "90dias", label: "90 dias" },
];

interface FinanceiroModuleProps {
  parcelas: (ParcelaVenda & { saldo_parcela: number })[];
  contas: ContaAPagar[];
  totalAPagarMes: number;
}

export function FinanceiroModule({
  parcelas,
  contas: initialContas,
  totalAPagarMes,
}: FinanceiroModuleProps) {
  const { toast } = useAppMessages();
  const [contas, setContas] = useState(initialContas);
  const [dialogContaAberto, setDialogContaAberto] = useState(false);
  const [paginaContas, setPaginaContas] = useState(1);
  const [gerandoRelatorio, setGerandoRelatorio] = useState<PeriodoRelatorioContas | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setContas(initialContas);
  }, [initialContas]);

  const totalPaginas = Math.max(1, Math.ceil(contas.length / LIMITE_CONTAS_PAGINA));
  const paginaAtual = Math.min(paginaContas, totalPaginas);
  const inicio = (paginaAtual - 1) * LIMITE_CONTAS_PAGINA;
  const contasVisiveis = contas.slice(inicio, inicio + LIMITE_CONTAS_PAGINA);

  useEffect(() => {
    if (paginaContas > totalPaginas) {
      setPaginaContas(totalPaginas);
    }
  }, [paginaContas, totalPaginas]);

  function handleBaixaConta(id: string) {
    startTransition(async () => {
      const result = await darBaixaConta(id);
      const err = mutationError(result);
      if (err) {
        toast(err, "error");
        return;
      }
      setContas((prev) => prev.filter((c) => c.id !== id));
      invalidateAfterFinanceiroChange();
      toast("Conta paga. Saiu da lista.", "success");
    });
  }

  async function gerarRelatorioPDF(periodo: PeriodoRelatorioContas) {
    setGerandoRelatorio(periodo);
    try {
      const result = await getContasPagasRelatorio(periodo);
      if ("error" in result) {
        toast(result.error, "error");
        return;
      }
      if (result.contas.length === 0) {
        toast("Nenhuma conta paga neste período.", "info");
        return;
      }
      await baixarRelatorioContasPDF(result);
      toast("PDF do relatório baixado.", "success");
    } catch {
      toast("Não foi possível gerar o PDF.", "error");
    } finally {
      setGerandoRelatorio(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Financeiro"
        description="Controle o que você tem a receber e a pagar."
      />

      <Tabs defaultValue="receber">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="receber">A Receber</TabsTrigger>
          <TabsTrigger value="pagar">A Pagar</TabsTrigger>
        </TabsList>

        <TabsContent value="receber" className="space-y-4">
          <RelatorioCrediarioRecebido />
          <ConsultaClienteDebito />
          <CrediarioReceber parcelas={parcelas} />
        </TabsContent>

        <TabsContent value="pagar">
          <div className="space-y-4">
            <Card className="bg-brand-red/5 border-brand-red/20">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-brand-black/60">
                  Total a pagar em {formatMesAno()}
                </p>
                <p className="text-2xl font-bold text-brand-red mt-0.5">
                  {formatCurrency(totalAPagarMes)}
                </p>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-red">
                  Relatório PDF
                </p>
                <div className="flex flex-wrap gap-2">
                  {RELATORIOS_PAGAR.map((rel) => (
                    <Button
                      key={rel.id}
                      type="button"
                      size="sm"
                      variant="outline"
                      className="touch-manipulation"
                      disabled={gerandoRelatorio !== null}
                      onClick={() => gerarRelatorioPDF(rel.id)}
                    >
                      {gerandoRelatorio === rel.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileDown className="h-4 w-4" />
                      )}
                      {rel.label}
                    </Button>
                  ))}
                </div>
                <p className="text-[10px] text-brand-black/45">
                  Contas pagas ficam só no banco. O app mostra só as pendentes.
                </p>
              </div>

              <Dialog open={dialogContaAberto} onOpenChange={setDialogContaAberto}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4" />
                    Cadastrar Conta
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Cadastrar Conta a Pagar</DialogTitle>
                  </DialogHeader>
                  <ContaForm
                    onSucesso={(novasContas) => {
                      setDialogContaAberto(false);
                      if (novasContas.length > 0) {
                        setContas((prev) =>
                          [...prev, ...novasContas].sort((a, b) =>
                            a.data_vencimento.localeCompare(b.data_vencimento)
                          )
                        );
                      }
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>

            <div className="rounded-xl border border-brand-red/15 bg-gradient-to-br from-brand-red/[0.08] via-brand-cream/70 to-brand-cream shadow-sm shadow-brand-red/[0.05] [&>div]:border-0 [&>div]:rounded-none">
              <Table className="text-xs bg-transparent">
                <TableHeader className="bg-brand-red/[0.06]">
                  <TableRow>
                    <TableHead className="h-8 px-2 py-1 text-[10px]">Descrição</TableHead>
                    <TableHead className="h-8 px-2 py-1 text-[10px]">Parcela</TableHead>
                    <TableHead className="h-8 px-2 py-1 text-[10px]">Vencimento</TableHead>
                    <TableHead className="h-8 px-2 py-1 text-[10px]">Valor</TableHead>
                    <TableHead className="h-8 px-2 py-1 text-[10px]">Status</TableHead>
                    <TableHead className="h-8 px-2 py-1 text-[10px] text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="bg-transparent">
                  {contas.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="px-2 py-6 text-center text-brand-black/50"
                      >
                        Nenhuma conta pendente.
                      </TableCell>
                    </TableRow>
                  ) : (
                    contasVisiveis.map((c) => (
                      <TableRow key={c.id} className="h-11 hover:bg-brand-red/[0.06]">
                        <TableCell className="px-2 py-2 align-middle font-medium">
                          {c.descricao}
                        </TableCell>
                        <TableCell className="px-2 py-2 align-middle">
                          {(c.parcelas_totais ?? 1) > 1
                            ? `${c.parcela_atual ?? 1}/${c.parcelas_totais}`
                            : "—"}
                        </TableCell>
                        <TableCell className="px-2 py-2 align-middle">
                          {formatDate(c.data_vencimento)}
                        </TableCell>
                        <TableCell className="px-2 py-2 align-middle tabular-nums">
                          {formatCurrency(Number(c.valor))}
                        </TableCell>
                        <TableCell className="px-2 py-2 align-middle">
                          <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                            Pendente
                          </Badge>
                        </TableCell>
                        <TableCell className="px-2 py-2 align-middle text-right">
                          <Button
                            size="sm"
                            className="h-8 text-xs px-2 touch-manipulation"
                            onClick={() => handleBaixaConta(c.id)}
                            disabled={pending}
                          >
                            Dar Baixa
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {contas.length > LIMITE_CONTAS_PAGINA && (
              <ListaPaginacao
                paginaAtual={paginaAtual}
                totalPaginas={totalPaginas}
                onSelecionarPagina={setPaginaContas}
                onProximaPagina={() => setPaginaContas((p) => Math.min(p + 1, totalPaginas))}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ContaForm({
  onSucesso,
}: {
  onSucesso: (contas: ContaAPagar[]) => void;
}) {
  const [parcelas, setParcelas] = useState(1);
  const [valor, setValor] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (valor <= 0) {
      setError("Informe um valor maior que zero.");
      return;
    }

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("valor", String(valor));
    formData.set("parcelas", String(parcelas));

    startTransition(async () => {
      const result = await createContaAPagar(formData);
      const err = mutationError(result);
      if (err) {
        setError(err);
        return;
      }
      form.reset();
      setValor(0);
      setParcelas(1);
      setError(null);
      onSucesso("contas" in result ? result.contas ?? [] : []);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="descricao">O que você deve? (fornecedor, boleto, etc.)</Label>
        <Input id="descricao" name="descricao" required placeholder="Ex: Fornecedor X, aluguel..." />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="valor">Valor total</Label>
          <InputMoeda id="valor" value={valor} onChange={setValor} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="data_vencimento">1º vencimento</Label>
          <Input id="data_vencimento" name="data_vencimento" type="date" required />
        </div>
      </div>
      <SelecaoBotoes
        label="Número de vezes"
        opcoes={OPCOES_PARCELAS}
        value={parcelas}
        onChange={setParcelas}
      />
      {parcelas > 1 && (
        <p className="text-xs text-brand-black/60">
          Serão criadas {parcelas} parcelas, uma a cada 30 dias, com o valor dividido igualmente.
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Salvando..." : parcelas > 1 ? `Cadastrar ${parcelas} parcelas` : "Cadastrar"}
      </Button>
    </form>
  );
}
