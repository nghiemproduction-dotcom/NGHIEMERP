/*
  # Seed Master Data

  Inserts roles, units, tiers, categories, locations, status codes,
  workflow templates, and SOP library entries.
*/

-- ROLES
INSERT INTO master_roles (code, name, description, permissions, menu_access, sort_order) VALUES
('super_admin', 'Super Admin / Strategy Director', 'Full system access', '{"all": true}', ARRAY['dashboard','sales','production','inventory','finance','settings','gallery','ai'], 1),
('sales_director', 'Sales Director', 'Full sales and CRM access', '{"sales": true, "crm": true, "finance_view": true}', ARRAY['dashboard','sales','finance'], 2),
('finance', 'Finance / Cashier', 'Financial transactions and reporting', '{"finance": true, "sales_view": true}', ARRAY['dashboard','sales','finance'], 3),
('production_manager', 'Production Manager', 'Manage all production workflows', '{"production": true, "inventory_view": true}', ARRAY['dashboard','production','inventory'], 4),
('artisan', 'Artisan / Main Craftsman', 'Execute production tasks', '{"tasks": true}', ARRAY['production'], 5),
('qc_inspector', 'QC Inspector', 'Quality control inspections', '{"qc": true, "production_view": true}', ARRAY['production'], 6),
('storekeeper', 'Inventory / Storekeeper', 'Manage warehouse and stock', '{"inventory": true}', ARRAY['dashboard','inventory'], 7),
('partner_operator', 'Partner / Kiosk Operator', 'Manage assigned POS/kiosk', '{"pos": true, "own_sales": true}', ARRAY['sales','inventory'], 8),
('customer_care', 'Support / Customer Care', 'Handle complaints and communication', '{"crm": true, "complaints": true}', ARRAY['sales'], 9),
('marketing', 'Marketing / Content', 'Manage gallery and content', '{"gallery": true, "content": true}', ARRAY['gallery','ai'], 10),
('trainee', 'Part-time / Trainee', 'Limited task execution', '{"tasks_limited": true}', ARRAY['production'], 11),
('auditor', 'Approver / Auditor', 'Approve expenses and view audit', '{"audit": true, "approve": true}', ARRAY['finance'], 12)
ON CONFLICT (code) DO NOTHING;

-- UNITS
INSERT INTO master_units (code, name, type) VALUES
('cai', 'Cái', 'count'), ('buc', 'Bức', 'count'), ('bo', 'Bộ', 'count'),
('kg', 'Kg', 'weight'), ('g', 'Gram', 'weight'), ('lit', 'Lít', 'volume'),
('ml', 'ml', 'volume'), ('m', 'Mét', 'length'), ('cm', 'cm', 'length'),
('m2', 'm²', 'area'), ('cuon', 'Cuộn', 'count'), ('hop', 'Hộp', 'count'),
('chai', 'Chai', 'count'), ('tep', 'Tép', 'count'), ('lot', 'Lô', 'count')
ON CONFLICT (code) DO NOTHING;

-- TIERS
INSERT INTO master_tiers (code, name, type, min_value, discount_rate, commission_rate, benefits, color) VALUES
('bronze', 'Bronze', 'customer', 0, 0, 0, ARRAY['Priority support'], '#CD7F32'),
('silver', 'Silver', 'customer', 5000000, 5, 0, ARRAY['5% discount', 'Free delivery'], '#C0C0C0'),
('gold', 'Gold', 'customer', 20000000, 10, 0, ARRAY['10% discount', 'VIP access', 'Custom framing'], '#FFD700'),
('vip', 'VIP', 'customer', 50000000, 15, 0, ARRAY['15% discount', 'Home service', 'Personal artist'], '#E5C100'),
('partner_basic', 'Doi tac Co ban', 'partner', 0, 0, 10, ARRAY['10% commission'], '#6B7280'),
('partner_silver', 'Doi tac Bac', 'partner', 10000000, 0, 15, ARRAY['15% commission', 'Marketing support'], '#C0C0C0'),
('partner_gold', 'Doi tac Vang', 'partner', 30000000, 0, 20, ARRAY['20% commission', 'Dedicated manager'], '#FFD700')
ON CONFLICT (code) DO NOTHING;

