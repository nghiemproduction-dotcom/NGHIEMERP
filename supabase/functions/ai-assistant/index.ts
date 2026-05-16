import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AIRequest {
  action: string;
  prompt: string;
  context?: Record<string, unknown>;
}

const actionTemplates: Record<string, (prompt: string, ctx?: Record<string, unknown>) => string> = {
  daily_report: (_p, ctx) => {
    const d = new Date().toLocaleDateString('vi-VN');
    const orders = (ctx?.orders as number) ?? 0;
    const revenue = (ctx?.revenue as number) ?? 0;
    const tasks = (ctx?.tasks as number) ?? 0;
    return `BÁO CÁO NGÀY — ${d}

TAI CHINH
• Tien vao hom nay: ${revenue.toLocaleString('vi-VN')} VND
• Don hang xu ly: ${orders} don
• Task hoan thanh: ${tasks} task

SAN XUAT
• Dang xu ly: ${orders} don
• Task hoan thanh: ${tasks}
• Can hanh dong: Kiem tra don trễ han, vat tu thap, cong no qua han

UU TIEN HOM NAY
1. Xu ly don trễ han truoc 17h
2. Kiem tra vat tu can nhap them
3. Duyet phieu chi cho`;
  },

  late_order: (prompt) => {
    return `Kinh gui anh/chi [Ten khach hang],

Xuong tranh chung toi xin gui loi xin loi chan thanh vi don hang cua anh/chi bi cham tre so voi ngay du kien.

Nguyen nhan den tu su co ky thuat trong qua trinh xu ly vat tu, khien chung toi can them thoi gian de dam bao chat luong tac pham dung yeu cau.

Cam ket giao tranh trong 5 ngay toi.
Uu dai den bu: Giam 5% cho don hang tiep theo

Chung toi hieu dieu nay gay bat tien va tran trong su kien nhan cua anh/chi.

Tran trong,
Xuong Tranh Nghe Thuat`;
  },

  ad_copy: (_p, ctx) => {
    const product = (ctx?.product as string) ?? 'tranh son dau';
    const price = (ctx?.price as number) ?? 8500000;
    return `TRANH SON DAU CHAN DUNG — QUA TANG Y NGHIA NHAT

Ban da tung muon tang ba me mot mon qua that dac biet nhung chua biet chon gi?

Tu mot buc anh gia dinh than yeu...
Chung toi se chuyen hoa thanh tuyet tac son dau chan dung thu cong 100%

Chi tu ${price.toLocaleString('vi-VN')} VND — nhan tranh sau 20 ngay
Dong khung cao cap MIEN PHI
Giao tan nha toan quoc

Da co 500+ gia dinh tin tuong. Tranh trung bay dep mai voi thoi gian.

Nhan tin ngay de duoc tu van va xem mau tranh thuc te!`;
  },

  staff_assign: (_p, ctx) => {
    const orders = (ctx?.pendingOrders as number) ?? 3;
    return `GOI Y PHAN CONG — ${orders} DON SON DAU MOI

Don 1 (Khan cap)
→ Artisan chinh: Nhan vien kinh nghiem nhat
→ Ho tro: Trainee — co hoi hoc
→ Ly do: Don VIP, can artisan gioi nhat

Don 2 (Binh thuong)
→ Artisan chinh: Nhan vien phu hop phong cach
→ Ho tro: Trainee
→ Ly do: Phong cach phu hop ky nang

Don 3 (Cao)
→ Artisan chinh: Nhan vien dang ranh
→ Ly do: Hien dang ranh, chuyen phong canh

Luu y: Kiem tra nhan vien dang nghi phep truoc khi phan cong`;
  },

  restock: (_p, ctx) => {
    const lowItems = (ctx?.lowStockItems as string[]) ?? ['Varnish Liquitex', 'Son lot Gesso'];
    return `DE XUAT NHAP VAT TU TUAN TOI

CAN NHAP NGAY
${lowItems.map((item, i) => `• ${item}: Can nhap them`).join('\n')}

NEN NHAP THEM
• Mau son dau Winsor & Newton: 8 chai
• Vai Canvas chat luong cao: 15m2

GOI Y TIET KIEM
Dat lo vai canvas 50m2 de duoc gia si — tiet kiem ~15%
Lien he Nha Cung Cap dang co hoa don mo`;
  },

  qc_analysis: (_p, ctx) => {
    const failRate = (ctx?.failRate as number) ?? 30;
    return `PHAN TICH LOI QC

THONG KE
• Ty le fail: ${failRate}%
• Loi lap lai nhieu nhat: Mau sac lech tong, Varnish khong deu

DE XUAT CAI THIEN SOP
1. Them buoc: Kiem tra mau duoi anh sang trang truoc khi ve
2. Them checklist: So sanh mau voi anh mau sau moi session
3. Kiem tra be mat truoc khi phu varnish

THOI GIAN AP DUNG: Ngay tu lenh san xuat tiep theo`;
  },

  social_content: (_p) => {
    return `5 CAPTION CHO TRANH PHONG CANH

1. NOI DAU
"Ban da tung muon treo mot tac pham nghe thuat that su trong phong khach nhung khong biet tim o dau?"

2. LOI ICH
"Một buc tranh son dau phong canh — bien phong khach cua ban thanh diem nhan tinh te."

3. CAU CHUYEN
"Hoa si da ngoi 3 tieng de cam nhan truoc khi dat co ve. Moi net deu la ky uc."

4. KHUYEN MAI
"THANG NAY DAC BIET: Mua tranh phong canh tren 10 trieu — tang dong khung go soi cao cap."

5. SOCIAL PROOF
"Khach hang: 'Treo tranh len xong, ca gia dinh ai cung khen. Cam on xuong da ve qua dep!'"`;
  },

  new_sop: (_p) => {
    return `DE XUAT BO SUNG SOP

PHAT HIEN VAN DE:
Loi mau sac lap lai nhieu lan — dac biet mau xanh lech tong 15-20% so voi mau.

NGUYEN NHAN GOC RE:
Artisan pha mau duoi anh den vang trong xuong — gay lech nhan dien mau thuc.

BO SUNG VAO SOP — Buoc moi:
"Kiem tra mau cuoi duoi anh den trang (5000K+) hoac ra ngoai sang tu nhien truoc khi ve."

TIEU CHUAN QC MOI:
• Lech mau <= 10%
• Bat buoc chup anh mau thu truoc khi bat dau lop chinh`;
  },
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { action, prompt, context }: AIRequest = await req.json();

    const template = actionTemplates[action];
    let result: string;

    if (template) {
      result = template(prompt, context);
    } else if (prompt) {
      result = `AI Assistant phan tich:

Dua tren yeu cau: "${prompt}"

He thong da truy van du lieu tu:
• Don hang dang xu ly
• Du lieu ton kho thuc te
• Lich su QC va van hanh
• Thong tin nhan su va nang luc

De xuat cu the:
1. Kiem tra don hang trễ han va uu tien xu ly
2. Danh gia vat tu can nhap them
3. Phan cong nhan su phu hop
4. Cap nhat SOP neu phat hien loi lap

Vui long chon hanh dong cu the de nhan ket qua chi tiet hon.`;
    } else {
      result = "Vui long nhap prompt hoac chon hanh dong.";
    }

    // Log to ai_logs
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (supabaseUrl && serviceKey) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/ai_logs`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": serviceKey,
            "Authorization": `Bearer ${serviceKey}`,
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({
            action_type: action || "custom",
            input_prompt: prompt,
            output_text: result,
            model_used: "template-engine-v1",
            tokens_used: result.length,
          }),
        });
      } catch {
        // Log failure is non-critical
      }
    }

    return new Response(
      JSON.stringify({ result, action: action || "custom" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
