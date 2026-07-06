"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertCircle, CheckCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
}

interface AppMessagesContextValue {
  toast: (message: string, type?: ToastType) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const AppMessagesContext = createContext<AppMessagesContextValue | null>(null);

export function useAppMessages() {
  const ctx = useContext(AppMessagesContext);
  if (!ctx) {
    throw new Error("useAppMessages deve ser usado dentro de AppMessagesProvider");
  }
  return ctx;
}

const toastStyles: Record<ToastType, string> = {
  success: "border-green-200 bg-green-50 text-green-900",
  error: "border-red-200 bg-red-50 text-red-900",
  info: "border-brand-red/20 bg-brand-cream text-brand-black",
};

const toastIcons: Record<ToastType, typeof Info> = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

export function AppMessagesProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { open: boolean }) | null>(
    null
  );
  const confirmResolve = useRef<((value: boolean) => void) | null>(null);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      confirmResolve.current = resolve;
      setConfirmState({ ...options, open: true });
    });
  }, []);

  function closeConfirm(result: boolean) {
    confirmResolve.current?.(result);
    confirmResolve.current = null;
    setConfirmState(null);
  }

  return (
    <AppMessagesContext.Provider value={{ toast, confirm }}>
      {children}

      <div
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const Icon = toastIcons[t.type];
          return (
            <div
              key={t.id}
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg animate-in slide-in-from-bottom-2 fade-in",
                toastStyles[t.type]
              )}
              role="alert"
            >
              <Icon className="h-5 w-5 shrink-0 mt-0.5" />
              <p className="text-sm flex-1">{t.message}</p>
              <button
                type="button"
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                className="shrink-0 opacity-60 hover:opacity-100"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      <Dialog
        open={confirmState?.open ?? false}
        onOpenChange={(open) => {
          if (!open) closeConfirm(false);
        }}
      >
        <DialogContent className="max-w-md" stackOnTop>
          <DialogHeader>
            <DialogTitle>{confirmState?.title}</DialogTitle>
            <DialogDescription className="text-base text-brand-black/70 pt-1">
              {confirmState?.message}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => closeConfirm(false)}>
              {confirmState?.cancelLabel ?? "Cancelar"}
            </Button>
            <Button
              type="button"
              variant={confirmState?.variant === "danger" ? "destructive" : "default"}
              onClick={() => closeConfirm(true)}
            >
              {confirmState?.confirmLabel ?? "Confirmar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppMessagesContext.Provider>
  );
}
