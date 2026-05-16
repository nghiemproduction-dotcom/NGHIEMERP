/*
  # Seed Orders, Production Jobs, Finance Transactions, and Alerts
  Creates realistic operational data for the last 6 months
*/

-- PRODUCTS
INSERT INTO products (code, name, type, price, cost_estimate, unit, dimensions, medium, style, is_public, is_active, tags) VALUES
('PRD-001', 'Tranh Son Dau Chan Dung Theo Yeu Cau', 'custom', 8500000, 3200000, 'buc', '60x80cm', 'oil', 'realism', true, true, ARRAY['portrait','custom','oil']),
('PRD-002', 'Tranh Son Dau Phong Canh 80x100', 'custom', 12000000, 4500000, 'buc', '80x100cm', 'oil', 'impressionism', true, true, ARRAY['landscape','oil','large']),
('PRD-003', 'Tranh Acrylic Truu Tuong Hien Dai', 'stock', 4500000, 1800000, 'buc', '60x60cm', 'acrylic', 'abstract', true, true, ARRAY['abstract','acrylic','modern']),
('PRD-004', 'Tranh Mau Nuoc Hoa Tulip', 'stock', 2800000, 900000, 'buc', '40x50cm', 'watercolor', 'botanical', true, true, ARRAY['floral','watercolor']),
('PRD-005', 'Tranh In Phong Canh 4K Co Khung', 'stock', 1500000, 400000, 'buc', '50x70cm', 'print', 'photography', true, true, ARRAY['print','landscape','affordable']),
('PRD-006', 'Tranh Son Dau Truu Tuong Lon 120x150', 'custom', 25000000, 9000000, 'buc', '120x150cm', 'oil', 'abstract', true, true, ARRAY['abstract','oil','large_format','premium']),
('PRD-007', 'Phuc Che Tranh Cu', 'service', 5000000, 1500000, 'lan', 'variable', 'various', 'restoration', false, true, ARRAY['restoration','service']),
('PRD-008', 'Dong Khung Tranh Cao Cap', 'service', 2000000, 800000, 'cai', 'custom', 'frame', 'framing', false, true, ARRAY['framing','service']),
('PRD-009', 'Tranh Acrylic Phong Canh Biet Thu', 'custom', 18000000, 6500000, 'buc', '100x130cm', 'acrylic', 'realism', true, true, ARRAY['landscape','acrylic','villa','custom']),
('PRD-010', 'Bo Tranh Hanh Lang Khach San (4 Buc)', 'custom', 35000000, 13000000, 'bo', '4x60x80cm', 'oil', 'landscape', false, true, ARRAY['hotel','set','landscape','bulk'])
ON CONFLICT (code) DO NOTHING;

-- MATERIALS
INSERT INTO materials (code, name, type, unit, cost_per_unit, min_stock, reorder_qty) VALUES
('MAT-001', 'Vai Canvas Bong Chat Luong Cao', 'raw', 'm2', 85000, 10, 20),
('MAT-002', 'Mau Son Dau Winsor & Newton', 'raw', 'chai', 180000, 5, 10),
('MAT-003', 'Mau Acrylic Golden', 'raw', 'chai', 120000, 5, 10),
('MAT-004', 'Mau Nuoc Shinhan', 'raw', 'hop', 95000, 3, 6),
('MAT-005', 'Co Ve Loai Thuong', 'tool', 'cai', 45000, 10, 20),
('MAT-006', 'Co Ve Loai Cao Cap', 'tool', 'cai', 120000, 5, 10),
('MAT-007', 'Khung Go Thong (1m)', 'raw', 'm', 35000, 20, 40),
('MAT-008', 'Khung Go Cong Nghiep (1m)', 'raw', 'm', 25000, 20, 40),
('MAT-009', 'Son Lot Gesso', 'raw', 'chai', 75000, 3, 6),
('MAT-010', 'Varnish Bong Liquitex', 'raw', 'chai', 95000, 3, 6),
('MAT-011', 'Xop Bao Ve', 'packaging', 'm2', 18000, 15, 30),
('MAT-012', 'Thung Carton Dong Tranh', 'packaging', 'cai', 25000, 20, 40),
('MAT-013', 'Bang Keo Cao Cap', 'packaging', 'cuon', 12000, 10, 20),
('MAT-014', 'Dung Cu Ve Palette Knife', 'tool', 'cai', 65000, 5, 10),
('MAT-015', 'Giay Phac Thao A3', 'raw', 'cuon', 40000, 5, 10)
ON CONFLICT (code) DO NOTHING;

