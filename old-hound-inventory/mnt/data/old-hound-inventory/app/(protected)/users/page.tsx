import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { createUser, updateUser } from "@/lib/auth-actions";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const current = await requireUser();
  if (current.role !== "OWNER") redirect("/");
  const users = await db.user.findMany({ orderBy: { name: "asc" } });
  return <>
    <PageHeader title="Users & Passwords" subtitle="Owner-only access. Add users, change usernames, reset passwords, roles, or deactivate access." />
    <section className="card"><h2>Add user</h2><form action={createUser} className="form-grid"><label>Name<input name="name" required/></label><label>Username<input name="username" required/></label><label>Password<input name="password" type="password" minLength={8} required/></label><label>Role<select name="role" defaultValue="STAFF"><option value="OWNER">Owner</option><option value="MANAGER">Manager</option><option value="STAFF">Staff</option></select></label><div className="full"><button className="btn">Add user</button></div></form></section>
    <section className="card"><h2>Existing users</h2><div className="record-list">{users.map(u=><details className="record" key={u.id}><summary><span><strong>{u.name}</strong> · {u.username ?? "No username"}</span><span className={`badge ${u.active ? "ok" : "low"}`}>{u.role}</span></summary><form action={updateUser} className="form-grid editor-body"><input type="hidden" name="id" value={u.id}/><label>Name<input name="name" required defaultValue={u.name}/></label><label>Username<input name="username" required defaultValue={u.username ?? ""}/></label><label>New password <small>(leave blank to keep current)</small><input name="password" type="password" minLength={8}/></label><label>Role<select name="role" defaultValue={u.role}><option value="OWNER">Owner</option><option value="MANAGER">Manager</option><option value="STAFF">Staff</option></select></label><label className="check-label"><input type="checkbox" name="active" defaultChecked={u.active}/> Active</label><div className="full"><button className="btn">Save user</button></div></form></details>)}</div></section>
  </>;
}
