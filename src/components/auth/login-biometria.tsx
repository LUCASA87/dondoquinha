"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoginLoadingOverlay } from "@/components/ui/brand-spinner";
import { prefetchAllAppData } from "@/lib/queries/fetch-page-data";
import { canUsePasskeyLogin, loginWithPasskey } from "@/lib/passkey-client";
import "@/lib/queries/fetch-page-data";

interface LoginBiometriaProps {
  redirectTo: string;
  disabled?: boolean;
  onDisponivelChange?: (disponivel: boolean) => void;
}

export function LoginBiometria({
  redirectTo,
  disabled,
  onDisponivelChange,
}: LoginBiometriaProps) {
  const router = useRouter();
  const [disponivel, setDisponivel] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void canUsePasskeyLogin().then((ok) => {
      setDisponivel(ok);
      onDisponivelChange?.(ok);
    });
  }, [onDisponivelChange]);

  if (!disponivel) return null;

  async function handleLoginBiometria() {
    setError(null);
    setCarregando(true);

    const destino = redirectTo.startsWith("/") ? redirectTo : "/dashboard";

    try {
      await loginWithPasskey();
      prefetchAllAppData();
      router.push(destino);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível entrar.";
      setError(message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <>
      {carregando && <LoginLoadingOverlay message="Verificando senha do celular..." />}

      <div className="space-y-2">
        <Button
          type="button"
          variant="default"
          className="w-full"
          size="lg"
          onClick={handleLoginBiometria}
          disabled={disabled || carregando}
        >
          <Fingerprint className="h-5 w-5" />
          Entrar com senha do celular
        </Button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </>
  );
}
