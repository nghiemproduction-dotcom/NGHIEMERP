import { useState, useCallback, useEffect } from 'react';
import { Bot, Sparkles, FileText, Bell, Users, Package, MessageSquare, TrendingUp, RefreshCw, Copy, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import type { MasterUser } from '../types';
import { usePermissions } from '../lib/permissions';

interface AIAction {
  id: string;
  icon: typeof Bot;
  label: string;
  description: string;
  category: string;
  color: string;
  prompt: string;
}

const aiActions: AIAction[] = [
  { id: 'daily_report', icon: TrendingUp, label: 'Tóm tắt báo cáo ngày', description: 'Tóm tắt doanh thu, tồn kho, QC, cảnh báo trong ngày', category: 'operations', color: 'text-blue-600', prompt: 'Hãy tóm tắt tình hình vận hành hôm nay của xưởng tranh' },
  { id: 'late_order', icon: Bell, label: 'Soạn xin lỗi đơn trễ', description: 'Draft tin nhắn xin lỗi khách khi đơn hàng bị trễ hạn', category: 'crm', color: 'text-orange-600', prompt: 'Soạn tin nhắn xin lỗi khách hàng về việc đơn hàng bị trễ 3 ngày do lỗi vật tư, hứa giao trong 5 ngày tới và tặng 5% cho đơn sau' },
  { id: 'ad_copy', icon: Sparkles, label: 'Sinh bài quảng cáo', description: 'Tạo nội dung quảng cáo Facebook/TikTok/Zalo cho sản phẩm', category: 'marketing', color: 'text-pink-600', prompt: 'Viết bài quảng cáo Facebook cho tranh sơn dầu chân dung theo yêu cầu, giá 8.5 triệu, thời gian 20 ngày. Viết theo góc độ: nỗi đau của khách (không có tranh đẹp để tặng người thân)' },
  { id: 'staff_assign', icon: Users, label: 'Gợi ý phân công nhân sự', description: 'Đề xuất phân công dựa trên kỹ năng và lịch làm việc', category: 'operations', color: 'text-emerald-600', prompt: 'Gợi ý phân công công việc cho 3 đơn hàng sơn dầu mới, trong xưởng có 4 artisan với kỹ năng khác nhau' },
  { id: 'restock', icon: Package, label: 'Gợi ý bổ sung vật tư', description: 'Phân tích BOM và đơn tương lai để đề xuất nhập kho', category: 'inventory', color: 'text-violet-600', prompt: 'Phân tích 5 đơn hàng đang sản xuất và đề xuất danh sách vật tư cần nhập thêm trong tuần tới' },
  { id: 'qc_analysis', icon: FileText, label: 'Phân tích lỗi QC lặp', description: 'Tóm tắt các lỗi QC thường xuyên và đề xuất cải tiến SOP', category: 'quality', color: 'text-red-600', prompt: 'Phân tích 10 bản ghi QC fail gần đây, tìm pattern lỗi lặp và đề xuất điều chỉnh SOP nào để giảm tỷ lệ fail' },
  { id: 'social_content', icon: MessageSquare, label: 'Nội dung mạng xã hội', description: 'Sinh caption cho Facebook, TikTok, Zalo theo 5 góc độ', category: 'marketing', color: 'text-cyan-600', prompt: 'Viết 5 caption khác nhau cho một bức tranh phong cảnh sông Hương, mỗi caption theo 1 góc: nỗi đau, lợi ích, câu chuyện, khuyến mãi, và social proof' },
  { id: 'new_sop', icon: RefreshCw, label: 'Đề xuất SOP mới', description: 'Đề xuất SOP mới dựa trên lỗi vận hành tái diễn', category: 'quality', color: 'text-amber-600', prompt: 'Dựa trên lỗi màu sắc lặp lại trong 3 đơn gần đây, đề xuất SOP mới hoặc bổ sung bước kiểm tra màu sắc trong quy trình hiện tại' },
];

const sampleOutputs: Record<string, string> = {
  daily_report: `📊 BÁO CÁO NGÀY — ${new Date().toLocaleDateString('vi-VN')}

💰 TÀI CHÍNH
• Tiền vào hôm nay: 44,500,000 VND
• Tiền ra: 1,800,000 VND
• Lợi nhuận ròng: +42,700,000 VND ✅

📦 SẢN XUẤT
• Task hoàn thành: 3/6 task đã xong
• Task trễ hạn: 2 task (ORD-2025-025, ORD-2025-019)
• QC đạt: 2 | QC fail: 1 (lỗi màu vùng cảnh)

⚠️ CẦN HÀNH ĐỘNG
1. ORD-2025-025: Trễ 3 ngày — cần đẩy tiến độ gấp
2. Varnish Liquitex còn 2 chai — cần đặt thêm
3. Công nợ RCV-001 quá hạn 15 ngày — nhắc khách
4. 2 phiếu chi chờ duyệt — cần xử lý hôm nay

🎯 ƯU TIÊN HÔM NAY
Tập trung hoàn thiện ORD-2025-025 (khẩn) trước 17h`,

  late_order: `Kính gửi anh/chị [Tên khách hàng],

Xưởng tranh chúng tôi xin được gửi lời xin lỗi chân thành vì đơn hàng [Mã đơn] của anh/chị bị chậm trễ so với ngày dự kiến ban đầu.

Nguyên nhân đến từ sự cố kỹ thuật trong quá trình xử lý vật tư, khiến chúng tôi cần thêm thời gian để đảm bảo chất lượng tác phẩm đúng yêu cầu của anh/chị.

✅ Cam kết giao tranh: [ngày giao dự kiến mới]
🎁 Ưu đãi đền bù: Giảm 5% cho đơn hàng tiếp theo

Chúng tôi hiểu điều này gây bất tiện và trân trọng sự kiên nhẫn của anh/chị. Xưởng đang nỗ lực hoàn thiện với chất lượng tốt nhất có thể.

Trân trọng,
Xưởng Tranh Nghệ Thuật`,

  ad_copy: `🎨 TRANH SON DẦU CHÂN DUNG — QUÀ TẶNG Ý NGHĨA NHẤT

Bạn đã từng muốn tặng ba mẹ một món quà thật đặc biệt nhưng chưa biết chọn gì?

📸 Từ một bức ảnh gia đình thân yêu...
🖌️ Chúng tôi sẽ chuyển hoá thành tuyệt tác sơn dầu chân dung thủ công 100%

✨ Chỉ từ 8,500,000 VND — nhận tranh sau 20 ngày
🎁 Đóng khung cao cấp MIỄN PHÍ
📦 Giao tận nhà toàn quốc

Đã có 500+ gia đình tin tưởng. Tranh trưng bày đẹp mãi với thời gian.

👇 Nhắn tin ngay để được tư vấn và xem mẫu tranh thực tế!`,

  staff_assign: `📋 GỢI Ý PHÂN CÔNG — 3 ĐƠN SƠN DẦU MỚI

ORD-2025-021 (120 triệu — Khẩn)
→ Artisan chính: Lê Văn Đức (Senior, 8 năm, oil portrait)
→ Hỗ trợ: Hoàng Minh Khoa
→ Lý do: Đơn VIP, cần artisan giỏi nhất

ORD-2025-022 (35 triệu — Bình thường)
→ Artisan chính: Nguyễn Đức Khánh
→ Hỗ trợ: Phạm Văn Bình (trainee — cơ hội học)
→ Lý do: Phong cách abstract — đúng kỹ năng Khánh

ORD-2025-028 (38 triệu — Cao)
→ Artisan chính: Phạm Thị Hoa
→ Lý do: Hiện đang rảnh, chuyên phong cảnh

⚠️ Lưu ý: Trần Đức Thịnh đang nghỉ phép — không phân công`,

  restock: `📦 ĐỀ XUẤT NHẬP VẬT TƯ TUẦN TỚI

Dựa trên 5 đơn đang SX (ORD-2025-015, 019, 020, 025, 028):

⚠️ CẦN NHẬP NGAY
• Varnish Liquitex bóng: 6 chai (hiện còn 2, cần 8)
• Sơn lót Gesso: 5 chai (hiện còn 2, cần 7)

📋 NÊN NHẬP THÊM
• Màu sơn dầu Winsor & Newton: 8 chai (các màu thiếu)
• Vải Canvas chất lượng cao: 15m² (cho đơn lớn)

💡 GỢI Ý TIẾT KIỆM
Đặt lô vải canvas 50m² để được giá sỉ — tiết kiệm ~15%
Liên hệ Nhà Cung Cấp Nam Phương (đang có hóa đơn mở)`,

  qc_analysis: `🔍 PHÂN TÍCH LỖI QC — 10 BẢN GHI GẦN NHẤT

📊 THỐNG KÊ
• Pass: 7/10 (70%) | Fail: 3/10 (30%)
• Điểm trung bình: 82/100

🔴 LỖI LẶP LẠI NHIỀU NHẤT
1. Lỗi màu sắc (3 lần): Màu xanh lệch tông so với mẫu
2. Varnish không đều (1 lần): Còn vết cọ
3. Bố cục lệch (1 lần): Chủ thể không đúng trung tâm

💡 ĐỀ XUẤT CẢI TIẾN SOP
SOP-005 (Vẽ màu chính):
→ Thêm bước: "Kiểm tra màu dưới ánh sáng trắng trước khi vẽ"
→ Thêm checklist: So sánh màu với ảnh mẫu sau mỗi session

SOP-006 (Phủ Varnish):
→ Thêm bước: "Kiểm tra bề mặt dưới đèn chéo trước khi phủ"`,

  social_content: `📱 5 CAPTION CHO TRANH PHONG CẢNH SÔNG HƯƠNG

1️⃣ NỖI ĐAU
"Bạn đã từng muốn treo một tác phẩm nghệ thuật thật sự trong phòng khách nhưng không biết tìm ở đâu? Những bức tranh in rẻ tiền chỉ làm căn phòng trống rỗng hơn thôi..."

2️⃣ LỢI ÍCH
"Một bức tranh sơn dầu phong cảnh sông Hương — biến phòng khách của bạn thành điểm nhấn tinh tế. Không gian sống nâng tầm, khách ghé thăm đều ngỡ ngàng."

3️⃣ CÂU CHUYỆN
"Bình minh sông Hương, khi ánh nắng đầu tiên chạm mặt nước... Họa sĩ Lê Văn Đức đã ngồi 3 tiếng tại đây để cảm nhận trước khi đặt cọ vẽ. Mỗi nét đều là ký ức."

4️⃣ KHUYẾN MÃI
"🎁 THÁNG NÀY ĐẶCBIỆT: Mua tranh phong cảnh trên 10 triệu — tặng đóng khung gỗ sồi cao cấp trị giá 2 triệu. Chỉ còn 3 suất!"

5️⃣ SOCIAL PROOF
"Khách hàng Nguyễn Thu Hà (Q.7): 'Treo tranh lên xong, cả gia đình ai cũng khen. Khách đến chơi hỏi mua ngay 😂 Cảm ơn xưởng đã vẽ quá đẹp!'"`,

  new_sop: `📋 ĐỀ XUẤT BỔ SUNG SOP-005

PHÁT HIỆN VẤN ĐỀ:
Lỗi màu sắc lặp lại 3 lần trong tháng 5 — đặc biệt màu xanh lệch tông 15-20% so với mẫu yêu cầu.

NGUYÊN NHÂN GỐC RỄ:
Artisan pha màu dưới ánh đèn vàng trong xưởng — gây lệch nhận biết màu thực.

BỔ SUNG VÀO SOP-005 — Bước 2.1 (mới):
"Kiểm tra màu cuối dưới ánh đèn trắng (5000K+) hoặc ra ngoài sáng tự nhiên trước khi vẽ. Chụp ảnh màu thử so sánh với ảnh mẫu trên màn hình calibrate."

TIÊU CHUẨN QC MỚI:
• Lệch màu ≤ 10% (thay vì 15% cũ)
• Bắt buộc chụp ảnh màu thử trước khi bắt đầu lớp chính

THỜI GIAN ÁP DỤNG: Ngay từ lệnh sản xuất tiếp theo`,
};

export default function AIHub({ currentUser }: { currentUser: MasterUser }) {
  const perms = usePermissions(currentUser);
  const [activeAction, setActiveAction] = useState<AIAction | null>(null);
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');

  const visibleActions = aiActions.filter(a => {
    if (perms.isSuperAdmin) return true;
    switch (a.category) {
      case 'operations': return perms.can('production');
      case 'crm': return perms.can('crm') || perms.can('sales');
      case 'marketing': return perms.can('content') || perms.can('gallery');
      case 'inventory': return perms.can('inventory');
      case 'quality': return perms.can('qc') || perms.can('production');
      default: return false;
    }
  });

  const categories = [...new Set(visibleActions.map(a => a.category))];
  const categoryLabels: Record<string, string> = {
    operations: 'Vận hành', crm: 'Chăm sóc KH', marketing: 'Marketing',
    inventory: 'Kho & Vật tư', quality: 'Kiểm soát chất lượng',
  };

  const [contextData, setContextData] = useState<Record<string, unknown>>({});

  const loadContext = useCallback(async () => {
    const [ordersRes, tasksRes, txnRes, lowStockRes] = await Promise.all([
      supabase.from('orders').select('id', { count: 'exact' }).neq('status', 'cancelled'),
      supabase.from('production_tasks').select('id,status').eq('status', 'done'),
      supabase.from('finance_transactions').select('amount').eq('direction', 'in').gte('txn_date', new Date(Date.now() - 86400000).toISOString()),
      supabase.from('inventory_items').select('material:materials(name)').lt('qty_on_hand', 5).limit(5),
    ]);
    setContextData({
      orders: ordersRes.count ?? 0,
      tasks: tasksRes.data?.length ?? 0,
      revenue: (txnRes.data ?? []).reduce((s, t) => s + Number(t.amount), 0),
      lowStockItems: (lowStockRes.data ?? []).map((i: Record<string, unknown>) => (i.material as Record<string, string>)?.name ?? 'N/A'),
    });
  }, []);

  useEffect(() => { loadContext(); }, [loadContext]);

  const callEdgeFunction = async (action: string, prompt: string) => {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    };
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action, prompt, context: contextData }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.result as string;
  };

  const runAction = async (action: AIAction) => {
    setActiveAction(action);
    setOutput('');
    setLoading(true);
    try {
      const result = await callEdgeFunction(action.id, action.prompt);
      setOutput(result || sampleOutputs[action.id] || 'Khong co ket qua.');
    } catch {
      setOutput(sampleOutputs[action.id] ?? 'Loi ket noi AI. Dung du lieu mau thay the.');
    }
    setLoading(false);
  };

  const runCustom = async () => {
    if (!customPrompt.trim()) return;
    setActiveAction(null);
    setOutput('');
    setLoading(true);
    try {
      const result = await callEdgeFunction('', customPrompt);
      setOutput(result || 'Khong co ket qua.');
    } catch {
      setOutput(`AI Assistant phan tich:\n\nDua tren yeu cau: "${customPrompt}"\n\nHe thong dang truy van du lieu. Vui long thu lai.`);
    }
    setLoading(false);
  };

  const copyOutput = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-700 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">AI Assistant Hub</h1>
            <p className="text-slate-400 text-xs">Hỗ trợ vận hành thông minh & tạo nội dung</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap mt-3">
          {['Marketing', 'Vận hành', 'QC', 'Nhân sự', 'Kho', 'CRM'].map(tag => (
            <Badge key={tag} className="bg-slate-700 text-slate-300">{tag}</Badge>
          ))}
        </div>
      </div>

      {/* Custom prompt */}
      <Card className="p-4">
        <p className="text-sm font-semibold text-gray-700 mb-2">Hỏi AI bất cứ điều gì...</p>
        <div className="flex gap-2">
          <input
            className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            placeholder="VD: Tại sao doanh thu tháng này giảm? Đơn nào cần ưu tiên hôm nay?"
            value={customPrompt}
            onChange={e => setCustomPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && runCustom()}
          />
          <button
            onClick={runCustom}
            disabled={loading || !customPrompt.trim()}
            className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl text-sm font-semibold hover:from-cyan-700 hover:to-blue-700 disabled:opacity-50 active:scale-95 transition-all flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" /> Hỏi
          </button>
        </div>
      </Card>

      {/* Action Grid */}
      {categories.map(cat => {
        const catActions = visibleActions.filter(a => a.category === cat);
        return (
          <div key={cat}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{categoryLabels[cat] ?? cat}</p>
            <div className="grid grid-cols-2 gap-2">
              {catActions.map(action => {
                const Icon = action.icon;
                const isActive = activeAction?.id === action.id;
                return (
                  <button
                    key={action.id}
                    onClick={() => runAction(action)}
                    className={`p-3 rounded-xl text-left border transition-all active:scale-95 ${
                      isActive ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-2 ${action.color}`} />
                    <p className="text-xs font-semibold text-gray-900 leading-snug">{action.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-snug line-clamp-2">{action.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Output panel */}
      {(loading || output) && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-cyan-600" />
              <span className="text-sm font-semibold text-gray-900">
                {activeAction?.label ?? 'AI Assistant'}
              </span>
              {loading && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />}
            </div>
            {output && (
              <button
                onClick={copyOutput}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Đã sao chép' : 'Sao chép'}
              </button>
            )}
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className={`h-3 bg-gray-200 rounded-full animate-pulse`} style={{ width: `${70 + i * 10}%` }} />
              ))}
              <div className="h-3 bg-gray-200 rounded-full animate-pulse w-1/2" />
            </div>
          ) : (
            <pre className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed font-sans">{output}</pre>
          )}
        </Card>
      )}
    </div>
  );
}
