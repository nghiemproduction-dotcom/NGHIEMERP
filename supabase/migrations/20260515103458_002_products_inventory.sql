/*
  # Products, Inventory, BOM Schema

  ## Tables Created
  - products: Artwork products and services catalog
  - materials: Raw and processed materials
  - inventory_items: Real-time stock per location
  - inventory_transactions: All stock movements
  - bom_templates: Bill of Materials per product type
  - bom_items: Individual BOM line items
*/

-- =================== PRODUCTS ===================
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  category_id uuid REFERENCES master_categories(id),
  type text DEFAULT 'artwork',
  description text DEFAULT '',
  price numeric(15,2) DEFAULT 0,
  cost_estimate numeric(15,2) DEFAULT 0,
  unit text DEFAULT 'bức',
  dimensions text DEFAULT '',
  medium text DEFAULT '',
  style text DEFAULT '',
  tags text[] DEFAULT '{}',
  images text[] DEFAULT '{}',
  is_public boolean DEFAULT false,
  is_active boolean DEFAULT true,
  meta jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read products" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage products" ON products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin update products" ON products FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- =================== MATERIALS ===================
CREATE TABLE IF NOT EXISTS materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  category_id uuid REFERENCES master_categories(id),
  type text DEFAULT 'raw',
  unit text DEFAULT 'kg',
  cost_per_unit numeric(15,4) DEFAULT 0,
  min_stock numeric(12,2) DEFAULT 0,
  reorder_qty numeric(12,2) DEFAULT 0,
  supplier_id uuid,
  notes text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read materials" ON materials FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage materials" ON materials FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin update materials" ON materials FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- =================== INVENTORY ITEMS ===================
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid REFERENCES materials(id),
  product_id uuid REFERENCES products(id),
  location_id uuid REFERENCES master_locations(id),
  qty_on_hand numeric(12,2) DEFAULT 0,
  qty_reserved numeric(12,2) DEFAULT 0,
  qty_available numeric(12,2) GENERATED ALWAYS AS (qty_on_hand - qty_reserved) STORED,
  avg_cost numeric(15,4) DEFAULT 0,
  last_counted_at timestamptz,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read inventory" ON inventory_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage inventory" ON inventory_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin update inventory" ON inventory_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- =================== INVENTORY TRANSACTIONS ===================
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  txn_no text UNIQUE NOT NULL,
  txn_type text NOT NULL,
  material_id uuid REFERENCES materials(id),
  product_id uuid REFERENCES products(id),
  from_location_id uuid REFERENCES master_locations(id),
  to_location_id uuid REFERENCES master_locations(id),
  qty numeric(12,2) NOT NULL DEFAULT 0,
  unit_cost numeric(15,4) DEFAULT 0,
  total_cost numeric(15,2) DEFAULT 0,
  ref_type text DEFAULT '',
  ref_id uuid,
  ref_no text DEFAULT '',
  batch_no text DEFAULT '',
  notes text DEFAULT '',
  performed_by uuid REFERENCES master_users(id),
  txn_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read inv txn" ON inventory_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage inv txn" ON inventory_transactions FOR INSERT TO authenticated WITH CHECK (true);

-- =================== BOM TEMPLATES ===================
CREATE TABLE IF NOT EXISTS bom_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  product_type text NOT NULL,
  version int DEFAULT 1,
  is_active boolean DEFAULT true,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE bom_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read bom" ON bom_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage bom" ON bom_templates FOR INSERT TO authenticated WITH CHECK (true);

-- =================== BOM ITEMS ===================
CREATE TABLE IF NOT EXISTS bom_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bom_id uuid REFERENCES bom_templates(id) ON DELETE CASCADE,
  material_id uuid REFERENCES materials(id),
  qty_per_unit numeric(12,4) NOT NULL DEFAULT 1,
  unit text DEFAULT '',
  waste_rate numeric(5,2) DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE bom_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read bom items" ON bom_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage bom items" ON bom_items FOR INSERT TO authenticated WITH CHECK (true);