-- LEADS
INSERT INTO leads (code, full_name, phone, email, source, status, product_interest, budget_estimate, notes) VALUES
('LEAD-001', 'Nguyen Hoang Nam', '0901888111', 'nam.nh@gmail.com', 'facebook', 'contacted', 'Tranh son dau chan dung', 8000000, 'Muon ve chan dung ba'),
('LEAD-002', 'Tran My Hanh', '0912777222', 'myhanh@gmail.com', 'instagram', 'qualified', 'Tranh truu tuong hien dai', 5000000, 'Dang trang tri can ho moi'),
('LEAD-003', 'Le Quoc Hung', '0923666333', 'hung.le@corp.com', 'direct', 'proposal_sent', 'Bo tranh van phong 5 buc', 25000000, 'Van phong moi, can bao gia'),
('LEAD-004', 'Pham Van Dat', '0934555444', 'dat.pham@gmail.com', 'tiktok', 'new', 'Tranh in phong canh', 2000000, 'Xem qua TikTok'),
('LEAD-005', 'Vo Thi Thu', '0945444555', 'thu.vo@gmail.com', 'zalo', 'negotiating', 'Tranh son dau phong canh', 12000000, 'Dang thuong luong gia'),
('LEAD-006', 'Bui Duc Tuan', '0956333666', '', 'walk-in', 'new', 'Dong khung tranh', 2500000, 'Den xem truc tiep'),
('LEAD-007', 'Nguyen Thi Hue', '0967222777', 'hue.nt@gmail.com', 'referral', 'contacted', 'Tranh son dau truu tuong lon', 20000000, 'Duoc gioi thieu boi khach VIP'),
('LEAD-008', 'Hoang Van Lam', '0978111888', '', 'facebook', 'lost', 'Tranh acrylic', 4000000, 'Mat don - gia cao hon budget')
ON CONFLICT (code) DO NOTHING;

-- ORDERS (30 orders with varied statuses)
DO $$
DECLARE
  v_cus1 uuid; v_cus2 uuid; v_cus3 uuid; v_cus4 uuid; v_cus5 uuid;
  v_cus6 uuid; v_cus7 uuid; v_cus8 uuid; v_cus13 uuid; v_cus24 uuid;
  v_loc_main uuid; v_loc_online uuid; v_loc_d1 uuid;
  v_usr1 uuid; v_usr2 uuid; v_usr3 uuid; v_usr5 uuid;
  v_prd1 uuid; v_prd2 uuid; v_prd3 uuid; v_prd5 uuid; v_prd6 uuid;
