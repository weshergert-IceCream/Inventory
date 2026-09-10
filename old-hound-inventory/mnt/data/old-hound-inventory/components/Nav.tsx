import Link from "next/link";
import type { User } from "@prisma/client";
import { logout } from "@/lib/auth-actions";

const links = [
  ["/", "Dashboard"],
  ["/inventory", "Inventory"],
  ["/stock-count", "Stock Count"],
  ["/orders", "Orders"],
  ["/receive", "Receive"],
  ["/setup", "Products & Setup"],
] as const;

export function Nav({ user }: { user: User }) {
  return (
    <>
      <aside className="sidebar" aria-label="Main navigation">
        <div className="brand">
          <div className="brand-mark">OH</div>
          <div>
            <strong>The Old Hound</strong>
            <span>Inventory & Ordering</span>
          </div>
        </div>

        <div className="sidebar-section-label">Menu</div>
        <nav className="sidebar-links">
          {links.map(([href, label]) => (
            <Link key={href} href={href}>{label}</Link>
          ))}
          {user.role === "OWNER" && <Link href="/users">Users</Link>}
        </nav>

        <div className="sidebar-foot">
          <div className="signed-in-label">Signed in as</div>
          <strong>{user.name}</strong>
          <div>{user.username ?? user.email}</div>
          <form action={logout}>
            <button className="logout-link" type="submit">Sign out</button>
          </form>
        </div>
      </aside>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {links.slice(0, 5).map(([href, label]) => (
          <Link key={href} href={href}>{label === "Stock Count" ? "Count" : label}</Link>
        ))}
      </nav>
    </>
  );
}
