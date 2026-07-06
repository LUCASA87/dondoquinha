import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface SelecaoBotoesProps {
  label: string;
  opcoes: number[];
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
}

export function SelecaoBotoes({
  label,
  opcoes,
  value,
  onChange,
  suffix = "x",
}: SelecaoBotoesProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {opcoes.map((n) => {
          const selecionado = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={cn(
                "min-w-[3rem] rounded-lg px-4 py-2.5 text-base font-medium transition-colors",
                selecionado
                  ? "bg-brand-red text-white shadow-sm"
                  : "border border-brand-black/15 bg-white text-brand-black/70 hover:bg-brand-cream hover:text-brand-black"
              )}
            >
              {n}{suffix}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const OPCOES_PARCELAS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

interface ParcelaOpcao {
  id: string;
  numero: number;
  saldo: number;
  labelExtra?: string;
}

interface SelecaoParcelaDebitoProps {
  label?: string;
  parcelas: ParcelaOpcao[];
  value: string | null;
  onChange: (id: string) => void;
  formatCurrency: (v: number) => string;
}

export function SelecaoParcelaDebito({
  label = "Selecione a parcela",
  parcelas,
  value,
  onChange,
  formatCurrency,
}: SelecaoParcelaDebitoProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {parcelas.map((p) => {
          const selecionado = value === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(p.id)}
              className={cn(
                "rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                selecionado
                  ? "bg-brand-red text-white shadow-sm"
                  : "border border-brand-black/15 bg-white text-brand-black/70 hover:bg-brand-cream hover:text-brand-black"
              )}
            >
              {p.numero}ª · {formatCurrency(p.saldo)}
              {p.labelExtra ? ` · ${p.labelExtra}` : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}
