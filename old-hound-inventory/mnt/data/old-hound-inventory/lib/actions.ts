"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getLocationBalances } from "@/lib/inventory";
import { requireUser } from "@/lib/auth";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}
function num(formData: FormData, key: string, fallback = 0) {
  const n = Number(formData.get(key));
  return Number.isFinite(n) ? n : fallback;
}

export async function createManufacturer(formData: FormData) {
  await requireUser();
  const name = text(formData, "name");
  if (!name) return;
  await db.manufacturer.create({ data: { name } });
  revalidatePath("/setup");
}

export async function createSupplier(formData: FormData) {
  await requireUser();
  const name = text(formData, "name");
  if (!name) return;
  await db.supplier.create({
    data: {
      name,
      contactName: text(formData, "contactName") || null,
      email: text(formData, "email") || null,
      phone: text(formData, "phone") || null,
      orderDay: text(formData, "orderDay") || null,
      leadTimeDays: num(formData, "leadTimeDays", 0) || null,
    },
  });
  revalidatePath("/setup");
}

export async function createProduct(formData: FormData) {
  await requireUser();
  const name = text(formData, "name");
  if (!name) return;
  await db.product.create({
    data: {
      name,
      sku: text(formData, "sku") || null,
      categoryId: text(formData, "categoryId"),
      manufacturerId: text(formData, "manufacturerId") || null,
      inventoryUnitId: text(formData, "inventoryUnitId"),
      parLevel: num(formData, "parLevel"),
      reorderPoint: num(formData, "reorderPoint"),
      reorderQuantity: num(formData, "reorderQuantity"),
      currentCost: num(formData, "currentCost"),
    },
  });
  revalidatePath("/inventory");
  revalidatePath("/setup");
  revalidatePath("/");
}

export async function createManualAdjustment(formData: FormData) {
  await requireUser();
  const productId = text(formData, "productId");
  const locationId = text(formData, "locationId");
  const quantity = num(formData, "quantity");
  const notes = text(formData, "notes") || "Manual adjustment";
  if (!productId || !locationId || quantity === 0) return;
  const product = await db.product.findUnique({ where: { id: productId } });
  await db.inventoryTransaction.create({
    data: {
      productId,
      locationId,
      transactionType: "MANUAL_ADJUSTMENT",
      quantity,
      unitCost: product?.currentCost ?? 0,
      notes,
    },
  });
  revalidatePath("/inventory");
  revalidatePath("/");
}

