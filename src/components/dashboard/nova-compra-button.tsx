import Link from "next/link";
import { Plus, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

interface NovaCompraButtonProps {
  className?: string;
}

export function NovaCompraButton({ className }: NovaCompraButtonProps) {
  return (
    <Link
      href="/vendas"
      aria-label="Nova compra"
      title="Nova compra"
      className={cn(
        "relative inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-red text-white shadow-md shadow-brand-red/25 transition-colors hover:bg-brand-red/90 lg:h-11 lg:w-11",
        className
      )}
    >
      <ShoppingCart className="h-5 w-5" />
      <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-brand-red ring-2 ring-brand-red lg:h-5 lg:w-5">
        <Plus className="h-2.5 w-2.5 lg:h-3 lg:w-3" strokeWidth={3} />
      </span>
    </Link>
  );
}
