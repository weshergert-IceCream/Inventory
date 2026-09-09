-- The Old Hound Inventory & Ordering System - initial PostgreSQL schema
CREATE TYPE "InventoryTransactionType" AS ENUM ('RECEIPT','COUNT_ADJUSTMENT','MANUAL_ADJUSTMENT','TRANSFER_IN','TRANSFER_OUT','RETURN_TO_SUPPLIER');
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT','APPROVED','SENT','PARTIALLY_RECEIVED','RECEIVED','CANCELLED');
CREATE TYPE "StockCountStatus" AS ENUM ('DRAFT','IN_PROGRESS','COMPLETED','CANCELLED');
CREATE TYPE "DeliveryStatus" AS ENUM ('IN_PROGRESS','COMPLETED','CANCELLED');
CREATE TYPE "UserRole" AS ENUM ('OWNER','MANAGER','STAFF');

CREATE TABLE "ProductCategory" (
  "id" TEXT PRIMARY KEY, "name" TEXT NOT NULL UNIQUE, "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "Manufacturer" (
  "id" TEXT PRIMARY KEY, "name" TEXT NOT NULL UNIQUE, "contactName" TEXT, "phone" TEXT, "email" TEXT,
  "website" TEXT, "notes" TEXT, "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "Unit" (
  "id" TEXT PRIMARY KEY, "name" TEXT NOT NULL UNIQUE, "abbreviation" TEXT NOT NULL UNIQUE, "unitType" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "Supplier" (
  "id" TEXT PRIMARY KEY, "name" TEXT NOT NULL UNIQUE, "contactName" TEXT, "email" TEXT, "phone" TEXT, "website" TEXT,
  "accountNumber" TEXT, "orderMethod" TEXT, "orderDay" TEXT, "leadTimeDays" INTEGER,
  "minimumOrderAmount" DECIMAL(10,2), "deliveryNotes" TEXT, "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "Location" (
  "id" TEXT PRIMARY KEY, "name" TEXT NOT NULL UNIQUE, "locationType" TEXT, "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "email" TEXT NOT NULL UNIQUE, "passwordHash" TEXT,
  "role" "UserRole" NOT NULL DEFAULT 'STAFF', "active" BOOLEAN NOT NULL DEFAULT true, "lastLogin" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "Product" (
  "id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "sku" TEXT UNIQUE, "categoryId" TEXT NOT NULL,
  "manufacturerId" TEXT, "inventoryUnitId" TEXT NOT NULL, "parLevel" DECIMAL(12,3) NOT NULL DEFAULT 0,
  "reorderPoint" DECIMAL(12,3) NOT NULL DEFAULT 0, "reorderQuantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
  "currentCost" DECIMAL(12,4) NOT NULL DEFAULT 0, "trackInventory" BOOLEAN NOT NULL DEFAULT true,
  "active" BOOLEAN NOT NULL DEFAULT true, "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Product_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "Manufacturer"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Product_inventoryUnitId_fkey" FOREIGN KEY ("inventoryUnitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX "Product_manufacturerId_idx" ON "Product"("manufacturerId");
CREATE INDEX "Product_name_idx" ON "Product"("name");

CREATE TABLE "SupplierProduct" (
  "id" TEXT PRIMARY KEY, "supplierId" TEXT NOT NULL, "productId" TEXT NOT NULL, "supplierSku" TEXT,
  "supplierDescription" TEXT, "purchaseUnitId" TEXT NOT NULL, "quantityPerPurchaseUnit" DECIMAL(12,3) NOT NULL,
  "purchasePrice" DECIMAL(12,2) NOT NULL, "minimumOrder" DECIMAL(12,3) NOT NULL DEFAULT 1,
  "preferred" BOOLEAN NOT NULL DEFAULT false, "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupplierProduct_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SupplierProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SupplierProduct_purchaseUnitId_fkey" FOREIGN KEY ("purchaseUnitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SupplierProduct_supplierId_productId_supplierSku_key" ON "SupplierProduct"("supplierId","productId","supplierSku");
CREATE INDEX "SupplierProduct_productId_idx" ON "SupplierProduct"("productId");
CREATE INDEX "SupplierProduct_supplierId_idx" ON "SupplierProduct"("supplierId");

CREATE TABLE "SupplierPriceHistory" (
  "id" TEXT PRIMARY KEY, "supplierProductId" TEXT NOT NULL, "oldPrice" DECIMAL(12,2), "newPrice" DECIMAL(12,2) NOT NULL,
  "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "source" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupplierPriceHistory_supplierProductId_fkey" FOREIGN KEY ("supplierProductId") REFERENCES "SupplierProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "SupplierPriceHistory_supplierProductId_effectiveDate_idx" ON "SupplierPriceHistory"("supplierProductId","effectiveDate");

CREATE TABLE "InventoryTransaction" (
  "id" TEXT PRIMARY KEY, "productId" TEXT NOT NULL, "locationId" TEXT NOT NULL,
  "transactionType" "InventoryTransactionType" NOT NULL, "quantity" DECIMAL(12,3) NOT NULL, "unitCost" DECIMAL(12,4),
  "referenceType" TEXT, "referenceId" TEXT, "userId" TEXT, "notes" TEXT,
  "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryTransaction_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryTransaction_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "InventoryTransaction_productId_transactionDate_idx" ON "InventoryTransaction"("productId","transactionDate");
CREATE INDEX "InventoryTransaction_locationId_transactionDate_idx" ON "InventoryTransaction"("locationId","transactionDate");
CREATE INDEX "InventoryTransaction_referenceType_referenceId_idx" ON "InventoryTransaction"("referenceType","referenceId");

CREATE TABLE "StockCount" (
  "id" TEXT PRIMARY KEY, "locationId" TEXT NOT NULL, "countDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" "StockCountStatus" NOT NULL DEFAULT 'DRAFT', "createdById" TEXT, "completedById" TEXT,
  "completedAt" TIMESTAMP(3), "notes" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StockCount_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StockCount_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "StockCount_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "StockCount_locationId_countDate_idx" ON "StockCount"("locationId","countDate");
CREATE TABLE "StockCountItem" (
  "id" TEXT PRIMARY KEY, "stockCountId" TEXT NOT NULL, "productId" TEXT NOT NULL,
  "expectedQuantity" DECIMAL(12,3) NOT NULL, "countedQuantity" DECIMAL(12,3) NOT NULL,
  "varianceQuantity" DECIMAL(12,3) NOT NULL, "unitCost" DECIMAL(12,4) NOT NULL,
  "varianceValue" DECIMAL(12,2) NOT NULL, "notes" TEXT,
  CONSTRAINT "StockCountItem_stockCountId_fkey" FOREIGN KEY ("stockCountId") REFERENCES "StockCount"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StockCountItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "StockCountItem_stockCountId_productId_key" ON "StockCountItem"("stockCountId","productId");

CREATE TABLE "PurchaseOrder" (
  "id" TEXT PRIMARY KEY, "poNumber" TEXT NOT NULL UNIQUE, "supplierId" TEXT NOT NULL,
  "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT', "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expectedDeliveryDate" TIMESTAMP(3), "submittedDate" TIMESTAMP(3), "createdById" TEXT,
  "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0, "tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(12,2) NOT NULL DEFAULT 0, "supplierConfirmation" TEXT, "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PurchaseOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "PurchaseOrder_supplierId_status_idx" ON "PurchaseOrder"("supplierId","status");

CREATE TABLE "PurchaseOrderItem" (
  "id" TEXT PRIMARY KEY, "purchaseOrderId" TEXT NOT NULL, "productId" TEXT NOT NULL, "supplierProductId" TEXT,
  "quantityOrdered" DECIMAL(12,3) NOT NULL, "purchaseUnitLabel" TEXT NOT NULL,
  "quantityPerUnit" DECIMAL(12,3) NOT NULL, "unitPrice" DECIMAL(12,2) NOT NULL,
  "quantityReceived" DECIMAL(12,3) NOT NULL DEFAULT 0, "lineTotal" DECIMAL(12,2) NOT NULL, "notes" TEXT,
  CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PurchaseOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PurchaseOrderItem_supplierProductId_fkey" FOREIGN KEY ("supplierProductId") REFERENCES "SupplierProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "PurchaseOrderItem_purchaseOrderId_idx" ON "PurchaseOrderItem"("purchaseOrderId");
CREATE INDEX "PurchaseOrderItem_productId_idx" ON "PurchaseOrderItem"("productId");

CREATE TABLE "Delivery" (
  "id" TEXT PRIMARY KEY, "purchaseOrderId" TEXT, "supplierId" TEXT NOT NULL,
  "deliveryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "invoiceNumber" TEXT, "invoiceTotal" DECIMAL(12,2),
  "receivedById" TEXT, "status" "DeliveryStatus" NOT NULL DEFAULT 'IN_PROGRESS', "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Delivery_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Delivery_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Delivery_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "DeliveryItem" (
  "id" TEXT PRIMARY KEY, "deliveryId" TEXT NOT NULL, "purchaseOrderItemId" TEXT, "productId" TEXT NOT NULL,
  "locationId" TEXT, "quantityReceived" DECIMAL(12,3) NOT NULL, "purchaseUnitLabel" TEXT NOT NULL,
  "inventoryQuantityReceived" DECIMAL(12,3) NOT NULL, "actualUnitCost" DECIMAL(12,4),
  "damagedQuantity" DECIMAL(12,3) NOT NULL DEFAULT 0, "notes" TEXT,
  CONSTRAINT "DeliveryItem_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DeliveryItem_purchaseOrderItemId_fkey" FOREIGN KEY ("purchaseOrderItemId") REFERENCES "PurchaseOrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "DeliveryItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "DeliveryItem_deliveryId_idx" ON "DeliveryItem"("deliveryId");

CREATE TABLE "AuditLog" (
  "id" TEXT PRIMARY KEY, "userId" TEXT, "action" TEXT NOT NULL, "entityType" TEXT NOT NULL,
  "entityId" TEXT, "beforeJson" JSONB, "afterJson" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType","entityId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

CREATE TABLE "Setting" (
  "id" TEXT PRIMARY KEY, "key" TEXT NOT NULL UNIQUE, "value" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
