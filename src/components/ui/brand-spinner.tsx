import { cn } from "@/lib/utils";

interface BrandSpinnerProps {
  size?: number;
  className?: string;
  label?: string;
}

const SEGMENTS = 12;

/** Spinner circular com 12 barras nas cores da Dondoquinha. */
export function BrandSpinner({ size = 52, className, label }: BrandSpinnerProps) {
  const barHeight = Math.round(size * 0.26);
  const radius = Math.round(size * 0.36);

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div
        className="relative brand-spinner"
        style={{ width: size, height: size }}
        role="status"
        aria-label={label ?? "Carregando"}
      >
        {Array.from({ length: SEGMENTS }).map((_, i) => (
          <span
            key={i}
            className="brand-spinner-bar absolute left-1/2 top-1/2 block -ml-[6%] w-[12%] rounded-full bg-brand-red"
            style={{
              height: barHeight,
              transform: `rotate(${i * 30}deg) translateY(-${radius}px)`,
              animationDelay: `${-1.1 + i * 0.1}s`,
              opacity: 0.2 + (i / SEGMENTS) * 0.8,
            }}
          />
        ))}
      </div>
      {label && (
        <p className="text-sm font-medium text-brand-black/60 animate-pulse">{label}</p>
      )}
    </div>
  );
}

export function LoginLoadingOverlay({ message = "Preparando tudo para você..." }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gradient-to-br from-brand-cream/97 via-white/95 to-brand-cream/97 backdrop-blur-[2px]">
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-brand-red/10 bg-white/80 px-10 py-8 shadow-xl shadow-brand-red/10">
        <BrandSpinner size={56} />
        <p className="mt-2 text-sm font-medium text-brand-black/70">{message}</p>
        <p className="text-xs text-brand-black/40">Carregando menus e informações</p>
      </div>
    </div>
  );
}
