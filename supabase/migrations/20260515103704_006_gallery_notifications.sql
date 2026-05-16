/*
  # Public Gallery, Notifications, AI Logs, Alerts

  ## Tables Created
  - gallery_items: Public artwork showcase
  - marketing_content: Content library for social/ads
  - notifications: In-app notification center
  - ai_logs: AI assistant interaction history
  - alerts: Smart operational alerts
  - app_settings: Global app configuration key-value
*/

-- =================== GALLERY ITEMS ===================
CREATE TABLE IF NOT EXISTS gallery_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text DEFAULT '',
  product_id uuid REFERENCES products(id),
  image_urls text[] DEFAULT '{}',
  medium text DEFAULT '',
  dimensions text DEFAULT '',
  style text DEFAULT '',
  artist text DEFAULT '',
  price numeric(15,2) DEFAULT 0,
  is_available boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  tags text[] DEFAULT '{}',
  view_count int DEFAULT 0,
  sort_order int DEFAULT 0,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE gallery_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone read public gallery" ON gallery_items FOR SELECT USING (published_at IS NOT NULL);
CREATE POLICY "Admin manage gallery" ON gallery_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin update gallery" ON gallery_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- =================== MARKETING CONTENT ===================
CREATE TABLE IF NOT EXISTS marketing_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text DEFAULT 'social_post',
  channel text DEFAULT 'facebook',
  content text DEFAULT '',
  media_urls text[] DEFAULT '{}',
  product_id uuid REFERENCES products(id),
  status text DEFAULT 'draft',
  scheduled_at timestamptz,
  published_at timestamptz,
  performance jsonb DEFAULT '{}',
  tags text[] DEFAULT '{}',
  created_by uuid REFERENCES master_users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE marketing_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read marketing" ON marketing_content FOR SELECT TO authenticated USING (true);
CREATE POLICY "Marketing manage content" ON marketing_content FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Marketing update content" ON marketing_content FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- =================== NOTIFICATIONS ===================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES master_users(id),
  type text NOT NULL,
  title text NOT NULL,
  body text DEFAULT '',
  ref_type text DEFAULT '',
  ref_id uuid,
  is_read boolean DEFAULT false,
  priority text DEFAULT 'normal',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own notifications" ON notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "System create notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users update own notifications" ON notifications FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- =================== AI LOGS ===================
CREATE TABLE IF NOT EXISTS ai_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text DEFAULT '',
  user_id uuid REFERENCES master_users(id),
  action_type text NOT NULL,
  prompt text DEFAULT '',
  result text DEFAULT '',
  model text DEFAULT 'gpt-4',
  tokens_used int DEFAULT 0,
  ref_type text DEFAULT '',
  ref_id uuid,
  rating int,
  feedback text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE ai_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read ai logs" ON ai_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "System log ai" ON ai_logs FOR INSERT TO authenticated WITH CHECK (true);

-- =================== ALERTS ===================
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  severity text DEFAULT 'warning',
  title text NOT NULL,
  description text DEFAULT '',
  ref_type text DEFAULT '',
  ref_id uuid,
  ref_no text DEFAULT '',
  is_resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES master_users(id),
  auto_generated boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read alerts" ON alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "System manage alerts" ON alerts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff resolve alerts" ON alerts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- =================== APP SETTINGS ===================
CREATE TABLE IF NOT EXISTS app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  category text DEFAULT 'general',
  label text DEFAULT '',
  description text DEFAULT '',
  updated_by uuid REFERENCES master_users(id),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read settings" ON app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage settings" ON app_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin update settings" ON app_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
