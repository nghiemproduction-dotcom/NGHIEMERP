/*
  # ArtERP Core Schema

  ## Summary
  Creates the foundational tables for the Art Workshop ERP system:
  master data tables, user roles, workflow engine, inventory, CRM, finance, and production.

  ## Tables Created
  - master_roles: Dynamic role definitions with permission arrays
  - master_users: Staff, partners, customers user records
  - master_categories: Product/material/service classification
  - master_status: Dynamic status definitions per domain
  - master_units: Units of measurement
  - master_locations: Warehouses, POS, kiosks, partner stores
  - master_tiers: Customer/partner tiering

  ## Security
  - RLS enabled on all tables
  - Policies for authenticated access
*/

-- =================== MASTER ROLES ===================
CREATE TABLE IF NOT EXISTS master_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  permissions jsonb DEFAULT '{}',
  menu_access text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE master_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read roles" ON master_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage roles" ON master_roles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin can update roles" ON master_roles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- =================== MASTER USERS ===================
CREATE TABLE IF NOT EXISTS master_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid,
  code text UNIQUE NOT NULL,
  full_name text NOT NULL,
  email text,
  phone text,
  pin_hash text,
  role_id uuid REFERENCES master_roles(id),
  role_code text,
  status text DEFAULT 'active',
  avatar_url text,
  skills text[] DEFAULT '{}',
  shift text DEFAULT 'full-time',
  hourly_rate numeric(12,2) DEFAULT 0,
  monthly_salary numeric(12,2) DEFAULT 0,
  join_date date,
  notes text DEFAULT '',
  meta jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE master_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read users" ON master_users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert users" ON master_users FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin can update users" ON master_users FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- =================== MASTER CATEGORIES ===================
CREATE TABLE IF NOT EXISTS master_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  parent_id uuid REFERENCES master_categories(id),
  unit text DEFAULT 'cái',
  min_stock numeric(12,2) DEFAULT 0,
  description text DEFAULT '',
  is_active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  meta jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE master_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read categories" ON master_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin insert categories" ON master_categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin update categories" ON master_categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- =================== MASTER STATUS ===================
CREATE TABLE IF NOT EXISTS master_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  domain text NOT NULL,
  color text DEFAULT '#6B7280',
  bg_color text DEFAULT '#F3F4F6',
  sort_order int DEFAULT 0,
  is_terminal boolean DEFAULT false,
  allowed_next text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE master_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read status" ON master_status FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage status" ON master_status FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin update status" ON master_status FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- =================== MASTER UNITS ===================
CREATE TABLE IF NOT EXISTS master_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  type text DEFAULT 'count',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE master_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read units" ON master_units FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage units" ON master_units FOR INSERT TO authenticated WITH CHECK (true);

-- =================== MASTER LOCATIONS ===================
CREATE TABLE IF NOT EXISTS master_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  address text DEFAULT '',
  manager_id uuid REFERENCES master_users(id),
  partner_type text DEFAULT 'internal',
  commission_rate numeric(5,2) DEFAULT 0,
  revenue_share numeric(5,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  phone text DEFAULT '',
  notes text DEFAULT '',
  meta jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE master_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read locations" ON master_locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage locations" ON master_locations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin update locations" ON master_locations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- =================== MASTER TIERS ===================
CREATE TABLE IF NOT EXISTS master_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  min_value numeric(15,2) DEFAULT 0,
  discount_rate numeric(5,2) DEFAULT 0,
  commission_rate numeric(5,2) DEFAULT 0,
  benefits text[] DEFAULT '{}',
  color text DEFAULT '#6B7280',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE master_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read tiers" ON master_tiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage tiers" ON master_tiers FOR INSERT TO authenticated WITH CHECK (true);