-- CATEGORIES
INSERT INTO master_categories (code, name, type, unit, min_stock) VALUES
('CAT_OIL', 'Tranh Son Dau', 'product', 'buc', 0),
('CAT_ACRY', 'Tranh Acrylic', 'product', 'buc', 0),
('CAT_WC', 'Tranh Mau Nuoc', 'product', 'buc', 0),
('CAT_DIGI', 'Tranh Ky Thuat So', 'product', 'buc', 0),
('CAT_SCULPT', 'Dieu Khac Tuong', 'product', 'cai', 0),
('CAT_FRAME', 'Khung Tranh', 'product', 'cai', 5),
('CAT_CUSTOM', 'Tranh Theo Yeu Cau', 'product', 'buc', 0),
('MAT_CANVAS', 'Vai Canvas', 'material', 'm2', 10),
('MAT_PAINT', 'Mau Ve', 'material', 'chai', 5),
('MAT_BRUSH', 'Co Ve', 'material', 'cai', 10),
('MAT_FRAME_W', 'Go Lam Khung', 'material', 'kg', 20),
('MAT_PRIMER', 'Son Lot Primer', 'material', 'chai', 3),
('MAT_VARNISH', 'Varnish Lop Bao Ve', 'material', 'chai', 3),
('MAT_STRETCH', 'Khung Cang Vai', 'material', 'cai', 10),
('TOOL_PALETTE', 'Bang Pha Mau', 'tool', 'cai', 5),
('TOOL_EASEL', 'Gia Ve', 'tool', 'cai', 2),
('SVC_RESTORE', 'Phuc Che Tranh', 'service', 'lan', 0),
('SVC_CONSULT', 'Tu Van Noi That', 'service', 'lan', 0)
ON CONFLICT (code) DO NOTHING;

-- STATUS
INSERT INTO master_status (code, name, domain, color, bg_color, sort_order, is_terminal, allowed_next) VALUES
('draft', 'Nhap', 'order', '#6B7280', '#F3F4F6', 1, false, ARRAY['confirmed','cancelled']),
('confirmed', 'Da Xac Nhan', 'order', '#2563EB', '#EFF6FF', 2, false, ARRAY['in_production','cancelled']),
('in_production', 'Dang San Xuat', 'order', '#D97706', '#FFFBEB', 3, false, ARRAY['qc_check','cancelled']),
('qc_check', 'Kiem Tra QC', 'order', '#7C3AED', '#F5F3FF', 4, false, ARRAY['ready','in_production']),
('ready', 'San Sang Giao', 'order', '#059669', '#ECFDF5', 5, false, ARRAY['delivered','cancelled']),
('delivered', 'Da Giao', 'order', '#16A34A', '#F0FDF4', 6, true, ARRAY[]::text[]),
('cancelled', 'Da Huy', 'order', '#DC2626', '#FEF2F2', 7, true, ARRAY[]::text[]),
('refunded', 'Da Hoan Tien', 'order', '#9CA3AF', '#F9FAFB', 8, true, ARRAY[]::text[]),
('pending', 'Cho Xu Ly', 'task', '#6B7280', '#F3F4F6', 1, false, ARRAY['in_progress','blocked']),
('in_progress', 'Dang Lam', 'task', '#2563EB', '#EFF6FF', 2, false, ARRAY['qc_pending','blocked','pending']),
('qc_pending', 'Cho QC', 'task', '#D97706', '#FFFBEB', 3, false, ARRAY['done','rework']),
('done', 'Hoan Thanh', 'task', '#16A34A', '#F0FDF4', 4, true, ARRAY[]::text[]),
('rework', 'Lam Lai', 'task', '#DC2626', '#FEF2F2', 5, false, ARRAY['in_progress']),
('blocked', 'Bi Chan', 'task', '#9CA3AF', '#F9FAFB', 6, false, ARRAY['in_progress']),
('qc_pass', 'Dat', 'qc', '#16A34A', '#F0FDF4', 1, true, ARRAY[]::text[]),
('qc_fail', 'Khong Dat', 'qc', '#DC2626', '#FEF2F2', 2, false, ARRAY['qc_pass']),
('qc_checking', 'Dang Kiem', 'qc', '#D97706', '#FFFBEB', 3, false, ARRAY['qc_pass','qc_fail'])
ON CONFLICT DO NOTHING;

