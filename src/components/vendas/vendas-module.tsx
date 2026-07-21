"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { Plus, Minus, ShoppingBag } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { ComprovanteVenda } from "@/components/vendas/comprovante-venda";
import { SelecaoBotoes, OPCOES_PARCELAS } from "@/components/ui/selecao-botoes";
import { InputMoeda } from "@/components/ui/input-moeda";
import { createVenda } from "@/lib/mutations/vendas";
import { mutationError } from "@/lib/db/helpers";
import { formatCurrency, formatDate, formatItemNome, formatItemNomeInput } from "@/lib/format";
import { datasAPartirDaPrimeira, datasPadraoParcelas, validarDatasParcelas } from "@/lib/parcelas-datas";
import { validateProdutoNome } from "@/lib/validate";
import type { Cliente, Produto, Venda } from "@/types/database";
import type { ComprovanteVendaData } from "@/lib/store";

interface VendasModuleProps {
  clientes: Cliente[];
  produtos: Produto[];
  vendas: Venda[];
  onRefresh: () => Promise<void>;
}

interface CarrinhoItem {
  id: string;
  produto_id: string | null;
  nome: string;
  quantidade: number;
  preco_unitario: number;
  preco_custo: number | null;
  estoque: number | null;
  manual: boolean;
}

function labelProdutoLista(p: Produto) {
  const nome = formatItemNome(p.nome);
  const preco = formatCurrency(Number(p.preco_venda));
  if (p.quantidade < 1) {
    return `${nome} — ${preco} (esgotado)`;
  }
  return `${nome} — ${preco} (est.: ${p.quantidade})`;
}

function labelProdutoSelecionado(p: Produto) {
  return `${formatItemNome(p.nome)} · ${formatCurrency(Number(p.preco_venda))}`;
}

