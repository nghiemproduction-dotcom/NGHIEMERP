/*
  # Seed Users and Customers
  Creates realistic staff profiles and 40+ customer records
*/

-- USERS
INSERT INTO master_users (code, full_name, email, phone, role_code, status, skills, shift, monthly_salary, join_date, notes) VALUES
('USR-001', 'Nguyen Minh Tuan', 'tuan.nguyen@artstudio.vn', '0901234567', 'super_admin', 'active', ARRAY['management','strategy','sales'], 'full-time', 25000000, '2021-01-15', 'Founder & Strategy Director'),
('USR-002', 'Tran Thi Lan Anh', 'lananh.tran@artstudio.vn', '0912345678', 'sales_director', 'active', ARRAY['sales','crm','negotiation'], 'full-time', 18000000, '2021-03-01', 'Top performer, 3 years'),
('USR-003', 'Le Van Duc', 'duc.le@artstudio.vn', '0923456789', 'artisan', 'active', ARRAY['oil_painting','acrylic','portrait'], 'full-time', 15000000, '2021-06-01', 'Senior artisan, 8 years exp'),
('USR-004', 'Pham Thi Hoa', 'hoa.pham@artstudio.vn', '0934567890', 'artisan', 'active', ARRAY['watercolor','landscape','sketch'], 'full-time', 13000000, '2022-01-10', ''),
('USR-005', 'Vo Thanh Nam', 'nam.vo@artstudio.vn', '0945678901', 'production_manager', 'active', ARRAY['management','qc','scheduling'], 'full-time', 20000000, '2021-08-15', 'Production Manager'),
('USR-006', 'Bui Thi Kim Oanh', 'oanh.bui@artstudio.vn', '0956789012', 'qc_inspector', 'active', ARRAY['qc','oil_painting','framing'], 'full-time', 12000000, '2022-04-01', 'QC Inspector'),
('USR-007', 'Dang Van Hung', 'hung.dang@artstudio.vn', '0967890123', 'storekeeper', 'active', ARRAY['inventory','logistics','packing'], 'full-time', 10000000, '2022-06-15', ''),
('USR-008', 'Nguyen Thi Mai', 'mai.nguyen@artstudio.vn', '0978901234', 'finance', 'active', ARRAY['accounting','finance','reporting'], 'full-time', 16000000, '2021-11-01', 'Finance Manager'),
('USR-009', 'Hoang Minh Khoa', 'khoa.hoang@artstudio.vn', '0989012345', 'artisan', 'active', ARRAY['oil_painting','restoration','framing'], 'full-time', 14000000, '2022-09-01', ''),
('USR-010', 'Ly Thi Thu Trang', 'trang.ly@artstudio.vn', '0990123456', 'marketing', 'active', ARRAY['social_media','content','photography'], 'full-time', 14000000, '2023-02-01', 'Marketing & Content'),
('USR-011', 'Phan Van Binh', 'binh.phan@artstudio.vn', '0901111222', 'trainee', 'active', ARRAY['oil_painting','sketch'], 'part-time', 6000000, '2023-09-01', 'Trainee - 6 months'),
('USR-012', 'Tran Thi Ngoc', 'ngoc.tran@artstudio.vn', '0912222333', 'customer_care', 'active', ARRAY['communication','crm','support'], 'full-time', 12000000, '2023-04-15', 'Customer Care'),
('USR-013', 'Do Van Khanh', 'khanh.do@artstudio.vn', '0923333444', 'artisan', 'active', ARRAY['acrylic','abstract','landscape'], 'full-time', 13500000, '2023-01-10', ''),
('USR-014', 'Nguyen Phuong Linh', 'linh.ng@artstudio.vn', '0934444555', 'partner_operator', 'active', ARRAY['sales','pos'], 'full-time', 11000000, '2023-06-01', 'Manages Vincom Kiosk'),
('USR-015', 'Tran Duc Thinh', 'thinh.td@artstudio.vn', '0945555666', 'artisan', 'on_leave', ARRAY['oil_painting','portrait'], 'full-time', 13000000, '2022-03-15', 'Maternity leave until March 2026')
ON CONFLICT (code) DO NOTHING;

