"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppMessages } from "@/components/ui/app-messages";
import { abrirWhatsApp } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

interface WhatsAppButtonProps {
  telefone: string | null | undefined;
  mensagem: string;
  label?: string;
  size?: "xs" | "sm" | "default" | "icon";
  className?: string;
  showLabel?: boolean;
}

export function WhatsAppButton({
  telefone,
  mensagem,
  label = "WhatsApp",
  size = "sm",
  className,
  showLabel = true,
}: WhatsAppButtonProps) {
  const { toast } = useAppMessages();

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (!telefone?.trim()) {
      toast("Cliente sem telefone cadastrado.", "error");
      return;
    }
    if (!abrirWhatsApp(telefone, mensagem)) {
      toast("Telefone inválido para WhatsApp.", "error");
    }
  }

  if (size === "icon") {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleClick}
        className={cn("text-green-600 hover:text-green-700 hover:bg-green-50", className)}
        title={label}
      >
        <MessageCircle className="h-4 w-4" />
      </Button>
    );
  }

  if (size === "xs") {
    return (
      <Button
        type="button"
        onClick={handleClick}
        title={label}
        className={cn(
          "min-h-11 h-11 px-3 text-xs gap-1.5 bg-green-600 text-white hover:bg-green-700 active:bg-green-800 border-0 touch-manipulation",
          className
        )}
      >
        <MessageCircle className="h-3.5 w-3.5 shrink-0" />
        {showLabel && label}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size={size === "default" ? "default" : "sm"}
      onClick={handleClick}
      className={cn(
        "bg-green-600 text-white hover:bg-green-700 border-0",
        className
      )}
    >
      <MessageCircle className="h-4 w-4" />
      {showLabel && label}
    </Button>
  );
}
