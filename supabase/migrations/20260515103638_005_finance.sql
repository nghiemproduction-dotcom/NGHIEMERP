/*
  # Finance, Cashflow, Audit Schema

  ## Tables Created
  - finance_transactions: All money movements (receipts, payments, expenses)
  - receivables: Outstanding money owed to us
  - payables: Outstanding money we owe
  - expense_requests: Pending approval expense requests
  - audit_trail: System-wide immutable audit log
  - daily_summaries: Pre-aggregated daily KPI snapshots
  - partner_settlements: Revenue sharing / commission settlements
*/

-- =================== FINANCE TRANSACTIONS ===================
CREATE TABLE IF NOT EXISTS finance_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  txn_no text UNIQUE NOT NULL,
  txn_type text NOT NULL,
  direction text NOT NULL,
  amount numeric(15,2) NOT NULL DEFAULT 0,
  currency text DEFAULT 'VND',
  category text DEFAULT '',
  ref_type text DEFAULT '',
  ref_id uuid,
  ref_no text DEFAULT '',
  order_id uuid REFERENCES orders(id),
  customer_id uuid REFERENCES customers(id),
  location_id uuid REFERENCES master_locations(id),
  description text DEFAULT '',
  payment_method text DEFAULT 'cash',
  status text DEFAULT 'confirmed',
  approved_by uuid REFERENCES master_users(id),
  approved_at timestamptz,
  created_by uuid REFERENCES master_users(id),
  txn_date date DEFAULT CURRENT_DATE,
  notes text DEFAULT '',
  meta jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read finance" ON finance_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Finance create txn" ON finance_transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Finance update txn" ON finance_transactions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- =================== RECEIVABLES ===================
CREATE TABLE IF NOT EXISTS receivables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_no text UNIQUE NOT NULL,
  order_id uuid REFERENCES orders(id),
  customer_id uuid REFERENCES customers(id),
  original_amount numeric(15,2) DEFAULT 0,
  paid_amount numeric(15,2) DEFAULT 0,
  balance numeric(15,2) DEFAULT 0,
  due_date date,
  status text DEFAULT 'open',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE receivables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read receivables" ON receivables FOR SELECT TO authenticated USING (true);
CREATE POLICY "Finance manage receivables" ON receivables FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Finance update receivables" ON receivables FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- =================== PAYABLES ===================
CREATE TABLE IF NOT EXISTS payables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_no text UNIQUE NOT NULL,
  supplier_name text NOT NULL,
  location_id uuid REFERENCES master_locations(id),
  original_amount numeric(15,2) DEFAULT 0,
  paid_amount numeric(15,2) DEFAULT 0,
  balance numeric(15,2) DEFAULT 0,
  due_date date,
  status text DEFAULT 'open',
  category text DEFAULT 'material',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE payables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read payables" ON payables FOR SELECT TO authenticated USING (true);
CREATE POLICY "Finance manage payables" ON payables FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Finance update payables" ON payables FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- =================== EXPENSE REQUESTS ===================
CREATE TABLE IF NOT EXISTS expense_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  req_no text UNIQUE NOT NULL,
  category text DEFAULT '',
  amount numeric(15,2) NOT NULL DEFAULT 0,
  description text NOT NULL,
  status text DEFAULT 'pending',
  requested_by uuid REFERENCES master_users(id),
  approved_by uuid REFERENCES master_users(id),
  approved_at timestamptz,
  reject_reason text DEFAULT '',
  attachments text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE expense_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read expenses" ON expense_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff create expense req" ON expense_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Finance update expense" ON expense_requests FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- =================== AUDIT TRAIL ===================
CREATE TABLE IF NOT EXISTS audit_trail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES master_users(id),
  user_name text DEFAULT '',
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address text DEFAULT '',
  user_agent text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read audit" ON audit_trail FOR SELECT TO authenticated USING (true);
CREATE POLICY "System log audit" ON audit_trail FOR INSERT TO authenticated WITH CHECK (true);

-- =================== DAILY SUMMARIES ===================
CREATE TABLE IF NOT EXISTS daily_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_date date UNIQUE NOT NULL,
  total_orders int DEFAULT 0,
  new_orders int DEFAULT 0,
  completed_orders int DEFAULT 0,
  revenue numeric(15,2) DEFAULT 0,
  cogs numeric(15,2) DEFAULT 0,
  gross_profit numeric(15,2) DEFAULT 0,
  expenses numeric(15,2) DEFAULT 0,
  net_profit numeric(15,2) DEFAULT 0,
  cash_in numeric(15,2) DEFAULT 0,
  cash_out numeric(15,2) DEFAULT 0,
  qc_pass int DEFAULT 0,
  qc_fail int DEFAULT 0,
  tasks_completed int DEFAULT 0,
  tasks_overdue int DEFAULT 0,
  new_customers int DEFAULT 0,
  meta jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read daily summary" ON daily_summaries FOR SELECT TO authenticated USING (true);
CREATE POLICY "System manage daily summary" ON daily_summaries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "System update daily summary" ON daily_summaries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- =================== PARTNER SETTLEMENTS ===================
CREATE TABLE IF NOT EXISTS partner_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settle_no text UNIQUE NOT NULL,
  location_id uuid REFERENCES master_locations(id),
  period_start date,
  period_end date,
  gross_sales numeric(15,2) DEFAULT 0,
  commission_rate numeric(5,2) DEFAULT 0,
  commission_amount numeric(15,2) DEFAULT 0,
  deductions numeric(15,2) DEFAULT 0,
  net_payout numeric(15,2) DEFAULT 0,
  status text DEFAULT 'pending',
  paid_at timestamptz,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE partner_settlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read settlements" ON partner_settlements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Finance manage settlements" ON partner_settlements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Finance update settlements" ON partner_settlements FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
