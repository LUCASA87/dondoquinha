import { PageHeader } from "@/components/layout/page-header";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { getDashboardStats } from "@/lib/queries/dashboard";

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div>
      <PageHeader
        title="Olá! 👋"
        description="Veja um resumo do seu estoque e lucro estimado."
      />
      <StatsCards initialStats={stats} />
    </div>
  );
}
