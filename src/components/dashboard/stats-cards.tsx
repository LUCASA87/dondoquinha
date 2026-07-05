"use client";

import { useEffect, useState } from "react";
import { Package, TrendingUp, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/format";
import type { DashboardStats } from "@/types/database";

interface StatsCardsProps {
  initialStats: DashboardStats;
}

export function StatsCards({ initialStats }: StatsCardsProps) {
  const [stats, setStats] = useState(initialStats);

  useEffect(() => {
    const supabase = createClient();

    async function fetchStats() {
      const { data } = await supabase
        .from("produtos")
        .select("quantidade, preco_custo, preco_venda");

      if (!data) return;

      let totalCusto = 0;
      let totalVenda = 0;

      for (const p of data) {
        totalCusto += Number(p.quantidade) * Number(p.preco_custo);
        totalVenda += Number(p.quantidade) * Number(p.preco_venda);
      }

      setStats({
        totalCusto,
        totalVenda,
        lucroEstimado: totalVenda - totalCusto,
      });
    }

    const channel = supabase
      .channel("produtos-dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "produtos" },
        () => fetchStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const cards = [
    {
      title: "Valor Total em Custo",
      value: formatCurrency(stats.totalCusto),
      description: "Quanto você investiu no estoque",
      icon: Package,
      color: "text-brand-black",
      bg: "bg-brand-cream",
    },
    {
      title: "Valor Total em Venda",
      value: formatCurrency(stats.totalVenda),
      description: "Quanto vale tudo se vender",
      icon: DollarSign,
      color: "text-brand-red",
      bg: "bg-brand-red/5",
    },
    {
      title: "Lucro Total Estimado",
      value: formatCurrency(stats.lucroEstimado),
      description: "Diferença entre venda e custo",
      icon: TrendingUp,
      color: "text-green-700",
      bg: "bg-green-50",
    },
  ];

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title} className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium text-brand-black/70">
              {card.title}
            </CardTitle>
            <div className={`rounded-xl p-2.5 ${card.bg}`}>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-brand-black">{card.value}</p>
            <p className="mt-2 text-sm text-brand-black/50">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