BEGIN
  SELECT id INTO v_cus1 FROM customers WHERE code = 'CUS-001';
  SELECT id INTO v_cus2 FROM customers WHERE code = 'CUS-002';
  SELECT id INTO v_cus3 FROM customers WHERE code = 'CUS-003';
  SELECT id INTO v_cus4 FROM customers WHERE code = 'CUS-004';
  SELECT id INTO v_cus5 FROM customers WHERE code = 'CUS-006';
  SELECT id INTO v_cus6 FROM customers WHERE code = 'CUS-008';
  SELECT id INTO v_cus7 FROM customers WHERE code = 'CUS-013';
  SELECT id INTO v_cus8 FROM customers WHERE code = 'CUS-024';
  SELECT id INTO v_cus13 FROM customers WHERE code = 'CUS-034';
  SELECT id INTO v_cus24 FROM customers WHERE code = 'CUS-029';
  SELECT id INTO v_loc_main FROM master_locations WHERE code = 'POS_MAIN';
  SELECT id INTO v_loc_online FROM master_locations WHERE code = 'ONLINE_SHOP';
  SELECT id INTO v_loc_d1 FROM master_locations WHERE code = 'POS_D1';
  SELECT id INTO v_usr1 FROM master_users WHERE code = 'USR-001';
  SELECT id INTO v_usr2 FROM master_users WHERE code = 'USR-002';
  SELECT id INTO v_usr3 FROM master_users WHERE code = 'USR-003';
  SELECT id INTO v_usr5 FROM master_users WHERE code = 'USR-005';
  SELECT id INTO v_prd1 FROM products WHERE code = 'PRD-001';
  SELECT id INTO v_prd2 FROM products WHERE code = 'PRD-002';
  SELECT id INTO v_prd3 FROM products WHERE code = 'PRD-003';
  SELECT id INTO v_prd5 FROM products WHERE code = 'PRD-005';
  SELECT id INTO v_prd6 FROM products WHERE code = 'PRD-006';

  INSERT INTO orders (order_no, customer_id, location_id, status, source, priority, assigned_to, order_date, deadline, total_amount, paid_amount, balance_due, deposit_amount, payment_status, cogs_estimate, margin_estimate, delivery_method, created_by) VALUES
  ('ORD-2025-001', v_cus1, v_loc_main, 'delivered', 'direct', 'normal', v_usr2, now()-interval'150 days', (now()-interval'130 days')::date, 8500000, 8500000, 0, 4250000, 'paid', 3200000, 5300000, 'pickup', v_usr2),
  ('ORD-2025-002', v_cus2, v_loc_main, 'delivered', 'direct', 'normal', v_usr2, now()-interval'140 days', (now()-interval'120 days')::date, 25000000, 25000000, 0, 12500000, 'paid', 9500000, 15500000, 'delivery', v_usr2),
  ('ORD-2025-003', v_cus5, v_loc_main, 'delivered', 'referral', 'high', v_usr2, now()-interval'130 days', (now()-interval'110 days')::date, 45000000, 45000000, 0, 22500000, 'paid', 16000000, 29000000, 'pickup', v_usr1),
  ('ORD-2025-004', v_cus8, v_loc_main, 'delivered', 'direct', 'high', v_usr1, now()-interval'120 days', (now()-interval'95 days')::date, 35000000, 35000000, 0, 17500000, 'paid', 13000000, 22000000, 'delivery', v_usr1),
  ('ORD-2025-005', v_cus3, v_loc_online, 'delivered', 'facebook', 'normal', v_usr2, now()-interval'110 days', (now()-interval'90 days')::date, 12000000, 12000000, 0, 6000000, 'paid', 4500000, 7500000, 'delivery', v_usr2),
  ('ORD-2025-006', v_cus4, v_loc_main, 'delivered', 'instagram', 'normal', v_usr2, now()-interval'100 days', (now()-interval'80 days')::date, 9000000, 9000000, 0, 4500000, 'paid', 3600000, 5400000, 'pickup', v_usr2),
  ('ORD-2025-007', v_cus13, v_loc_main, 'delivered', 'referral', 'high', v_usr2, now()-interval'90 days', (now()-interval'70 days')::date, 85000000, 85000000, 0, 42500000, 'paid', 30000000, 55000000, 'pickup', v_usr1),
  ('ORD-2025-008', v_cus7, v_loc_main, 'delivered', 'direct', 'normal', v_usr2, now()-interval'85 days', (now()-interval'65 days')::date, 35000000, 35000000, 0, 17500000, 'paid', 12500000, 22500000, 'delivery', v_usr2),
  ('ORD-2025-009', v_cus1, v_loc_main, 'refunded', 'direct', 'normal', v_usr2, now()-interval'75 days', (now()-interval'55 days')::date, 8500000, 8500000, 0, 8500000, 'refunded', 3200000, 0, 'pickup', v_usr2),
  ('ORD-2025-010', v_cus24, v_loc_main, 'delivered', 'direct', 'urgent', v_usr1, now()-interval'70 days', (now()-interval'50 days')::date, 95000000, 95000000, 0, 47500000, 'paid', 35000000, 60000000, 'delivery', v_usr1),
  ('ORD-2025-011', v_cus5, v_loc_main, 'delivered', 'referral', 'normal', v_usr2, now()-interval'60 days', (now()-interval'45 days')::date, 18000000, 18000000, 0, 9000000, 'paid', 6500000, 11500000, 'pickup', v_usr2),
  ('ORD-2025-012', v_cus4, v_loc_online, 'delivered', 'instagram', 'normal', v_usr2, now()-interval'55 days', (now()-interval'40 days')::date, 4500000, 4500000, 0, 4500000, 'paid', 1800000, 2700000, 'delivery', v_usr2),
  ('ORD-2025-013', v_cus6, v_loc_main, 'delivered', 'direct', 'high', v_usr1, now()-interval'50 days', (now()-interval'35 days')::date, 35000000, 35000000, 0, 17500000, 'paid', 13000000, 22000000, 'delivery', v_usr1),
  ('ORD-2025-014', v_cus3, v_loc_online, 'ready', 'facebook', 'normal', v_usr2, now()-interval'35 days', (now()-interval'15 days')::date, 8500000, 4250000, 4250000, 4250000, 'partial', 3200000, 5300000, 'delivery', v_usr2),
  ('ORD-2025-015', v_cus8, v_loc_main, 'in_production', 'direct', 'high', v_usr1, now()-interval'30 days', (now()+interval'10 days')::date, 55000000, 27500000, 27500000, 27500000, 'partial', 20000000, 35000000, 'pickup', v_usr1),
  ('ORD-2025-016', v_cus2, v_loc_main, 'in_production', 'direct', 'normal', v_usr2, now()-interval'25 days', (now()+interval'15 days')::date, 12000000, 6000000, 6000000, 6000000, 'partial', 4500000, 7500000, 'pickup', v_usr2),
  ('ORD-2025-017', v_cus5, v_loc_main, 'confirmed', 'referral', 'urgent', v_usr1, now()-interval'20 days', (now()+interval'5 days')::date, 25000000, 12500000, 12500000, 12500000, 'partial', 9500000, 15500000, 'delivery', v_usr1),
  ('ORD-2025-018', v_cus4, v_loc_d1, 'in_production', 'instagram', 'normal', v_usr2, now()-interval'18 days', (now()+interval'20 days')::date, 9000000, 4500000, 4500000, 4500000, 'partial', 3600000, 5400000, 'pickup', v_usr2),
  ('ORD-2025-019', v_cus7, v_loc_main, 'qc_check', 'direct', 'high', v_usr2, now()-interval'45 days', (now()-interval'5 days')::date, 45000000, 22500000, 22500000, 22500000, 'partial', 16000000, 29000000, 'delivery', v_usr1),
  ('ORD-2025-020', v_cus1, v_loc_main, 'in_production', 'direct', 'normal', v_usr2, now()-interval'15 days', (now()+interval'25 days')::date, 8500000, 4250000, 4250000, 4250000, 'partial', 3200000, 5300000, 'pickup', v_usr2),
  ('ORD-2025-021', v_cus13, v_loc_main, 'confirmed', 'referral', 'high', v_usr1, now()-interval'10 days', (now()+interval'30 days')::date, 120000000, 60000000, 60000000, 60000000, 'partial', 45000000, 75000000, 'pickup', v_usr1),
  ('ORD-2025-022', v_cus24, v_loc_main, 'draft', 'direct', 'normal', v_usr1, now()-interval'5 days', (now()+interval'45 days')::date, 35000000, 0, 35000000, 0, 'unpaid', 13000000, 22000000, 'delivery', v_usr1),
  ('ORD-2025-023', v_cus6, v_loc_online, 'in_production', 'direct', 'normal', v_usr2, now()-interval'22 days', (now()+interval'8 days')::date, 3000000, 3000000, 0, 3000000, 'paid', 1200000, 1800000, 'delivery', v_usr2),
  ('ORD-2025-024', v_cus3, v_loc_online, 'cancelled', 'facebook', 'normal', v_usr2, now()-interval'40 days', (now()-interval'20 days')::date, 4500000, 0, 0, 0, 'unpaid', 0, 0, 'delivery', v_usr2),
  ('ORD-2025-025', v_cus8, v_loc_main, 'in_production', 'direct', 'urgent', v_usr1, now()-interval'12 days', (now()+interval'3 days')::date, 89000000, 44500000, 44500000, 44500000, 'partial', 32000000, 57000000, 'delivery', v_usr1),
  ('ORD-2025-026', v_cus5, v_loc_main, 'confirmed', 'referral', 'normal', v_usr2, now()-interval'8 days', (now()+interval'35 days')::date, 18000000, 9000000, 9000000, 9000000, 'partial', 6500000, 11500000, 'pickup', v_usr2),
  ('ORD-2025-027', v_cus4, v_loc_d1, 'delivered', 'instagram', 'normal', v_usr2, now()-interval'65 days', (now()-interval'48 days')::date, 13500000, 13500000, 0, 6750000, 'paid', 5400000, 8100000, 'pickup', v_usr2),
  ('ORD-2025-028', v_cus2, v_loc_main, 'in_production', 'direct', 'high', v_usr2, now()-interval'20 days', (now()+interval'12 days')::date, 38000000, 19000000, 19000000, 19000000, 'partial', 14000000, 24000000, 'pickup', v_usr2),
  ('ORD-2025-029', v_cus1, v_loc_main, 'draft', 'direct', 'normal', v_usr2, now()-interval'2 days', (now()+interval'60 days')::date, 25000000, 0, 25000000, 0, 'unpaid', 9500000, 15500000, 'pickup', v_usr2),
  ('ORD-2025-030', v_cus24, v_loc_main, 'qc_check', 'direct', 'high', v_usr1, now()-interval'38 days', (now()-interval'8 days')::date, 75000000, 37500000, 37500000, 37500000, 'partial', 27500000, 47500000, 'delivery', v_usr1);
