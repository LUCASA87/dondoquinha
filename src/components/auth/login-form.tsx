"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "@/app/actions/auth";
import { LoginLoadingOverlay } from "@/components/ui/brand-spinner";
import { useAppMessages } from "@/components/ui/app-messages";
import { fetchAllAppData } from "@/lib/queries/fetch-page-data";
import {
  isPasskeyLoginAvailable,
  registerPasskeyOnDevice,
} from "@/lib/passkey-client";
import { platformAuthenticatorIsAvailable } from "@simplewebauthn/browser";
import { LoginBiometria } from "@/components/auth/login-biometria";
import "@/lib/queries/fetch-page-data";

interface LoginFormProps {
  redirectTo: string;
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  const router = useRouter();
  const { confirm, toast } = useAppMessages();
  const [error, setError] = useState<string | null>(null);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [temBiometria, setTemBiometria] = useState(false);

  useEffect(() => {
    void isPasskeyLoginAvailable().then(setTemBiometria);
  }, []);

  async function oferecerLoginRapido() {
    try {
      const jaTemPasskey = await isPasskeyLoginAvailable();
      if (jaTemPasskey) return;

      const biometriaDisponivel = await platformAuthenticatorIsAvailable();
      if (!biometriaDisponivel) return;

      const ativar = await confirm({
        title: "Login rápido neste celular",
        message:
          "Deseja ativar entrada com digital ou Face ID para os próximos acessos?",
        confirmLabel: "Ativar",
        cancelLabel: "Agora não",
      });

      if (!ativar) return;

      await registerPasskeyOnDevice();
      toast("Login rápido ativado neste aparelho.", "success");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível ativar o login rápido.";
      toast(message, "error");
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setCarregando(true);

    const formData = new FormData(e.currentTarget);
    const destino = redirectTo.startsWith("/") ? redirectTo : "/dashboard";

    try {
      const [loginResult] = await Promise.all([
        loginAction(formData),
        fetchAllAppData(),
      ]);

      if (loginResult?.error) {
        setError(loginResult.error);
        setCarregando(false);
        return;
      }

      await oferecerLoginRapido();

      router.push(destino);
      router.refresh();
    } catch {
      setError("Não foi possível entrar. Tente novamente.");
      setCarregando(false);
    }
  }

  return (
    <>
      {carregando && <LoginLoadingOverlay />}

      <LoginBiometria redirectTo={redirectTo} disabled={carregando} />

      {temBiometria && (
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-brand-red/15" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-wider">
            <span className="bg-white px-3 text-brand-black/45">ou entre com senha</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Usuário</Label>
          <Input
            id="username"
            name="username"
            autoComplete="username"
            required
            defaultValue="dondoquinha"
            placeholder="dondoquinha"
            className="lowercase"
            disabled={carregando}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={mostrarSenha ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="••••••"
              className="pr-11"
              disabled={carregando}
            />
            <button
              type="button"
              onClick={() => setMostrarSenha((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-brand-black/45 hover:text-brand-red"
              aria-label={mostrarSenha ? "Ocultar senha" : "Ver senha"}
              disabled={carregando}
            >
              {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full" size="lg" disabled={carregando}>
          {carregando ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </>
  );
}
