-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "page_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'TO_IMPLEMENT',
    "test_date" DATETIME,
    "variables" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "events_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_events" ("created_at", "id", "name", "page_id", "status", "test_date", "updated_at", "variables") SELECT "created_at", "id", "name", "page_id", "status", "test_date", "updated_at", "variables" FROM "events";
DROP TABLE "events";
ALTER TABLE "new_events" RENAME TO "events";
CREATE TABLE "new_pages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "product_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "pages_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_pages" ("created_at", "id", "name", "product_id", "updated_at", "url") SELECT "created_at", "id", "name", "product_id", "updated_at", "url" FROM "pages";
DROP TABLE "pages";
ALTER TABLE "new_pages" RENAME TO "pages";
CREATE TABLE "new_suggested_values" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "product_id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "is_contextual" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "suggested_values_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_suggested_values" ("created_at", "id", "is_contextual", "product_id", "updated_at", "value") SELECT "created_at", "id", "is_contextual", "product_id", "updated_at", "value" FROM "suggested_values";
DROP TABLE "suggested_values";
ALTER TABLE "new_suggested_values" RENAME TO "suggested_values";
CREATE TABLE "new_variables" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "product_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "variables_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_variables" ("created_at", "description", "id", "name", "product_id", "type", "updated_at") SELECT "created_at", "description", "id", "name", "product_id", "type", "updated_at" FROM "variables";
DROP TABLE "variables";
ALTER TABLE "new_variables" RENAME TO "variables";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
