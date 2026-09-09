"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { createSession, destroySession, requireUser } from "@/lib/auth";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function login(formData: FormData) {
  const username = value(formData, "username").toLowerCase();
  const password = value(formData, "password");
  if (!username || !password) redirect("/login?error=missing");

  const user = await db.user.findUnique({ where: { username } });
  if (!user?.passwordHash || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
    redirect("/login?error=invalid");
  }

  await db.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
  await createSession(user.id);
  redirect("/");
}

export async function bootstrapAdmin(formData: FormData) {
  const configuredUsers = await db.user.count({ where: { passwordHash: { not: null } } });
  if (configuredUsers > 0) redirect("/login");

  const name = value(formData, "name");
  const username = value(formData, "username").toLowerCase();
  const password = value(formData, "password");
  const confirm = value(formData, "confirmPassword");
  if (!name || !username || password.length < 8 || password !== confirm) redirect("/login?setupError=1");

  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await db.user.findFirst({ where: { OR: [{ username }, { email: "owner@oldhound.local" }] } });
  const user = existing
    ? await db.user.update({ where: { id: existing.id }, data: { name, username, passwordHash, role: "OWNER", active: true } })
    : await db.user.create({ data: { name, username, email: `${username}@oldhound.local`, passwordHash, role: "OWNER", active: true } });

  await createSession(user.id);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function createUser(formData: FormData) {
  const current = await requireUser();
  if (current.role !== "OWNER") return;
  const name = value(formData, "name");
  const username = value(formData, "username").toLowerCase();
  const password = value(formData, "password");
  const role = value(formData, "role") as "OWNER" | "MANAGER" | "STAFF";
  if (!name || !username || password.length < 8) return;
  const passwordHash = await bcrypt.hash(password, 12);
  await db.user.create({ data: { name, username, email: `${username}@oldhound.local`, passwordHash, role, active: true } });
  revalidatePath("/users");
}

export async function updateUser(formData: FormData) {
  const current = await requireUser();
  if (current.role !== "OWNER") return;
  const id = value(formData, "id");
  const name = value(formData, "name");
  const username = value(formData, "username").toLowerCase();
  const role = value(formData, "role") as "OWNER" | "MANAGER" | "STAFF";
  const password = value(formData, "password");
  if (!id || !name || !username) return;
  const data: any = { name, username, role, active: formData.get("active") === "on" };
  if (password) {
    if (password.length < 8) return;
    data.passwordHash = await bcrypt.hash(password, 12);
  }
  await db.user.update({ where: { id }, data });
  revalidatePath("/users");
}
