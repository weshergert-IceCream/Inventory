import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  await db.auditLog.deleteMany();
  await db.deliveryItem.deleteMany();
  await db.delivery.deleteMany();
  await db.purchaseOrderItem.deleteMany();
  await db.purchaseOrder.deleteMany();
  await db.stockCountItem.deleteMany();
  await db.stockCount.deleteMany();
  await db.inventoryTransaction.deleteMany();
  await db.supplierPriceHistory.deleteMany();
  await db.supplierProduct.deleteMany();
  await db.product.deleteMany();
  await db.supplier.deleteMany();
  await db.manufacturer.deleteMany();
  await db.location.deleteMany();
  await db.productCategory.deleteMany();
  await db.unit.deleteMany();
  await db.session.deleteMany();
  await db.user.deleteMany();
  await db.setting.deleteMany();

  const [iceCream, dairy, cones, packaging, toppings, cleaning] = await Promise.all([
    db.productCategory.create({ data: { name: "Ice Cream", sortOrder: 1 } }),
    db.productCategory.create({ data: { name: "Milk & Dairy", sortOrder: 2 } }),
    db.productCategory.create({ data: { name: "Cones", sortOrder: 3 } }),
    db.productCategory.create({ data: { name: "Cups & Lids", sortOrder: 4 } }),
    db.productCategory.create({ data: { name: "Toppings & Sauces", sortOrder: 5 } }),
    db.productCategory.create({ data: { name: "Cleaning", sortOrder: 6 } }),
  ]);

  const [litre, each, caseUnit, tub, bottle] = await Promise.all([
    db.unit.create({ data: { name: "Litre", abbreviation: "L", unitType: "volume" } }),
    db.unit.create({ data: { name: "Each", abbreviation: "ea", unitType: "count" } }),
    db.unit.create({ data: { name: "Case", abbreviation: "case", unitType: "package" } }),
    db.unit.create({ data: { name: "Tub", abbreviation: "tub", unitType: "package" } }),
    db.unit.create({ data: { name: "Bottle", abbreviation: "btl", unitType: "package" } }),
  ]);

  const [walkIn, frontFreezer, dryStorage, refrigerator] = await Promise.all([
    db.location.create({ data: { name: "Walk-In Freezer", locationType: "Freezer", sortOrder: 1 } }),
    db.location.create({ data: { name: "Front Service Freezer", locationType: "Freezer", sortOrder: 2 } }),
    db.location.create({ data: { name: "Dry Storage", locationType: "Dry", sortOrder: 3 } }),
    db.location.create({ data: { name: "Back Refrigerator", locationType: "Refrigerator", sortOrder: 4 } }),
  ]);

  const [chapmans, oldHoundHouse, packagingMfr] = await Promise.all([
    db.manufacturer.create({ data: { name: "Chapman's" } }),
    db.manufacturer.create({ data: { name: "The Old Hound House Supply" } }),
    db.manufacturer.create({ data: { name: "Foodservice Packaging Co." } }),
  ]);

  const [dairySupplier, foodSupplier, packagingSupplier] = await Promise.all([
    db.supplier.create({ data: { name: "Central Dairy Distributor", orderDay: "Tuesday", leadTimeDays: 2, minimumOrderAmount: 250 } }),
    db.supplier.create({ data: { name: "FoodService Supply", orderDay: "Monday", leadTimeDays: 2 } }),
    db.supplier.create({ data: { name: "Packaging Supply Co.", orderMethod: "Online", leadTimeDays: 3 } }),
  ]);

  const vanilla = await db.product.create({ data: { name: "Vanilla Ice Cream", sku: "IC-VAN", categoryId: iceCream.id, manufacturerId: chapmans.id, inventoryUnitId: litre.id, parLevel: 60, reorderPoint: 25, reorderQuantity: 22.8, currentCost: 5.24 } });
  const chocolate = await db.product.create({ data: { name: "Chocolate Ice Cream", sku: "IC-CHO", categoryId: iceCream.id, manufacturerId: chapmans.id, inventoryUnitId: litre.id, parLevel: 60, reorderPoint: 25, reorderQuantity: 22.8, currentCost: 5.39 } });
  const strawberry = await db.product.create({ data: { name: "Strawberry Ice Cream", sku: "IC-STR", categoryId: iceCream.id, manufacturerId: chapmans.id, inventoryUnitId: litre.id, parLevel: 45, reorderPoint: 20, reorderQuantity: 22.8, currentCost: 5.49 } });
  const milk = await db.product.create({ data: { name: "2% Milk", sku: "DA-MILK", categoryId: dairy.id, manufacturerId: oldHoundHouse.id, inventoryUnitId: litre.id, parLevel: 40, reorderPoint: 15, reorderQuantity: 24, currentCost: 1.72 } });
  const waffle = await db.product.create({ data: { name: "Waffle Cones", sku: "CO-WAF", categoryId: cones.id, manufacturerId: packagingMfr.id, inventoryUnitId: each.id, parLevel: 600, reorderPoint: 200, reorderQuantity: 300, currentCost: 0.19 } });
  const largeCups = await db.product.create({ data: { name: "Large Cups", sku: "PK-LCUP", categoryId: packaging.id, manufacturerId: packagingMfr.id, inventoryUnitId: each.id, parLevel: 500, reorderPoint: 150, reorderQuantity: 500, currentCost: 0.16 } });
  const chocolateSauce = await db.product.create({ data: { name: "Chocolate Sauce", sku: "TOP-CHO", categoryId: toppings.id, manufacturerId: oldHoundHouse.id, inventoryUnitId: each.id, parLevel: 12, reorderPoint: 4, reorderQuantity: 6, currentCost: 8.25 } });
  const sanitizer = await db.product.create({ data: { name: "Food-Safe Sanitizer", sku: "CL-SAN", categoryId: cleaning.id, manufacturerId: oldHoundHouse.id, inventoryUnitId: each.id, parLevel: 8, reorderPoint: 2, reorderQuantity: 4, currentCost: 12.5 } });

  const supplierProducts = [
    [dairySupplier.id, vanilla.id, "VAN-11.4", tub.id, 11.4, 59.75],
    [dairySupplier.id, chocolate.id, "CHO-11.4", tub.id, 11.4, 61.5],
    [dairySupplier.id, strawberry.id, "STR-11.4", tub.id, 11.4, 62.25],
    [dairySupplier.id, milk.id, "MILK-12L", caseUnit.id, 12, 20.64],
    [packagingSupplier.id, waffle.id, "WAF-300", caseUnit.id, 300, 57],
    [packagingSupplier.id, largeCups.id, "LCUP-500", caseUnit.id, 500, 80],
    [foodSupplier.id, chocolateSauce.id, "CHOSAU-6", caseUnit.id, 6, 49.5],
    [foodSupplier.id, sanitizer.id, "SAN-4", caseUnit.id, 4, 50],
  ] as const;

  for (const [supplierId, productId, supplierSku, purchaseUnitId, quantityPerPurchaseUnit, purchasePrice] of supplierProducts) {
    const sp = await db.supplierProduct.create({ data: { supplierId, productId, supplierSku, purchaseUnitId, quantityPerPurchaseUnit, purchasePrice, preferred: true } });
    await db.supplierPriceHistory.create({ data: { supplierProductId: sp.id, newPrice: purchasePrice, source: "Initial setup" } });
  }

  const starting = [
    [vanilla.id, walkIn.id, 18], [vanilla.id, frontFreezer.id, 4],
    [chocolate.id, walkIn.id, 28], [chocolate.id, frontFreezer.id, 3],
    [strawberry.id, walkIn.id, 10], [strawberry.id, frontFreezer.id, 2],
    [milk.id, refrigerator.id, 18],
    [waffle.id, dryStorage.id, 120], [largeCups.id, dryStorage.id, 75],
    [chocolateSauce.id, dryStorage.id, 3], [sanitizer.id, dryStorage.id, 5],
  ] as const;

  for (const [productId, locationId, quantity] of starting) {
    const product = await db.product.findUniqueOrThrow({ where: { id: productId } });
    await db.inventoryTransaction.create({ data: { productId, locationId, transactionType: "MANUAL_ADJUSTMENT", quantity, unitCost: product.currentCost, notes: "Opening inventory" } });
  }

  await db.user.create({ data: { name: "Shop Owner", email: "owner@oldhound.local", role: "OWNER" } });
  await db.setting.create({ data: { key: "shop", value: { name: "The Old Hound", currency: "CAD" } } });

  const spVan = await db.supplierProduct.findFirstOrThrow({ where: { productId: vanilla.id, supplierId: dairySupplier.id }, include: { purchaseUnit: true } });
  const spCho = await db.supplierProduct.findFirstOrThrow({ where: { productId: chocolate.id, supplierId: dairySupplier.id }, include: { purchaseUnit: true } });
  await db.purchaseOrder.create({
    data: {
      poNumber: `PO-${new Date().getFullYear()}-0001`, supplierId: dairySupplier.id, status: "SENT", submittedDate: new Date(),
      expectedDeliveryDate: new Date(Date.now() + 2 * 86400000), subtotal: 243, total: 243,
      items: { create: [
        { productId: vanilla.id, supplierProductId: spVan.id, quantityOrdered: 2, purchaseUnitLabel: spVan.purchaseUnit.abbreviation, quantityPerUnit: spVan.quantityPerPurchaseUnit, unitPrice: spVan.purchasePrice, lineTotal: 119.5 },
        { productId: chocolate.id, supplierProductId: spCho.id, quantityOrdered: 2, purchaseUnitLabel: spCho.purchaseUnit.abbreviation, quantityPerUnit: spCho.quantityPerPurchaseUnit, unitPrice: spCho.purchasePrice, lineTotal: 123 },
      ] },
    },
  });

  console.log("Seeded The Old Hound inventory database.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => db.$disconnect());