END $$;

-- FINANCE TRANSACTIONS
DO $$
DECLARE
  v_usr1 uuid; v_usr8 uuid;
BEGIN
  SELECT id INTO v_usr1 FROM master_users WHERE code = 'USR-001';
  SELECT id INTO v_usr8 FROM master_users WHERE code = 'USR-008';

  INSERT INTO finance_transactions (txn_no, txn_type, direction, amount, category, description, payment_method, status, created_by, txn_date) VALUES
  ('TXN-2025-001', 'receipt', 'in', 4250000, 'deposit', 'Tien coc 50% - ORD-2025-001', 'bank_transfer', 'confirmed', v_usr8, (now()-interval'150 days')::date),
  ('TXN-2025-002', 'receipt', 'in', 4250000, 'payment', 'Thanh toan con lai - ORD-2025-001', 'cash', 'confirmed', v_usr8, (now()-interval'130 days')::date),
  ('TXN-2025-003', 'receipt', 'in', 12500000, 'deposit', 'Tien coc - ORD-2025-002', 'bank_transfer', 'confirmed', v_usr8, (now()-interval'140 days')::date),
  ('TXN-2025-004', 'receipt', 'in', 12500000, 'payment', 'Thanh toan con lai - ORD-2025-002', 'bank_transfer', 'confirmed', v_usr8, (now()-interval'120 days')::date),
  ('TXN-2025-005', 'expense', 'out', 8500000, 'material', 'Nhap vai canvas va mau ve thang 1', 'bank_transfer', 'confirmed', v_usr8, (now()-interval'145 days')::date),
  ('TXN-2025-006', 'expense', 'out', 3200000, 'salary', 'Luong tuan - Artisan thang 1', 'bank_transfer', 'confirmed', v_usr8, (now()-interval'135 days')::date),
  ('TXN-2025-007', 'receipt', 'in', 22500000, 'deposit', 'Tien coc - ORD-2025-003', 'bank_transfer', 'confirmed', v_usr8, (now()-interval'130 days')::date),
  ('TXN-2025-008', 'receipt', 'in', 22500000, 'payment', 'Thanh toan con lai - ORD-2025-003', 'bank_transfer', 'confirmed', v_usr8, (now()-interval'110 days')::date),
  ('TXN-2025-009', 'expense', 'out', 1800000, 'overhead', 'Tien dien thang 2', 'cash', 'confirmed', v_usr8, (now()-interval'120 days')::date),
  ('TXN-2025-010', 'expense', 'out', 12000000, 'material', 'Nhap varnish va son lot', 'bank_transfer', 'confirmed', v_usr8, (now()-interval'118 days')::date),
  ('TXN-2025-011', 'receipt', 'in', 17500000, 'deposit', 'Tien coc - ORD-2025-004', 'bank_transfer', 'confirmed', v_usr8, (now()-interval'120 days')::date),
  ('TXN-2025-012', 'receipt', 'in', 17500000, 'payment', 'Thanh toan con lai - ORD-2025-004', 'bank_transfer', 'confirmed', v_usr8, (now()-interval'95 days')::date),
  ('TXN-2025-013', 'receipt', 'in', 6000000, 'payment', 'Thanh toan full - ORD-2025-005', 'bank_transfer', 'confirmed', v_usr8, (now()-interval'90 days')::date),
  ('TXN-2025-014', 'expense', 'out', 5500000, 'salary', 'Luong thang 3 - Phan staff', 'bank_transfer', 'confirmed', v_usr8, (now()-interval'105 days')::date),
  ('TXN-2025-015', 'expense', 'out', 2200000, 'overhead', 'Tien thue xe van chuyen', 'cash', 'confirmed', v_usr8, (now()-interval'100 days')::date),
  ('TXN-2025-016', 'receipt', 'in', 42500000, 'deposit', 'Tien coc - ORD-2025-007', 'bank_transfer', 'confirmed', v_usr8, (now()-interval'90 days')::date),
  ('TXN-2025-017', 'receipt', 'in', 42500000, 'payment', 'Thanh toan con lai - ORD-2025-007', 'bank_transfer', 'confirmed', v_usr8, (now()-interval'70 days')::date),
  ('TXN-2025-018', 'expense', 'out', 15000000, 'material', 'Nhap nguyen lieu quy 2', 'bank_transfer', 'confirmed', v_usr8, (now()-interval'85 days')::date),
  ('TXN-2025-019', 'receipt', 'in', 8500000, 'refund_in', 'Khach tra lai - ORD-2025-009 (loi mau)', 'bank_transfer', 'confirmed', v_usr8, (now()-interval'75 days')::date),
  ('TXN-2025-020', 'refund', 'out', 8500000, 'refund', 'Hoan tien - ORD-2025-009', 'bank_transfer', 'confirmed', v_usr8, (now()-interval'73 days')::date),
  ('TXN-2025-021', 'receipt', 'in', 47500000, 'deposit', 'Tien coc - ORD-2025-010', 'bank_transfer', 'confirmed', v_usr8, (now()-interval'70 days')::date),
  ('TXN-2025-022', 'receipt', 'in', 47500000, 'payment', 'Thanh toan con lai - ORD-2025-010', 'bank_transfer', 'confirmed', v_usr8, (now()-interval'50 days')::date),
  ('TXN-2025-023', 'expense', 'out', 3500000, 'marketing', 'Chay quang cao Facebook thang 4', 'bank_transfer', 'confirmed', v_usr8, (now()-interval'60 days')::date),
  ('TXN-2025-024', 'expense', 'out', 2800000, 'overhead', 'Tien internet va dien thoai Q2', 'cash', 'confirmed', v_usr8, (now()-interval'58 days')::date),
  ('TXN-2025-025', 'receipt', 'in', 27500000, 'deposit', 'Tien coc 50% - ORD-2025-015', 'bank_transfer', 'confirmed', v_usr8, (now()-interval'30 days')::date),
  ('TXN-2025-026', 'receipt', 'in', 6000000, 'deposit', 'Tien coc - ORD-2025-016', 'bank_transfer', 'confirmed', v_usr8, (now()-interval'25 days')::date),
  ('TXN-2025-027', 'receipt', 'in', 12500000, 'deposit', 'Tien coc - ORD-2025-017', 'bank_transfer', 'confirmed', v_usr8, (now()-interval'20 days')::date),
  ('TXN-2025-028', 'expense', 'out', 18500000, 'salary', 'Luong thang 4 - Toan bo nhan su', 'bank_transfer', 'confirmed', v_usr8, (now()-interval'45 days')::date),
  ('TXN-2025-029', 'expense', 'out', 9800000, 'material', 'Nhap nguyen lieu thang 5', 'bank_transfer', 'confirmed', v_usr8, (now()-interval'38 days')::date),
  ('TXN-2025-030', 'expense', 'out', 4500000, 'overhead', 'Tien thue mat bang thang 5', 'bank_transfer', 'confirmed', v_usr8, (now()-interval'32 days')::date),
  ('TXN-2025-031', 'receipt', 'in', 44500000, 'deposit', 'Tien coc - ORD-2025-025', 'bank_transfer', 'confirmed', v_usr8, (now()-interval'12 days')::date),
  ('TXN-2025-032', 'receipt', 'in', 60000000, 'deposit', 'Tien coc 50% - ORD-2025-021', 'bank_transfer', 'confirmed', v_usr8, (now()-interval'10 days')::date),
  ('TXN-2025-033', 'expense', 'out', 6500000, 'marketing', 'Chay quang cao TikTok thang 5', 'bank_transfer', 'confirmed', v_usr8, (now()-interval'15 days')::date),
  ('TXN-2025-034', 'expense', 'out', 1200000, 'overhead', 'Mua do dung van phong', 'cash', 'confirmed', v_usr8, (now()-interval'8 days')::date),
  ('TXN-2025-035', 'expense', 'out', 25000000, 'salary', 'Luong thang 5 - Toan bo nhan su', 'bank_transfer', 'confirmed', v_usr8, (now()-interval'5 days')::date);