-- LOCATIONS
INSERT INTO master_locations (code, name, type, address, partner_type, commission_rate, revenue_share) VALUES
('WH_MAIN', 'Kho Trung Tam - Xuong Chinh', 'warehouse', '12 Nguyen Van Cu, Q.5, TP.HCM', 'internal', 0, 0),
('WH_FINISH', 'Kho Thanh Pham', 'warehouse', '12 Nguyen Van Cu, Q.5, TP.HCM', 'internal', 0, 0),
('WH_DEFECT', 'Kho Hong Phe Pham', 'warehouse', '12 Nguyen Van Cu, Q.5, TP.HCM', 'internal', 0, 0),
('POS_MAIN', 'Showroom Chinh - Q.5', 'pos', '12 Nguyen Van Cu, Q.5, TP.HCM', 'internal', 0, 0),
('POS_D1', 'Kiosk Quan 1 - Vincom', 'kiosk', 'Tang B1, Vincom Center, Q.1', 'partner', 15, 85),
('POS_D7', 'Diem Ban Quan 7', 'pos', '28 Nguyen Duc Canh, Q.7', 'partner', 18, 82),
('CONSIGN_1', 'Ky gui - Gallery Le Loi', 'consignment', '45 Le Loi, Q.1', 'consignment', 20, 80),
('CONSIGN_2', 'Ky gui - Cafe Nghe Thuat Thao Dien', 'consignment', '78 Xuan Thuy, Thao Dien, Q.2', 'consignment', 25, 75),
('ONLINE_SHOP', 'Cua Hang Online', 'online', 'Shopee/Facebook/TikTok', 'internal', 0, 0),
('PARTNER_HP', 'Doi Tac Hai Phong', 'partner', '15 Dien Bien Phu, Hai Phong', 'partner', 20, 80),
('PARTNER_HN', 'Dai Ly Ha Noi - Gallery Ho Tay', 'partner', '23 Yen Phu, Tay Ho, Ha Noi', 'partner', 22, 78)
ON CONFLICT (code) DO NOTHING;

-- WORKFLOW TEMPLATES
INSERT INTO workflow_templates (code, name, product_type, description, version) VALUES
('WF_OIL_CUSTOM', 'Quy trinh Tranh Son Dau Theo Yeu Cau', 'oil_custom', 'Toan bo quy trinh tu tu van den giao tranh', 2),
('WF_ACRY_CUSTOM', 'Quy trinh Tranh Acrylic Theo Yeu Cau', 'acrylic_custom', 'Quy trinh san xuat tranh acrylic', 1),
('WF_PRINT', 'Quy trinh Tranh In Ky Thuat So', 'digital_print', 'In an va dong khung', 1),
('WF_RESTORE', 'Quy trinh Phuc Che Tranh', 'restoration', 'Tiep nhan, phan tich, phuc che, nghiem thu', 2),
('WF_FRAME', 'Quy trinh Dong Khung', 'framing', 'Do, cat, lap khung, kiem tra', 1)
ON CONFLICT (code) DO NOTHING;

-- WORKFLOW STAGES for WF_OIL_CUSTOM
DO $$
DECLARE v_tmpl uuid;
BEGIN
  SELECT id INTO v_tmpl FROM workflow_templates WHERE code = 'WF_OIL_CUSTOM';
  INSERT INTO workflow_stages (template_id, code, name, sort_order, duration_hours, required_role, requires_qc, requires_photo, sop_code) VALUES
  (v_tmpl, 'CONSULT', 'Tu van & Xac nhan Yeu cau', 1, 1, 'sales_director', false, false, 'SOP-001'),
  (v_tmpl, 'SKETCH', 'Phac thao & Duyet ban phac', 2, 4, 'artisan', true, true, 'SOP-002'),
  (v_tmpl, 'CANVAS_PREP', 'Chuan bi vai & Son lot', 3, 2, 'artisan', false, false, 'SOP-003'),
  (v_tmpl, 'UNDERPAINTING', 'Lop nen (Underpainting)', 4, 6, 'artisan', false, true, 'SOP-004'),
  (v_tmpl, 'MAIN_LAYER', 'Lop mau chinh (Main Layer)', 5, 16, 'artisan', true, true, 'SOP-005'),
  (v_tmpl, 'DETAIL', 'Chi tiet & Tinh chinh (Detail)', 6, 8, 'artisan', false, true, 'SOP-005'),
  (v_tmpl, 'DRYING', 'Cho kho hoan toan', 7, 24, 'artisan', false, false, 'SOP-006'),
  (v_tmpl, 'VARNISH', 'Phu varnish bao ve', 8, 2, 'artisan', false, false, 'SOP-006'),
  (v_tmpl, 'FRAMING', 'Dong khung', 9, 3, 'artisan', false, true, 'SOP-007'),
  (v_tmpl, 'QC_FINAL', 'Kiem tra QC Cuoi', 10, 1, 'qc_inspector', true, true, 'SOP-008'),
  (v_tmpl, 'PACKAGING', 'Dong goi & Ban giao', 11, 1, 'storekeeper', false, true, 'SOP-009');
