import { PageHeader } from "@/components/PageHeader";
import { db } from "@/lib/db";
import { createCategory, createLocation, createManufacturer, createProduct, createSupplier, createSupplierProduct, createUnit } from "@/lib/actions";
import { money, qty } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const [manufacturers, suppliers, categories, units, locations, products] = await Promise.all([
    db.manufacturer.findMany({ orderBy: { name: "asc" } }),
    db.supplier.findMany({ orderBy: { name: "asc" } }),
    db.productCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    db.unit.findMany({ orderBy: { name: "asc" } }),
    db.location.findMany({ orderBy: { sortOrder: "asc" } }),
    db.product.findMany({ include: { manufacturer: true, category: true, inventoryUnit: true }, orderBy: { name: "asc" }, take: 100 }),
  ]);

  return (
    <>
      <PageHeader title="Products & Setup" subtitle="Group 1: products, categories, manufacturers, suppliers, supplier products, units and locations." />
      <div className="grid-2">
        <section className="card"><h2>Add manufacturer</h2><form action={createManufacturer} className="form-grid"><label className="full">Manufacturer name<input name="name" required placeholder="e.g. Chapman's" /></label><div className="full"><button className="btn" type="submit">Add manufacturer</button></div></form></section>
        <section className="card"><h2>Add supplier</h2><form action={createSupplier} className="form-grid"><label>Supplier name<input name="name" required /></label><label>Contact<input name="contactName" /></label><label>Email<input type="email" name="email" /></label><label>Phone<input name="phone" /></label><label>Order day<input name="orderDay" placeholder="Tuesday" /></label><label>Lead time days<input type="number" min="0" name="leadTimeDays" /></label><div className="full"><button className="btn" type="submit">Add supplier</button></div></form></section>
      </div>

      <section className="card"><h2>Add product</h2><form action={createProduct} className="form-grid">
        <label>Product name<input name="name" required /></label><label>SKU<input name="sku" /></label>
        <label>Category<select name="categoryId" required defaultValue=""><option value="" disabled>Select category</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>Manufacturer<select name="manufacturerId" defaultValue=""><option value="">None</option>{manufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
        <label>Inventory unit<select name="inventoryUnitId" required defaultValue=""><option value="" disabled>Select unit</option>{units.map(u => <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>)}</select></label>
        <label>Current cost per inventory unit<input type="number" step="0.0001" min="0" name="currentCost" defaultValue="0" /></label>
        <label>Par level<input type="number" step="0.001" min="0" name="parLevel" defaultValue="0" /></label>
        <label>Reorder point<input type="number" step="0.001" min="0" name="reorderPoint" defaultValue="0" /></label>
        <label>Default reorder quantity<input type="number" step="0.001" min="0" name="reorderQuantity" defaultValue="0" /></label>
        <div className="full"><button className="btn" type="submit">Add product</button></div>
      </form></section>


      <div className="grid-2">
        <section className="card"><h2>Add category</h2><form action={createCategory} className="form-grid"><label>Category name<input name="name" required /></label><label>Sort order<input type="number" name="sortOrder" defaultValue="0" /></label><div className="full"><button className="btn" type="submit">Add category</button></div></form></section>
        <section className="card"><h2>Add unit</h2><form action={createUnit} className="form-grid"><label>Name<input name="name" required placeholder="Case" /></label><label>Abbreviation<input name="abbreviation" required placeholder="case" /></label><label>Unit type<select name="unitType" defaultValue="count"><option value="count">Count</option><option value="volume">Volume</option><option value="weight">Weight</option><option value="package">Package</option></select></label><div style={{alignSelf:"end"}}><button className="btn" type="submit">Add unit</button></div></form></section>
      </div>

      <div className="grid-2">
        <section className="card"><h2>Add location</h2><form action={createLocation} className="form-grid"><label>Name<input name="name" required placeholder="Walk-In Freezer" /></label><label>Type<input name="locationType" placeholder="Freezer" /></label><label>Sort order<input type="number" name="sortOrder" defaultValue="0" /></label><div style={{alignSelf:"end"}}><button className="btn" type="submit">Add location</button></div></form></section>
        <section className="card"><h2>Add supplier pack</h2><form action={createSupplierProduct} className="form-grid"><label>Supplier<select name="supplierId" required defaultValue=""><option value="" disabled>Select supplier</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Product<select name="productId" required defaultValue=""><option value="" disabled>Select product</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Supplier SKU<input name="supplierSku" /></label><label>Purchase unit<select name="purchaseUnitId" required defaultValue=""><option value="" disabled>Select unit</option>{units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label><label>Inventory units per purchase unit<input type="number" step="0.001" min="0.001" name="quantityPerPurchaseUnit" defaultValue="1" required /></label><label>Purchase price<input type="number" step="0.01" min="0" name="purchasePrice" defaultValue="0" required /></label><label>Minimum order<input type="number" step="0.001" min="0" name="minimumOrder" defaultValue="1" /></label><label style={{display:"flex",gridTemplateColumns:"auto 1fr",alignItems:"center",gap:8}}><input style={{width:"auto"}} type="checkbox" name="preferred" /> Preferred supplier</label><div className="full"><button className="btn" type="submit">Add supplier pack</button></div></form></section>
      </div>

      <section className="card"><h2>Master data overview</h2><section className="stats"><div className="stat-card"><span>Products</span><strong>{products.length}</strong></div><div className="stat-card"><span>Manufacturers</span><strong>{manufacturers.length}</strong></div><div className="stat-card"><span>Suppliers</span><strong>{suppliers.length}</strong></div><div className="stat-card"><span>Locations</span><strong>{locations.length}</strong></div></section>
      <div className="table-wrap"><table><thead><tr><th>Product</th><th>Manufacturer</th><th>Category</th><th>Unit</th><th>Cost</th><th>Par</th></tr></thead><tbody>{products.map(p => <tr key={p.id}><td>{p.name}</td><td>{p.manufacturer?.name ?? "—"}</td><td>{p.category.name}</td><td>{p.inventoryUnit.abbreviation}</td><td>{money(p.currentCost)}</td><td>{qty(p.parLevel)}</td></tr>)}</tbody></table></div></section>

      <section className="card"><h2>Supplier products / pack sizes</h2><p className="metric-note">Supplier-specific SKUs, purchase units, pack conversions, pricing and preferred suppliers are fully stored and used by ordering and receiving.</p></section>
    </>
  );
}
