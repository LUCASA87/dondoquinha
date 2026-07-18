"use client";

import { useState } from "react";
import {
  BookOpen,
  ChevronLeft,
  Home,
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

const TUTORIAL_SECOES = [
  {
    icon: Home,
    titulo: "Início",
    itens: [
      "Mostra o resumo da loja: estoque, quanto tem a receber e a pagar.",
      "As parcelas a vencer aparecem aqui para você não esquecer.",
      "O botão de carrinho leva direto para registrar uma nova venda.",
    ],
  },
  {
    icon: Package,
    titulo: "Estoque",
    itens: [
      "Cadastre cada produto com nome, preço e quantidade.",
      "Edite quando mudar o preço ou entrar mercadoria nova.",
      "Ao vender no crediário, a quantidade baixa sozinha.",
      "Se zerar o estoque na venda, o produto some da lista.",
    ],
  },
  {
    icon: Users,
    titulo: "Clientes",
    itens: [
      "Cadastre nome, telefone, CPF (opcional) e endereço.",
      "Toque no nome da cliente (ou em Ver débito) para abrir o carnê.",
      "No carnê você vê o que ela deve, parcelas e pedidos.",
      "Dá para enviar WhatsApp, cobrar, gerar PDF e registrar pagamento.",
      "Use Enviar última compra para mandar o carnê da venda de novo.",
      "Role a tela se o carnê for longo e feche com o X.",
    ],
  },
  {
    icon: ShoppingCart,
    titulo: "Vendas",
    itens: [
      "Escolha a cliente e adicione os produtos no carrinho.",
      "Ajuste a quantidade de cada item antes de finalizar.",
      "Escolha em quantas parcelas fica o crediário.",
      "Ao confirmar, sai o carnê da venda para baixar, imprimir ou enviar.",
      "No carnê use ⬇ baixar, 🖨 imprimir ou → enviar no WhatsApp.",
    ],
  },
  {
    icon: Wallet,
    titulo: "Financeiro — A Receber",
    itens: [
      "Lista todas as parcelas em aberto do crediário.",
      "Registrar Pagamento: escolha a parcela, digite o valor e como pagou.",
      "Se pagar a mais, o excedente abate as próximas parcelas sozinho.",
      "Dá para excluir uma parcela só (ícone da lixeira).",
      "Apagar tudo remove todas as parcelas em aberto — pede a senha de login.",
      "Use a busca de cliente e o relatório PDF de recebidos do período.",
    ],
  },
  {
    icon: Wallet,
    titulo: "Financeiro — A Pagar",
    itens: [
      "Cadastre contas da loja (aluguel, fornecedor, boletos etc.).",
      "Pode parcelar a conta na hora do cadastro.",
      "Dar Baixa marca a conta como paga e tira da lista.",
      "Relatórios PDF: pago do mês, últimos 3 meses ou 90 dias.",
    ],
  },
] as const;

export function ConfiguracoesDialog({
  onOpen,
}: {
  onOpen?: () => void;
}) {
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
        if (next) onOpen?.();
        if (!next) setAba("menu");
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-center gap-2 border-brand-red/20 text-brand-black/70 hover:bg-brand-cream"
          onClick={() => onOpen?.()}
        >
          <Settings className="h-4 w-4 text-brand-red" />
          Configurações
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {aba === "menu" && "Configurações"}
            {aba === "tutorial" && "Tutorial do sistema"}
            {aba === "senha" && "Trocar senha"}
          </DialogTitle>
          {aba === "menu" && (
            <DialogDescription>
              Tutorial completo e opções da conta.
            </DialogDescription>
          )}
          {aba === "tutorial" && (
            <DialogDescription>
              Passo a passo de cada tela do Dondoquinha.
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
                  Guia completo: estoque, clientes, vendas e financeiro
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

            <div className="space-y-3">
              {TUTORIAL_SECOES.map((secao, index) => {
                const Icon = secao.icon;
                return (
                  <section
                    key={secao.titulo}
                    className="rounded-xl border border-brand-red/10 bg-white p-3"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-red text-xs font-semibold text-white">
                        {index + 1}
                      </span>
                      <Icon className="h-4 w-4 shrink-0 text-brand-red" />
                      <h3 className="font-medium text-brand-black">{secao.titulo}</h3>
                    </div>
                    <ul className="space-y-1.5 pl-1">
                      {secao.itens.map((item) => (
                        <li
                          key={item}
                          className="flex gap-2 text-sm leading-relaxed text-brand-black/65"
                        >
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand-red/50" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>

            <div className="space-y-2 rounded-xl bg-brand-cream/60 px-3 py-3 text-xs leading-relaxed text-brand-black/65">
              <p className="font-medium text-brand-black/80">Dicas rápidas</p>
              <p>
                No celular, abra o menu pelo ícone ☰ no canto. Em Configurações
                você troca a senha e lê este tutorial de novo.
              </p>
              <p>
                Em qualquer janela, use o <strong className="font-medium text-brand-black/80">X</strong> para
                fechar. Se o conteúdo for longo, role a tela para baixo.
              </p>
              <p>
                Ordem sugerida no dia a dia: cadastre estoque → cadastre cliente →
                faça a venda → receba no Financeiro.
              </p>
            </div>
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
