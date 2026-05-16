import { useEffect, useState } from 'react';
import {
  TrendingUp, ShoppingCart, AlertTriangle, Clock, Package,
  DollarSign, Users, CheckCircle, XCircle, Activity, Bell, BarChart2, ArrowRight,
  Trophy, History, GitBranch
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import StatCard from '../components/ui/StatCard';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { formatCurrency, formatDate, formatDatetime, statusColor, severityColor, isOverdue } from '../lib/utils';
import type { Alert, Order, DailySummary, MasterUser } from '../types';
import { usePermissions } from '../lib/permissions';
import { useMultiRealtimeSubscription } from '../lib/useRealtime';

interface TopProduct {
  id: string;
  name: string;
  code: string;
  type: string;
  total_revenue: number;
  total_qty: number;
}

interface OrderHistoryEvent {
  id: string;
  order_id: string;
  event_type: string;
  note: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
  order_no: string;
}

interface DashboardData {
  totalRevenue: number;
  totalOrders: number;
  activeOrders: number;
  overdueOrders: number;
  pendingApproval: number;
  qcPassRate: number;
  totalReceivable: number;
  totalPayable: number;
  recentOrders: Order[];
  alerts: Alert[];
  dailySummaries: DailySummary[];
  topAlerts: Alert[];
  topProducts: TopProduct[];
  recentHistory: OrderHistoryEvent[];
}

function MiniChart({ data, color = '#2563EB' }: { data: number[]; color?: string }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 200},${80 - (v / max) * 70}`).join(' ');
  const area = `${pts} 200,80 0,80`;
  return (
    <svg viewBox="0 0 200 80" className="w-full h-12" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`g${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#g${color.replace('#', '')})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Dashboard({ onNav, currentUser }: { onNav: (p: string) => void; currentUser: MasterUser }) {
  const perms = usePermissions(currentUser);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [ordersRes, alertsRes, summaryRes, receivableRes, payableRes, topProductsRes, historyRes] = await Promise.all([
        supabase.from('orders').select('*, customer:customers(full_name,tier_code)').order('created_at', { ascending: false }).limit(8),
        supabase.from('alerts').select('*').eq('is_resolved', false).order('created_at', { ascending: false }).limit(10),
        supabase.from('daily_summaries').select('*').order('summary_date', { ascending: false }).limit(30),
        supabase.from('receivables').select('balance,status'),
        supabase.from('payables').select('balance,status'),
        supabase.from('order_items').select('product_id, product_name, qty, line_total, products(code, type, name)').order('line_total', { ascending: false }),
        supabase.from('order_history').select('*, order:orders(order_no)').order('created_at', { ascending: false }).limit(8),
      ]);

      const orders: Order[] = ordersRes.data ?? [];
      const alerts: Alert[] = alertsRes.data ?? [];
      const summaries: DailySummary[] = (summaryRes.data ?? []).reverse();

      const activeOrders = orders.filter(o => !['delivered','cancelled','refunded'].includes(o.status)).length;
      const overdueOrders = orders.filter(o => o.deadline && isOverdue(o.deadline) && !['delivered','cancelled','refunded'].includes(o.status)).length;
      const totalRevenue = summaries.reduce((s, d) => s + d.revenue, 0);
      const totalQcPass = summaries.reduce((s, d) => s + d.qc_pass, 0);
      const totalQcFail = summaries.reduce((s, d) => s + d.qc_fail, 0);
      const qcPassRate = totalQcPass + totalQcFail > 0 ? Math.round((totalQcPass / (totalQcPass + totalQcFail)) * 100) : 0;
      const totalReceivable = (receivableRes.data ?? []).filter(r => r.status !== 'paid').reduce((s, r) => s + r.balance, 0);
      const totalPayable = (payableRes.data ?? []).filter(r => r.status !== 'paid').reduce((s, r) => s + r.balance, 0);

      // Aggregate top products by revenue
      const itemRows = (topProductsRes.data ?? []) as unknown as Array<{
        product_id: string;
        product_name: string;
        qty: number;
        line_total: number;
        products: { code: string; type: string; name: string } | null;
      }>;
      const productMap = new Map<string, TopProduct>();
      for (const item of itemRows) {
        if (!item.product_id) continue;
        const existing = productMap.get(item.product_id);
        if (existing) {
          existing.total_revenue += item.line_total;
          existing.total_qty += item.qty;
        } else {
          const p = item.products;
          productMap.set(item.product_id, {
            id: item.product_id,
            name: item.product_name || p?.name || '—',
            code: p?.code || '—',
            type: p?.type || '—',
            total_revenue: item.line_total,
            total_qty: item.qty,
          });
        }
      }
      const topProducts = Array.from(productMap.values())
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, 5);

      // Recent activity history
      const recentHistory: OrderHistoryEvent[] = (historyRes.data ?? []).map((h: Record<string, unknown>) => {
        const order = h.order as { order_no: string } | null;
        return {
          id: h.id as string,
          order_id: h.order_id as string,
          event_type: h.event_type as string,
          note: (h.note as string) || '',
          old_value: (h.old_value as Record<string, unknown>) ?? null,
          new_value: (h.new_value as Record<string, unknown>) ?? null,
          created_at: h.created_at as string,
          order_no: order?.order_no ?? '—',
        };
      });

      setData({
        totalRevenue,
        totalOrders: orders.length,
        activeOrders,
        overdueOrders,
        pendingApproval: alerts.filter(a => a.type === 'expense_pending').length,
        qcPassRate,
        totalReceivable,
        totalPayable,
        recentOrders: orders.slice(0, 6),
        alerts,
        dailySummaries: summaries,
        topAlerts: alerts.slice(0, 5),
        topProducts,
        recentHistory,
      });
      setLoading(false);
    }
    load();
  }, []);
  useMultiRealtimeSubscription(['orders', 'alerts', 'daily_summaries', 'receivables', 'payables'], () => { load(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex gap-2 items-center text-gray-400">
        <Activity className="w-5 h-5 animate-pulse" />
        <span className="text-sm">Đang tải dữ liệu...</span>
      </div>
    </div>
  );

  if (!data) return null;

  const revenueData = data.dailySummaries.map(d => d.cash_in);
  const cashData = data.dailySummaries.map(d => d.cash_in - d.cash_out);
  const orderData = data.dailySummaries.map(d => d.new_orders);

  const statusLabels: Record<string, string> = {
    draft: 'Nháp', confirmed: 'Đã xác nhận', in_production: 'Đang SX',
    qc_check: 'Kiểm QC', ready: 'Sẵn giao', delivered: 'Đã giao',
    cancelled: 'Hủy', refunded: 'Hoàn tiền',
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Tổng quan hoạt động xưởng hôm nay</p>
        </div>
        <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full font-medium">
          {new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())}
        </span>
      </div>

      {/* Alerts strip */}
      {data.topAlerts.length > 0 && (
        <div className="space-y-2">
          {data.topAlerts.slice(0, 3).map(a => (
            <div key={a.id} className={`flex items-start gap-3 px-4 py-3 rounded-xl border-l-4 ${severityColor(a.severity)}`}>
              <Bell className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-600" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{a.title}</p>
                <p className="text-xs text-gray-600 truncate">{a.description}</p>
              </div>
              <Badge className={a.severity === 'critical' ? 'bg-red-100 text-red-700' : a.severity === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'}>
                {a.severity === 'critical' ? 'Khẩn cấp' : a.severity === 'high' ? 'Cao' : 'TB'}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Doanh thu tháng" value={formatCurrency(data.totalRevenue)} sub="30 ngày qua" icon={TrendingUp} iconColor="text-blue-600" trend={12} />
        <StatCard label="Đơn đang xử lý" value={data.activeOrders} sub={`${data.overdueOrders} đơn trễ hạn`} icon={ShoppingCart} iconColor="text-emerald-600" alert={data.overdueOrders > 0} />
        {(perms.can('production') || perms.can('qc') || perms.isSuperAdmin) && (
          <StatCard label="Tỷ lệ QC đạt" value={`${data.qcPassRate}%`} sub="Tháng này" icon={CheckCircle} iconColor="text-green-600" />
        )}
        {(perms.can('finance') || perms.can('finance_view') || perms.isSuperAdmin) && (
          <StatCard label="Công nợ phải thu" value={formatCurrency(data.totalReceivable)} sub={`Phải trả: ${formatCurrency(data.totalPayable)}`} icon={DollarSign} iconColor="text-rose-600" alert={data.totalReceivable > 50000000} />
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 col-span-1 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Dòng tiền 30 ngày</h3>
            <BarChart2 className="w-4 h-4 text-gray-400" />
          </div>
          <MiniChart data={revenueData} color="#2563EB" />
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <span className="text-xs text-gray-500">Tiền vào</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs text-gray-500">Lợi nhuận ròng</span>
            </div>
          </div>
          <MiniChart data={cashData.map(v => Math.max(v, 0))} color="#10b981" />
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Đơn hàng mới/ngày</h3>
            <Users className="w-4 h-4 text-gray-400" />
          </div>
          <MiniChart data={orderData} color="#f59e0b" />
          <div className="mt-3 space-y-2">
            {[
              { label: 'Tổng đơn', value: data.totalOrders, color: 'text-gray-900' },
              { label: 'Đang SX', value: data.activeOrders, color: 'text-blue-700' },
              { label: 'Trễ hạn', value: data.overdueOrders, color: 'text-red-600' },
            ].map(r => (
              <div key={r.label} className="flex justify-between items-center">
                <span className="text-xs text-gray-500">{r.label}</span>
                <span className={`text-sm font-bold ${r.color}`}>{r.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Orders + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Đơn hàng gần đây</h3>
              {(perms.can('sales') || perms.isSuperAdmin) && (
                <button onClick={() => onNav('sales')} className="flex items-center gap-1 text-xs text-blue-600 font-medium hover:underline">
                  Xem tất cả <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="divide-y divide-gray-50">
              {data.recentOrders.map(o => {
                const c = o.customer as unknown as { full_name: string; tier_code: string };
                const overdue = o.deadline && isOverdue(o.deadline) && !['delivered','cancelled','refunded'].includes(o.status);
                return (
                  <div key={o.id} className={`flex items-center gap-3 px-4 py-3 ${overdue ? 'bg-red-50' : 'hover:bg-gray-50'} transition-colors`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900">{o.order_no}</span>
                        {overdue && <Badge className="bg-red-100 text-red-700">Trễ</Badge>}
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{c?.full_name ?? '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-900">{formatCurrency(o.total_amount)}</p>
                      <p className="text-xs text-gray-400">{o.deadline ? formatDate(o.deadline) : '—'}</p>
                    </div>
                    <Badge className={statusColor(o.status)}>{statusLabels[o.status] ?? o.status}</Badge>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Alerts panel */}
        <Card>
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900">Cảnh báo</h3>
              {data.alerts.length > 0 && (
                <span className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {data.alerts.length}
                </span>
              )}
            </div>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="p-3 space-y-2">
            {data.alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle className="w-8 h-8 text-green-400 mb-2" />
                <p className="text-sm text-gray-400">Không có cảnh báo</p>
              </div>
            ) : data.alerts.slice(0, 6).map(a => (
              <div key={a.id} className={`p-3 rounded-lg border-l-4 ${severityColor(a.severity)}`}>
                <p className="text-xs font-semibold text-gray-900 leading-snug">{a.title}</p>
                {a.ref_no && <p className="text-xs text-gray-500 mt-0.5">{a.ref_no}</p>}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Top Products + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top sản phẩm bán chạy */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-gray-900">Top sản phẩm bán chạy</h3>
            </div>
            <span className="text-xs text-gray-400">Theo doanh thu</span>
          </div>
          <div className="divide-y divide-gray-50">
            {data.topProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Package className="w-8 h-8 text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">Chưa có dữ liệu</p>
              </div>
            ) : data.topProducts.map((p, idx) => {
              const rankColors = ['text-amber-500', 'text-gray-400', 'text-orange-400'];
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                  <span className={`text-sm font-bold w-6 text-center ${idx < 3 ? rankColors[idx] : 'text-gray-300'}`}>
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900 truncate">{p.name}</span>
                      <Badge className="bg-gray-100 text-gray-600">{p.code}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{p.type} &middot; {p.total_qty} sản phẩm</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-900">{formatCurrency(p.total_revenue)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Lịch sử hoạt động gần đây */}
        <Card>
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-semibold text-gray-900">Lịch sử hoạt động</h3>
            </div>
            <span className="text-xs text-gray-400">Gần đây</span>
          </div>
          <div className="p-3 space-y-2">
            {data.recentHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Clock className="w-8 h-8 text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">Chưa có hoạt động</p>
              </div>
            ) : data.recentHistory.map(h => {
              const eventTypeLabels: Record<string, string> = {
                status_change: 'Đổi trạng thái',
                created: 'Tạo đơn',
                updated: 'Cập nhật',
                note_added: 'Thêm ghi chú',
                payment: 'Thanh toán',
              };
              const eventTypeColors: Record<string, string> = {
                status_change: 'bg-blue-100 text-blue-700',
                created: 'bg-green-100 text-green-700',
                updated: 'bg-amber-100 text-amber-700',
                note_added: 'bg-violet-100 text-violet-700',
                payment: 'bg-emerald-100 text-emerald-700',
              };
              return (
                <div key={h.id} className="p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-gray-900">{h.order_no}</span>
                    <Badge className={eventTypeColors[h.event_type] ?? 'bg-gray-100 text-gray-600'}>
                      {eventTypeLabels[h.event_type] ?? h.event_type}
                    </Badge>
                  </div>
                  {h.note && <p className="text-xs text-gray-600 leading-snug">{h.note}</p>}
                  <p className="text-xs text-gray-400 mt-1">{formatDatetime(h.created_at)}</p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Dòng thời gian biến động */}
      <Card>
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-violet-500" />
            <h3 className="text-sm font-semibold text-gray-900">Dòng thời gian biến động</h3>
          </div>
          <span className="text-xs text-gray-400">Thay đổi trạng thái gần đây</span>
        </div>
        <div className="px-4 py-4">
          {data.recentHistory.filter(h => h.event_type === 'status_change').length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <GitBranch className="w-8 h-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">Chưa có biến động</p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-200" />
              <div className="space-y-4">
                {data.recentHistory
                  .filter(h => h.event_type === 'status_change')
                  .map(h => {
                    const oldStatus = h.old_value?.status as string | undefined;
                    const newStatus = h.new_value?.status as string | undefined;
                    return (
                      <div key={h.id} className="flex items-start gap-4 relative">
                        <div className="w-6 h-6 rounded-full bg-white border-2 border-violet-300 flex items-center justify-center flex-shrink-0 z-10">
                          <div className="w-2 h-2 rounded-full bg-violet-500" />
                        </div>
                        <div className="flex-1 pb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-gray-900">{h.order_no}</span>
                            {oldStatus && (
                              <Badge className={statusColor(oldStatus)}>{statusLabels[oldStatus] ?? oldStatus}</Badge>
                            )}
                            <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            {newStatus && (
                              <Badge className={statusColor(newStatus)}>{statusLabels[newStatus] ?? newStatus}</Badge>
                            )}
                          </div>
                          {h.note && <p className="text-xs text-gray-500 mt-0.5">{h.note}</p>}
                          <p className="text-xs text-gray-400 mt-0.5">{formatDatetime(h.created_at)}</p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(perms.can('production') || perms.can('qc') || perms.isSuperAdmin) && (
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><CheckCircle className="w-5 h-5 text-green-600" /></div>
              <div>
                <p className="text-xs text-gray-500">QC Đạt (tháng)</p>
                <p className="text-lg font-bold text-green-700">{data.dailySummaries.reduce((s, d) => s + d.qc_pass, 0)}</p>
              </div>
            </div>
          </Card>
        )}
        {(perms.can('production') || perms.can('qc') || perms.isSuperAdmin) && (
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg"><XCircle className="w-5 h-5 text-red-600" /></div>
              <div>
                <p className="text-xs text-gray-500">QC Fail (tháng)</p>
                <p className="text-lg font-bold text-red-700">{data.dailySummaries.reduce((s, d) => s + d.qc_fail, 0)}</p>
              </div>
            </div>
          </Card>
        )}
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><Clock className="w-5 h-5 text-blue-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Task hoàn thành</p>
              <p className="text-lg font-bold text-blue-700">{data.dailySummaries.reduce((s, d) => s + d.tasks_completed, 0)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg"><Package className="w-5 h-5 text-amber-600" /></div>
            <div>
              <p className="text-xs text-gray-500">KH mới (tháng)</p>
              <p className="text-lg font-bold text-amber-700">{data.dailySummaries.reduce((s, d) => s + d.new_customers, 0)}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
