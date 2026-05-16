/*
  # Production Workflow, Tasks, QC, SOP Schema

  ## Tables Created
  - workflow_templates: Reusable workflow blueprints per product type
  - workflow_stages: Ordered stages within a workflow
  - production_jobs: Production job per order
  - production_tasks: Individual task/stage per job
  - task_logs: Time tracking, comments, state changes
  - qc_records: Quality control inspections
  - sop_library: Standard Operating Procedures
*/

-- =================== WORKFLOW TEMPLATES ===================
CREATE TABLE IF NOT EXISTS workflow_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  product_type text NOT NULL,
  description text DEFAULT '',
  is_active boolean DEFAULT true,
  version int DEFAULT 1,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read wf templates" ON workflow_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage wf templates" ON workflow_templates FOR INSERT TO authenticated WITH CHECK (true);

-- =================== WORKFLOW STAGES ===================
CREATE TABLE IF NOT EXISTS workflow_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES workflow_templates(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  sort_order int DEFAULT 0,
  duration_hours numeric(6,1) DEFAULT 0,
  required_role text DEFAULT '',
  requires_qc boolean DEFAULT false,
  requires_photo boolean DEFAULT false,
  sop_code text DEFAULT '',
  auto_assign boolean DEFAULT false,
  materials_consumed jsonb DEFAULT '[]',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE workflow_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read wf stages" ON workflow_stages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage wf stages" ON workflow_stages FOR INSERT TO authenticated WITH CHECK (true);

-- =================== PRODUCTION JOBS ===================
CREATE TABLE IF NOT EXISTS production_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_no text UNIQUE NOT NULL,
  order_id uuid REFERENCES orders(id),
  order_item_id uuid REFERENCES order_items(id),
  template_id uuid REFERENCES workflow_templates(id),
  status text DEFAULT 'queued',
  priority text DEFAULT 'normal',
  assigned_manager uuid REFERENCES master_users(id),
  start_date date,
  deadline date,
  completed_date timestamptz,
  estimated_hours numeric(8,2) DEFAULT 0,
  actual_hours numeric(8,2) DEFAULT 0,
  waste_cost numeric(12,2) DEFAULT 0,
  rework_count int DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE production_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read prod jobs" ON production_jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage prod jobs" ON production_jobs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff update prod jobs" ON production_jobs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- =================== PRODUCTION TASKS ===================
CREATE TABLE IF NOT EXISTS production_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES production_jobs(id) ON DELETE CASCADE,
  stage_id uuid REFERENCES workflow_stages(id),
  stage_name text NOT NULL,
  stage_code text NOT NULL,
  sort_order int DEFAULT 0,
  status text DEFAULT 'pending',
  assigned_to uuid REFERENCES master_users(id),
  started_at timestamptz,
  completed_at timestamptz,
  deadline timestamptz,
  estimated_hours numeric(6,1) DEFAULT 0,
  actual_hours numeric(6,1) DEFAULT 0,
  qc_status text DEFAULT 'pending',
  qc_note text DEFAULT '',
  photo_urls text[] DEFAULT '{}',
  fail_reason text DEFAULT '',
  rework_count int DEFAULT 0,
  notes text DEFAULT '',
  sop_code text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE production_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read prod tasks" ON production_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage prod tasks" ON production_tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff update prod tasks" ON production_tasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- =================== TASK LOGS ===================
CREATE TABLE IF NOT EXISTS task_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES production_tasks(id) ON DELETE CASCADE,
  log_type text NOT NULL,
  old_status text DEFAULT '',
  new_status text DEFAULT '',
  note text DEFAULT '',
  duration_minutes int DEFAULT 0,
  performed_by uuid REFERENCES master_users(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE task_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read task logs" ON task_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff log tasks" ON task_logs FOR INSERT TO authenticated WITH CHECK (true);

-- =================== QC RECORDS ===================
CREATE TABLE IF NOT EXISTS qc_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qc_no text UNIQUE NOT NULL,
  task_id uuid REFERENCES production_tasks(id),
  job_id uuid REFERENCES production_jobs(id),
  order_id uuid REFERENCES orders(id),
  inspector_id uuid REFERENCES master_users(id),
  result text DEFAULT 'pending',
  score numeric(5,2) DEFAULT 0,
  checklist jsonb DEFAULT '[]',
  defects_found text[] DEFAULT '{}',
  photos text[] DEFAULT '{}',
  notes text DEFAULT '',
  action_required text DEFAULT '',
  inspected_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE qc_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read qc records" ON qc_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "QC manage records" ON qc_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "QC update records" ON qc_records FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- =================== SOP LIBRARY ===================
CREATE TABLE IF NOT EXISTS sop_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_code text UNIQUE NOT NULL,
  title text NOT NULL,
  purpose text DEFAULT '',
  applicable_roles text[] DEFAULT '{}',
  product_types text[] DEFAULT '{}',
  tools_required text[] DEFAULT '{}',
  materials_required text[] DEFAULT '{}',
  steps jsonb DEFAULT '[]',
  qc_criteria text[] DEFAULT '{}',
  common_errors jsonb DEFAULT '[]',
  media_urls text[] DEFAULT '{}',
  version int DEFAULT 1,
  status text DEFAULT 'active',
  effective_date date DEFAULT CURRENT_DATE,
  reviewed_by uuid REFERENCES master_users(id),
  created_by uuid REFERENCES master_users(id),
  revision_history jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE sop_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read sop" ON sop_library FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage sop" ON sop_library FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin update sop" ON sop_library FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
