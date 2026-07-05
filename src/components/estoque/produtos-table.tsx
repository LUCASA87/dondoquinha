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
import { formatCurrency } from "@/lib/format";
import type { Produto } from "@/types/database";

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
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = produto
        ? await updateProduto(produto.id, formData)
        : await createProduto(formData);

      if (result.error) {
        setError(result.error);
      } else {
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
          defaultValue={produto?.nome}
          placeholder="Ex: Batom vermelho"
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
          <Input
            id="preco_custo"
            name="preco_custo"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={produto?.preco_custo ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="preco_venda">Preço Venda</Label>
          <Input
            id="preco_venda"
            name="preco_venda"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={produto?.preco_venda ?? ""}
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
  const [open, setOpen] = useState(false);
  const [editProduto, setEditProduto] = useState<Produto | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    startTransition(async () => {
      await deleteProduto(id);
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
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.nome}</TableCell>
                <TableCell>{p.codigo_sku || "—"}</TableCell>
                <TableCell>{p.quantidade}</TableCell>
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