export async function completeStockCount(formData: FormData) {
  await requireUser();
  const locationId = text(formData, "locationId");
  if (!locationId) return;
  const location = await db.location.findUnique({ where: { id: locationId } });
  const balances = await getLocationBalances(locationId);
  const count = await db.stockCount.create({
    data: { locationId, status: "IN_PROGRESS", notes: `Count for ${location?.name ?? "location"}` },
  });

  await db.$transaction(async (tx) => {
    for (const product of balances) {
      const raw = formData.get(`count_${product.id}`);
      if (raw == null || String(raw).trim() === "") continue;
      const counted = Number(raw);
      if (!Number.isFinite(counted)) continue;
      const expected = product.onHand;
      const variance = counted - expected;
      await tx.stockCountItem.create({
        data: {
          stockCountId: count.id,
          productId: product.id,
          expectedQuantity: expected,
          countedQuantity: counted,
          varianceQuantity: variance,
          unitCost: product.currentCost,
          varianceValue: variance * Number(product.currentCost),
        },
      });
      if (variance !== 0) {
        await tx.inventoryTransaction.create({
          data: {
            productId: product.id,
            locationId,
            transactionType: "COUNT_ADJUSTMENT",
            quantity: variance,
            unitCost: product.currentCost,
            referenceType: "STOCK_COUNT",
            referenceId: count.id,
            notes: "Physical stock count adjustment",
          },
        });
      }
    }
    await tx.stockCount.update({
      where: { id: count.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
  });

  revalidatePath("/stock-count");
  revalidatePath("/inventory");
  revalidatePath("/");
  redirect("/stock-count");
}

export async function createPurchaseOrder(formData: FormData) {
  await requireUser();
  const supplierId = text(formData, "supplierId");
  if (!supplierId) return;
  const supplierProducts = await db.supplierProduct.findMany({
    where: { supplierId, active: true },
    include: { product: true, purchaseUnit: true },
  });

  const selected = supplierProducts
    .map((sp) => ({ sp, qty: num(formData, `qty_${sp.id}`, 0) }))
    .filter((x) => x.qty > 0);
  if (!selected.length) return;

  const count = await db.purchaseOrder.count();
  const poNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
  const subtotal = selected.reduce((sum, x) => sum + x.qty * Number(x.sp.purchasePrice), 0);
  const expectedRaw = text(formData, "expectedDeliveryDate");

  await db.purchaseOrder.create({
    data: {
      poNumber,
      supplierId,
      status: "SENT",
      submittedDate: new Date(),
      expectedDeliveryDate: expectedRaw ? new Date(`${expectedRaw}T12:00:00`) : null,
      subtotal,
      tax: 0,
      total: subtotal,
      items: {
        create: selected.map(({ sp, qty }) => ({
          productId: sp.productId,
          supplierProductId: sp.id,
          quantityOrdered: qty,
          purchaseUnitLabel: sp.purchaseUnit.abbreviation,
          quantityPerUnit: sp.quantityPerPurchaseUnit,
          unitPrice: sp.purchasePrice,
          lineTotal: qty * Number(sp.purchasePrice),
        })),
      },
    },
  });
  revalidatePath("/orders");
  revalidatePath("/");
}

export async function receivePurchaseOrder(formData: FormData) {
  await requireUser();
  const purchaseOrderId = text(formData, "purchaseOrderId");
  const locationId = text(formData, "locationId");
  if (!purchaseOrderId || !locationId) return;

  const po = await db.purchaseOrder.findUnique({
    where: { id: purchaseOrderId },
    include: { items: { include: { product: true } } },
  });
  if (!po) return;

  const receivedLines = po.items
    .map((item) => ({ item, qty: num(formData, `recv_${item.id}`, 0) }))
    .filter((x) => x.qty > 0);
  if (!receivedLines.length) return;

  const invoiceNumber = text(formData, "invoiceNumber") || null;
  const invoiceTotalRaw = text(formData, "invoiceTotal");

  await db.$transaction(async (tx) => {
    const delivery = await tx.delivery.create({
      data: {
        purchaseOrderId: po.id,
        supplierId: po.supplierId,
        status: "COMPLETED",
        invoiceNumber,
        invoiceTotal: invoiceTotalRaw ? Number(invoiceTotalRaw) : null,
      },
    });

    for (const { item, qty } of receivedLines) {
      const inventoryQty = qty * Number(item.quantityPerUnit);
      const inventoryUnitCost = Number(item.unitPrice) / Number(item.quantityPerUnit || 1);
      await tx.deliveryItem.create({
        data: {
          deliveryId: delivery.id,
          purchaseOrderItemId: item.id,
          productId: item.productId,
          locationId,
          quantityReceived: qty,
          purchaseUnitLabel: item.purchaseUnitLabel,
          inventoryQuantityReceived: inventoryQty,
          actualUnitCost: inventoryUnitCost,
        },
      });
      await tx.purchaseOrderItem.update({
        where: { id: item.id },
        data: { quantityReceived: { increment: qty } },
      });
      await tx.inventoryTransaction.create({
        data: {
          productId: item.productId,
          locationId,
          transactionType: "RECEIPT",
          quantity: inventoryQty,
          unitCost: inventoryUnitCost,
          referenceType: "DELIVERY",
          referenceId: delivery.id,
          notes: `${po.poNumber} received`,
        },
      });
      await tx.product.update({
        where: { id: item.productId },
        data: { currentCost: inventoryUnitCost },
      });
    }

    const refreshed = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: po.id } });
    const allReceived = refreshed.every((i) => Number(i.quantityReceived) >= Number(i.quantityOrdered));
    const someReceived = refreshed.some((i) => Number(i.quantityReceived) > 0);
    await tx.purchaseOrder.update({
      where: { id: po.id },
      data: { status: allReceived ? "RECEIVED" : someReceived ? "PARTIALLY_RECEIVED" : "SENT" },
    });
  });

  revalidatePath("/receive");
  revalidatePath("/orders");
  revalidatePath("/inventory");
  revalidatePath("/");
}


export async function updatePurchaseOrderHistory(formData: FormData) {
  await requireUser();
  const id = text(formData, "id");
  if (!id) return;

  const orderDate = text(formData, "orderDate");
  const expectedDeliveryDate = text(formData, "expectedDeliveryDate");

  await db.purchaseOrder.update({
    where: { id },
    data: {
      orderDate: orderDate ? new Date(`${orderDate}T12:00:00`) : undefined,
      expectedDeliveryDate: expectedDeliveryDate ? new Date(`${expectedDeliveryDate}T12:00:00`) : null,
      supplierConfirmation: text(formData, "supplierConfirmation") || null,
      notes: text(formData, "notes") || null,
    },
  });

  revalidatePath("/history");
  revalidatePath("/orders");
  revalidatePath("/receive");
  revalidatePath("/");
}

