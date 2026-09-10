import { Nav } from "@/components/Nav";
import { requireUser } from "@/lib/auth";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <>
      <Nav user={user} />
      <main className="app-shell">{children}</main>
    </>
  );
}
