"use client";

import { useState, useTransition, useMemo } from "react";
import { Plus, Pencil, Trash2, Search, Wallet } from "lucide-react";
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
} from "@/lib/mutations/clientes";
import { useAppMessages } from "@/components/ui/app-messages";
import { WhatsAppButton } from "@/components/ui/whatsapp-button";
import { ClienteDebitoPanel } from "@/components/financeiro/consulta-cliente-debito";
import { formatCPF, formatPhone } from "@/lib/format";
import { mensagemWhatsAppCliente } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import type { Cliente } from "@/types/database";
import { invalidateAfterClientesChange } from "@/lib/queries/page-cache";
import { mutationError } from "@/lib/db/helpers";

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

      const err = mutationError(result);
      if (err) {
        setError(err);
      } else {
        invalidateAfterClientesChange();
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
  const { confirm, toast } = useAppMessages();
  const [open, setOpen] = useState(false);
  const [editCliente, setEditCliente] = useState<Cliente | null>(null);
  const [busca, setBusca] = useState("");
  const [clienteDebito, setClienteDebito] = useState<Cliente | null>(null);
  const [comprovanteAberto, setComprovanteAberto] = useState(false);
  const [pending, startTransition] = useTransition();

  const clientesFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return clientes;
    return clientes.filter(
      (c) =>
        c.nome.toLowerCase().includes(termo) ||
        c.cpf.includes(termo.replace(/\D/g, ""))
    );
  }, [clientes, busca]);

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Excluir cliente",
      message: "Tem certeza que deseja excluir esta cliente?",
      confirmLabel: "Excluir",
      variant: "danger",
    });
    if (!ok) return;
    startTransition(async () => {
      const result = await deleteCliente(id);
      const err = mutationError(result);
      if (err) {
        toast(err, "error");
      } else {
        invalidateAfterClientesChange();
        toast("Cliente excluída com sucesso.", "success");
      }
    });
  }

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Pesquise a cliente e veja o que ela deve no crediário."
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

      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-black/40" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Pesquisar por nome ou CPF..."
          className="pl-10"
        />
      </div>

      {clientesFiltrados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-red/20 bg-white p-12 text-center">
          <p className="text-brand-black/60">
            {busca ? "Nenhuma cliente encontrada." : "Nenhuma cliente cadastrada ainda."}
          </p>
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
            {clientesFiltrados.map((c) => (
              <TableRow
                key={c.id}
                className="cursor-pointer"
                onClick={() => setClienteDebito(c)}
              >
                <TableCell className="font-medium">{c.nome}</TableCell>
                <TableCell>{formatCPF(c.cpf)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span>{c.telefone ? formatPhone(c.telefone) : "—"}</span>
                    {c.telefone && (
                      <WhatsAppButton
                        telefone={c.telefone}
                        mensagem={mensagemWhatsAppCliente(c.nome)}
                        size="icon"
                        label="WhatsApp"
                      />
                    )}
                  </div>
                </TableCell>
                <TableCell>{c.endereco || "—"}</TableCell>
                <TableCell className="text-right">
                  <div
                    className="flex justify-end gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setClienteDebito(c)}
                    >
                      <Wallet className="h-4 w-4" />
                      Ver débito
                    </Button>
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

      <Dialog
        open={!!clienteDebito}
        onOpenChange={(open) => {
          if (!open) {
            setClienteDebito(null);
            setComprovanteAberto(false);
          }
        }}
      >
        <DialogContent
          className={cn(
            "max-w-2xl max-h-[90vh] overflow-y-auto",
            comprovanteAberto && "overflow-hidden border-0 bg-transparent p-0 shadow-none"
          )}
        >
          {!comprovanteAberto && (
            <DialogHeader>
              <DialogTitle>
                {clienteDebito ? `Débitos — ${clienteDebito.nome}` : "Débitos"}
              </DialogTitle>
            </DialogHeader>
          )}
          {clienteDebito && (
            <ClienteDebitoPanel
              clienteId={clienteDebito.id}
              onComprovanteVisivel={setComprovanteAberto}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
