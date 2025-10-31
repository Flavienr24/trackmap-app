-- CreateTable
CREATE TABLE "common_properties" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "product_id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "suggested_value_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "common_properties_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "common_properties_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "common_properties_suggested_value_id_fkey" FOREIGN KEY ("suggested_value_id") REFERENCES "suggested_values" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "common_properties_property_id_key" ON "common_properties"("property_id");

-- CreateIndex
CREATE UNIQUE INDEX "common_properties_product_id_property_id_key" ON "common_properties"("product_id", "property_id");

-- CreateIndex
CREATE INDEX "common_properties_product_id_idx" ON "common_properties"("product_id");