END $$;

-- EXPENSE REQUESTS
DO $$
DECLARE v_usr3 uuid; v_usr5 uuid; v_usr8 uuid; v_usr1 uuid;
BEGIN
  SELECT id INTO v_usr3 FROM master_users WHERE code = 'USR-003';
  SELECT id INTO v_usr5 FROM master_users WHERE code = 'USR-005';
  SELECT id INTO v_usr8 FROM master_users WHERE code = 'USR-008';
  SELECT id INTO v_usr1 FROM master_users WHERE code = 'USR-001';
  INSERT INTO expense_requests (req_no, category, amount, description, status, requested_by, approved_by, approved_at) VALUES
  ('EXP-001', 'material', 3500000, 'Mua them co ve loai cao cap cho don hang ORD-2025-015', 'approved', v_usr3, v_usr1, now()-interval'28 days'),
  ('EXP-002', 'equipment', 12000000, 'Mua may say tranh mini cai tien toc do kho', 'pending', v_usr5, null, null),
  ('EXP-003', 'material', 2200000, 'Nhap them varnish mat - het hang', 'approved', v_usr3, v_usr8, now()-interval'10 days'),
  ('EXP-004', 'overhead', 8500000, 'Sua chua may lanh xuong - hu 1 may', 'approved', v_usr5, v_usr1, now()-interval'22 days'),
  ('EXP-005', 'marketing', 15000000, 'Chup anh san pham chuyen nghiep cho catalog 2025', 'pending', v_usr3, null, null),
  ('EXP-006', 'material', 5800000, 'Nhap lo vai canvas chat luong cao - mua si', 'approved', v_usr5, v_usr1, now()-interval'35 days');
