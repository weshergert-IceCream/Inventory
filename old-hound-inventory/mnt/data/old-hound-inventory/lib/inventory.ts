import { db } from "@/lib/db";

export async function getInventoryBalances() {
  const products = await db.product.findMany({
    where: { active: true, trackInventory: true },
    include: { category: true, manufacturer: true, inventoryUnit: true },
    orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
  });

  const grouped = await db.inventoryTransaction.groupBy({
    by: ["productId"],
    _sum: { quantity: true },
  });
  const totals = new Map(grouped.map((g) => [g.productId, Number(g._sum.quantity ?? 0)]));

  return products.map((product) => ({
    ...product,
    onHand: totals.get(product.id) ?? 0,
  }));
}

export async function getLocationBalances(locationId: string) {
  const products = await db.product.findMany({
    where: { active: true, trackInventory: true },
    include: { category: true, manufacturer: true, inventoryUnit: true },
    orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
  });
  const grouped = await db.inventoryTransaction.groupBy({
    by: ["productId"],
    where: { locationId },
    _sum: { quantity: true },
  });
  const totals = new Map(grouped.map((g) => [g.productId, Number(g._sum.quantity ?? 0)]));
  return products.map((product) => ({ ...product, onHand: totals.get(product.id) ?? 0 }));
}

export async function getOpenOnOrderByProduct() {
  const lines = await db.purchaseOrderItem.findMany({
    where: {
      purchaseOrder: { status: { in: ["DRAFT", "APPROVED", "SENT", "PARTIALLY_RECEIVED"] } },
    },
    select: { productId: true, quantityOrdered: true, quantityReceived: true, quantityPerUnit: true },
  });

  const map = new Map<string, number>();
  for (const line of lines) {
    const packagesOutstanding = Number(line.quantityOrdered) - Number(line.quantityReceived);
    const inventoryUnits = Math.max(0, packagesOutstanding) * Number(line.quantityPerUnit);
    map.set(line.productId, (map.get(line.productId) ?? 0) + inventoryUnits);
  }
  return map;
}
