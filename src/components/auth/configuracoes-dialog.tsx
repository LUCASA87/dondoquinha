"use client";

import { useState } from "react";
import {
  BookOpen,
  ChevronLeft,
  KeyRound,
  Package,
  Settings,
  ShoppingCart,
  Users,
  Wallet,
} from "lucide-react";
import { TrocarSenhaForm } from "@/components/auth/trocar-senha-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type AbaConfig = "menu" | "tutorial" | "senha";

const TUTORIAL_PASSOS = [
  {
    icon: Package,
    titulo: "Estoque",
    texto:
      "Cadastre produtos, preços e quantidades. Assim o sistema controla o que ainda tem para vender.",
  },
  {
    icon: Users,
    titulo: "Clientes",
    texto:
      "Cadastre as clientes e toque em uma delas para ver o carnê: o que ela deve, parcelas e comprovantes.",
  },
  {
    icon: ShoppingCart,
    titulo: "Vendas",
    texto:
      "Registre a compra no crediário, escolha as parcelas e envie o carnê da venda pelo WhatsApp.",
  },
  {
    icon: Wallet,
    titulo: "Financeiro",
    texto:
      "Receba parcelas do crediário, consulte débitos e acompanhe contas a pagar da loja.",
  },
] as const;

export function ConfiguracoesDialog() {
  const [open, setOpen] = useState(false);
  const [aba, setAba] = useState<AbaConfig>("menu");

  function fechar() {
    setOpen(false);
    setAba("menu");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setAba("menu");
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-center gap-2 border-brand-red/20 text-brand-black/70 hover:bg-brand-cream"
        >
          <Settings className="h-4 w-4 text-brand-red" />
          Configurações
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {aba === "menu" && "Configurações"}
            {aba === "tutorial" && "Mini tutorial"}
            {aba === "senha" && "Trocar senha"}
          </DialogTitle>
          {aba === "menu" && (
            <DialogDescription>
              Tutorial rápido do sistema e opções da conta.
            </DialogDescription>
          )}
        </DialogHeader>

        {aba === "menu" && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setAba("tutorial")}
              className="flex w-full items-center gap-3 rounded-xl border border-brand-red/15 bg-brand-cream/40 px-4 py-3.5 text-left transition-colors hover:bg-brand-cream"
            >
              <BookOpen className="h-5 w-5 shrink-0 text-brand-red" />
              <div>
                <p className="font-medium text-brand-black">Tutorial</p>
                <p className="text-xs text-brand-black/55">
                  Como usar estoque, clientes, vendas e financeiro
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setAba("senha")}
              className="flex w-full items-center gap-3 rounded-xl border border-brand-red/15 bg-white px-4 py-3.5 text-left transition-colors hover:bg-brand-cream/50"
            >
              <KeyRound className="h-5 w-5 shrink-0 text-brand-red" />
              <div>
                <p className="font-medium text-brand-black">Trocar senha</p>
                <p className="text-xs text-brand-black/55">
                  Altere a senha de acesso ao sistema
                </p>
              </div>
            </button>
          </div>
        )}

        {aba === "tutorial" && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setAba("menu")}
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-red hover:underline"
            >
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </button>

            <ol className="space-y-3">
              {TUTORIAL_PASSOS.map((passo, index) => {
                const Icon = passo.icon;
                return (
                  <li
                    key={passo.titulo}
                    className="flex gap-3 rounded-xl border border-brand-red/10 bg-white p-3"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-red text-sm font-semibold text-white">
                      {index + 1}
                    </span>
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-brand-red" />
                        <p className="font-medium text-brand-black">{passo.titulo}</p>
                      </div>
                      <p className="text-sm leading-relaxed text-brand-black/65">
                        {passo.texto}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>

            <p className="rounded-xl bg-brand-cream/60 px-3 py-2 text-xs leading-relaxed text-brand-black/60">
              Dica: na lista de clientes, toque no nome para abrir o carnê. Use o{" "}
              <strong className="font-medium text-brand-black/80">X</strong> no
              canto para fechar e role a tela se o carnê for longo.
            </p>
          </div>
        )}

        {aba === "senha" && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setAba("menu")}
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-red hover:underline"
            >
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </button>
            <TrocarSenhaForm onSuccess={fechar} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