END $$;

-- SOP LIBRARY
INSERT INTO sop_library (sop_code, title, purpose, applicable_roles, steps, qc_criteria, version, status) VALUES
('SOP-001', 'Quy trinh Tu van & Tiep nhan don', 'Dam bao thu thap day du thong tin tu khach truoc khi xac nhan don',
  ARRAY['sales_director','artisan'],
  '[{"step":1,"title":"Chao hoi & Xac dinh nhu cau","detail":"Tim hieu khong gian treo tranh, phong cach yeu thich, ngan sach"},{"step":2,"title":"Goi y san pham phu hop","detail":"Xem portfolio, so sanh cac mau, de xuat chat lieu phu hop"},{"step":3,"title":"Xac nhan thong so ky thuat","detail":"Kich thuoc, mau sac chu dao, chat lieu, deadline"},{"step":4,"title":"Lap bao gia & Thu coc","detail":"Bao gia chi tiet, thu 50% coc, ky hop dong"}]',
  ARRAY['Khach da ky xac nhan thong so', 'Da thu du tien coc', 'Anh tham khao da luu vao he thong'], 1, 'active'),
('SOP-002', 'Quy trinh Phac thao & Duyet ban', 'Tao ban phac thao de khach duyet truoc khi ve chinh thuc',
  ARRAY['artisan'],
  '[{"step":1,"title":"Nghien cuu tai lieu tham khao","detail":"Xem ky anh mau, phong cach, mau sac khach yeu cau"},{"step":2,"title":"Phac thao bang but chi","detail":"Ve 2-3 phac thao khac nhau de khach chon"},{"step":3,"title":"Chup anh va gui khach duyet","detail":"Chup anh ro net, ghi chu dien giai tren anh"},{"step":4,"title":"Chinh sua theo feedback","detail":"Toi da 2 lan chinh sua phac thao"}]',
  ARRAY['Khach da duyet phac thao bang van ban', 'Anh phac thao da upload vao task'], 1, 'active'),
('SOP-003', 'Chuan bi vai canvas & Son lot', 'Chuan bi be mat vai dung chuan truoc khi ve',
  ARRAY['artisan'],
  '[{"step":1,"title":"Kiem tra va cat vai","detail":"Kiem tra chat luong vai, cat dung kich thuoc theo don hang"},{"step":2,"title":"Cang vai len khung","detail":"Cang vai deu, khong bi nhan, cac goc phai vuong"},{"step":3,"title":"Son lot lan 1","detail":"Pha son lot ti le 1:1 voi nuoc, quet deu ca mat"},{"step":4,"title":"De kho 4 tieng","detail":"Tranh anh nang truc tiep, nhiet do phong"},{"step":5,"title":"Son lot lan 2","detail":"Quet lan 2 khi lan 1 da hoan toan kho"}]',
  ARRAY['Vai cang phang khong nhan', 'Be mat min sau 2 lop son lot', 'Kich thuoc dung voi don hang'], 2, 'active'),
('SOP-004', 'Ky thuat Ve lop nen (Underpainting)', 'Tao lop nen dung ky thuat de mau sac ben dep',
  ARRAY['artisan'],
  '[{"step":1,"title":"Pha mau nen co ban","detail":"Thuong dung mau nau dat hoac xam trung tinh"},{"step":2,"title":"Ve phac hinh va bong toi","detail":"Xac dinh anh sang chinh, vung bong toi, bong sang"},{"step":3,"title":"Cho kho hoan toan","detail":"Thuong 12-24 tieng tuy do day son"}]',
  ARRAY['Bo cuc can doi', 'Tuong phan sang toi ro rang'], 1, 'active'),
