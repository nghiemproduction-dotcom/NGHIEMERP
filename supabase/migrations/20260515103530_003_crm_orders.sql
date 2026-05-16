/*
  # CRM, Leads, Customers, Orders Schema

  ## Tables Created
  - customers: Full CRM customer records with persona, tier, history
  - leads: Prospect pipeline
  - orders: Sales orders with all lifecycle fields
  - order_items: Line items per order
  - order_history: Immutable audit log for order changes
  - quotations: Quote records linked to orders
  - complaints: Customer complaint tracker
*/

-- =================== CUSTOMERS ===================
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  full_name text NOT NULL,
  company text DEFAULT '',
  email text DEFAULT '',
  phone text NOT NULL,
  address text DEFAULT '',
  city text DEFAULT '',
  tier_id uuid REFERENCES master_tiers(id),
  tier_code text DEFAULT 'standard',
  segment text DEFAULT 'individual',
  source text DEFAULT 'walk-in',
  persona text DEFAULT '',
  pain_points text[] DEFAULT '{}',
  interests text[] DEFAULT '{}',
  total_orders int DEFAULT 0,
  total_spent numeric(15,2) DEFAULT 0,
  last_order_at timestamptz,
  assigned_to uuid REFERENCES master_users(id),
  notes text DEFAULT '',
  tags text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  meta jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read customers" ON customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage customers" ON customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff update customers" ON customers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- =================== LEADS ===================
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  full_name text NOT NULL,
  phone text DEFAULT '',
  email text DEFAULT '',
  source text DEFAULT 'facebook',
  status text DEFAULT 'new',
  product_interest text DEFAULT '',
  budget_estimate numeric(15,2) DEFAULT 0,
  notes text DEFAULT '',
  assigned_to uuid REFERENCES master_users(id),
  converted_at timestamptz,
  customer_id uuid REFERENCES customers(id),
  follow_up_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read leads" ON leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage leads" ON leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff update leads" ON leads FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- =================== ORDERS ===================
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id),
  location_id uuid REFERENCES master_locations(id),
  status text DEFAULT 'draft',
  source text DEFAULT 'direct',
  priority text DEFAULT 'normal',
  assigned_to uuid REFERENCES master_users(id),
  order_date timestamptz DEFAULT now(),
  deadline date,
  promised_date date,
  completed_date timestamptz,
  subtotal numeric(15,2) DEFAULT 0,
  discount_amount numeric(15,2) DEFAULT 0,
  discount_pct numeric(5,2) DEFAULT 0,
  tax_amount numeric(15,2) DEFAULT 0,
  total_amount numeric(15,2) DEFAULT 0,
  paid_amount numeric(15,2) DEFAULT 0,
  balance_due numeric(15,2) DEFAULT 0,
  cogs_estimate numeric(15,2) DEFAULT 0,
  margin_estimate numeric(15,2) DEFAULT 0,
  deposit_amount numeric(15,2) DEFAULT 0,
  deposit_date date,
  payment_status text DEFAULT 'unpaid',
  shipping_address text DEFAULT '',
  delivery_method text DEFAULT 'pickup',
  shipper_id uuid REFERENCES master_users(id),
  shipping_cost numeric(12,2) DEFAULT 0,
  special_instructions text DEFAULT '',
  internal_notes text DEFAULT '',
  tags text[] DEFAULT '{}',
  meta jsonb DEFAULT '{}',
  created_by uuid REFERENCES master_users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read orders" ON orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff create orders" ON orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff update orders" ON orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- =================== ORDER ITEMS ===================
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  product_name text NOT NULL,
  sku text DEFAULT '',
  qty int DEFAULT 1,
  unit_price numeric(15,2) DEFAULT 0,
  discount_pct numeric(5,2) DEFAULT 0,
  line_total numeric(15,2) DEFAULT 0,
  cost_estimate numeric(15,2) DEFAULT 0,
  dimensions text DEFAULT '',
  specifications jsonb DEFAULT '{}',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read order items" ON order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage order items" ON order_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff update order items" ON order_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- =================== ORDER HISTORY ===================
CREATE TABLE IF NOT EXISTS order_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  note text DEFAULT '',
  performed_by uuid REFERENCES master_users(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE order_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read order history" ON order_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff log order history" ON order_history FOR INSERT TO authenticated WITH CHECK (true);

-- =================== QUOTATIONS ===================
CREATE TABLE IF NOT EXISTS quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_no text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id),
  order_id uuid REFERENCES orders(id),
  status text DEFAULT 'draft',
  valid_until date,
  items jsonb DEFAULT '[]',
  subtotal numeric(15,2) DEFAULT 0,
  total numeric(15,2) DEFAULT 0,
  notes text DEFAULT '',
  created_by uuid REFERENCES master_users(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read quotations" ON quotations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage quotations" ON quotations FOR INSERT TO authenticated WITH CHECK (true);

-- =================== COMPLAINTS ===================
CREATE TABLE IF NOT EXISTS complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_no text UNIQUE NOT NULL,
  order_id uuid REFERENCES orders(id),
  customer_id uuid REFERENCES customers(id),
  type text DEFAULT 'quality',
  status text DEFAULT 'open',
  description text NOT NULL,
  resolution text DEFAULT '',
  refund_amount numeric(15,2) DEFAULT 0,
  resolved_at timestamptz,
  assigned_to uuid REFERENCES master_users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read complaints" ON complaints FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage complaints" ON complaints FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff update complaints" ON complaints FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
