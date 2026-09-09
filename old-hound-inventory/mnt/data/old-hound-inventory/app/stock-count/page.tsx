import { PageHeader } from "@/components/PageHeader";
import { db } from "@/lib/db";
import { getLocationBalances } from "@/lib/inventory";
import { completeStockCount } from "@/lib/actions";
import { qty, shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ location?: string }> };

export default async function StockCountPage({ searchParams }: Props) {
  const params = await searchParams;
  const locations = await db.location.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  const locationId = params.location && locations.some(l => l.id === params.location) ? params.location : locations[0]?.id;
  const selected = locations.find(l => l.id === locationId);
  const balances = locationId ? await getLocationBalances(locationId) : [];
  const recent = await db.stockCount.findMany({ include: { location: true, items: true }, orderBy: { countDate: "desc" }, take: 6 });

  return (
    <>
      <PageHeader title="Stock Count" subtitle="Enter the physical quantity actually present. Completing the count creates adjustment transactions automatically." />
      <section className="card">
        <form method="get" className="form-grid">
          <label>Count location<select name="location" defaultValue={locationId}><option value="">Choose location</option>{locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
          <div style={{alignSelf:"end"}}><button className="btn secondary" type="submit">Load location</button></div>
        </form>
      </section>

      {selected && <section className="card">
        <div className="section-title"><h2>{selected.name}</h2><span className="badge">{balances.length} products</span></div>
        <form action={completeStockCount}>
          <input type="hidden" name="locationId" value={selected.id} />
          <div className="count-grid">
            {balances.map(p => <div className="count-row" key={p.id}>
              <div><strong>{p.name}</strong><small>{p.manufacturer?.name ?? "No manufacturer"} · {p.inventoryUnit.abbreviation}</small></div>
              <div><span style={{color:"var(--muted)",fontSize:12}}>Expected</span><strong style={{display:"block"}}>{qty(p.onHand)} {p.inventoryUnit.abbreviation}</strong></div>
              <label>Counted<input name={`count_${p.id}`} type="number" step="0.001" placeholder={qty(p.onHand)} /></label>
            </div>)}
          </div>
          <div style={{marginTop:16}}><button className="btn" type="submit">Complete count</button></div>
        </form>
      </section>}

      <section className="card">
        <h2>Recent counts</h2>
        <div className="table-wrap"><table><thead><tr><th>Date</th><th>Location</th><th>Status</th><th>Items counted</th></tr></thead><tbody>{recent.map(c => <tr key={c.id}><td>{shortDate(c.countDate)}</td><td>{c.location.name}</td><td><span className="badge">{c.status}</span></td><td>{c.items.length}</td></tr>)}</tbody></table></div>
      </section>
    </>
  );
}
