import { PageHeader } from "@/components/PageHeader";
import { db } from "@/lib/db";
import { getInventoryBalances } from "@/lib/inventory";
import { money, qty } from "@/lib/format";
import { createManualAdjustment } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const [inventory, locations] = await Promise.all([
    getInventoryBalances(),
    db.location.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <>
      <PageHeader title="Inventory" subtitle="Current stock is calculated from inventory transactions." />
      <section className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Product</th><th>Manufacturer</th><th>Category</th><th>On hand</th><th>Target stock</th><th>Reorder</th><th>Value</th><th>Status</th></tr></thead>
            <tbody>
              {inventory.map((p) => {
                const low = p.onHand <= Number(p.reorderPoint);
                return <tr key={p.id}>
                  <td><strong>{p.name}</strong><div style={{fontSize:12,color:"var(--muted)"}}>{p.sku ?? "No SKU"}</div></td>
                  <td>{p.manufacturer?.name ?? "—"}</td>
                  <td>{p.category.name}</td>
                  <td>{qty(p.onHand)} {p.inventoryUnit.abbreviation}</td>
                  <td>{qty(p.parLevel)}</td>
                  <td>{qty(p.reorderPoint)}</td>
                  <td>{money(p.onHand * Number(p.currentCost))}</td>
                  <td><span className={`badge ${low ? "low" : "ok"}`}>{low ? "LOW" : "OK"}</span></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>Manual adjustment</h2>
        <p className="metric-note">Use for corrections that are not part of a physical stock count or delivery. Positive adds stock; negative removes stock.</p>
        <form action={createManualAdjustment} className="form-grid">
          <label>Product<select name="productId" required defaultValue=""><option value="" disabled>Select product</option>{inventory.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label>Location<select name="locationId" required defaultValue=""><option value="" disabled>Select location</option>{locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
          <label>Quantity change<input type="number" step="0.001" name="quantity" placeholder="e.g. -2 or 12" required /></label>
          <label>Reason / note<input name="notes" placeholder="Reason for adjustment" /></label>
          <div className="full"><button className="btn" type="submit">Record adjustment</button></div>
        </form>
      </section>
    </>
  );
}
