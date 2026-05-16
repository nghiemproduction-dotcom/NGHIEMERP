export interface MasterRole {
  id: string;
  code: string;
  name: string;
  description: string;
  permissions: Record<string, unknown>;
  menu_access: string[];
  is_active: boolean;
  sort_order: number;
}

export interface MasterUser {
  id: string;
  code: string;
  full_name: string;
  email: string;
  phone: string;
  role_code: string;
  status: string;
  skills: string[];
  shift: string;
  monthly_salary: number;
  join_date: string;
  notes: string;
  pin_hash: string;
  role?: MasterRole;
}

export interface Customer {
  id: string;
  code: string;
  full_name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  tier_code: string;
  segment: string;
  source: string;
  total_orders: number;
  total_spent: number;
  notes: string;
  tags: string[];
  is_active: boolean;
  created_at: string;
  persona: string;
  pain_points: string[];
}

export interface Order {
  id: string;
  order_no: string;
  customer_id: string;
  location_id: string;
  status: string;
  source: string;
  priority: string;
  order_date: string;
  deadline: string;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  deposit_amount: number;
  payment_status: string;
  cogs_estimate: number;
  margin_estimate: number;
  delivery_method: string;
  special_instructions: string;
  internal_notes: string;
  created_at: string;
  customer?: Customer;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  type: string;
  price: number;
  cost_estimate: number;
  unit: string;
  dimensions: string;
  medium: string;
  style: string;
  tags: string[];
  is_public: boolean;
  is_active: boolean;
}

export interface ProductionJob {
  id: string;
  job_no: string;
  order_id: string;
  status: string;
  priority: string;
  start_date: string;
  deadline: string;
  estimated_hours: number;
  actual_hours: number;
  waste_cost: number;
  rework_count: number;
  notes: string;
  order?: Order;
}

export interface ProductionTask {
  id: string;
  job_id: string;
  stage_name: string;
  stage_code: string;
  sort_order: number;
  status: string;
  qc_status: string;
  qc_note: string;
  photo_urls: string[];
  fail_reason: string;
  rework_count: number;
  notes: string;
  sop_code: string;
  started_at: string;
  completed_at: string;
  deadline: string;
  assigned_to?: string;
  assignee?: MasterUser;
}

export interface FinanceTransaction {
  id: string;
  txn_no: string;
  txn_type: string;
  direction: string;
  amount: number;
  category: string;
  description: string;
  payment_method: string;
  status: string;
  txn_date: string;
  order_id?: string;
  order?: Order;
}

export interface Alert {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  ref_type: string;
  ref_no: string;
  is_resolved: boolean;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  material_id?: string;
  product_id?: string;
  location_id: string;
  qty_on_hand: number;
  qty_reserved: number;
  qty_available: number;
  avg_cost: number;
  material?: Material;
  location?: MasterLocation;
}

export interface Material {
  id: string;
  code: string;
  name: string;
  type: string;
  unit: string;
  cost_per_unit: number;
  min_stock: number;
}

export interface MasterLocation {
  id: string;
  code: string;
  name: string;
  type: string;
  address: string;
  partner_type: string;
  commission_rate: number;
  revenue_share: number;
  is_active: boolean;
}

export interface DailySummary {
  summary_date: string;
  total_orders: number;
  new_orders: number;
  completed_orders: number;
  revenue: number;
  cogs: number;
  gross_profit: number;
  expenses: number;
  net_profit: number;
  cash_in: number;
  cash_out: number;
  qc_pass: number;
  qc_fail: number;
  tasks_completed: number;
  tasks_overdue: number;
  new_customers: number;
}

export interface GalleryItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  image_urls: string[];
  medium: string;
  dimensions: string;
  style: string;
  artist: string;
  price: number;
  is_available: boolean;
  is_featured: boolean;
  tags: string[];
  view_count: number;
  published_at: string;
}

export interface SopEntry {
  id: string;
  sop_code: string;
  title: string;
  purpose: string;
  applicable_roles: string[];
  steps: Array<{ step: number; title: string; detail: string }>;
  qc_criteria: string[];
  version: number;
  status: string;
  updated_at: string;
}

export interface Receivable {
  id: string;
  ref_no: string;
  order_id: string;
  customer_id: string;
  original_amount: number;
  paid_amount: number;
  balance: number;
  due_date: string;
  status: string;
  customer?: Customer;
  order?: Order;
}

export interface Payable {
  id: string;
  ref_no: string;
  supplier_name: string;
  original_amount: number;
  paid_amount: number;
  balance: number;
  due_date: string;
  status: string;
  category: string;
}

export interface Lead {
  id: string;
  code: string;
  full_name: string;
  phone: string;
  email: string;
  source: string;
  status: string;
  product_interest: string;
  budget_estimate: number;
  notes: string;
  created_at: string;
}

export interface QcRecord {
  id: string;
  qc_no: string;
  result: string;
  score: number;
  defects_found: string[];
  notes: string;
  action_required: string;
  inspected_at: string;
  order?: Order;
}
