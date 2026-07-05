"use client";

import { useState, useTransition } from "react";
import { Plus, Minus, ShoppingBag } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { createVenda } from "@/app/actions/vendas";
import {
  formatCurrency,
  formatDate,
  FORMAS_PAGAMENTO,
  FORMAS_PARCELADAS,
  PAGAMENTO_LABELS,
} from "@/lib/format";
import type { Cliente, Produto, Venda, FormaPagamento } from "@/types/database";

interface VendasModuleProps {
  clientes: Cliente[];
  produtos: Produto[];
  vendas: Venda[];
}

interface CarrinhoItem {
  produto_id: string;
  nome: string;
  quantidade: number;
  preco_unitario: number;
  estoque: number;
}

export function VendasModule({ clientes, produtos, vendas }: VendasModuleProps) {
  const [clienteId, setClienteId] = useState("");
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>("pix");
  const [parcelas, setParcelas] = useState(1);
  const [carrinho, setCarrinho] = useState<CarrinhoItem[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const isParcelado = FORMAS_PARCELADAS.includes(
    formaPagamento as (typeof FORMAS_PARCELADAS)[number]
  );

  const total = carrinho.reduce(
    (sum, item) => sum + item.quantidade * item.preco_unitario,
    0
  );

  function adicionarProduto() {
    const produto = produtos.find((p) => p.id === produtoSelecionado);
    if (!produto) return;

    const existente = carrinho.find((c) => c.produto_id === produto.id);
    if (existente) {
      if (existente.quantidade >= produto.quantidade) {
        setError("Quantidade maior que o estoque disponível.");
        return;
      }
      setCarrinho(
        carrinho.map((c) =>
          c.produto_id === produto.id
            ? { ...c, quantidade: c.quantidade + 1 }
            : c
        )
      );
    } else {
      if (produto.quantidade < 1) {
        setError("Produto sem estoque.");
        return;
      }
      setCarrinho([
        ...carrinho,
        {
          produto_id: produto.id,
          nome: produto.nome,
          quantidade: 1,
          preco_unitario: Number(produto.preco_venda),
          estoque: produto.quantidade,
        },
      ]);
    }
    setError(null);
  }

  function alterarQuantidade(produtoId: string, delta: number) {
    setCarrinho(
      carrinho
        .map((c) => {
          if (c.produto_id !== produtoId) return c;
          const novaQtd = c.quantidade + delta;
          if (novaQtd <= 0) return null;
          if (novaQtd > c.estoque) return c;
          return { ...c, quantidade: novaQtd };
        })
        .filter(Boolean) as CarrinhoItem[]
    );
  }

  function finalizarVenda() {
    if (!clienteId) {
      setError("Selecione uma cliente.");
      return;
    }
    if (carrinho.length === 0) {
      setError("Adicione pelo menos um produto.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await createVenda({
        cliente_id: clienteId,
        forma_pagamento: formaPagamento,
        parcelas: isParcelado ? parcelas : 1,
        itens: carrinho.map((c) => ({
          produto_id: c.produto_id,
          quantidade: c.quantidade,
          preco_unitario: c.preco_unitario,
        })),
      });

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setCarrinho([]);
        setClienteId("");
        setFormaPagamento("pix");
        setParcelas(1);
        setTimeout(() => setSuccess(false), 3000);
      }
    });
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Vendas"
        description="Registre novas vendas e acompanhe o fluxo de caixa."
      />

      {success && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-green-700">
          Venda registrada com sucesso!
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-brand-red" />
            Nova Venda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select
                value={formaPagamento}
                onValueChange={(v) => setFormaPagamento(v as FormaPagamento)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMAS_PAGAMENTO.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isParcelado && (
            <div className="space-y-2 max-w-xs">
              <Label htmlFor="parcelas">Quantidade de Parcelas</Label>
              <Input
                id="parcelas"
                type="number"
                min={1}
                max={24}
                value={parcelas}
                onChange={(e) => setParcelas(Number(e.target.value))}
              />
              {parcelas > 0 && total > 0 && (
                <p className="text-sm text-brand-black/60">
                  {parcelas}x de {formatCurrency(total / parcelas)} (vencimentos a cada 30 dias)
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <Select value={produtoSelecionado} onValueChange={setProdutoSelecionado}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecione um produto" />
              </SelectTrigger>
              <SelectContent>
                {produtos
                  .filter((p) => p.quantidade > 0)
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome} — {formatCurrency(Number(p.preco_venda))} (estoque: {p.quantidade})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button type="button" onClick={adicionarProduto} variant="secondary">
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>

          {carrinho.length > 0 && (
            <div className="rounded-xl border border-brand-red/10 p-4 space-y-3">
              {carrinho.map((item) => (
                <div
                  key={item.produto_id}
                  className="flex items-center justify-between gap-4"
                >
                  <span className="font-medium">{item.nome}</span>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => alterarQuantidade(item.produto_id, -1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center">{item.quantidade}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => alterarQuantidade(item.produto_id, 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <span className="w-24 text-right font-medium">
                      {formatCurrency(item.quantidade * item.preco_unitario)}
                    </span>
                  </div>
                </div>
              ))}
              <div className="border-t border-brand-red/10 pt-3 flex justify-between items-center">
                <span className="text-lg font-bold">Total</span>
                <span className="text-2xl font-bold text-brand-red">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button
            onClick={finalizarVenda}
            disabled={pending || carrinho.length === 0}
            size="lg"
            className="w-full sm:w-auto"
          >
            {pending ? "Registrando..." : "Finalizar Venda"}
          </Button>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-xl font-semibold text-brand-black mb-4">
          Vendas Recentes
        </h2>
        {vendas.length === 0 ? (
          <p className="text-brand-black/50">Nenhuma venda registrada.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendas.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>{formatDate(v.data_venda)}</TableCell>
                  <TableCell>{v.clientes?.nome ?? "—"}</TableCell>
                  <TableCell>{PAGAMENTO_LABELS[v.forma_pagamento]}</TableCell>
                  <TableCell>
                    <Badge variant={v.status === "pago" ? "success" : "warning"}>
                      {v.status === "pago" ? "Pago" : "Pendente"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(Number(v.valor_total))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
