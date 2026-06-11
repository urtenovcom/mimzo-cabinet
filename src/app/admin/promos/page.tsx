import { listPromos } from "@/lib/admin-data";
import { PromoAdmin } from "./promo-admin";

export const dynamic = "force-dynamic";

export default async function AdminPromos() {
  const promos = await listPromos();
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Промокоды
        </h1>
        <p className="text-sm text-muted-foreground">
          Создавай и управляй промокодами прямо здесь.
        </p>
      </header>
      <PromoAdmin
        promos={promos.map((p) => ({
          id: p.id,
          code: p.code,
          grant_devices: p.grant_devices,
          grant_traffic_gb: p.grant_traffic_gb,
          grant_days: p.grant_days,
          uses_count: p.uses_count,
          uses_total: p.uses_total,
          is_active: p.is_active,
        }))}
      />
    </div>
  );
}
