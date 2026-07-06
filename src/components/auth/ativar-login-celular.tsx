"use client";

import { useState, useEffect } from "react";
import { Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loginAction } from "@/app/actions/auth";
import { LoginLoadingOverlay } from "@/components/ui/brand-spinner";
import { useAppMessages } from "@/components/ui/app-messages";
import {
  canActivatePasskeyLogin,
  registerPasskeyOnDevice,
} from "@/lib/passkey-client";

interface AtivarLoginCelularProps {
  disabled?: boolean;
  getCredentials: () => { username: string; password: string };
  onAtivado?: () => void;
}

export function AtivarLoginCelular({
  disabled,
  getCredentials,
  onAtivado,
}: AtivarLoginCelularProps) {
  const { toast } = useAppMessages();
  const [visivel, setVisivel] = useState(false);
  const [ativando, setAtivando] = useState(false);

  useEffect(() => {
    void canActivatePasskeyLogin().then(setVisivel);
  }, []);

  if (!visivel) return null;

  async function handleAtivar() {
    const { username, password } = getCredentials();

    if (!password.trim()) {
      toast("Digite sua senha acima para ativar o login do celular.", "info");
      return;
    }

    setAtivando(true);

    try {
      const formData = new FormData();
      formData.set("username", username);
      formData.set("password", password);

      const loginResult = await loginAction(formData);
      if (loginResult?.error) {
        toast(loginResult.error, "error");
        return;
      }

      await registerPasskeyOnDevice();
      setVisivel(false);
      onAtivado?.();
      toast("Login com senha do celular ativado neste aparelho.", "success");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível ativar o login do celular.";
      toast(message, "error");
    } finally {
      setAtivando(false);
    }
  }

  return (
    <>
      {ativando && <LoginLoadingOverlay message="Ativando login do celular..." />}

      <Button
        type="button"
        variant="outline"
        className="w-full border-brand-red/25 text-brand-black/80"
        size="lg"
        onClick={handleAtivar}
        disabled={disabled || ativando}
      >
        <Smartphone className="h-5 w-5 text-brand-red" />
        Ativar login com senha do celular
      </Button>
    </>
  );
}
