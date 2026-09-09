import Link from "next/link";

const links = [
  ["/", "Dashboard"],
  ["/inventory", "Inventory"],
  ["/stock-count", "Stock Count"],
  ["/orders", "Orders"],
  ["/receive", "Receive"],
  ["/setup", "Setup"],
] as const;

export function Nav() {
  return (
    <>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">OH</div>
          <div>
            <strong>The Old Hound</strong>
            <span>Inventory & Ordering</span>
          </div>
        </div>
        <nav>
          {links.map(([href, label]) => (
            <Link key={href} href={href}>{label}</Link>
          ))}
        </nav>
        <div className="sidebar-foot">Built for simple daily stock control.</div>
      </aside>
      <nav className="mobile-nav">
        {links.slice(0, 5).map(([href, label]) => (
          <Link key={href} href={href}>{label === "Stock Count" ? "Count" : label}</Link>
        ))}
      </nav>
    </>
  );
}
