import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { bootstrapAdmin, login } from "@/lib/auth-actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const current = await getCurrentUser();
  if (current) redirect("/");
  const configuredUsers = await db.user.count({ where: { passwordHash: { not: null } } });
  const params = await searchParams;
  const firstRun = configuredUsers === 0;

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="login-brand"><div className="brand-mark dark">OH</div><div><h1>The Old Hound</h1><p>Inventory & Ordering</p></div></div>
        {firstRun ? (
          <>
            <h2>Create the first administrator</h2>
            <p className="metric-note">This only appears before the first password-protected account is created.</p>
            {params.setupError && <div className="alert error">Use a username, a password of at least 8 characters, and make sure both passwords match.</div>}
            <form action={bootstrapAdmin} className="form-grid single">
              <label>Name<input name="name" required autoComplete="name" placeholder="Shop Owner" /></label>
              <label>Username<input name="username" required autoComplete="username" placeholder="owner" /></label>
              <label>Password<input name="password" required type="password" minLength={8} autoComplete="new-password" /></label>
              <label>Confirm password<input name="confirmPassword" required type="password" minLength={8} autoComplete="new-password" /></label>
              <button className="btn" type="submit">Create administrator</button>
            </form>
          </>
        ) : (
          <>
            <h2>Sign in</h2>
            {params.error === "invalid" && <div className="alert error">Incorrect username or password.</div>}
            {params.error === "missing" && <div className="alert error">Enter your username and password.</div>}
            <form action={login} className="form-grid single">
              <label>Username<input name="username" required autoComplete="username" /></label>
              <label>Password<input name="password" required type="password" autoComplete="current-password" /></label>
              <button className="btn" type="submit">Sign in</button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
