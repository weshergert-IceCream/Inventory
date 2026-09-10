import { PageHeader } from "@/components/PageHeader";
import { db } from "@/lib/db";
import {
  createCategory, createLocation, createManufacturer, createProduct, createSupplier, createSupplierProduct, createUnit,
  updateLocation, updateManufacturer, updateProduct, updateSupplier, deleteProduct, deleteLocation,
} from "@/lib/actions";
import { money, qty } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SetupPage({ searchParams }: { searchParams: Promise<{ deleteError?: string; deleted?: string }> }) {
  const params = await searchParams;
  const [manufacturers, suppliers, categories, units, locations, products, supplierProducts] = await Promise.all([
    db.manufacturer.findMany({ orderBy: { name: "asc" } }),
    db.supplier.findMany({ orderBy: { name: "asc" } }),
    db.productCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    db.unit.findMany({ orderBy: { name: "asc" } }),
    db.location.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    db.product.findMany({ include: { manufacturer: true, category: true, inventoryUnit: true }, orderBy: { name: "asc" }, take: 500 }),
    db.supplierProduct.findMany({ include: { supplier: true, product: true, purchaseUnit: true }, orderBy: { createdAt: "desc" }, take: 200 }),
  ]);

  return (
    <>
      <PageHeader title="Products & Setup" subtitle="Add new master data or edit records already entered." />
      {params.deleteError ? <div className="alert error">{params.deleteError}</div> : null}
      {params.deleted ? <div className="alert success">{params.deleted}</div> : null}

      <section className="card">
        <div className="section-title"><h2>Products</h2><span className="badge">{products.length}</span></div>
        <details className="editor"><summary>+ Add product</summary>
          <form action={createProduct} className="form-grid editor-body">
            <ProductFields categories={categories} manufacturers={manufacturers} units={units} />
            <div className="full"><button className="btn" type="submit">Add product</button></div>
          </form>
        </details>
        <div className="table-wrap"><table><thead><tr><th>Product</th><th>Manufacturer</th><th>Category</th><th>Unit</th><th>Cost</th><th>Target stock</th><th>Status</th><th></th></tr></thead>
          <tbody>{products.map(p => <tr key={p.id}><td><strong>{p.name}</strong><br/><small>{p.sku ?? "No SKU"}</small></td><td>{p.manufacturer?.name ?? "—"}</td><td>{p.category.name}</td><td>{p.inventoryUnit.abbreviation}</td><td>{money(p.currentCost)}</td><td>{qty(p.parLevel)}</td><td><span className={`badge ${p.active ? "ok" : "low"}`}>{p.active ? "Active" : "Inactive"}</span></td><td><details className="inline-editor"><summary>Edit</summary><form action={updateProduct} className="form-grid popup-form"><input type="hidden" name="id" value={p.id}/><ProductFields categories={categories} manufacturers={manufacturers} units={units} product={p}/><div className="full check-row"><label><input type="checkbox" name="trackInventory" defaultChecked={p.trackInventory}/> Track inventory</label><label><input type="checkbox" name="active" defaultChecked={p.active}/> Active</label></div><label className="full">Notes<textarea name="notes" defaultValue={p.notes ?? ""}/></label><div className="full"><button className="btn" type="submit">Save changes</button></div></form>
              <details className="danger-zone"><summary>Delete product…</summary><form action={deleteProduct} className="delete-confirm"><input type="hidden" name="id" value={p.id}/><p><strong>Permanent deletion.</strong> If this product has inventory, count, order, or receiving history, deletion will be blocked. Otherwise, type <strong>DELETE</strong> to confirm.</p><label>Type DELETE<input name="confirmation" autoComplete="off" required /></label><button className="btn danger" type="submit">Permanently delete product</button></form></details>
            </details></td></tr>)}</tbody>
        </table></div>
      </section>

      <div className="grid-2">
        <section className="card"><div className="section-title"><h2>Manufacturers</h2><span className="badge">{manufacturers.length}</span></div>
          <details className="editor"><summary>+ Add manufacturer</summary><form action={createManufacturer} className="form-grid editor-body"><label className="full">Manufacturer name<input name="name" required /></label><div className="full"><button className="btn">Add manufacturer</button></div></form></details>
          <div className="record-list">{manufacturers.map(m => <details className="record" key={m.id}><summary><span>{m.name}</span><span className={`badge ${m.active ? "ok" : "low"}`}>{m.active ? "Active" : "Inactive"}</span></summary><form action={updateManufacturer} className="form-grid editor-body"><input type="hidden" name="id" value={m.id}/><label>Name<input name="name" required defaultValue={m.name}/></label><label>Contact<input name="contactName" defaultValue={m.contactName ?? ""}/></label><label>Phone<input name="phone" defaultValue={m.phone ?? ""}/></label><label>Email<input type="email" name="email" defaultValue={m.email ?? ""}/></label><label>Website<input name="website" defaultValue={m.website ?? ""}/></label><label className="check-label"><input type="checkbox" name="active" defaultChecked={m.active}/> Active</label><label className="full">Notes<textarea name="notes" defaultValue={m.notes ?? ""}/></label><div className="full"><button className="btn">Save manufacturer</button></div></form></details>)}</div>
        </section>

        <section className="card"><div className="section-title"><h2>Locations</h2><span className="badge">{locations.length}</span></div>
          <details className="editor"><summary>+ Add location</summary><form action={createLocation} className="form-grid editor-body"><label>Name<input name="name" required /></label><label>Type<input name="locationType" /></label><label>Sort order<input type="number" name="sortOrder" defaultValue="0"/></label><div className="full"><button className="btn">Add location</button></div></form></details>
          <div className="record-list">{locations.map(l => <details className="record" key={l.id}><summary><span>{l.name}</span><span className={`badge ${l.active ? "ok" : "low"}`}>{l.active ? "Active" : "Inactive"}</span></summary><form action={updateLocation} className="form-grid editor-body"><input type="hidden" name="id" value={l.id}/><label>Name<input name="name" required defaultValue={l.name}/></label><label>Type<input name="locationType" defaultValue={l.locationType ?? ""}/></label><label>Sort order<input type="number" name="sortOrder" defaultValue={l.sortOrder}/></label><label className="check-label"><input type="checkbox" name="active" defaultChecked={l.active}/> Active</label><div className="full"><button className="btn">Save location</button></div></form><details className="danger-zone"><summary>Delete location…</summary><form action={deleteLocation} className="delete-confirm"><input type="hidden" name="id" value={l.id}/><p><strong>Permanent deletion.</strong> If this location has inventory, stock count, or receiving history, deletion will be blocked. Otherwise, type <strong>DELETE</strong> to confirm.</p><label>Type DELETE<input name="confirmation" autoComplete="off" required /></label><button className="btn danger" type="submit">Permanently delete location</button></form></details></details>)}</div>
        </section>
      </div>

      <section className="card"><div className="section-title"><h2>Suppliers</h2><span className="badge">{suppliers.length}</span></div>
        <details className="editor"><summary>+ Add supplier</summary><form action={createSupplier} className="form-grid editor-body"><label>Supplier name<input name="name" required /></label><label>Contact<input name="contactName" /></label><label>Email<input type="email" name="email" /></label><label>Phone<input name="phone" /></label><label>Order day<input name="orderDay" placeholder="Tuesday" /></label><label>Lead time days<input type="number" min="0" name="leadTimeDays" /></label><div className="full"><button className="btn">Add supplier</button></div></form></details>
        <div className="record-list grid-records">{suppliers.map(s => <details className="record" key={s.id}><summary><span>{s.name}</span><span className={`badge ${s.active ? "ok" : "low"}`}>{s.active ? "Active" : "Inactive"}</span></summary><form action={updateSupplier} className="form-grid editor-body"><input type="hidden" name="id" value={s.id}/><label>Name<input name="name" required defaultValue={s.name}/></label><label>Contact<input name="contactName" defaultValue={s.contactName ?? ""}/></label><label>Email<input type="email" name="email" defaultValue={s.email ?? ""}/></label><label>Phone<input name="phone" defaultValue={s.phone ?? ""}/></label><label>Website<input name="website" defaultValue={s.website ?? ""}/></label><label>Account #<input name="accountNumber" defaultValue={s.accountNumber ?? ""}/></label><label>Order method<input name="orderMethod" defaultValue={s.orderMethod ?? ""}/></label><label>Order day<input name="orderDay" defaultValue={s.orderDay ?? ""}/></label><label>Lead time days<input type="number" min="0" name="leadTimeDays" defaultValue={s.leadTimeDays ?? ""}/></label><label>Minimum order<input type="number" min="0" step="0.01" name="minimumOrderAmount" defaultValue={s.minimumOrderAmount ? String(s.minimumOrderAmount) : ""}/></label><label className="check-label"><input type="checkbox" name="active" defaultChecked={s.active}/> Active</label><label className="full">Delivery notes<textarea name="deliveryNotes" defaultValue={s.deliveryNotes ?? ""}/></label><div className="full"><button className="btn">Save supplier</button></div></form></details>)}</div>
      </section>

      <div className="grid-2">
        <section className="card"><h2>Categories</h2><form action={createCategory} className="form-grid"><label>Category name<input name="name" required /></label><label>Sort order<input type="number" name="sortOrder" defaultValue="0" /></label><div className="full"><button className="btn">Add category</button></div></form><p className="metric-note spaced">{categories.map(c => c.name).join(" • ")}</p></section>
        <section className="card"><h2>Units</h2><form action={createUnit} className="form-grid"><label>Name<input name="name" required /></label><label>Abbreviation<input name="abbreviation" required /></label><label>Unit type<select name="unitType" defaultValue="count"><option value="count">Count</option><option value="volume">Volume</option><option value="weight">Weight</option><option value="package">Package</option></select></label><div className="full"><button className="btn">Add unit</button></div></form><p className="metric-note spaced">{units.map(u => `${u.name} (${u.abbreviation})`).join(" • ")}</p></section>
      </div>

      <section className="card"><h2>Supplier products / pack sizes</h2>
        <form action={createSupplierProduct} className="form-grid"><label>Supplier<select name="supplierId" required defaultValue=""><option value="" disabled>Select supplier</option>{suppliers.filter(s=>s.active).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Product<select name="productId" required defaultValue=""><option value="" disabled>Select product</option>{products.filter(p=>p.active).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Supplier SKU<input name="supplierSku" /></label><label>Purchase unit<select name="purchaseUnitId" required defaultValue=""><option value="" disabled>Select unit</option>{units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label><label>Inventory units per purchase unit<input type="number" step="0.001" min="0.001" name="quantityPerPurchaseUnit" defaultValue="1" required /></label><label>Purchase price<input type="number" step="0.01" min="0" name="purchasePrice" defaultValue="0" required /></label><label>Minimum order<input type="number" step="0.001" min="0" name="minimumOrder" defaultValue="1" /></label><label className="check-label"><input type="checkbox" name="preferred" /> Preferred supplier</label><div className="full"><button className="btn">Add supplier pack</button></div></form>
        <div className="table-wrap spaced"><table><thead><tr><th>Supplier</th><th>Product</th><th>Purchase unit</th><th>Pack conversion</th><th>Price</th></tr></thead><tbody>{supplierProducts.map(sp=><tr key={sp.id}><td>{sp.supplier.name}</td><td>{sp.product.name}</td><td>{sp.purchaseUnit.abbreviation}</td><td>{qty(sp.quantityPerPurchaseUnit)}</td><td>{money(sp.purchasePrice)}</td></tr>)}</tbody></table></div>
      </section>
    </>
  );
}

function ProductFields({ categories, manufacturers, units, product }: any) {
  return <>
    <label>Product name<input name="name" required defaultValue={product?.name ?? ""}/></label>
    <label>SKU<input name="sku" defaultValue={product?.sku ?? ""}/></label>
    <label>Category<select name="categoryId" required defaultValue={product?.categoryId ?? ""}><option value="" disabled>Select category</option>{categories.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <label>Manufacturer<select name="manufacturerId" defaultValue={product?.manufacturerId ?? ""}><option value="">None</option>{manufacturers.map((m:any)=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
    <label>Inventory unit<select name="inventoryUnitId" required defaultValue={product?.inventoryUnitId ?? ""}><option value="" disabled>Select unit</option>{units.map((u:any)=><option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>)}</select></label>
    <label>Current cost<input type="number" step="0.0001" min="0" name="currentCost" defaultValue={product ? String(product.currentCost) : "0"}/></label>
    <label>Target stock<input type="number" step="0.001" min="0" name="parLevel" defaultValue={product ? String(product.parLevel) : "0"}/></label>
    <label>Reorder point<input type="number" step="0.001" min="0" name="reorderPoint" defaultValue={product ? String(product.reorderPoint) : "0"}/></label>
    <label>Default reorder quantity<input type="number" step="0.001" min="0" name="reorderQuantity" defaultValue={product ? String(product.reorderQuantity) : "0"}/></label>
  </>;
}
