"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoginLoadingOverlay } from "@/components/ui/brand-spinner";
import { fetchAllAppData } from "@/lib/queries/fetch-page-data";
import { isPasskeyLoginAvailable, loginWithPasskey } from "@/lib/passkey-client";
import "@/lib/queries/fetch-page-data";

interface LoginBiometriaProps {
  redirectTo: string;
  disabled?: boolean;
}

export function LoginBiometria({ redirectTo, disabled }: LoginBiometriaProps) {
  const router = useRouter();
  const [disponivel, setDisponivel] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void isPasskeyLoginAvailable().then(setDisponivel);
  }, []);

  if (!disponivel) return null;

  async function handleLoginBiometria() {
    setError(null);
    setCarregando(true);

    const destino = redirectTo.startsWith("/") ? redirectTo : "/dashboard";

    try {
      await Promise.all([loginWithPasskey(), fetchAllAppData()]);
      router.push(destino);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível entrar.";
      setError(message);
      setCarregando(false);
    }
  }

  return (
    <>
      {carregando && <LoginLoadingOverlay />}

      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          className="w-full border-brand-red/25"
          size="lg"
          onClick={handleLoginBiometria}
          disabled={disabled || carregando}
        >
          <Fingerprint className="h-5 w-5 text-brand-red" />
          Entrar com digital ou Face ID
        </Button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </>
  );
}
