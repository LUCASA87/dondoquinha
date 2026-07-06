"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
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
import { createProduto, updateProduto, deleteProduto } from "@/app/actions/produtos";
import { InputMoeda } from "@/components/ui/input-moeda";
import { useAppMessages } from "@/components/ui/app-messages";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatItemNome } from "@/lib/format";
import type { Produto } from "@/types/database";
import { invalidateAfterEstoqueChange } from "@/lib/queries/page-cache";

interface ProdutosTableProps {
  produtos: Produto[];
}

function ProdutoForm({
  produto,
  onDone,
}: {
  produto?: Produto;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [precoCusto, setPrecoCusto] = useState(Number(produto?.preco_custo ?? 0));
  const [precoVenda, setPrecoVenda] = useState(Number(produto?.preco_venda ?? 0));
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (precoCusto <= 0 || precoVenda <= 0) {
      setError("Informe preço de custo e venda maiores que zero.");
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.set("preco_custo", String(precoCusto));
    formData.set("preco_venda", String(precoVenda));

    startTransition(async () => {
      const result = produto
        ? await updateProduto(produto.id, formData)
        : await createProduto(formData);

      if (result.error) {
        setError(result.error);
      } else {
        invalidateAfterEstoqueChange();
        onDone();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome do Produto</Label>
        <Input
          id="nome"
          name="nome"
          required
          defaultValue={produto?.nome ? formatItemNome(produto.nome) : ""}
          placeholder="Ex: BATOM VERMELHO"
          className="uppercase"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="codigo_sku">Código SKU</Label>
        <Input
          id="codigo_sku"
          name="codigo_sku"
          defaultValue={produto?.codigo_sku ?? ""}
          placeholder="Ex: BT-001"
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor="quantidade">Quantidade</Label>
          <Input
            id="quantidade"
            name="quantidade"
            type="number"
            min="0"
            required
            defaultValue={produto?.quantidade ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="preco_custo">Preço Custo</Label>
          <InputMoeda
            id="preco_custo"
            value={precoCusto}
            onChange={setPrecoCusto}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="preco_venda">Preço Venda</Label>
          <InputMoeda
            id="preco_venda"
            value={precoVenda}
            onChange={setPrecoVenda}
            required
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Salvando..." : produto ? "Atualizar Produto" : "Cadastrar Produto"}
      </Button>
    </form>
  );
}

export function ProdutosTable({ produtos }: ProdutosTableProps) {
  const { confirm, toast } = useAppMessages();
  const [open, setOpen] = useState(false);
  const [editProduto, setEditProduto] = useState<Produto | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Excluir produto",
      message: "Tem certeza que deseja excluir este produto?",
      confirmLabel: "Excluir",
      variant: "danger",
    });
    if (!ok) return;
    startTransition(async () => {
      const result = await deleteProduto(id);
      if (result.error) {
        toast(result.error, "error");
      } else {
        invalidateAfterEstoqueChange();
        toast("Produto excluído com sucesso.", "success");
      }
    });
  }

  return (
    <div>
      <PageHeader
        title="Estoque"
        description="Gerencie seus produtos e quantidades."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditProduto(null)}>
                <Plus className="h-4 w-4" />
                Cadastrar Produto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editProduto ? "Editar Produto" : "Cadastrar Produto"}
                </DialogTitle>
              </DialogHeader>
              <ProdutoForm
                key={editProduto?.id ?? "novo"}
                produto={editProduto ?? undefined}
                onDone={() => {
                  setOpen(false);
                  setEditProduto(null);
                }}
              />
            </DialogContent>
          </Dialog>
        }
      />

      {produtos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-red/20 bg-white p-12 text-center">
          <p className="text-brand-black/60">Nenhum produto cadastrado ainda.</p>
          <p className="mt-1 text-sm text-brand-black/40">
            Clique em &quot;Cadastrar Produto&quot; para começar.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Qtd</TableHead>
              <TableHead>Custo</TableHead>
              <TableHead>Venda</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {produtos.map((p) => (
              <TableRow
                key={p.id}
                className={p.quantidade < 1 ? "bg-brand-red/5" : undefined}
              >
                <TableCell className="font-medium uppercase">
                  <div className="flex flex-wrap items-center gap-2">
                    {formatItemNome(p.nome)}
                    {p.quantidade < 1 && (
                      <Badge variant="warning">Esgotado</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{p.codigo_sku || "—"}</TableCell>
                <TableCell className={p.quantidade < 1 ? "text-brand-red font-medium" : undefined}>
                  {p.quantidade}
                </TableCell>
                <TableCell>{formatCurrency(Number(p.preco_custo))}</TableCell>
                <TableCell>{formatCurrency(Number(p.preco_venda))}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditProduto(p);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(p.id)}
                      disabled={pending}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