END $$;

-- RECEIVABLES
DO $$
DECLARE v_ord14 uuid; v_ord15 uuid; v_ord17 uuid; v_ord19 uuid; v_ord21 uuid; v_ord25 uuid; v_ord30 uuid;
  v_cus3 uuid; v_cus8 uuid; v_cus5 uuid; v_cus7 uuid; v_cus13 uuid; v_cus24 uuid;
BEGIN
  SELECT id INTO v_ord14 FROM orders WHERE order_no = 'ORD-2025-014';
  SELECT id INTO v_ord15 FROM orders WHERE order_no = 'ORD-2025-015';
  SELECT id INTO v_ord17 FROM orders WHERE order_no = 'ORD-2025-017';
  SELECT id INTO v_ord19 FROM orders WHERE order_no = 'ORD-2025-019';
  SELECT id INTO v_ord21 FROM orders WHERE order_no = 'ORD-2025-021';
  SELECT id INTO v_ord25 FROM orders WHERE order_no = 'ORD-2025-025';
  SELECT id INTO v_ord30 FROM orders WHERE order_no = 'ORD-2025-030';
  SELECT id INTO v_cus3 FROM customers WHERE code = 'CUS-003';
  SELECT id INTO v_cus8 FROM customers WHERE code = 'CUS-024';
  SELECT id INTO v_cus5 FROM customers WHERE code = 'CUS-006';
  SELECT id INTO v_cus7 FROM customers WHERE code = 'CUS-013';
  SELECT id INTO v_cus13 FROM customers WHERE code = 'CUS-034';
  SELECT id INTO v_cus24 FROM customers WHERE code = 'CUS-029';
  INSERT INTO receivables (ref_no, order_id, customer_id, original_amount, paid_amount, balance, due_date, status) VALUES
  ('RCV-001', v_ord14, v_cus3, 8500000, 4250000, 4250000, (now()-interval'15 days')::date, 'overdue'),
  ('RCV-002', v_ord15, v_cus8, 55000000, 27500000, 27500000, (now()+interval'10 days')::date, 'open'),
  ('RCV-003', v_ord17, v_cus5, 25000000, 12500000, 12500000, (now()+interval'5 days')::date, 'open'),
  ('RCV-004', v_ord19, v_cus7, 45000000, 22500000, 22500000, (now()-interval'5 days')::date, 'overdue'),
  ('RCV-005', v_ord21, v_cus13, 120000000, 60000000, 60000000, (now()+interval'30 days')::date, 'open'),
  ('RCV-006', v_ord25, v_cus24, 89000000, 44500000, 44500000, (now()+interval'3 days')::date, 'open'),
  ('RCV-007', v_ord30, v_cus8, 75000000, 37500000, 37500000, (now()-interval'8 days')::date, 'overdue');
END $$;

-- PAYABLES
INSERT INTO payables (ref_no, supplier_name, original_amount, paid_amount, balance, due_date, status, category) VALUES
('PAY-001', 'Cong ty TNHH Mau Ve Artis', 8500000, 8500000, 0, (now()-interval'30 days')::date, 'paid', 'material'),
('PAY-002', 'Nha Cung Cap Vai Canvas Nam Phuong', 12000000, 6000000, 6000000, (now()+interval'5 days')::date, 'partial', 'material'),
('PAY-003', 'Cong ty Vat Tu My Thuat Minh Duc', 5800000, 0, 5800000, (now()-interval'3 days')::date, 'overdue', 'material'),
('PAY-004', 'Cong ty TNHH Khung Go Gia Lai', 9500000, 9500000, 0, (now()-interval'20 days')::date, 'paid', 'material'),
('PAY-005', 'Xuong Gia Cong Khung An Binh', 3200000, 0, 3200000, (now()+interval'10 days')::date, 'open', 'outsource'),
('PAY-006', 'Dich vu Sua May Lanh Phuoc Thinh', 1800000, 1800000, 0, (now()-interval'18 days')::date, 'paid', 'maintenance');