export async function updateDeliveryHistory(formData: FormData) {
  await requireUser();
  const id = text(formData, "id");
  if (!id) return;

  const deliveryDate = text(formData, "deliveryDate");
  const invoiceTotal = text(formData, "invoiceTotal");

  await db.delivery.update({
    where: { id },
    data: {
      deliveryDate: deliveryDate ? new Date(`${deliveryDate}T12:00:00`) : undefined,
      invoiceNumber: text(formData, "invoiceNumber") || null,
      invoiceTotal: invoiceTotal ? num(formData, "invoiceTotal") : null,
      notes: text(formData, "notes") || null,
    },
  });

  revalidatePath("/history");
  revalidatePath("/receive");
  revalidatePath("/orders");
  revalidatePath("/");
}

export async function createCategory(formData: FormData) {
  await requireUser();
  const name = text(formData, "name");
  if (!name) return;
  await db.productCategory.create({ data: { name, sortOrder: num(formData, "sortOrder", 0) } });
  revalidatePath("/setup");
}

export async function createUnit(formData: FormData) {
  await requireUser();
  const name = text(formData, "name");
  const abbreviation = text(formData, "abbreviation");
  if (!name || !abbreviation) return;
  await db.unit.create({ data: { name, abbreviation, unitType: text(formData, "unitType") || "count" } });
  revalidatePath("/setup");
}

export async function createLocation(formData: FormData) {
  await requireUser();
  const name = text(formData, "name");
  if (!name) return;
  await db.location.create({ data: { name, locationType: text(formData, "locationType") || null, sortOrder: num(formData, "sortOrder", 0) } });
  revalidatePath("/setup");
  revalidatePath("/inventory");
  revalidatePath("/stock-count");
  revalidatePath("/receive");
}

export async function createSupplierProduct(formData: FormData) {
  await requireUser();
  const supplierId = text(formData, "supplierId");
  const productId = text(formData, "productId");
  const purchaseUnitId = text(formData, "purchaseUnitId");
  if (!supplierId || !productId || !purchaseUnitId) return;
  const purchasePrice = num(formData, "purchasePrice");
  const record = await db.supplierProduct.create({
    data: {
      supplierId,
      productId,
      supplierSku: text(formData, "supplierSku") || null,
      supplierDescription: text(formData, "supplierDescription") || null,
      purchaseUnitId,
      quantityPerPurchaseUnit: num(formData, "quantityPerPurchaseUnit", 1),
      purchasePrice,
      minimumOrder: num(formData, "minimumOrder", 1),
      preferred: formData.get("preferred") === "on",
    },
  });
  await db.supplierPriceHistory.create({ data: { supplierProductId: record.id, newPrice: purchasePrice, source: "Setup" } });
  revalidatePath("/setup");
  revalidatePath("/orders");
}

export async function updateManufacturer(formData: FormData) {
  await requireUser();
  const id = text(formData, "id");
  const name = text(formData, "name");
  if (!id || !name) return;
  await db.manufacturer.update({ where: { id }, data: {
    name,
    contactName: text(formData, "contactName") || null,
    phone: text(formData, "phone") || null,
    email: text(formData, "email") || null,
    website: text(formData, "website") || null,
    notes: text(formData, "notes") || null,
    active: formData.get("active") === "on",
  }});
  revalidatePath("/setup"); revalidatePath("/inventory");
}

export async function updateSupplier(formData: FormData) {
  await requireUser();
  const id = text(formData, "id");
  const name = text(formData, "name");
  if (!id || !name) return;
  await db.supplier.update({ where: { id }, data: {
    name,
    contactName: text(formData, "contactName") || null,
    email: text(formData, "email") || null,
    phone: text(formData, "phone") || null,
    website: text(formData, "website") || null,
    accountNumber: text(formData, "accountNumber") || null,
    orderMethod: text(formData, "orderMethod") || null,
    orderDay: text(formData, "orderDay") || null,
    leadTimeDays: text(formData, "leadTimeDays") ? num(formData, "leadTimeDays") : null,
    minimumOrderAmount: text(formData, "minimumOrderAmount") ? num(formData, "minimumOrderAmount") : null,
    deliveryNotes: text(formData, "deliveryNotes") || null,
    active: formData.get("active") === "on",
  }});
  revalidatePath("/setup"); revalidatePath("/orders"); revalidatePath("/receive");
}

