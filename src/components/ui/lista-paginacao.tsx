"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ListaPaginacaoProps {
  paginaAtual: number;
  totalPaginas: number;
  onSelecionarPagina: (pagina: number) => void;
  onProximaPagina: () => void;
}

export function ListaPaginacao({
  paginaAtual,
  totalPaginas,
  onSelecionarPagina,
  onProximaPagina,
}: ListaPaginacaoProps) {
  if (totalPaginas <= 1) return null;

  return (
    <div className="mt-3 flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((numero) => (
          <button
            key={numero}
            type="button"
            onClick={() => onSelecionarPagina(numero)}
            className={cn(
              "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-xs font-semibold transition-colors touch-manipulation select-none",
              paginaAtual === numero
                ? "bg-brand-red text-white"
                : "bg-brand-cream text-brand-black active:bg-brand-red/15"
            )}
            aria-label={`Página ${numero}`}
            aria-current={paginaAtual === numero ? "page" : undefined}
          >
            {numero}
          </button>
        ))}
      </div>
      {paginaAtual < totalPaginas && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 touch-manipulation px-4 text-xs"
          onClick={onProximaPagina}
        >
          <Plus className="h-4 w-4" />
          Ver mais
        </Button>
      )}
    </div>
  );
}