-- ALERTS
INSERT INTO alerts (type, severity, title, description, ref_type, ref_no, is_resolved) VALUES
('overdue_order', 'high', 'Don hang ORD-2025-019 tre han QC', 'Don hang da qua han giao 5 ngay, dang cho QC final', 'order', 'ORD-2025-019', false),
('overdue_order', 'critical', 'Don hang ORD-2025-025 gan het han (3 ngay)', 'Don hang urgent can hoan thanh truoc ngay mai', 'order', 'ORD-2025-025', false),
('low_stock', 'warning', 'Varnish Liquitex sap het', 'Chi con 2 chai, du doi chot duoi 3 chai', 'material', 'MAT-010', false),
('low_stock', 'warning', 'Son Lot Gesso sap het', 'Chi con 2 chai, muc toi thieu la 3', 'material', 'MAT-009', false),
('overdue_payment', 'high', 'Cong no RCV-001 qua han 15 ngay', 'Khach CUS-003 chua tra 4,250,000 VND', 'receivable', 'RCV-001', false),
('overdue_payment', 'high', 'Cong no RCV-004 qua han 5 ngay', 'Khach CUS-013 chua tra 22,500,000 VND', 'receivable', 'RCV-004', false),
('overdue_payment', 'medium', 'Cong no phai tra PAY-003 qua han', 'Cong ty Mau Ve Minh Duc cho thu 5,800,000 VND qua han 3 ngay', 'payable', 'PAY-003', false),
('expense_pending', 'info', 'Co 2 phieu chi cho duyet', 'EXP-002 va EXP-005 dang cho phe duyet', 'expense', '', false),
('qc_fail_pattern', 'warning', 'Loi mau sac lap lai 3 don lien tiep', '3 don hang QC fail do loi mau trong thang nay', 'qc', '', false),
('rework_alert', 'medium', 'Don hang ORD-2025-030 can lam lai', 'QC fail lan 1 - loi mau sac vung canh', 'order', 'ORD-2025-030', false);

-- COMPLAINTS
DO $$
DECLARE v_ord9 uuid; v_cus1 uuid; v_usr12 uuid;
BEGIN
  SELECT id INTO v_ord9 FROM orders WHERE order_no = 'ORD-2025-009';
  SELECT id INTO v_cus1 FROM customers WHERE code = 'CUS-001';
  SELECT id INTO v_usr12 FROM master_users WHERE code = 'USR-012';
  INSERT INTO complaints (complaint_no, order_id, customer_id, type, status, description, resolution, refund_amount, resolved_at, assigned_to) VALUES
  ('CMP-001', v_ord9, v_cus1, 'quality', 'resolved', 'Mau sac tranh khac xa voi mau mau khach yeu cau. Phan mau xanh bi lech tong qua nhieu.', 'Da hoan tien day du va xin loi khach hang. Se cai thien quy trinh QC mau truoc giao.', 8500000, now()-interval'70 days', v_usr12);
  INSERT INTO complaints (complaint_no, order_id, customer_id, type, status, description, assigned_to) VALUES
  ('CMP-002', v_ord9, v_cus1, 'delay', 'open', 'Don hang ORD-2025-030 bi tri hoan them 8 ngay so voi ngay hua. Khach hang khong hai long.', v_usr12);
END $$;

-- DAILY SUMMARIES (last 30 days)
INSERT INTO daily_summaries (summary_date, total_orders, new_orders, completed_orders, revenue, cogs, gross_profit, expenses, net_profit, cash_in, cash_out, qc_pass, qc_fail, tasks_completed, tasks_overdue, new_customers) VALUES
(CURRENT_DATE - 29, 18, 1, 0, 0, 0, 0, 2500000, -2500000, 0, 2500000, 0, 0, 3, 0, 0),
(CURRENT_DATE - 28, 19, 1, 0, 0, 0, 0, 0, 0, 4500000, 0, 2, 0, 4, 0, 1),
(CURRENT_DATE - 27, 19, 0, 0, 0, 0, 0, 1200000, -1200000, 12500000, 1200000, 1, 0, 5, 0, 0),
(CURRENT_DATE - 26, 20, 1, 0, 0, 0, 0, 0, 0, 6000000, 0, 3, 1, 4, 1, 1),
(CURRENT_DATE - 25, 20, 0, 0, 0, 0, 0, 3200000, -3200000, 0, 3200000, 2, 0, 6, 0, 0),
(CURRENT_DATE - 24, 21, 1, 1, 18000000, 6500000, 11500000, 0, 11500000, 9000000, 0, 2, 0, 5, 0, 0),
(CURRENT_DATE - 22, 21, 0, 1, 9000000, 3600000, 5400000, 0, 5400000, 4500000, 0, 3, 0, 4, 0, 0),
(CURRENT_DATE - 21, 22, 1, 0, 0, 0, 0, 9800000, -9800000, 19000000, 9800000, 1, 0, 3, 1, 1),
(CURRENT_DATE - 20, 22, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 5, 1, 0),
(CURRENT_DATE - 19, 23, 1, 0, 0, 0, 0, 4500000, -4500000, 44500000, 4500000, 2, 0, 4, 0, 1),
(CURRENT_DATE - 18, 23, 0, 1, 35000000, 13000000, 22000000, 0, 22000000, 17500000, 0, 3, 0, 6, 0, 0),
(CURRENT_DATE - 17, 24, 1, 0, 0, 0, 0, 0, 0, 4500000, 0, 2, 0, 5, 1, 1),
(CURRENT_DATE - 15, 24, 0, 0, 0, 0, 0, 6500000, -6500000, 60000000, 6500000, 3, 0, 4, 0, 0),
(CURRENT_DATE - 14, 25, 1, 0, 0, 0, 0, 0, 0, 9000000, 0, 1, 1, 3, 1, 1),
(CURRENT_DATE - 13, 25, 0, 0, 0, 0, 0, 1200000, -1200000, 0, 1200000, 2, 0, 5, 0, 0),
(CURRENT_DATE - 12, 25, 0, 0, 0, 0, 0, 0, 0, 44500000, 0, 3, 0, 6, 0, 0),
(CURRENT_DATE - 11, 26, 1, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 4, 1, 0),
(CURRENT_DATE - 10, 26, 0, 0, 0, 0, 0, 0, 0, 60000000, 0, 3, 0, 5, 0, 1),
(CURRENT_DATE - 8, 27, 1, 0, 0, 0, 0, 25000000, -25000000, 0, 25000000, 2, 1, 4, 2, 0),
(CURRENT_DATE - 7, 27, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 5, 1, 0),
(CURRENT_DATE - 6, 28, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 3, 1, 1),
(CURRENT_DATE - 5, 28, 0, 0, 0, 0, 0, 25000000, -25000000, 0, 25000000, 2, 0, 4, 0, 0),
(CURRENT_DATE - 4, 29, 1, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 5, 1, 1),
(CURRENT_DATE - 3, 29, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 4, 1, 0),
(CURRENT_DATE - 2, 30, 1, 1, 35000000, 12500000, 22500000, 0, 22500000, 17500000, 0, 3, 0, 6, 0, 0),
(CURRENT_DATE - 1, 30, 0, 0, 0, 0, 0, 1800000, -1800000, 0, 1800000, 2, 0, 3, 1, 0),
(CURRENT_DATE, 30, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 2, 2, 0)
ON CONFLICT (summary_date) DO NOTHING;

