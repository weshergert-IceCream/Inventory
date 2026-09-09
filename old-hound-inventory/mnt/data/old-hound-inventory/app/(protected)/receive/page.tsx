import { PageHeader } from "@/components/PageHeader";
import { db } from "@/lib/db";
import { receivePurchaseOrder } from "@/lib/actions";
import { money, qty, shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ po?: string }> };

export default async function ReceivePage({ searchParams }: Props) {
  const params = await searchParams;
  const [locations, openOrders] = await Promise.all([
    db.location.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    db.purchaseOrder.findMany({
      where: { status: { in: ["SENT", "PARTIALLY_RECEIVED", "APPROVED"] } },
      include: { supplier: true, items: { include: { product: true } } },
      orderBy: [{ expectedDeliveryDate: "asc" }, { orderDate: "asc" }],
    }),
  ]);
  const poId = params.po && openOrders.some(o => o.id === params.po) ? params.po : openOrders[0]?.id;
  const po = openOrders.find(o => o.id === poId);

  return (
    <>
      <PageHeader title="Receive Delivery" subtitle="Receive against a purchase order and stock is added automatically." />
      <section className="card">
        <form method="get" className="form-grid">
          <label>Purchase order<select name="po" defaultValue={poId}><option value="">Choose PO</option>{openOrders.map(o => <option key={o.id} value={o.id}>{o.poNumber} — {o.supplier.name}</option>)}</select></label>
          <div style={{alignSelf:"end"}}><button className="btn secondary" type="submit">Load order</button></div>
        </form>
      </section>

      {po ? <section className="card">
        <div className="section-title"><div><h2>{po.supplier.name}</h2><div className="metric-note">{po.poNumber} · expected {shortDate(po.expectedDeliveryDate)} · {money(po.total)}</div></div><span className="badge open">{po.status}</span></div>
        <form action={receivePurchaseOrder}>
          <input type="hidden" name="purchaseOrderId" value={po.id} />
          <div className="form-grid" style={{marginBottom:16}}>
            <label>Put stock into location<select name="locationId" required defaultValue=""><option value="" disabled>Select location</option>{locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
            <label>Invoice number<input name="invoiceNumber" /></label>
            <label>Invoice total<input type="number" step="0.01" name="invoiceTotal" /></label>
          </div>
          <div className="table-wrap"><table><thead><tr><th>Product</th><th>Ordered</th><th>Previously received</th><th>Outstanding</th><th>Receive now</th></tr></thead><tbody>{po.items.map(i => {
            const outstanding = Math.max(0, Number(i.quantityOrdered) - Number(i.quantityReceived));
            return <tr key={i.id}><td><strong>{i.product.name}</strong></td><td>{qty(i.quantityOrdered)} {i.purchaseUnitLabel}</td><td>{qty(i.quantityReceived)}</td><td>{qty(outstanding)}</td><td style={{width:130}}><input type="number" min="0" max={outstanding} step="1" name={`recv_${i.id}`} defaultValue={outstanding} /></td></tr>;
          })}</tbody></table></div>
          <div style={{marginTop:16}}><button className="btn" type="submit">Complete receiving</button></div>
        </form>
      </section> : <div className="empty">There are no purchase orders waiting to be received.</div>}
    </>
  );
}
