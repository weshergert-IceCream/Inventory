import { db } from "@/lib/db";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ ok: true, database: "connected" });
  } catch {
    return Response.json({ ok: false, database: "unavailable" }, { status: 503 });
  }
}
