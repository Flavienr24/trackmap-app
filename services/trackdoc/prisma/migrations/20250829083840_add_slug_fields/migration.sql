/*
  Migration to add slug fields to products and pages tables
  
  This migration adds URL-friendly slug fields and populates them based on existing names:
  - Products get slugs based on lowercase names with special chars removed
  - Pages get slugs based on lowercase names with special chars removed
*/

-- First add temporary slug columns that allow NULL
ALTER TABLE "products" ADD COLUMN "slug_temp" TEXT;
ALTER TABLE "pages" ADD COLUMN "slug_temp" TEXT;

-- Generate slugs for existing products based on their names
UPDATE "products" SET "slug_temp" = 
  REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(LOWER(TRIM("name")), ' ', '-'),
            '_', '-'
          ),
          '.', ''
        ),
        '/', ''
      ),
      '(', ''
    ),
    ')', ''
  );

-- Generate slugs for existing pages based on their names  
UPDATE "pages" SET "slug_temp" = 
  REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(LOWER(TRIM("name")), ' ', '-'),
            '_', '-'
          ),
          '.', ''
        ),
        '/', ''
      ),
      '(', ''
    ),
    ')', ''
  );

-- Now create the final tables with NOT NULL slug columns
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- Recreate products table with slug
CREATE TABLE "new_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

INSERT INTO "new_products" ("id", "name", "slug", "description", "created_at", "updated_at") 
SELECT "id", "name", "slug_temp", "description", "created_at", "updated_at" FROM "products";

DROP TABLE "products";
ALTER TABLE "new_products" RENAME TO "products";
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- Recreate pages table with slug
CREATE TABLE "new_pages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "product_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "pages_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_pages" ("id", "product_id", "name", "slug", "url", "created_at", "updated_at") 
SELECT "id", "product_id", "name", "slug_temp", "url", "created_at", "updated_at" FROM "pages";

DROP TABLE "pages";
ALTER TABLE "new_pages" RENAME TO "pages";
CREATE UNIQUE INDEX "pages_product_id_slug_key" ON "pages"("product_id", "slug");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