('SOP-005', 'Ky thuat Ve mau chinh (Main Painting)', 'Dam bao chat luong mau sac va ky thuat dung yeu cau',
  ARRAY['artisan'],
  '[{"step":1,"title":"Bat dau tu vung lon","detail":"Dien mau cac vung lon truoc, sau do chi tiet dan"},{"step":2,"title":"Ky thuat wet-on-wet","detail":"Pha mau tren bang pha, kiem tra mau tren giay trang truoc khi ve"},{"step":3,"title":"Chup anh tien do","detail":"Chup anh sau moi buoi lam de theo doi tien do"},{"step":4,"title":"So sanh voi anh mau","detail":"Dat anh mau canh tranh de so sanh"}]',
  ARRAY['Mau sac dung voi yeu cau ±10%', 'Be mat deu mau khong bi von cuc', 'Chup anh tien do du tat ca giai doan'], 1, 'active'),
('SOP-006', 'Quy trinh Kho & Phu Varnish', 'Bao quan tranh dung cach sau khi ve xong',
  ARRAY['artisan'],
  '[{"step":1,"title":"Dat tranh o noi thong thoang","detail":"Tranh bui, nhiet do 18-25°C, do am <70%"},{"step":2,"title":"Cho kho hoan toan","detail":"Tranh son dau can 24-72 gio tuy do day"},{"step":3,"title":"Phu varnish bao ve","detail":"Dung varnish bong hoac mo theo yeu cau khach, quet deu 2 lop"}]',
  ARRAY['Varnish phu deu khong co vet co', 'Be mat bong hoac mo dung theo yeu cau'], 1, 'active'),
('SOP-007', 'Quy trinh Dong Khung', 'Dong khung dung ky thuat dep mat',
  ARRAY['artisan','storekeeper'],
  '[{"step":1,"title":"Do va chon khung","detail":"Do chinh xac kich thuoc tranh, chon khung theo yeu cau khach"},{"step":2,"title":"Cat va ghep khung","detail":"Cat goc 45° chinh xac, dan/dong dinh cac goc"},{"step":3,"title":"Gan tranh vao khung","detail":"Cang tranh vao khung, dan mat sau, gan hook treo"},{"step":4,"title":"Ve sinh va kiem tra","detail":"Lau sach be mat, kiem tra cac goc, kiem tra hook"}]',
  ARRAY['Cac goc khung thang vuong 90°', 'Khong co khe ho giua tranh va khung', 'Hook chac chan'], 1, 'active'),
('SOP-008', 'Quy trinh QC Nghiem thu Cuoi', 'Kiem tra toan dien truoc khi ban giao khach',
  ARRAY['qc_inspector'],
  '[{"step":1,"title":"Kiem tra mau sac","detail":"So sanh voi anh mau khach da duyet, ghi nhan do khac biet"},{"step":2,"title":"Kiem tra ky thuat","detail":"Kiem tra be mat, khong co vet nut, bong troc, vet co xau"},{"step":3,"title":"Kiem tra khung","detail":"Cac goc, mat sau, hook treo"},{"step":4,"title":"Chup anh nghiem thu","detail":"Chup anh tong the, chi tiet, so sanh voi mau"},{"step":5,"title":"Ghi phieu QC","detail":"Ghi diem QC, ghi nhan loi (neu co), ky ten"}]',
  ARRAY['Diem QC >= 85/100', 'Khong co loi nghiem trong', 'Khung chac chan', 'Co anh nghiem thu day du'], 2, 'active'),
('SOP-009', 'Quy trinh Dong Goi & Ban Giao', 'Dong goi an toan, ban giao dung nguoi dung don',
  ARRAY['storekeeper'],
  '[{"step":1,"title":"Chuan bi vat lieu dong goi","detail":"Xop bao ve, boc mang co, thung carton cung"},{"step":2,"title":"Boc tranh","detail":"Boc 2-3 lop xop, co dinh bang bang keo"},{"step":3,"title":"Kiem tra don hang","detail":"Doi chieu tranh voi phieu don hang truoc khi dong goi"},{"step":4,"title":"Ghi thong tin len thung","detail":"Ghi ten khach, dia chi, SDT, ma don hang"},{"step":5,"title":"Ban giao cho shipper","detail":"Yeu cau ky nhan, chup anh ban giao"}]',
  ARRAY['Tranh khong bi xe dich trong thung', 'Co anh chup khi ban giao', 'Khach da ky nhan'], 1, 'active')
ON CONFLICT (sop_code) DO NOTHING;
