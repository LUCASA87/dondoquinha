"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { checkDefaultPasswordAction } from "@/app/actions/auth";
import { hashPassword, verifyPassword } from "@/lib/auth-password";
import { createClient } from "@/lib/supabase/client";
import { LOJA } from "@/lib/store";
import { formatConnectionError } from "@/lib/format-error";
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
import { useAppMessages } from "@/components/ui/app-messages";

function CampoSenha({
  id,
  label,
  name,
  value,
  onChange,
  mostrar,
  onToggleMostrar,
}: {
  id: string;
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  mostrar: boolean;
  onToggleMostrar: () => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={mostrar ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          className="pr-11"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={onToggleMostrar}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-brand-black/45 hover:text-brand-red"
          aria-label={mostrar ? "Ocultar senha" : "Ver senha"}
        >
          {mostrar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function mapSupabaseError(message: string): string {
  if (message.includes("app_credenciais")) {
    return "Tabela de senhas não encontrada. Rode a migration 008 no Supabase.";
  }
  return formatConnectionError(message);
}

async function validarSenhaAtual(
  senhaAtual: string,
  senhaHash: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (senhaHash) {
    const valida = await verifyPassword(senhaAtual, senhaHash);
    if (!valida) {
      return { ok: false, error: "Senha atual incorreta." };
    }
    return { ok: true };
  }

  try {
    const result = await checkDefaultPasswordAction(senhaAtual);
    if ("error" in result && result.error) {
      return { ok: false, error: result.error };
    }
    if (!result.valid) {
      return { ok: false, error: "Senha atual incorreta." };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao validar senha.";
    return { ok: false, error: formatConnectionError(message) };
  }
}

export function TrocarSenhaDialog() {
  const { toast } = useAppMessages();
  const [open, setOpen] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [senhaNova, setSenhaNova] = useState("");
  const [senhaConfirmar, setSenhaConfirmar] = useState("");
  const [mostrarAtual, setMostrarAtual] = useState(false);
  const [mostrarNova, setMostrarNova] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function resetForm() {
    setSenhaAtual("");
    setSenhaNova("");
    setSenhaConfirmar("");
    setMostrarAtual(false);
    setMostrarNova(false);
    setMostrarConfirmar(false);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const atual = senhaAtual.trim();
    const nova = senhaNova.trim();

    if (nova !== senhaConfirmar.trim()) {
      setError("A confirmação da nova senha não confere.");
      return;
    }

    if (nova.length < 4) {
      setError("A nova senha deve ter pelo menos 4 caracteres.");
      return;
    }

    if (atual === nova) {
      setError("A nova senha deve ser diferente da atual.");
      return;
    }

    startTransition(async () => {
      try {
        const supabase = createClient();
        const { data: credenciais, error: fetchError } = await supabase
          .from("app_credenciais")
          .select("senha_hash")
          .eq("id", 1)
          .maybeSingle();

        if (fetchError) {
          setError(mapSupabaseError(fetchError.message));
          return;
        }

        const validacao = await validarSenhaAtual(atual, credenciais?.senha_hash ?? null);
        if (!validacao.ok) {
          setError(validacao.error);
          return;
        }

        const senha_hash = await hashPassword(nova);
        const { error: dbError } = await supabase.from("app_credenciais").upsert({
          id: 1,
          usuario: LOJA.nome.toLowerCase(),
          senha_hash,
          updated_at: new Date().toISOString(),
        });

        if (dbError) {
          setError(mapSupabaseError(dbError.message));
          return;
        }

        toast("Senha alterada com sucesso.", "success");
        resetForm();
        setOpen(false);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao trocar senha.";
        setError(formatConnectionError(message));
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-center gap-2 border-brand-red/20 text-brand-black/70 hover:bg-brand-cream"
        >
          <KeyRound className="h-4 w-4 text-brand-red" />
          Trocar senha
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Trocar senha</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <CampoSenha
            id="senha_atual"
            label="Senha atual"
            name="senha_atual"
            value={senhaAtual}
            onChange={setSenhaAtual}
            mostrar={mostrarAtual}
            onToggleMostrar={() => setMostrarAtual((v) => !v)}
          />
          <CampoSenha
            id="senha_nova"
            label="Nova senha"
            name="senha_nova"
            value={senhaNova}
            onChange={setSenhaNova}
            mostrar={mostrarNova}
            onToggleMostrar={() => setMostrarNova((v) => !v)}
          />
          <CampoSenha
            id="senha_confirmar"
            label="Confirmar nova senha"
            name="senha_confirmar"
            value={senhaConfirmar}
            onChange={setSenhaConfirmar}
            mostrar={mostrarConfirmar}
            onToggleMostrar={() => setMostrarConfirmar((v) => !v)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Salvando..." : "Salvar nova senha"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
