import { PageHeader } from "@/components/PageHeader";
import { db } from "@/lib/db";
import { getInventoryBalances, getOpenOnOrderByProduct } from "@/lib/inventory";
import { createPurchaseOrder } from "@/lib/actions";
import { money, qty, shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ supplier?: string }> };

export default async function OrdersPage({ searchParams }: Props) {
  const params = await searchParams;
  const [suppliers, inventory, onOrder, orders] = await Promise.all([
    db.supplier.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    getInventoryBalances(),
    getOpenOnOrderByProduct(),
    db.purchaseOrder.findMany({ include: { supplier: true, items: true }, orderBy: { orderDate: "desc" }, take: 20 }),
  ]);
  const supplierId = params.supplier && suppliers.some(s => s.id === params.supplier) ? params.supplier : suppliers[0]?.id;
  const supplierProducts = supplierId ? await db.supplierProduct.findMany({
    where: { supplierId, active: true }, include: { product: { include: { inventoryUnit: true } }, purchaseUnit: true }, orderBy: { product: { name: "asc" } }
  }) : [];
  const invMap = new Map(inventory.map(p => [p.id, p]));

  return (
    <>
      <PageHeader title="Supplier Orders" subtitle="Review suggested quantities, adjust as needed, then create the purchase order." />
      <section className="card">
        <form method="get" className="form-grid">
          <label>Supplier<select name="supplier" defaultValue={supplierId}><option value="">Choose supplier</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <div style={{alignSelf:"end"}}><button className="btn secondary" type="submit">Load supplier</button></div>
        </form>
      </section>

      {supplierId && <section className="card">
        <h2>Create purchase order</h2>
        <form action={createPurchaseOrder}>
          <input type="hidden" name="supplierId" value={supplierId} />
          <div className="form-grid" style={{marginBottom:14}}><label>Expected delivery date<input type="date" name="expectedDeliveryDate" /></label></div>
          <div className="table-wrap"><table><thead><tr><th>Product</th><th>On hand</th><th>On order</th><th>Target stock</th><th>Pack</th><th>Price</th><th>Suggested</th><th>Order qty</th></tr></thead><tbody>
            {supplierProducts.map(sp => {
              const p = invMap.get(sp.productId);
              const onHand = p?.onHand ?? 0;
              const already = onOrder.get(sp.productId) ?? 0;
              const par = Number(p?.parLevel ?? 0);
              const pack = Number(sp.quantityPerPurchaseUnit);
              const needed = Math.max(0, par - onHand - already);
              const suggested = pack > 0 ? Math.ceil(needed / pack) : 0;
              return <tr key={sp.id}>
                <td><strong>{sp.product.name}</strong></td><td>{qty(onHand)} {sp.product.inventoryUnit.abbreviation}</td><td>{qty(already)}</td><td>{qty(par)}</td><td>{qty(pack)} {sp.product.inventoryUnit.abbreviation}/{sp.purchaseUnit.abbreviation}</td><td>{money(sp.purchasePrice)}</td><td><span className="badge">{suggested}</span></td><td style={{width:115}}><input type="number" min="0" step="1" name={`qty_${sp.id}`} defaultValue={suggested} /></td>
              </tr>;
            })}
          </tbody></table></div>
          <div style={{marginTop:16}}><button className="btn" type="submit">Create & mark sent</button></div>
        </form>
      </section>}

      <section className="card">
        <h2>Purchase order history</h2>
        <div className="table-wrap"><table><thead><tr><th>PO</th><th>Supplier</th><th>Date</th><th>Expected</th><th>Items</th><th>Total</th><th>Status</th></tr></thead><tbody>{orders.map(o => <tr key={o.id}><td className="mono">{o.poNumber}</td><td>{o.supplier.name}</td><td>{shortDate(o.orderDate)}</td><td>{shortDate(o.expectedDeliveryDate)}</td><td>{o.items.length}</td><td>{money(o.total)}</td><td><span className={`badge ${o.status === "RECEIVED" ? "ok" : "open"}`}>{o.status}</span></td></tr>)}</tbody></table></div>
      </section>
    </>
  );
}
