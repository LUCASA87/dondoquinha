"use client";

import { useState, useTransition } from "react";
import { CheckCircle, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  darBaixaParcela,
  getParcelasPendentes,
  createContaAPagar,
  darBaixaConta,
  createCartao,
  createFaturaCartao,
  darBaixaFatura,
} from "@/app/actions/financeiro";
import {
  formatCurrency,
  formatDate,
  PAGAMENTO_LABELS,
  FORMAS_PAGAMENTO,
} from "@/lib/format";
import type {
  ParcelaVenda,
  ContaAPagar,
  CartaoCredito,
  FaturaCartao,
} from "@/types/database";

interface FinanceiroModuleProps {
  parcelas: ParcelaVenda[];
  contas: ContaAPagar[];
  totalBoletosMes: number;
  cartoes: CartaoCredito[];
  faturas: FaturaCartao[];
  resumoCartoes: {
    cartao: CartaoCredito;
    total: number;
    diaVencimento: number;
  }[];
}

export function FinanceiroModule({
  parcelas: initialParcelas,
  contas: initialContas,
  totalBoletosMes,
  cartoes: initialCartoes,
  faturas: initialFaturas,
  resumoCartoes,
}: FinanceiroModuleProps) {
  const [filtroPagamento, setFiltroPagamento] = useState("todos");
  const [parcelas, setParcelas] = useState(initialParcelas);
  const [contas, setContas] = useState(initialContas);
  const [faturas, setFaturas] = useState(initialFaturas);
  const [pending, startTransition] = useTransition();

  function handleFiltroChange(value: string) {
    setFiltroPagamento(value);
    startTransition(async () => {
      const data = await getParcelasPendentes(value === "todos" ? undefined : value);
      setParcelas(data as ParcelaVenda[]);
    });
  }

  function handleBaixaParcela(id: string) {
    startTransition(async () => {
      await darBaixaParcela(id);
      setParcelas((prev) => prev.filter((p) => p.id !== id));
    });
  }

  function handleBaixaConta(id: string) {
    startTransition(async () => {
      await darBaixaConta(id);
      setContas((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: "pago" as const } : c))
      );
    });
  }

  function handleBaixaFatura(id: string) {
    startTransition(async () => {
      await darBaixaFatura(id);
      setFaturas((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: "pago" as const } : f))
      );
    });
  }

  return (
    <div>
      <PageHeader
        title="Financeiro"
        description="Controle o que você tem a receber e a pagar."
      />

      <Tabs defaultValue="receber">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="receber">A Receber</TabsTrigger>
          <TabsTrigger value="pagar">A Pagar</TabsTrigger>
          <TabsTrigger value="cartoes">Cartões</TabsTrigger>
        </TabsList>

        <TabsContent value="receber">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Valores a Receber</CardTitle>
              <Select value={filtroPagamento} onValueChange={handleFiltroChange}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Filtrar pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {FORMAS_PAGAMENTO.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {parcelas.length === 0 ? (
                <p className="text-brand-black/50 py-8 text-center">
                  Nenhuma parcela pendente. 🎉
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead>Parcela</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parcelas.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.vendas?.clientes?.nome ?? "—"}</TableCell>
                        <TableCell>
                          {p.vendas
                            ? PAGAMENTO_LABELS[p.vendas.forma_pagamento]
                            : "—"}
                        </TableCell>
                        <TableCell>{p.numero_parcela}ª</TableCell>
                        <TableCell>{formatDate(p.data_vencimento)}</TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(Number(p.valor_parcela))}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => handleBaixaParcela(p.id)}
                            disabled={pending}
                          >
                            <CheckCircle className="h-4 w-4" />
                            Dar Baixa
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pagar">
          <div className="space-y-6">
            <Card className="bg-brand-red/5 border-brand-red/20">
              <CardContent className="pt-6">
                <p className="text-sm text-brand-black/60">Total de boletos a pagar este mês</p>
                <p className="text-3xl font-bold text-brand-red mt-1">
                  {formatCurrency(totalBoletosMes)}
                </p>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4" />
                    Cadastrar Boleto
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Cadastrar Boleto de Fornecedor</DialogTitle>
                  </DialogHeader>
                  <ContaForm />
                </DialogContent>
              </Dialog>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor / Descrição</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contas.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.descricao}</TableCell>
                    <TableCell>{formatDate(c.data_vencimento)}</TableCell>
                    <TableCell>{formatCurrency(Number(c.valor))}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "pago" ? "success" : "warning"}>
                        {c.status === "pago" ? "Pago" : "Pendente"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {c.status === "pendente" && (
                        <Button
                          size="sm"
                          onClick={() => handleBaixaConta(c.id)}
                          disabled={pending}
                        >
                          Dar Baixa
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="cartoes">
          <CartoesTab
            cartoes={initialCartoes}
            faturas={faturas}
            resumoCartoes={resumoCartoes}
            onBaixaFatura={handleBaixaFatura}
            pending={pending}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ContaForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createContaAPagar(formData);
      if (result.error) setError(result.error);
      else window.location.reload();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="descricao">Fornecedor / Descrição</Label>
        <Input id="descricao" name="descricao" required placeholder="Nome do fornecedor" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="valor">Valor</Label>
          <Input id="valor" name="valor" type="number" step="0.01" min="0" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="data_vencimento">Vencimento</Label>
          <Input id="data_vencimento" name="data_vencimento" type="date" required />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Salvando..." : "Cadastrar Boleto"}
      </Button>
    </form>
  );
}

function CartoesTab({
  cartoes,
  faturas,
  resumoCartoes,
  onBaixaFatura,
  pending,
}: {
  cartoes: CartaoCredito[];
  faturas: FaturaCartao[];
  resumoCartoes: FinanceiroModuleProps["resumoCartoes"];
  onBaixaFatura: (id: string) => void;
  pending: boolean;
}) {
  const [openCartao, setOpenCartao] = useState(false);
  const [openFatura, setOpenFatura] = useState(false);

  return (
    <div className="space-y-6">
      {resumoCartoes.map(({ cartao, total, diaVencimento }) => (
        <Card key={cartao.id} className="border-brand-red/20 bg-brand-cream/30">
          <CardContent className="pt-6">
            <p className="text-base text-brand-black">
              A fatura do Cartão{" "}
              <strong className="text-brand-red">{cartao.nome_cartao}</strong> para o mês
              atual é{" "}
              <strong>{formatCurrency(total)}</strong> e vence no dia{" "}
              <strong>{diaVencimento}</strong>.
            </p>
          </CardContent>
        </Card>
      ))}

      <div className="flex flex-wrap gap-3 justify-end">
        <Dialog open={openCartao} onOpenChange={setOpenCartao}>
          <DialogTrigger asChild>
            <Button variant="secondary">
              <Plus className="h-4 w-4" />
              Cadastrar Cartão
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Cartão da Empresa</DialogTitle>
            </DialogHeader>
            <CartaoForm onDone={() => setOpenCartao(false)} />
          </DialogContent>
        </Dialog>

        <Dialog open={openFatura} onOpenChange={setOpenFatura}>
          <DialogTrigger asChild>
            <Button disabled={cartoes.length === 0}>
              <Plus className="h-4 w-4" />
              Lançar Compra no Cartão
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Lançar Compra Parcelada</DialogTitle>
            </DialogHeader>
            <FaturaForm cartoes={cartoes} onDone={() => setOpenFatura(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cartão</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Parcela</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {faturas.map((f) => (
            <TableRow key={f.id}>
              <TableCell>{f.cartoes_credito?.nome_cartao ?? "—"}</TableCell>
              <TableCell>{f.descricao}</TableCell>
              <TableCell>
                {f.parcela_atual}/{f.parcelas_totais}
              </TableCell>
              <TableCell>{formatDate(f.data_vencimento_fatura)}</TableCell>
              <TableCell>{formatCurrency(Number(f.valor_total))}</TableCell>
              <TableCell>
                <Badge variant={f.status === "pago" ? "success" : "warning"}>
                  {f.status === "pago" ? "Pago" : "Pendente"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {f.status === "pendente" && (
                  <Button size="sm" onClick={() => onBaixaFatura(f.id)} disabled={pending}>
                    Dar Baixa
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function CartaoForm({ onDone }: { onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createCartao(formData);
      if (result.error) setError(result.error);
      else {
        onDone();
        window.location.reload();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nome_cartao">Nome do Cartão</Label>
        <Input id="nome_cartao" name="nome_cartao" required placeholder="Ex: Nubank Empresa" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="dia_vencimento">Dia do Vencimento</Label>
          <Input
            id="dia_vencimento"
            name="dia_vencimento"
            type="number"
            min={1}
            max={31}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="limite">Limite (opcional)</Label>
          <Input id="limite" name="limite" type="number" step="0.01" min="0" />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Salvando..." : "Cadastrar Cartão"}
      </Button>
    </form>
  );
}

function FaturaForm({
  cartoes,
  onDone,
}: {
  cartoes: CartaoCredito[];
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    startTransition(async () => {
      const result = await createFaturaCartao({
        cartao_id: (form.elements.namedItem("cartao_id") as HTMLSelectElement).value,
        descricao: (form.elements.namedItem("descricao") as HTMLInputElement).value,
        valor_total: Number((form.elements.namedItem("valor_total") as HTMLInputElement).value),
        parcelas_totais: Number(
          (form.elements.namedItem("parcelas_totais") as HTMLInputElement).value
        ),
        data_compra: (form.elements.namedItem("data_compra") as HTMLInputElement).value,
      });
      if (result.error) setError(result.error);
      else {
        onDone();
        window.location.reload();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cartao_id">Cartão</Label>
        <select
          id="cartao_id"
          name="cartao_id"
          required
          className="flex h-11 w-full rounded-lg border border-brand-black/15 bg-white px-4 py-2 text-base"
        >
          {cartoes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome_cartao}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição da Compra</Label>
        <Input id="descricao" name="descricao" required placeholder="Ex: Material de embalagem" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor="valor_total">Valor Total</Label>
          <Input id="valor_total" name="valor_total" type="number" step="0.01" min="0" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="parcelas_totais">Parcelas</Label>
          <Input id="parcelas_totais" name="parcelas_totais" type="number" min={1} defaultValue={1} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="data_compra">Data da Compra</Label>
          <Input
            id="data_compra"
            name="data_compra"
            type="date"
            required
            defaultValue={new Date().toISOString().split("T")[0]}
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Salvando..." : "Lançar Compra"}
      </Button>
    </form>
  );
}
