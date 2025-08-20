-- Migration to simplify architecture: remove instances, simplify pages
-- Step 1: Add new url column to pages with data migration
ALTER TABLE pages ADD COLUMN url TEXT;

-- Step 2: Migrate existing URLs data (extract first URL from JSON)
UPDATE pages SET url = (
  CASE 
    WHEN urls LIKE '%"dev":%' THEN 
      TRIM(SUBSTR(urls, INSTR(urls, '"dev":"') + 6), '"')
    WHEN urls LIKE '%"staging":%' THEN 
      TRIM(SUBSTR(urls, INSTR(urls, '"staging":"') + 10), '"')
    WHEN urls LIKE '%"prod":%' THEN 
      TRIM(SUBSTR(urls, INSTR(urls, '"prod":"') + 7), '"')
    ELSE 'https://example.com'
  END
);

-- Step 3: Make url column required
ALTER TABLE pages RENAME TO pages_old;

CREATE TABLE pages (
    id TEXT NOT NULL PRIMARY KEY,
    product_id TEXT NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL,
    CONSTRAINT pages_product_id_fkey FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Step 4: Copy data from old table
INSERT INTO pages (id, product_id, name, url, created_at, updated_at)
SELECT id, product_id, name, url, created_at, updated_at FROM pages_old;

-- Step 5: Drop old table
DROP TABLE pages_old;

-- Step 6: Simplify products table
ALTER TABLE products RENAME TO products_old;

CREATE TABLE products (
    id TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL
);

-- Step 7: Copy products data
INSERT INTO products (id, name, description, created_at, updated_at)
SELECT id, name, description, created_at, updated_at FROM products_old;

-- Step 8: Drop old products table
DROP TABLE products_old;

-- Step 9: Drop instances table completely
DROP TABLE instances;