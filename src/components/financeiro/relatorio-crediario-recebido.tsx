"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppMessages } from "@/components/ui/app-messages";
import { getRecebimentosCrediario } from "@/lib/mutations/financeiro";
import { baixarRelatorioCrediarioRecebidoPDF } from "@/lib/relatorio-crediario-recebido-pdf";

function inicioMesAtual(): string {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split("T")[0];
}

function hojeISO(): string {
  return new Date().toISOString().split("T")[0];
}

export function RelatorioCrediarioRecebido() {
  const { toast } = useAppMessages();
  const [dataInicio, setDataInicio] = useState(inicioMesAtual);
  const [dataFim, setDataFim] = useState(hojeISO);
  const [gerando, setGerando] = useState(false);

  async function gerarPDF() {
    setGerando(true);
    try {
      const result = await getRecebimentosCrediario(dataInicio, dataFim);
      if ("error" in result) {
        toast(result.error, "error");
        return;
      }
      if (result.linhas.length === 0) {
        toast("Nenhum recebimento neste período.", "info");
        return;
      }
      await baixarRelatorioCrediarioRecebidoPDF({
        titulo: "Crediário recebido",
        dataInicio: result.dataInicio,
        dataFim: result.dataFim,
        linhas: result.linhas,
        total: result.total,
      });
      toast("PDF do crediário baixado.", "success");
    } catch {
      toast("Não foi possível gerar o PDF.", "error");
    } finally {
      setGerando(false);
    }
  }

  return (
    <Card className="border-brand-red/15 bg-brand-cream/30">
      <CardContent className="pt-4 pb-4 space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-red">
          Relatório PDF — Crediário recebido
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="crediario_data_inicio" className="text-xs">
              Data inicial
            </Label>
            <Input
              id="crediario_data_inicio"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="crediario_data_fim" className="text-xs">
              Data final
            </Label>
            <Input
              id="crediario_data_fim"
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="touch-manipulation"
          disabled={gerando}
          onClick={gerarPDF}
        >
          {gerando ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4" />
          )}
          Gerar PDF do período
        </Button>
        <p className="text-[10px] text-brand-black/45">
          Lista os pagamentos recebidos no crediário entre as datas escolhidas.
        </p>
      </CardContent>
    </Card>
  );
}
