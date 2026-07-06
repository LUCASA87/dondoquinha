"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { changePasswordAction } from "@/app/actions/auth";
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

    if (senhaNova !== senhaConfirmar) {
      setError("A confirmação da nova senha não confere.");
      return;
    }

    startTransition(async () => {
      const result = await changePasswordAction(senhaAtual, senhaNova);
      if (result.error) {
        setError(result.error);
        return;
      }

      toast("Senha alterada com sucesso.", "success");
      resetForm();
      setOpen(false);
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
