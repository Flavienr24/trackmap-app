/*
  Migration Pass 1 – Event Definitions Glossary

  - Align legacy schema with current datamodel (properties / property_values)
  - Introduce canonical EventDefinition tables with history tracking
  - Add nullable foreign key from events to event_definitions
  - Ensure product name uniqueness constraint is present when running on fresh databases
*/

-- Legacy cleanup: remove deprecated tables if they are still present
PRAGMA foreign_keys=OFF;
DROP TABLE IF EXISTS "variable_values";
DROP TABLE IF EXISTS "variables";
PRAGMA foreign_keys=ON;

-- Ensure properties library tables exist (fresh databases created from older migrations)
CREATE TABLE IF NOT EXISTS "properties" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "product_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "properties_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "property_values" (
    "property_id" TEXT NOT NULL,
    "suggested_value_id" TEXT NOT NULL,
    CONSTRAINT "property_values_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "property_values_suggested_value_id_fkey" FOREIGN KEY ("suggested_value_id") REFERENCES "suggested_values" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY ("property_id", "suggested_value_id")
);

-- Canonical event definitions
CREATE TABLE "event_definitions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "product_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "user_interaction_type" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "event_definitions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "event_definition_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "event_definition_id" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "author" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_definition_history_event_definition_id_fkey" FOREIGN KEY ("event_definition_id") REFERENCES "event_definitions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Redefine events to attach optional eventDefinition while keeping legacy name column as shadow
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "page_id" TEXT NOT NULL,
    "event_definition_id" TEXT,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'TO_IMPLEMENT',
    "test_date" DATETIME,
    "properties" TEXT NOT NULL,
    "screenshots" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "events_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "events_event_definition_id_fkey" FOREIGN KEY ("event_definition_id") REFERENCES "event_definitions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_events" ("created_at", "id", "name", "page_id", "properties", "screenshots", "status", "test_date", "updated_at")
SELECT "created_at", "id", "name", "page_id", "properties", "screenshots", "status", "test_date", "updated_at" FROM "events";
DROP TABLE "events";
ALTER TABLE "new_events" RENAME TO "events";
CREATE INDEX "events_page_id_idx" ON "events"("page_id");
CREATE INDEX "events_event_definition_id_idx" ON "events"("event_definition_id");
CREATE INDEX "events_status_idx" ON "events"("status");
CREATE INDEX "events_updated_at_idx" ON "events"("updated_at");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Supporting indexes for the new glossary tables
CREATE INDEX "event_definitions_product_id_idx" ON "event_definitions"("product_id");
CREATE UNIQUE INDEX "event_definitions_product_id_name_key" ON "event_definitions"("product_id", "name");
CREATE INDEX "event_definition_history_event_definition_id_idx" ON "event_definition_history"("event_definition_id");

-- Ensure legacy pages index exists (older databases were missing it)
CREATE INDEX IF NOT EXISTS "pages_product_id_idx" ON "pages"("product_id");

-- Ensure product names stay unique even on fresh databases
CREATE UNIQUE INDEX IF NOT EXISTS "products_name_key" ON "products"("name");