export async function updateLocation(formData: FormData) {
  await requireUser();
  const id = text(formData, "id");
  const name = text(formData, "name");
  if (!id || !name) return;
  await db.location.update({ where: { id }, data: {
    name,
    locationType: text(formData, "locationType") || null,
    sortOrder: num(formData, "sortOrder", 0),
    active: formData.get("active") === "on",
  }});
  revalidatePath("/setup"); revalidatePath("/inventory"); revalidatePath("/stock-count"); revalidatePath("/receive");
}

export async function updateProduct(formData: FormData) {
  await requireUser();
  const id = text(formData, "id");
  const name = text(formData, "name");
  if (!id || !name) return;
  await db.product.update({ where: { id }, data: {
    name,
    sku: text(formData, "sku") || null,
    categoryId: text(formData, "categoryId"),
    manufacturerId: text(formData, "manufacturerId") || null,
    inventoryUnitId: text(formData, "inventoryUnitId"),
    parLevel: num(formData, "parLevel"),
    reorderPoint: num(formData, "reorderPoint"),
    reorderQuantity: num(formData, "reorderQuantity"),
    currentCost: num(formData, "currentCost"),
    trackInventory: formData.get("trackInventory") === "on",
    active: formData.get("active") === "on",
    notes: text(formData, "notes") || null,
  }});
  revalidatePath("/setup"); revalidatePath("/inventory"); revalidatePath("/orders"); revalidatePath("/");
}


export async function deleteProduct(formData: FormData) {
  await requireUser();
  const id = text(formData, "id");
  const confirmation = text(formData, "confirmation");
  if (!id || confirmation !== "DELETE") {
    redirect("/setup?deleteError=" + encodeURIComponent("Deletion cancelled: type DELETE exactly to confirm."));
  }

  const product = await db.product.findUnique({ where: { id }, select: { name: true } });
  if (!product) redirect("/setup?deleteError=" + encodeURIComponent("Product was not found."));

  const [transactions, stockCounts, orderItems, deliveryItems] = await Promise.all([
    db.inventoryTransaction.count({ where: { productId: id } }),
    db.stockCountItem.count({ where: { productId: id } }),
    db.purchaseOrderItem.count({ where: { productId: id } }),
    db.deliveryItem.count({ where: { productId: id } }),
  ]);

  if (transactions || stockCounts || orderItems || deliveryItems) {
    redirect("/setup?deleteError=" + encodeURIComponent(
      `Cannot permanently delete ${product!.name} because it is already used in inventory, stock count, order, or receiving history. Mark it Inactive instead.`
    ));
  }

  await db.product.delete({ where: { id } });
  revalidatePath("/setup");
  revalidatePath("/inventory");
  revalidatePath("/orders");
  revalidatePath("/");
  redirect("/setup?deleted=" + encodeURIComponent(`Product ${product!.name} was permanently deleted.`));
}

export async function deleteLocation(formData: FormData) {
  await requireUser();
  const id = text(formData, "id");
  const confirmation = text(formData, "confirmation");
  if (!id || confirmation !== "DELETE") {
    redirect("/setup?deleteError=" + encodeURIComponent("Deletion cancelled: type DELETE exactly to confirm."));
  }

  const location = await db.location.findUnique({ where: { id }, select: { name: true } });
  if (!location) redirect("/setup?deleteError=" + encodeURIComponent("Location was not found."));

  const [transactions, stockCounts, deliveryItems] = await Promise.all([
    db.inventoryTransaction.count({ where: { locationId: id } }),
    db.stockCount.count({ where: { locationId: id } }),
    db.deliveryItem.count({ where: { locationId: id } }),
  ]);

  if (transactions || stockCounts || deliveryItems) {
    redirect("/setup?deleteError=" + encodeURIComponent(
      `Cannot permanently delete ${location!.name} because it is already used in inventory, stock count, or receiving history. Mark it Inactive instead.`
    ));
  }

  await db.location.delete({ where: { id } });
  revalidatePath("/setup");
  revalidatePath("/inventory");
  revalidatePath("/stock-count");
  revalidatePath("/receive");
  redirect("/setup?deleted=" + encodeURIComponent(`Location ${location!.name} was permanently deleted.`));
}