-- CUSTOMERS (40 records)
INSERT INTO customers (code, full_name, company, email, phone, address, city, tier_code, segment, source, total_orders, total_spent, tags, notes) VALUES
('CUS-001', 'Nguyen Van An', '', 'an.nguyen@gmail.com', '0901100001', '45 Le Loi, Q.1', 'Ho Chi Minh', 'vip', 'individual', 'referral', 12, 85000000, ARRAY['vip','repeat','portrait'], 'Khach quen, thich tranh chan dung gia dinh'),
('CUS-002', 'Pham Thi Bich Lien', 'Cong ty TNHH Bich Lien', 'lien.pham@bichliencorp.com', '0912200002', '123 Nguyen Hue, Q.1', 'Ho Chi Minh', 'gold', 'corporate', 'direct', 5, 32000000, ARRAY['corporate','office_deco'], 'Mua tranh trang tri van phong'),
('CUS-003', 'Tran Thanh Tung', '', 'tung.tran@hotmail.com', '0923300003', '67 Vo Thi Sau, Q.3', 'Ho Chi Minh', 'silver', 'individual', 'facebook', 3, 9500000, ARRAY['landscape'], ''),
('CUS-004', 'Le Thi Kim Chi', 'Spa Kim Chi', 'kimchi@spakimchi.vn', '0934400004', '89 Dien Bien Phu, Binh Thanh', 'Ho Chi Minh', 'gold', 'corporate', 'instagram', 7, 28000000, ARRAY['corporate','spa','abstract'], 'Mua tranh trang tri spa'),
('CUS-005', 'Vo Minh Duc', '', 'duc.vo@yahoo.com', '0945500005', '12 Hoang Dieu, Q.4', 'Ho Chi Minh', 'bronze', 'individual', 'walk-in', 1, 3500000, ARRAY[]::text[], 'Mua tranh phong thuy'),
('CUS-006', 'Nguyen Thi Thanh Huong', 'NTH Interior', 'huong.interior@gmail.com', '0956600006', '34 Tran Hung Dao, Q.5', 'Ho Chi Minh', 'vip', 'corporate', 'referral', 18, 120000000, ARRAY['vip','interior','bulk_order'], 'Cong ty noi that, mua so luong lon'),
('CUS-007', 'Bui Van Nghia', '', 'nghia.bui@gmail.com', '0967700007', '56 Ly Thuong Kiet, Q.10', 'Ho Chi Minh', 'silver', 'individual', 'tiktok', 2, 7200000, ARRAY['abstract','modern'], ''),
('CUS-008', 'Dang Thi My Linh', 'Khach San My Linh', 'mylinh.hotel@gmail.com', '0978800008', '78 Bui Vien, Q.1', 'Ho Chi Minh', 'gold', 'corporate', 'direct', 4, 45000000, ARRAY['hotel','landscape','large_format'], 'Khach san 3 sao, mua trang tri hanh lang'),
('CUS-009', 'Hoang Quoc Viet', '', 'viet.hoang@outlook.com', '0989900009', '90 Nam Ky Khoi Nghia, Q.3', 'Ho Chi Minh', 'bronze', 'individual', 'facebook', 1, 2800000, ARRAY[]::text[], ''),
('CUS-010', 'Ly Thi Ngoc Bich', 'Truong Mam Non Ngoc Bich', 'ngocbich.school@gmail.com', '0901010010', '11 Nguyen Trai, Q.5', 'Ho Chi Minh', 'silver', 'corporate', 'referral', 3, 12000000, ARRAY['education','cartoon','mural'], 'Ve tranh tuong cho truong mam non'),
('CUS-011', 'Phan Thanh Cuong', '', 'cuong.phan@gmail.com', '0912020011', '22 Le Van Sy, Q.3', 'Ho Chi Minh', 'gold', 'individual', 'instagram', 6, 22000000, ARRAY['portrait','custom'], 'Thich tranh chan dung, hay tang nguoi than'),
('CUS-012', 'Truong Thi Lan', '', 'lan.truong@gmail.com', '0923030012', '33 Pham Ngu Lao, Q.1', 'Ho Chi Minh', 'bronze', 'individual', 'walk-in', 1, 1500000, ARRAY[]::text[], 'Khach vang lai showroom'),
('CUS-013', 'Mai Van Son', 'Son Real Estate', 'son.realestate@gmail.com', '0934040013', '44 Ton Duc Thang, Q.1', 'Ho Chi Minh', 'vip', 'corporate', 'direct', 9, 67000000, ARRAY['real_estate','interior','premium'], 'Mua tranh cho can ho cao cap'),
('CUS-014', 'Dinh Thi Thu Ha', '', 'thuha.dinh@gmail.com', '0945050014', '55 Ly Tu Trong, Q.1', 'Ho Chi Minh', 'silver', 'individual', 'facebook', 2, 8000000, ARRAY['flower','watercolor'], ''),
('CUS-015', 'Ngo Duc Manh', 'Ngo Duc Restaurant', 'ngoduc.rest@gmail.com', '0956060015', '66 Xo Viet Nghe Tinh, Binh Thanh', 'Ho Chi Minh', 'gold', 'corporate', 'referral', 5, 31000000, ARRAY['restaurant','landscape','oil'], 'Nha hang, mua tranh trang tri'),
('CUS-016', 'Trinh Thi Xuan', '', 'xuan.trinh@gmail.com', '0967070016', '77 Doan Van Bo, Q.4', 'Ho Chi Minh', 'bronze', 'individual', 'tiktok', 1, 2500000, ARRAY[]::text[], ''),
('CUS-017', 'Luu Van Minh', 'Cong ty CP Minh Phat', 'minh.luu@minhphat.com', '0978080017', '88 Cong Quynh, Q.1', 'Ho Chi Minh', 'gold', 'corporate', 'direct', 4, 38000000, ARRAY['corporate','abstract','modern'], ''),
('CUS-018', 'Cao Thi Phuong Thao', '', 'thao.cao@gmail.com', '0989090018', '99 Truong Dinh, Q.3', 'Ho Chi Minh', 'silver', 'individual', 'instagram', 3, 11500000, ARRAY['abstract','acrylic'], 'Hay mua lam qua tang'),
('CUS-019', 'Tran Van Long', '', 'long.tran@gmail.com', '0901001019', '110 Vo Van Tan, Q.3', 'Ho Chi Minh', 'bronze', 'individual', 'walk-in', 1, 3200000, ARRAY[]::text[], ''),
('CUS-020', 'Nguyen Thi Kieu Loan', 'KL Beauty Clinic', 'kieuloan@klbeauty.vn', '0912012020', '121 Le Thanh Ton, Q.1', 'Ho Chi Minh', 'gold', 'corporate', 'facebook', 6, 42000000, ARRAY['clinic','abstract','minimalist'], 'Tham my vien, mua tranh hien dai'),
('CUS-021', 'Huynh Tan Phat', '', 'phat.huynh@gmail.com', '0923023021', '132 Ngo Quyen, Q.5', 'Ho Chi Minh', 'silver', 'individual', 'referral', 2, 9000000, ARRAY['landscape','oil'], ''),
('CUS-022', 'Do Thi Thu Trang', 'Thu Trang Events', 'thutrang.events@gmail.com', '0934034022', '143 Tran Quang Khai, Q.1', 'Ho Chi Minh', 'gold', 'corporate', 'instagram', 5, 35000000, ARRAY['event','floral','custom'], 'Cong ty to chuc su kien'),
('CUS-023', 'Luong Van Tai', '', 'tai.luong@gmail.com', '0945045023', '154 Le Duc Tho, Go Vap', 'Ho Chi Minh', 'bronze', 'individual', 'facebook', 1, 1800000, ARRAY[]::text[], ''),
('CUS-024', 'Vu Thi Thanh Mai', 'VTM Architecture', 'vtm.architecture@gmail.com', '0956056024', '165 Hoang Van Thu, Phu Nhuan', 'Ho Chi Minh', 'vip', 'corporate', 'direct', 11, 89000000, ARRAY['vip','architecture','interior','premium'], 'Cong ty kien truc, khach hang lon'),
('CUS-025', 'Lam Van Cuong', '', 'cuong.lam@gmail.com', '0967067025', '176 Phan Xich Long, Phu Nhuan', 'Ho Chi Minh', 'silver', 'individual', 'tiktok', 2, 6500000, ARRAY['portrait','custom'], ''),
('CUS-026', 'Pham Thi Bao Ngoc', '', 'baongoc.pham@gmail.com', '0978078026', '187 Nguyen Van Troi, Phu Nhuan', 'Ho Chi Minh', 'bronze', 'individual', 'instagram', 1, 2200000, ARRAY[]::text[], ''),
('CUS-027', 'Tran Ngoc Hieu', 'Hieu Pharma', 'hieu.pharma@gmail.com', '0989089027', '198 Bach Dang, Binh Thanh', 'Ho Chi Minh', 'gold', 'corporate', 'referral', 4, 28500000, ARRAY['pharma','landscape','calming'], 'Nha thuoc chuoi'),
('CUS-028', 'Nguyen Duc Kien', '', 'kien.nguyen@gmail.com', '0901900028', '209 Dinh Bo Linh, Binh Thanh', 'Ho Chi Minh', 'silver', 'individual', 'facebook', 3, 10200000, ARRAY['oil','portrait'], ''),
('CUS-029', 'Vo Thi Cam Tu', 'Tu Garden Resort', 'tugarden.resort@gmail.com', '0912811029', '220 Vo Thi Sau, Q.3', 'Ho Chi Minh', 'vip', 'corporate', 'direct', 8, 95000000, ARRAY['vip','resort','landscape','large_format'], 'Resort sinh thai, mua so luong lon moi nam'),
('CUS-030', 'Le Minh Quang', '', 'quang.le@gmail.com', '0923722030', '231 Truong Sa, Binh Thanh', 'Ho Chi Minh', 'bronze', 'individual', 'walk-in', 1, 4500000, ARRAY['abstract'], ''),
('CUS-031', 'Dang Thi Quynh Nhu', '', 'quynhnhu.dang@gmail.com', '0934633031', '45 Ha Noi Moi, Tan Binh', 'Ho Chi Minh', 'silver', 'individual', 'instagram', 2, 8800000, ARRAY['floral','acrylic'], 'Hay mua tranh hoa'),
('CUS-032', 'Bui Ngoc Tien', 'Tien Tech Group', 'tien.tech@tientech.vn', '0945544032', '56 Cong Hoa, Tan Binh', 'Ho Chi Minh', 'gold', 'corporate', 'direct', 6, 52000000, ARRAY['tech','modern','abstract','corporate'], 'Cong ty cong nghe'),
('CUS-033', 'Hoang Thi Thu Suong', '', 'thusuong.hoang@gmail.com', '0956455033', '67 Nguyen Hong, Go Vap', 'Ho Chi Minh', 'bronze', 'individual', 'facebook', 1, 3000000, ARRAY[]::text[], ''),
('CUS-034', 'Nguyen Van Phuc', 'Phuc Nguyen Gallery', 'phucnguyen.gallery@gmail.com', '0967366034', '78 Truong Chinh, Tan Binh', 'Ho Chi Minh', 'vip', 'corporate', 'referral', 15, 145000000, ARRAY['vip','gallery','reseller','premium'], 'Gallery mua lai ban le'),
('CUS-035', 'Tran Thi Quynh Anh', '', 'quynhanh.tran@gmail.com', '0978277035', '89 Co Bac, Q.1', 'Ho Chi Minh', 'silver', 'individual', 'tiktok', 2, 7500000, ARRAY['modern','minimalist'], ''),
('CUS-036', 'Le Van Truong', '', 'truong.le@gmail.com', '0989188036', '90 Hai Ba Trung, Q.1', 'Ho Chi Minh', 'bronze', 'individual', 'walk-in', 1, 2000000, ARRAY[]::text[], ''),
('CUS-037', 'Pham Nguyen Bao Uyen', 'BU Consulting', 'baouyen.bu@gmail.com', '0901099037', '101 Ngo Duc Ke, Q.1', 'Ho Chi Minh', 'gold', 'corporate', 'instagram', 5, 39000000, ARRAY['consulting','modern','minimalist'], ''),
('CUS-038', 'Vo Duc Hai', '', 'hai.vo@gmail.com', '0912988038', '112 Doan Van Bo, Q.4', 'Ho Chi Minh', 'bronze', 'individual', 'facebook', 1, 1200000, ARRAY[]::text[], 'Khach mua tranh in re'),
('CUS-039', 'Nguyen Thi Cam Van', 'Van Photography Studio', 'camvan.photo@gmail.com', '0923877039', '123 Le Lai, Q.1', 'Ho Chi Minh', 'silver', 'individual', 'referral', 3, 13500000, ARRAY['photography','portrait','custom'], 'Studio anh, mua tranh in lon'),
('CUS-040', 'Tran Duc Anh', '', 'ducanh.tran@gmail.com', '0934766040', '134 Nguyen Thai Binh, Q.1', 'Ho Chi Minh', 'bronze', 'individual', 'facebook', 1, 2800000, ARRAY[]::text[], '')
ON CONFLICT (code) DO NOTHING;