-- GALLERY ITEMS
INSERT INTO gallery_items (title, slug, description, medium, dimensions, style, artist, price, is_available, is_featured, tags, published_at, view_count) VALUES
('Binh Minh Tren Song Huong', 'binh-minh-song-huong', 'Canh binh minh huyen ao tren dong song Huong, TP Hue - son dau co dien trang trong sang', 'oil', '80x100cm', 'impressionism', 'Le Van Duc', 12000000, true, true, ARRAY['landscape','river','morning','featured'], now()-interval'30 days', 342),
('Chan Dung Nguoi Me', 'chan-dung-nguoi-me', 'Tranh chan dung dac ta tinh yeu thuong va su hy sinh cua nguoi me Viet Nam truyen thong', 'oil', '60x80cm', 'realism', 'Le Van Duc', 9500000, false, true, ARRAY['portrait','woman','sold'], now()-interval'45 days', 518),
('Thanh Pho Ve Dem', 'thanh-pho-ve-dem', 'Canh thanh pho soi dong voi nhung anh den lung linh trong bong toi', 'acrylic', '70x90cm', 'modern', 'Pham Thi Hoa', 7800000, true, true, ARRAY['cityscape','night','modern'], now()-interval'20 days', 215),
('Ruong Bac Thang Mu Cang Chai', 'ruong-bac-thang', 'Ve dep hung vi cua ruong bac thang Mu Cang Chai vao mua lua chin vang', 'oil', '100x130cm', 'realism', 'Hoang Minh Khoa', 18500000, true, false, ARRAY['landscape','mountain','vietnam'], now()-interval'15 days', 189),
('Hoa Sen Trong Nang Som', 'hoa-sen-trong-nang-som', 'Su tinh khiet cua hoa sen Viet Nam duoc the hien qua ngon co mem mai cua mau nuoc', 'watercolor', '40x50cm', 'botanical', 'Pham Thi Hoa', 2800000, true, false, ARRAY['floral','lotus','watercolor'], now()-interval'25 days', 156),
('Truu Tuong So 7 - Bien Ca', 'truutuong-so7-bienca', 'Tac pham truu tuong manh me goi len hinh anh bien ca bao to va su bat khuat', 'acrylic', '100x100cm', 'abstract', 'Nguyen Duc Kien', 15000000, true, true, ARRAY['abstract','sea','bold','featured'], now()-interval'10 days', 287),
('Pho Co Ha Noi Mua Thu', 'pho-co-hanoi', 'Niem man mac khi mua thu tran ve pho co Ha Noi voi nhung la vang roi', 'oil', '60x80cm', 'impressionism', 'Le Van Duc', 11000000, false, false, ARRAY['street','hanoi','autumn','sold'], now()-interval'60 days', 423),
('Bien Xanh Ly Son', 'bien-xanh-ly-son', 'Ve dep hoang so va trong treo cua bien dao Ly Son - Son tinh', 'acrylic', '80x100cm', 'realism', 'Hoang Minh Khoa', 14500000, true, true, ARRAY['sea','island','vietnam','featured'], now()-interval'8 days', 198);

-- APP SETTINGS
INSERT INTO app_settings (key, value, category, label) VALUES
('app_name', 'ArtERP Studio', 'general', 'Ten ung dung'),
('studio_name', 'Xuong Tranh Nghe Thuat', 'general', 'Ten xuong'),
('currency', 'VND', 'general', 'Don vi tien te'),
('deposit_default_pct', '50', 'sales', 'Ti le dat coc mac dinh (%)'),
('expense_approval_threshold', '5000000', 'finance', 'Nguong phe duyet chi phi (VND)'),
('qc_pass_score', '85', 'production', 'Diem QC dat toi thieu'),
('low_stock_alert', 'true', 'inventory', 'Canh bao ton kho thap'),
('auto_workflow', 'true', 'production', 'Tu dong tao workflow khi co don hang'),
('tax_rate', '0', 'finance', 'Thue suat mac dinh (%)'),
('working_hours_start', '08:00', 'general', 'Gio bat dau lam'),
('working_hours_end', '18:00', 'general', 'Gio ket thuc lam'),
('primary_color', '#1e40af', 'ui', 'Mau chinh cua he thong'),
('gallery_tagline', 'Nghe thuat song dong - Chuyen biet tranh', 'gallery', 'Slogan gallery')
ON CONFLICT (key) DO NOTHING;
