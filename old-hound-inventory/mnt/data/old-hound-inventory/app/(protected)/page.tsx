import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { db } from "@/lib/db";
import { getInventoryBalances } from "@/lib/inventory";
import { money, qty, shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const inventory = await getInventoryBalances();
  const low = inventory.filter((p) => p.onHand <= Number(p.reorderPoint));
  const inventoryValue = inventory.reduce((sum, p) => sum + p.onHand * Number(p.currentCost), 0);
  const openOrders = await db.purchaseOrder.findMany({
    where: { status: { in: ["DRAFT", "APPROVED", "SENT", "PARTIALLY_RECEIVED"] } },
    include: { supplier: true },
    orderBy: [{ expectedDeliveryDate: "asc" }, { orderDate: "desc" }],
  });
  const expected = openOrders.filter((o) => o.expectedDeliveryDate).slice(0, 5);

  return (
    <>
      <PageHeader title="Dashboard" subtitle="What needs attention today at The Old Hound." />
      <section className="stats">
        <StatCard label="Inventory value" value={money(inventoryValue)} note="Based on current unit costs" />
        <StatCard label="Items low" value={String(low.length)} note="At or below reorder point" />
        <StatCard label="Open orders" value={String(openOrders.length)} note="Sent, draft or partly received" />
        <StatCard label="Tracked products" value={String(inventory.length)} note="Active inventory items" />
      </section>

      <div className="grid-2">
        <section className="card">
          <div className="section-title"><h2>Items needing attention</h2><Link className="btn ghost" href="/inventory">View inventory</Link></div>
          {low.length ? low.slice(0, 8).map((p) => (
            <div className="low-row" key={p.id}>
              <div><strong>{p.name}</strong><span>{p.manufacturer?.name ?? "No manufacturer"} · {p.category.name}</span></div>
              <div style={{textAlign:"right"}}><strong>{qty(p.onHand)} {p.inventoryUnit.abbreviation}</strong><span>Target stock {qty(p.parLevel)}</span></div>
            </div>
          )) : <div className="empty">No products are below their reorder point.</div>}
        </section>

        <div>
          <section className="card">
            <h2>Quick actions</h2>
            <div className="quick-actions">
              <Link href="/stock-count">Count inventory</Link>
              <Link href="/orders">Create order</Link>
              <Link href="/receive">Receive delivery</Link>
              <Link href="/inventory">Adjust inventory</Link>
            </div>
          </section>

          <section className="card">
            <h2>Upcoming deliveries</h2>
            {expected.length ? expected.map((o) => (
              <div className="low-row" key={o.id}>
                <div><strong>{o.supplier.name}</strong><span className="mono">{o.poNumber}</span></div>
                <div style={{textAlign:"right"}}><strong>{shortDate(o.expectedDeliveryDate)}</strong><span>{money(o.total)}</span></div>
              </div>
            )) : <div className="empty">No dated deliveries are currently expected.</div>}
          </section>
        </div>
      </div>
    </>
  );
}