export function VendasModule({ clientes, produtos, vendas, onRefresh }: VendasModuleProps) {
  const [clienteId, setClienteId] = useState("");
  const [parcelas, setParcelas] = useState(1);
  const [datasVencimento, setDatasVencimento] = useState<string[]>(() =>
    datasPadraoParcelas(1)
  );
  const [obs, setObs] = useState("");
  const [carrinho, setCarrinho] = useState<CarrinhoItem[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState("");
  const [nomeManual, setNomeManual] = useState("");
  const [custoManual, setCustoManual] = useState(0);
  const [precoManual, setPrecoManual] = useState(0);
  const [qtdManual, setQtdManual] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [comprovante, setComprovante] = useState<ComprovanteVendaData | null>(null);
  const [telefoneComprovante, setTelefoneComprovante] = useState<string | null>(null);
  const [showComprovante, setShowComprovante] = useState(false);
  const [pending, startTransition] = useTransition();
  const carrinhoRef = useRef<HTMLDivElement>(null);
  const scrollAposAdicionar = useRef(false);

  const produtoAtual = produtos.find((p) => p.id === produtoSelecionado);

  const produtosOrdenados = [...produtos]
    .filter((p) => p.quantidade > 0)
    .sort((a, b) => {
    const aEsgotado = a.quantidade < 1;
    const bEsgotado = b.quantidade < 1;
    if (aEsgotado !== bEsgotado) return aEsgotado ? 1 : -1;
    return formatItemNome(a.nome).localeCompare(formatItemNome(b.nome), "pt-BR");
  });

  useEffect(() => {
    if (!scrollAposAdicionar.current || carrinho.length === 0) return;
    scrollAposAdicionar.current = false;
    requestAnimationFrame(() => {
      carrinhoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [carrinho]);

  useEffect(() => {
    if (produtoSelecionado) {
      const selecionado = produtos.find((p) => p.id === produtoSelecionado);
      if (!selecionado || selecionado.quantidade < 1) {
        setProdutoSelecionado("");
      }
    }
  }, [produtos, produtoSelecionado]);

  function marcarScrollAposAdicionar() {
    scrollAposAdicionar.current = true;
  }

  function adicionarProdutoAoCarrinho(produtoId: string): boolean {
    const produto = produtos.find((p) => p.id === produtoId);
    if (!produto) return false;

    const existente = carrinho.find((c) => c.produto_id === produto.id);
    if (existente) {
      if (existente.quantidade >= produto.quantidade) {
        setError("Quantidade maior que o estoque disponível.");
        return false;
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
        return false;
      }
      setCarrinho([
        ...carrinho,
        {
          id: produto.id,
          produto_id: produto.id,
          nome: formatItemNome(produto.nome),
          quantidade: 1,
          preco_unitario: Number(produto.preco_venda),
          preco_custo: Number(produto.preco_custo),
          estoque: produto.quantidade,
          manual: false,
        },
      ]);
    }
    setError(null);
    return true;
  }

  function handleProdutoSelect(produtoId: string) {
    setProdutoSelecionado(produtoId);
    if (adicionarProdutoAoCarrinho(produtoId)) {
      marcarScrollAposAdicionar();
    }
  }

  function adicionarProduto() {
    if (!produtoSelecionado) return;
    if (adicionarProdutoAoCarrinho(produtoSelecionado)) {
      marcarScrollAposAdicionar();
    }
  }

  function adicionarManual() {
    const nomeCheck = validateProdutoNome(nomeManual);
    const qtd = Math.max(1, Number(qtdManual.replace(",", ".")) || 1);

    if (!nomeCheck.ok) {
      setError(nomeCheck.error);
      return;
    }
    const nome = nomeCheck.nome;
    if (precoManual < 0.01) {
      setError("Informe o preço de venda.");
      return;
    }

    const chave = `manual:${nome.toLowerCase()}`;
    const existente = carrinho.find((c) => c.id === chave);

    if (existente) {
      setCarrinho(
        carrinho.map((c) =>
          c.id === chave ? { ...c, quantidade: c.quantidade + qtd } : c
        )
      );
    } else {
      setCarrinho([
        ...carrinho,
        {
          id: chave,
          produto_id: null,
          nome,
          quantidade: qtd,
          preco_unitario: precoManual,
          preco_custo: custoManual > 0 ? custoManual : null,
          estoque: null,
          manual: true,
        },
      ]);
    }

    setNomeManual("");
    setCustoManual(0);
    setPrecoManual(0);
    setQtdManual("1");
    setError(null);
    marcarScrollAposAdicionar();
  }

  const total = carrinho.reduce(
    (sum, item) => sum + item.quantidade * item.preco_unitario,
    0
  );

  function alterarQuantidade(itemId: string, delta: number) {
    const novoCarrinho = carrinho
      .map((c) => {
        if (c.id !== itemId) return c;
        const novaQtd = c.quantidade + delta;
        if (novaQtd <= 0) return null;
        if (c.estoque !== null && novaQtd > c.estoque) return c;
        return { ...c, quantidade: novaQtd };
      })
      .filter(Boolean) as CarrinhoItem[];

    setCarrinho(novoCarrinho);
    if (novoCarrinho.length === 0) {
      setParcelas(1);
      setDatasVencimento(datasPadraoParcelas(1));
    }
  }

  function alterarNumeroParcelas(n: number) {
    setParcelas(n);
    setDatasVencimento((prev) => {
      if (n === prev.length) return prev;
      const primeira = prev[0];
      if (primeira) return datasAPartirDaPrimeira(primeira, n);
      return datasPadraoParcelas(n);
    });
  }

  function alterarDataParcela(index: number, valor: string) {
    setDatasVencimento((prev) => {
      if (index === 0) {
        return datasAPartirDaPrimeira(valor, prev.length);
      }
      const next = [...prev];
      next[index] = valor;
      return next;
    });
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

    const datasOk = validarDatasParcelas(parcelas, datasVencimento);
    if (!datasOk.ok) {
      setError(datasOk.error);
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await createVenda({
        cliente_id: clienteId,
        parcelas,
        datas_vencimento: datasOk.datas,
        obs: obs.trim() || undefined,
        itens: carrinho.map((c) => ({
          produto_id: c.produto_id,
          nome: c.nome,
          quantidade: c.quantidade,
          preco_unitario: c.preco_unitario,
          preco_custo: c.preco_custo,
        })),
      });

      const err = mutationError(result);
      if (err) {
        setError(err);
      } else if ("comprovante" in result && result.comprovante) {
        await onRefresh();
        const telefone =
          clientes.find((c) => c.id === clienteId)?.telefone ?? null;
        setTelefoneComprovante(telefone);
        setComprovante(result.comprovante);
        setShowComprovante(true);
        setCarrinho([]);
        setClienteId("");
        setParcelas(1);
        setDatasVencimento(datasPadraoParcelas(1));
        setObs("");
        setNomeManual("");
        setCustoManual(0);
        setPrecoManual(0);
        setQtdManual("1");
        setProdutoSelecionado("");
      }
    });
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Vendas"
        description="Registre vendas no crediário e gere o comprovante."
      />

      <ComprovanteVenda
        open={showComprovante}
        onOpenChange={setShowComprovante}
        data={comprovante}
        telefoneCliente={telefoneComprovante}
      />

      {!showComprovante && (
      <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-brand-red" />
            Nova Venda (Crediário)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2 max-w-md">
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

          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <div className="min-w-0 w-full sm:flex-1">
              <Select value={produtoSelecionado} onValueChange={handleProdutoSelect}>
                <SelectTrigger className="h-11 w-full min-w-0 gap-2 overflow-hidden [&_svg]:shrink-0">
                  {produtoAtual ? (
                    <span className="min-w-0 flex-1 truncate text-left">
                      {labelProdutoSelecionado(produtoAtual)}
                    </span>
                  ) : (
                    <SelectValue placeholder="Selecione um produto" className="truncate" />
                  )}
                </SelectTrigger>
                <SelectContent className="max-w-[min(100vw-2rem,24rem)]">
                  {produtosOrdenados.length === 0 ? (
                    <SelectItem value="__vazio" disabled>
                      Nenhum produto cadastrado no Estoque
                    </SelectItem>
                  ) : (
                    produtosOrdenados.map((p) => {
                      const esgotado = p.quantidade < 1;
                      return (
                        <SelectItem
                          key={p.id}
                          value={p.id}
                          disabled={esgotado}
                          className="whitespace-normal"
                        >
                          {labelProdutoLista(p)}
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              onClick={adicionarProduto}
              variant="secondary"
              disabled={!produtoSelecionado}
              className="w-full shrink-0 sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>

          <div className="rounded-xl border border-dashed border-brand-black/15 p-4 space-y-3">
            <p className="text-sm font-medium text-brand-black">
              Produto avulso — digitar manualmente
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-1 sm:col-span-2 lg:col-span-2">
                <Label htmlFor="nome_manual">Nome do produto</Label>
                <Input
                  id="nome_manual"
                  value={nomeManual}
                  onChange={(e) => setNomeManual(formatItemNomeInput(e.target.value))}
                  className="uppercase"
                  placeholder="Ex: Natura, Avon..."
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="custo_manual">Preço custo</Label>
                <InputMoeda
                  id="custo_manual"
                  value={custoManual}
                  onChange={setCustoManual}
                  placeholder="R$0,00"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="preco_manual">Preço venda</Label>
                <InputMoeda
                  id="preco_manual"
                  value={precoManual}
                  onChange={setPrecoManual}
                  placeholder="R$0,00"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="qtd_manual">Qtd</Label>
                <Input
                  id="qtd_manual"
                  type="number"
                  min="1"
                  step="1"
                  value={qtdManual}
                  onChange={(e) => setQtdManual(e.target.value)}
                />
              </div>
            </div>
            <Button type="button" onClick={adicionarManual} variant="outline" size="sm">
              <Plus className="h-4 w-4" />
              Adicionar produto manual
            </Button>
          </div>

          {carrinho.length > 0 && (
            <div ref={carrinhoRef} className="scroll-mt-4 space-y-4">
              <div className="rounded-xl border border-brand-red/10 p-4 space-y-3">
                {carrinho.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4"
                  >
                    <div>
                      <span className="font-medium uppercase">{formatItemNome(item.nome)}</span>
                      {item.manual && (
                        <span className="ml-2 text-[10px] text-brand-black/50 uppercase">
                          avulso
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => alterarQuantidade(item.id, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center">{item.quantidade}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => alterarQuantidade(item.id, 1)}
                        disabled={
                          item.estoque !== null && item.quantidade >= item.estoque
                        }
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

              <SelecaoBotoes
                label="Número de Parcelas"
                opcoes={OPCOES_PARCELAS}
                value={parcelas}
                onChange={alterarNumeroParcelas}
              />
              {parcelas > 0 && (
                <div className="space-y-3 -mt-1">
                  <p className="text-sm text-brand-black/60">
                    {parcelas}x de {formatCurrency(total / parcelas)}. Ao mudar a
                    1ª data, as outras vão de 30 em 30 dias. Ainda dá para
                    ajustar cada uma se precisar.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {datasVencimento.map((data, index) => (
                      <div key={`parcela-data-${index}`} className="space-y-1.5">
                        <Label
                          htmlFor={`data_parcela_${index + 1}`}
                          className="text-xs text-brand-black/70"
                        >
                          {index + 1}ª parcela —{" "}
                          {formatCurrency(total / parcelas)}
                        </Label>
                        <Input
                          id={`data_parcela_${index + 1}`}
                          type="date"
                          value={data}
                          onChange={(e) =>
                            alterarDataParcela(index, e.target.value)
                          }
                          className="h-11"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="obs">Observação — como será pago</Label>
                <Textarea
                  id="obs"
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  placeholder="Ex: 1ª parcela em dinheiro, restante no pix..."
                  rows={2}
                />
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
        <p className="mb-4 text-sm text-brand-black/50">Últimas 5 vendas registradas.</p>
        {vendas.length === 0 ? (
          <p className="text-brand-black/50">Nenhuma venda registrada.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Parcelas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendas.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>{formatDate(v.data_venda)}</TableCell>
                  <TableCell>{v.clientes?.nome ?? "—"}</TableCell>
                  <TableCell>{v.parcelas}x</TableCell>
                  <TableCell>
                    <Badge variant={v.status === "pago" ? "success" : "warning"}>
                      {v.status === "pago" ? "Quitado" : "Em aberto"}
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
      </>
      )}
    </div>
  );
}
