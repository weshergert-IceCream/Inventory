import Link from "next/link";
import type { User } from "@prisma/client";
import { logout } from "@/lib/auth-actions";

const links = [
  ["/", "Dashboard"],
  ["/inventory", "Inventory"],
  ["/stock-count", "Stock Count"],
  ["/orders", "Orders"],
  ["/receive", "Receive"],
  ["/setup", "Setup"],
] as const;

export function Nav({ user }: { user: User }) {
  return (
    <>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">OH</div>
          <div><strong>The Old Hound</strong><span>Inventory & Ordering</span></div>
        </div>
        <nav>
          {links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
          {user.role === "OWNER" && <Link href="/users">Users</Link>}
        </nav>
        <div className="sidebar-foot">
          <strong>{user.name}</strong><br />{user.username ?? user.email}<br />
          <form action={logout}><button className="logout-link" type="submit">Sign out</button></form>
        </div>
      </aside>
      <nav className="mobile-nav">
        {links.slice(0, 5).map(([href, label]) => <Link key={href} href={href}>{label === "Stock Count" ? "Count" : label}</Link>)}
      </nav>
    </>
  );
}
