import { PageHeader } from "@/components/PageHeader";
import { db } from "@/lib/db";
import { money, qty, shortDate } from "@/lib/format";
import { updateDeliveryHistory, updatePurchaseOrderHistory } from "@/lib/actions";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    from?: string;
    to?: string;
    supplier?: string;
    type?: string;
  }>;
};

function inputDate(value: Date | null | undefined) {
  if (!value) return "";
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseStart(value?: string) {
  return value ? new Date(`${value}T00:00:00`) : undefined;
}

function parseEnd(value?: string) {
  return value ? new Date(`${value}T23:59:59.999`) : undefined;
}

function statusLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function HistoryPage({ searchParams }: Props) {
  const params = await searchParams;
  const from = parseStart(params.from);
  const to = parseEnd(params.to);
  const supplierId = params.supplier || "";
  const recordType = params.type === "orders" || params.type === "received" ? params.type : "all";

  const [suppliers, orders, deliveries] = await Promise.all([
    db.supplier.findMany({ orderBy: { name: "asc" } }),
    recordType === "received"
      ? Promise.resolve([])
      : db.purchaseOrder.findMany({
          where: {
            ...(supplierId ? { supplierId } : {}),
            ...(from || to ? { orderDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
          },
          include: {
            supplier: true,
            items: { include: { product: true } },
          },
          orderBy: { orderDate: "desc" },
        }),
    recordType === "orders"
      ? Promise.resolve([])
      : db.delivery.findMany({
          where: {
            ...(supplierId ? { supplierId } : {}),
            ...(from || to ? { deliveryDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
          },
          include: {
            supplier: true,
            purchaseOrder: true,
            items: { include: { product: true } },
          },
          orderBy: { deliveryDate: "desc" },
        }),
  ]);

  const allOrdersForTotals = await db.purchaseOrder.findMany({
    where: {
      status: { not: "CANCELLED" },
      ...(supplierId ? { supplierId } : {}),
      ...(from || to ? { orderDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    },
    select: { supplierId: true, total: true },
  });

  const allDeliveriesForTotals = await db.delivery.findMany({
    where: {
      status: "COMPLETED",
      ...(supplierId ? { supplierId } : {}),
      ...(from || to ? { deliveryDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    },
    include: { items: true },
  });

  const totals = new Map<string, { ordered: number; orderCount: number; received: number; deliveryCount: number }>();
  for (const order of allOrdersForTotals) {
    const current = totals.get(order.supplierId) ?? { ordered: 0, orderCount: 0, received: 0, deliveryCount: 0 };
    current.ordered += Number(order.total);
    current.orderCount += 1;
    totals.set(order.supplierId, current);
  }
  for (const delivery of allDeliveriesForTotals) {
    const current = totals.get(delivery.supplierId) ?? { ordered: 0, orderCount: 0, received: 0, deliveryCount: 0 };
    const calculated = delivery.items.reduce(
      (sum, item) => sum + Number(item.inventoryQuantityReceived) * Number(item.actualUnitCost ?? 0),
      0,
    );
    current.received += delivery.invoiceTotal == null ? calculated : Number(delivery.invoiceTotal);
    current.deliveryCount += 1;
    totals.set(delivery.supplierId, current);
  }

  const supplierName = new Map(suppliers.map((s) => [s.id, s.name]));
  const supplierRows = Array.from(totals.entries())
    .map(([id, value]) => ({ id, name: supplierName.get(id) ?? "Unknown supplier", ...value }))
    .sort((a, b) => b.ordered - a.ordered);

  const totalOrdered = supplierRows.reduce((sum, row) => sum + row.ordered, 0);
  const totalReceived = supplierRows.reduce((sum, row) => sum + row.received, 0);

  const timeline = [
    ...orders.map((order) => ({ type: "order" as const, date: order.orderDate, record: order })),
    ...deliveries.map((delivery) => ({ type: "received" as const, date: delivery.deliveryDate, record: delivery })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <>
      <PageHeader title="Order History" subtitle="A searchable timeline of purchase orders and received shipments." />

      <section className="card">
        <form method="get" className="history-filters">
          <label>From<input type="date" name="from" defaultValue={params.from ?? ""} /></label>
          <label>To<input type="date" name="to" defaultValue={params.to ?? ""} /></label>
          <label>Supplier<select name="supplier" defaultValue={supplierId}><option value="">All suppliers</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <label>Show<select name="type" defaultValue={recordType}><option value="all">Orders & received shipments</option><option value="orders">Orders only</option><option value="received">Received shipments only</option></select></label>
          <button className="btn" type="submit">Apply filters</button>
        </form>
      </section>

      <section className="history-summary">
        <div className="stat-card"><span>Amount ordered</span><strong>{money(totalOrdered)}</strong><small>{allOrdersForTotals.length} purchase orders</small></div>
        <div className="stat-card"><span>Amount received</span><strong>{money(totalReceived)}</strong><small>{allDeliveriesForTotals.length} received shipments</small></div>
        <div className="stat-card"><span>Suppliers</span><strong>{supplierRows.length}</strong><small>In the selected period</small></div>
        <div className="stat-card"><span>Timeline records</span><strong>{timeline.length}</strong><small>Matching current filters</small></div>
      </section>

      <section className="card">
        <h2>Supplier totals</h2>
        {supplierRows.length ? <div className="table-wrap"><table className="supplier-totals"><thead><tr><th>Supplier</th><th>Orders</th><th>Amount ordered</th><th>Shipments</th><th>Amount received</th></tr></thead><tbody>{supplierRows.map((row) => <tr key={row.id}><td><strong>{row.name}</strong></td><td>{row.orderCount}</td><td>{money(row.ordered)}</td><td>{row.deliveryCount}</td><td>{money(row.received)}</td></tr>)}</tbody></table></div> : <div className="empty">No supplier activity matches this period.</div>}
      </section>

      <section className="card">
        <h2>Timeline</h2>
        {timeline.length ? <div className="timeline">{timeline.map((entry) => {
          if (entry.type === "order") {
            const order = entry.record;
            return <details className="timeline-item" key={`order-${order.id}`}>
              <summary>
                <span className="timeline-date">{shortDate(order.orderDate)}</span>
                <strong className="timeline-supplier">{order.supplier.name}</strong>
                <span className="timeline-reference mono">{order.poNumber}</span>
                <span className="timeline-status"><span className="badge open">{statusLabel(order.status)}</span></span>
                <span className="timeline-amount">{money(order.total)}</span>
              </summary>
              <div className="timeline-detail">
                <div className="timeline-detail-grid">
                  <div>
                    <div className="section-title"><h3>Order contents</h3><span className="timeline-kind">Order</span></div>
                    <div className="table-wrap"><table><thead><tr><th>Product</th><th>Ordered</th><th>Received</th><th>Unit price</th><th>Line total</th></tr></thead><tbody>{order.items.map((item) => <tr key={item.id}><td><strong>{item.product.name}</strong></td><td>{qty(item.quantityOrdered)} {item.purchaseUnitLabel}</td><td>{qty(item.quantityReceived)} {item.purchaseUnitLabel}</td><td>{money(item.unitPrice)}</td><td>{money(item.lineTotal)}</td></tr>)}</tbody></table></div>
                  </div>
                  <form action={updatePurchaseOrderHistory} className="history-edit form-grid single">
                    <h3>Edit order history</h3>
                    <input type="hidden" name="id" value={order.id} />
                    <label>Order date<input type="date" name="orderDate" defaultValue={inputDate(order.orderDate)} /></label>
                    <label>Expected delivery<input type="date" name="expectedDeliveryDate" defaultValue={inputDate(order.expectedDeliveryDate)} /></label>
                    <label>Supplier confirmation<input name="supplierConfirmation" defaultValue={order.supplierConfirmation ?? ""} /></label>
                    <label>Notes<textarea name="notes" rows={3} defaultValue={order.notes ?? ""} /></label>
                    <button className="btn secondary" type="submit">Save order details</button>
                  </form>
                </div>
              </div>
            </details>;
          }

          const delivery = entry.record;
          const receivedAmount = delivery.invoiceTotal == null
            ? delivery.items.reduce((sum, item) => sum + Number(item.inventoryQuantityReceived) * Number(item.actualUnitCost ?? 0), 0)
            : Number(delivery.invoiceTotal);
          return <details className="timeline-item" key={`delivery-${delivery.id}`}>
            <summary>
              <span className="timeline-date">{shortDate(delivery.deliveryDate)}</span>
              <strong className="timeline-supplier">{delivery.supplier.name}</strong>
              <span className="timeline-reference mono">{delivery.invoiceNumber || delivery.purchaseOrder?.poNumber || "Received shipment"}</span>
              <span className="timeline-status"><span className="badge ok">Received</span></span>
              <span className="timeline-amount">{money(receivedAmount)}</span>
            </summary>
            <div className="timeline-detail">
              <div className="timeline-detail-grid">
                <div>
                  <div className="section-title"><h3>Shipment contents</h3><span className="timeline-kind received">Received</span></div>
                  <div className="metric-note">{delivery.purchaseOrder ? `Against ${delivery.purchaseOrder.poNumber}` : "Not linked to a purchase order"}</div>
                  <div className="table-wrap"><table><thead><tr><th>Product</th><th>Received</th><th>Inventory added</th><th>Actual unit cost</th></tr></thead><tbody>{delivery.items.map((item) => <tr key={item.id}><td><strong>{item.product.name}</strong></td><td>{qty(item.quantityReceived)} {item.purchaseUnitLabel}</td><td>{qty(item.inventoryQuantityReceived)}</td><td>{money(item.actualUnitCost)}</td></tr>)}</tbody></table></div>
                </div>
                <form action={updateDeliveryHistory} className="history-edit form-grid single">
                  <h3>Edit received shipment</h3>
                  <input type="hidden" name="id" value={delivery.id} />
                  <label>Received date<input type="date" name="deliveryDate" defaultValue={inputDate(delivery.deliveryDate)} /></label>
                  <label>Invoice number<input name="invoiceNumber" defaultValue={delivery.invoiceNumber ?? ""} /></label>
                  <label>Invoice total<input type="number" step="0.01" min="0" name="invoiceTotal" defaultValue={delivery.invoiceTotal?.toString() ?? ""} /></label>
                  <label>Notes<textarea name="notes" rows={3} defaultValue={delivery.notes ?? ""} /></label>
                  <button className="btn secondary" type="submit">Save shipment details</button>
                </form>
              </div>
            </div>
          </details>;
        })}</div> : <div className="empty">No orders or received shipments match these filters.</div>}
      </section>
    </>
  );
}
