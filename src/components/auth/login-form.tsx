"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "@/app/actions/auth";
import { LoginLoadingOverlay } from "@/components/ui/brand-spinner";
import { fetchAllAppData } from "@/lib/queries/fetch-page-data";
import "@/lib/queries/fetch-page-data";

interface LoginFormProps {
  redirectTo: string;
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);

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
