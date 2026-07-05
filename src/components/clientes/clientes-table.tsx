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
import {
  createCliente,
  updateCliente,
  deleteCliente,
} from "@/app/actions/clientes";
import { formatCPF, formatPhone } from "@/lib/format";
import type { Cliente } from "@/types/database";

interface ClientesTableProps {
  clientes: Cliente[];
}

function ClienteForm({
  cliente,
  onDone,
}: {
  cliente?: Cliente;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = cliente
        ? await updateCliente(cliente.id, formData)
        : await createCliente(formData);

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
        <Label htmlFor="nome">Nome Completo</Label>
        <Input
          id="nome"
          name="nome"
          required
          defaultValue={cliente?.nome}
          placeholder="Nome da cliente"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cpf">CPF</Label>
        <Input
          id="cpf"
          name="cpf"
          required
          defaultValue={cliente ? formatCPF(cliente.cpf) : ""}
          placeholder="000.000.000-00"
          maxLength={14}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="telefone">Telefone</Label>
        <Input
          id="telefone"
          name="telefone"
          defaultValue={cliente?.telefone ? formatPhone(cliente.telefone) : ""}
          placeholder="(00) 00000-0000"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="endereco">Endereço</Label>
        <Input
          id="endereco"
          name="endereco"
          defaultValue={cliente?.endereco ?? ""}
          placeholder="Rua, número, bairro"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Salvando..." : cliente ? "Atualizar Cliente" : "Cadastrar Cliente"}
      </Button>
    </form>
  );
}

export function ClientesTable({ clientes }: ClientesTableProps) {
  const [open, setOpen] = useState(false);
  const [editCliente, setEditCliente] = useState<Cliente | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta cliente?")) return;
    startTransition(async () => {
      await deleteCliente(id);
    });
  }

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Cadastre e gerencie suas clientes."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditCliente(null)}>
                <Plus className="h-4 w-4" />
                Cadastrar Cliente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editCliente ? "Editar Cliente" : "Cadastrar Cliente"}
                </DialogTitle>
              </DialogHeader>
              <ClienteForm
                cliente={editCliente ?? undefined}
                onDone={() => {
                  setOpen(false);
                  setEditCliente(null);
                }}
              />
            </DialogContent>
          </Dialog>
        }
      />

      {clientes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-red/20 bg-white p-12 text-center">
          <p className="text-brand-black/60">Nenhuma cliente cadastrada ainda.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Endereço</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientes.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.nome}</TableCell>
                <TableCell>{formatCPF(c.cpf)}</TableCell>
                <TableCell>{c.telefone ? formatPhone(c.telefone) : "—"}</TableCell>
                <TableCell>{c.endereco || "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditCliente(c);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(c.id)}
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
