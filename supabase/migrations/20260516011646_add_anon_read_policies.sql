/*
  # Add anon role RLS policies for all tables

  1. Purpose
    The app uses a custom master_users table for authentication (not Supabase Auth).
    Users who log in via the custom auth system do NOT have a Supabase Auth session,
    so they are treated as `anon` role by Supabase. Without anon policies, ALL queries
    return empty results — the entire app shows blank screens.

  2. Changes
    Add SELECT policy for `anon` role on every table the frontend queries.
    Add INSERT/UPDATE/DELETE policies for `anon` role on tables the frontend writes to.
    This mirrors the existing `authenticated` policies.

  3. Security Note
    In a production deployment, these anon policies should be replaced with
    proper Supabase Auth integration. For now, they enable the custom auth
    system to function.

  4. Tables affected (SELECT for anon):
    - master_roles, master_users, master_categories, master_status, master_units,
      master_locations, master_tiers
    - products, materials, inventory_items, inventory_transactions, bom_templates,
      bom_items
    - customers, leads, orders, order_items, order_history, quotations, complaints
    - workflow_templates, workflow_stages, production_jobs, production_tasks,
      task_logs, qc_records, sop_library
    - finance_transactions, receivables, payables, expense_requests, audit_trail,
      daily_summaries, partner_settlements
    - gallery_items, marketing_content, notifications, ai_logs, alerts, app_settings

  5. Tables affected (INSERT/UPDATE/DELETE for anon):
    - Same write permissions as authenticated role for all operational tables
*/

-- Core master tables
CREATE POLICY "Anon read roles" ON master_roles FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert roles" ON master_roles FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update roles" ON master_roles FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon read users" ON master_users FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert users" ON master_users FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update users" ON master_users FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon read categories" ON master_categories FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert categories" ON master_categories FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update categories" ON master_categories FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon read status" ON master_status FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert status" ON master_status FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update status" ON master_status FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon read units" ON master_units FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert units" ON master_units FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon read locations" ON master_locations FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert locations" ON master_locations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update locations" ON master_locations FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon read tiers" ON master_tiers FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert tiers" ON master_tiers FOR INSERT TO anon WITH CHECK (true);

-- Products & Inventory
CREATE POLICY "Anon read products" ON products FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert products" ON products FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update products" ON products FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon read materials" ON materials FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert materials" ON materials FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update materials" ON materials FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon read inventory" ON inventory_items FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert inventory" ON inventory_items FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update inventory" ON inventory_items FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon read inv txn" ON inventory_transactions FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert inv txn" ON inventory_transactions FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon read bom" ON bom_templates FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert bom" ON bom_templates FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon read bom items" ON bom_items FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert bom items" ON bom_items FOR INSERT TO anon WITH CHECK (true);

-- CRM & Orders
CREATE POLICY "Anon read customers" ON customers FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert customers" ON customers FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update customers" ON customers FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon read leads" ON leads FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert leads" ON leads FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update leads" ON leads FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon read orders" ON orders FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert orders" ON orders FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update orders" ON orders FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon delete orders" ON orders FOR DELETE TO anon USING (true);

CREATE POLICY "Anon read order items" ON order_items FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert order items" ON order_items FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update order items" ON order_items FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon delete order items" ON order_items FOR DELETE TO anon USING (true);

CREATE POLICY "Anon read order history" ON order_history FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert order history" ON order_history FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon read quotations" ON quotations FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert quotations" ON quotations FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon read complaints" ON complaints FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert complaints" ON complaints FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update complaints" ON complaints FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Production & Workflow
CREATE POLICY "Anon read wf templates" ON workflow_templates FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert wf templates" ON workflow_templates FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon read wf stages" ON workflow_stages FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert wf stages" ON workflow_stages FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon read prod jobs" ON production_jobs FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert prod jobs" ON production_jobs FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update prod jobs" ON production_jobs FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon read prod tasks" ON production_tasks FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert prod tasks" ON production_tasks FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update prod tasks" ON production_tasks FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon read task logs" ON task_logs FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert task logs" ON task_logs FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon read qc records" ON qc_records FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert qc records" ON qc_records FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update qc records" ON qc_records FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon read sop" ON sop_library FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert sop" ON sop_library FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update sop" ON sop_library FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Finance
CREATE POLICY "Anon read finance" ON finance_transactions FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert finance" ON finance_transactions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update finance" ON finance_transactions FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon read receivables" ON receivables FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert receivables" ON receivables FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update receivables" ON receivables FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon read payables" ON payables FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert payables" ON payables FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update payables" ON payables FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon read expenses" ON expense_requests FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert expenses" ON expense_requests FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update expenses" ON expense_requests FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon read audit" ON audit_trail FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert audit" ON audit_trail FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon read daily summary" ON daily_summaries FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert daily summary" ON daily_summaries FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update daily summary" ON daily_summaries FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon read settlements" ON partner_settlements FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert settlements" ON partner_settlements FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update settlements" ON partner_settlements FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Gallery & Notifications
CREATE POLICY "Anon read gallery" ON gallery_items FOR SELECT TO anon USING (published_at IS NOT NULL);
CREATE POLICY "Anon insert gallery" ON gallery_items FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update gallery" ON gallery_items FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon read marketing" ON marketing_content FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert marketing" ON marketing_content FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update marketing" ON marketing_content FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon read notifications" ON notifications FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert notifications" ON notifications FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update notifications" ON notifications FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon read ai logs" ON ai_logs FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert ai logs" ON ai_logs FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon read alerts" ON alerts FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert alerts" ON alerts FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update alerts" ON alerts FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon read settings" ON app_settings FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert settings" ON app_settings FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update settings" ON app_settings FOR UPDATE TO anon USING (true) WITH CHECK (true);
