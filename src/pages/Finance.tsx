import { useEffect, useState, useCallback } from 'react';
import { DollarSign, CheckCircle, AlertTriangle, Clock, ArrowDownLeft, ArrowUpRight, Receipt, Save, Trash2, Plus, Search, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { formatCurrency, formatDate, formatDatetime } from '../lib/utils';
import type { MasterUser, FinanceTransaction, Receivable, Payable } from '../types';
import { usePermissions } from '../lib/permissions';
import { useMultiRealtimeSubscription } from '../lib/useRealtime';

type Tab = 'transactions' | 'receivables' | 'payables' | 'expenses' | 'audit';

interface ExpenseRequest {
  id: string; req_no: string; category: string; amount: number; description: string; status: string; created_at: string;
  requested_by?: { full_name: string }; approved_by?: { full_name: string };
}

interface AuditEntry {
  id: string; action: string; table_name: string; record_id: string; old_data: Record<string, unknown> | null; new_data: Record<string, unknown> | null; created_at: string;
  user?: { full_name: string };
}

const txnCategoryLabels: Record<string, string> = {
  deposit: 'Đặt cọc', payment: 'Thanh toán', refund: 'Hoàn tiền', material: 'Vật tư',
  salary: 'Lương', overhead: 'Chi phí cố định', marketing: 'Marketing', maintenance: 'Bảo trì',
  refund_in: 'Nhận hoàn trả', shipping: 'Shipper', commission: 'Hoa hồng',
};
const statusLabels: Record<string, string> = {
  open: 'Mở', paid: 'Đã TT', partial: 'Một phần', overdue: 'Quá hạn',
  pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối', confirmed: 'Xác nhận',
};
const statusColor: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700', paid: 'bg-green-100 text-green-700',
  partial: 'bg-amber-100 text-amber-700', overdue: 'bg-red-100 text-red-700',
  pending: 'bg-gray-100 text-gray-700', approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700', confirmed: 'bg-green-100 text-green-700',
  unpaid: 'bg-red-100 text-red-700',
};
const directionOptions = [
  { value: 'in', label: 'Tiền vào' }, { value: 'out', label: 'Tiền ra' },
];
const defaultPaymentMethods = ['cash', 'bank_transfer', 'momo', 'zalo_pay', 'vnpay'];

function DataDiff({ oldData, newData }: { oldData: Record<string, unknown> | null; newData: Record<string, unknown> | null }) {
  if (!oldData && !newData) return null;
  const allKeys = Array.from(new Set([...Object.keys(oldData ?? {}), ...Object.keys(newData ?? {})]));
  const changedKeys = allKeys.filter(k => {
    const o = oldData?.[k]; const n = newData?.[k];
    return JSON.stringify(o) !== JSON.stringify(n);
  });
  if (changedKeys.length === 0) return <span className="text-xs text-gray-400">Không thay đổi</span>;
  return (
    <div className="space-y-0.5">
      {changedKeys.slice(0, 5).map(k => (
        <div key={k} className="text-xs">
          <span className="font-medium text-gray-700">{k}: </span>
          {oldData?.[k] !== undefined && <span className="text-red-500 line-through">{String(oldData[k])}</span>}
          {oldData?.[k] !== undefined && newData?.[k] !== undefined && ' → '}
          {newData?.[k] !== undefined && <span className="text-green-600">{String(newData[k])}</span>}
        </div>
      ))}
      {changedKeys.length > 5 && <p className="text-xs text-gray-400">+{changedKeys.length - 5} thay đổi khác</p>}
    </div>
  );
}

export default function Finance({ currentUser }: { currentUser: MasterUser }) {
  const perms = usePermissions(currentUser);
  const [tab, setTab] = useState<Tab>('transactions');
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [payables, setPayables] = useState<Payable[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRequest[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [auditFilter, setAuditFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [cashflowWarning, setCashflowWarning] = useState(false);

  // Dynamic dropdown options from DB
  const [paymentMethods, setPaymentMethods] = useState<string[]>(defaultPaymentMethods);

  // Form states
  const [showTxnForm, setShowTxnForm] = useState(false);
  const [showPayableForm, setShowPayableForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);

  const [txnForm, setTxnForm] = useState({ direction: 'in', amount: 0, category: 'payment', description: '', payment_method: 'cash', ref_no: '' });
  const [payableForm, setPayableForm] = useState({ supplier_name: '', amount: 0, category: 'material', due_date: '', notes: '' });
  const [expenseForm, setExpenseForm] = useState({ category: '', amount: 0, description: '' });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const loadData = useCallback(async () => {
    setLoading(true);
    const [txnRes, rcvRes, payRes, expRes, auditRes, catsRes] = await Promise.all([
      supabase.from('finance_transactions').select('*, order:orders(order_no)').order('txn_date', { ascending: false }).limit(40),
      supabase.from('receivables').select('*, customer:customers(full_name,phone), order:orders(order_no)').order('due_date'),
      supabase.from('payables').select('*').order('due_date'),
      supabase.from('expense_requests').select('*, requested_by:master_users!requested_by(full_name), approved_by:master_users!approved_by(full_name)').order('created_at', { ascending: false }),
      supabase.from('audit_trail').select('*, user:master_users(full_name)').order('created_at', { ascending: false }).limit(50),
      supabase.from('master_categories').select('code, type').in('type', ['payment_method', 'finance_category']),
    ]);
    setTransactions(txnRes.data ?? []);
    setReceivables(rcvRes.data ?? []);
    setPayables(payRes.data ?? []);
    setExpenses(expRes.data ?? []);
    setAuditEntries(auditRes.data ?? []);

    // Populate dynamic payment methods from DB, merge with defaults
    const dbPaymentMethods = (catsRes.data ?? []).filter((c: { type: string }) => c.type === 'payment_method').map((c: { code: string }) => c.code);
    const mergedPaymentMethods = Array.from(new Set([...defaultPaymentMethods, ...dbPaymentMethods]));
    setPaymentMethods(mergedPaymentMethods);

    // Cashflow warning: check last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentTxns = (txnRes.data ?? []).filter((t: FinanceTransaction) => new Date(t.txn_date) >= sevenDaysAgo);
    const recentIn = recentTxns.filter((t: FinanceTransaction) => t.direction === 'in').reduce((s: number, t: FinanceTransaction) => s + t.amount, 0);
    const recentOut = recentTxns.filter((t: FinanceTransaction) => t.direction === 'out').reduce((s: number, t: FinanceTransaction) => s + t.amount, 0);
    setCashflowWarning(recentIn - recentOut < 0);

    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useMultiRealtimeSubscription(['finance_transactions', 'receivables', 'payables', 'expense_requests'], loadData, [loadData]);

  const totalIn = transactions.filter(t => t.direction === 'in').reduce((s, t) => s + t.amount, 0);
  const totalOut = transactions.filter(t => t.direction === 'out').reduce((s, t) => s + t.amount, 0);
  const totalRcv = receivables.filter(r => r.status !== 'paid').reduce((s, r) => s + r.balance, 0);
  const totalPay = payables.filter(p => p.status !== 'paid').reduce((s, p) => s + p.balance, 0);
  const overdueRcv = receivables.filter(r => r.status === 'overdue').length;
  const pendingExp = expenses.filter(e => e.status === 'pending').length;

  const filteredAudit = auditFilter
    ? auditEntries.filter(a => a.table_name.toLowerCase().includes(auditFilter.toLowerCase()))
    : auditEntries;

  // TRANSACTION CRUD
  const createTransaction = async () => {
    setSaving(true);
    const count = transactions.length + 1;
    const txnNo = `TXN-2025-${String(count).padStart(3, '0')}`;
    const { error } = await supabase.from('finance_transactions').insert({
      txn_no: txnNo, txn_type: txnForm.direction === 'in' ? 'receipt' : 'expense',
      direction: txnForm.direction, amount: txnForm.amount,
      category: txnForm.category, description: txnForm.description,
      payment_method: txnForm.payment_method, ref_no: txnForm.ref_no,
      status: 'confirmed', txn_date: new Date().toISOString(),
    });
    if (!error) { showToast('Giao dịch ' + txnNo + ' thành công!'); setShowTxnForm(false); loadData(); }
    else showToast('Lỗi: ' + error.message);
    setSaving(false);
  };

  const deleteTransaction = async (id: string) => {
    if (!confirm('Xóa giao dịch này?')) return;
    const { error } = await supabase.from('finance_transactions').delete().eq('id', id);
    if (!error) { showToast('Đã xóa giao dịch'); loadData(); }
    else showToast('Lỗi: ' + error.message);
  };

  // RECEIVABLE: mark as paid
  const markReceivablePaid = async (rcv: Receivable) => {
    const { error } = await supabase.from('receivables').update({ paid_amount: rcv.original_amount, balance: 0, status: 'paid' }).eq('id', rcv.id);
    if (!error) { showToast('Công nợ đã thanh toán'); loadData(); }
    else showToast('Lỗi: ' + error.message);
  };

  // PAYABLE CRUD
  const createPayable = async () => {
    setSaving(true);
    const count = payables.length + 1;
    const refNo = `PAY-${String(count).padStart(3, '0')}`;
    const { error } = await supabase.from('payables').insert({
      ref_no: refNo, supplier_name: payableForm.supplier_name,
      original_amount: payableForm.amount, paid_amount: 0, balance: payableForm.amount,
      due_date: payableForm.due_date || null, status: 'open', category: payableForm.category,
      notes: payableForm.notes,
    });
    if (!error) { showToast('Tạo công nợ phải trả thành công!'); setShowPayableForm(false); loadData(); }
    else showToast('Lỗi: ' + error.message);
    setSaving(false);
  };

  const markPayablePaid = async (pay: Payable) => {
    const { error } = await supabase.from('payables').update({ paid_amount: pay.original_amount, balance: 0, status: 'paid' }).eq('id', pay.id);
    if (!error) { showToast('Đã thanh toán'); loadData(); }
    else showToast('Lỗi: ' + error.message);
  };

  // EXPENSE REQUEST CRUD
  const createExpenseRequest = async () => {
    setSaving(true);
    const count = expenses.length + 1;
    const reqNo = `EXP-${String(count).padStart(3, '0')}`;
    const { error } = await supabase.from('expense_requests').insert({
      req_no: reqNo, category: expenseForm.category, amount: expenseForm.amount,
      description: expenseForm.description, status: 'pending',
    });
    if (!error) { showToast('Tạo phiếu chi ' + reqNo + ' thành công!'); setShowExpenseForm(false); loadData(); }
    else showToast('Lỗi: ' + error.message);
    setSaving(false);
  };

  const approveExpense = async (exp: ExpenseRequest) => {
    const { error } = await supabase.from('expense_requests').update({ status: 'approved' }).eq('id', exp.id);
    if (!error) { showToast('Phiếu chi ' + exp.req_no + ' đã duyệt'); loadData(); }
    else showToast('Lỗi: ' + error.message);
  };

  const rejectExpense = async (exp: ExpenseRequest) => {
    const { error } = await supabase.from('expense_requests').update({ status: 'rejected' }).eq('id', exp.id);
    if (!error) { showToast('Phiếu chi ' + exp.req_no + ' đã từ chối'); loadData(); }
    else showToast('Lỗi: ' + error.message);
  };

  const allTabs: { id: Tab; label: string; count: number; visible: boolean }[] = [
    { id: 'transactions', label: 'Giao dịch', count: transactions.length, visible: !!(perms.can('finance') || perms.can('finance_view') || perms.isSuperAdmin) },
    { id: 'receivables', label: 'Phải thu', count: receivables.length, visible: !!(perms.can('finance') || perms.can('finance_view') || perms.isSuperAdmin) },
    { id: 'payables', label: 'Phải trả', count: payables.length, visible: !!(perms.can('finance') || perms.can('finance_view') || perms.isSuperAdmin) },
    { id: 'expenses', label: 'Phiếu chi', count: expenses.length, visible: !!(perms.can('finance') || perms.can('approve') || perms.can('audit') || perms.isSuperAdmin) },
    { id: 'audit', label: 'Audit', count: auditEntries.length, visible: !!(perms.can('audit') || perms.can('approve') || perms.isSuperAdmin) },
  ];
  const tabs = allTabs.filter(t => t.visible);

  const inputCls = 'w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white';
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';
  const btnPrimary = 'flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50';

  return (
    <div className="space-y-4">
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium">{toast}</div>}

      <div><h1 className="text-xl font-bold text-gray-900">Tài chính</h1><p className="text-sm text-gray-500">Thu, chi, công nợ, dòng tiền</p></div>

      {/* Cashflow warning */}
      {cashflowWarning && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div><p className="text-sm font-semibold text-red-800">Cảnh báo: Dòng tiền âm 7 ngày qua</p>
            <p className="text-xs text-red-600 mt-0.5">Tổng tiền ra vượt tiền vào trong 7 ngày gần nhất</p>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4"><div className="flex items-center gap-2 mb-1"><ArrowDownLeft className="w-4 h-4 text-green-600" /><span className="text-xs text-gray-500">Tiền vào</span></div><p className="text-lg font-bold text-green-700">{formatCurrency(totalIn)}</p></Card>
        <Card className="p-4"><div className="flex items-center gap-2 mb-1"><ArrowUpRight className="w-4 h-4 text-red-500" /><span className="text-xs text-gray-500">Tiền ra</span></div><p className="text-lg font-bold text-red-600">{formatCurrency(totalOut)}</p></Card>
        <Card className={`p-4 ${overdueRcv > 0 ? 'border-red-200 bg-red-50' : ''}`}>
          <div className="flex items-center gap-2 mb-1"><DollarSign className="w-4 h-4 text-blue-600" /><span className="text-xs text-gray-500">Phải thu</span>{overdueRcv > 0 && <Badge className="bg-red-100 text-red-700">{overdueRcv} quá hạn</Badge>}</div>
          <p className={`text-lg font-bold ${overdueRcv > 0 ? 'text-red-700' : 'text-blue-700'}`}>{formatCurrency(totalRcv)}</p>
        </Card>
        <Card className={`p-4 ${pendingExp > 0 ? 'border-amber-200 bg-amber-50' : ''}`}>
          <div className="flex items-center gap-2 mb-1"><DollarSign className="w-4 h-4 text-amber-600" /><span className="text-xs text-gray-500">Phải trả</span>{pendingExp > 0 && <Badge className="bg-amber-100 text-amber-700">{pendingExp} chờ duyệt</Badge>}</div>
          <p className="text-lg font-bold text-amber-700">{formatCurrency(totalPay)}</p>
        </Card>
      </div>

      {/* Tabs + action buttons */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl flex-1 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex-shrink-0 flex items-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${tab === t.id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              {t.label}<span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${tab === t.id ? 'bg-rose-100 text-rose-700' : 'bg-gray-200 text-gray-500'}`}>{t.count}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {tab === 'transactions' && perms.canWrite('transactions') && <button onClick={() => { setTxnForm({ direction: 'in', amount: 0, category: 'payment', description: '', payment_method: 'cash', ref_no: '' }); setShowTxnForm(true); }} className={btnPrimary}><Plus className="w-4 h-4" /> Ghi</button>}
          {tab === 'payables' && perms.canWrite('payables') && <button onClick={() => { setPayableForm({ supplier_name: '', amount: 0, category: 'material', due_date: '', notes: '' }); setShowPayableForm(true); }} className={btnPrimary}><Plus className="w-4 h-4" /> Thêm</button>}
          {tab === 'expenses' && perms.canWrite('expenses') && <button onClick={() => { setExpenseForm({ category: '', amount: 0, description: '' }); setShowExpenseForm(true); }} className={btnPrimary}><Plus className="w-4 h-4" /> Tạo phiếu</button>}
        </div>
      </div>

      {loading ? <div className="flex justify-center py-12 text-gray-400 text-sm">Đang tải...</div> : (
        <>
          {/* TRANSACTIONS */}
          {tab === 'transactions' && (perms.can('finance') || perms.can('finance_view') || perms.isSuperAdmin) && <div className="space-y-2">{transactions.length === 0 ? <EmptyState icon={Receipt} title="Chưa có giao dịch" /> : transactions.map(txn => {
            const isIn = txn.direction === 'in';
            const order = txn.order as unknown as { order_no: string };
            return (
              <Card key={txn.id} className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${isIn ? 'bg-green-100' : 'bg-red-100'}`}>
                    {isIn ? <ArrowDownLeft className="w-4 h-4 text-green-600" /> : <ArrowUpRight className="w-4 h-4 text-red-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{txn.description || txn.txn_no}</p>
                      <Badge className="bg-gray-100 text-gray-600 text-xs">{txnCategoryLabels[txn.category] ?? txn.category}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">{txn.txn_no}</span>
                      {order?.order_no && <span className="text-xs text-blue-600">{order.order_no}</span>}
                      <span className="text-xs text-gray-400">{txn.payment_method}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-bold ${isIn ? 'text-green-700' : 'text-red-600'}`}>{isIn ? '+' : '-'}{formatCurrency(txn.amount)}</p>
                    <p className="text-xs text-gray-400">{formatDate(txn.txn_date)}</p>
                    {perms.canDelete('transactions') && <button onClick={() => deleteTransaction(txn.id)} className="text-xs text-red-400 hover:text-red-600 mt-0.5"><Trash2 className="w-3 h-3 inline" /> Xóa</button>}
                  </div>
                </div>
              </Card>
            );
          })}</div>}

          {/* RECEIVABLES */}
          {tab === 'receivables' && (perms.can('finance') || perms.can('finance_view') || perms.isSuperAdmin) && <div className="space-y-2">{receivables.length === 0 ? <EmptyState icon={DollarSign} title="Không có công nợ phải thu" /> : receivables.map(rcv => {
            const customer = rcv.customer as unknown as { full_name: string; phone: string };
            const order = rcv.order as unknown as { order_no: string };
            return (
              <Card key={rcv.id} className={`p-4 ${rcv.status === 'overdue' ? 'border-red-300 bg-red-50' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${rcv.status === 'overdue' ? 'bg-red-100' : 'bg-blue-100'}`}>
                    {rcv.status === 'overdue' ? <AlertTriangle className="w-4 h-4 text-red-600" /> : <Clock className="w-4 h-4 text-blue-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{customer?.full_name ?? '—'}</p>
                      <Badge className={statusColor[rcv.status] ?? 'bg-gray-100 text-gray-600'}>{statusLabels[rcv.status] ?? rcv.status}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{order?.order_no ?? rcv.ref_no} • Hạn: <span className={rcv.status === 'overdue' ? 'text-red-600 font-semibold' : ''}>{formatDate(rcv.due_date)}</span></p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-bold ${rcv.status === 'overdue' ? 'text-red-700' : 'text-blue-700'}`}>{formatCurrency(rcv.balance)}</p>
                    <p className="text-xs text-gray-400">/{formatCurrency(rcv.original_amount)}</p>
                    {rcv.status !== 'paid' && perms.canWrite('receivables') && <button onClick={() => markReceivablePaid(rcv)} className="text-xs bg-green-600 text-white px-2 py-1 rounded-lg font-semibold mt-1 hover:bg-green-700 active:scale-95">Đã TT</button>}
                  </div>
                </div>
              </Card>
            );
          })}</div>}

          {/* PAYABLES */}
          {tab === 'payables' && (perms.can('finance') || perms.can('finance_view') || perms.isSuperAdmin) && <div className="space-y-2">{payables.length === 0 ? <EmptyState icon={DollarSign} title="Không có công nợ phải trả" /> : payables.map(pay => (
            <Card key={pay.id} className={`p-4 ${pay.status === 'overdue' ? 'border-red-300 bg-red-50' : ''}`}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg flex-shrink-0 ${pay.status === 'paid' ? 'bg-green-100' : pay.status === 'overdue' ? 'bg-red-100' : 'bg-amber-100'}`}>
                  {pay.status === 'paid' ? <CheckCircle className="w-4 h-4 text-green-600" /> : pay.status === 'overdue' ? <AlertTriangle className="w-4 h-4 text-red-600" /> : <Clock className="w-4 h-4 text-amber-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">{pay.supplier_name}</p>
                    <Badge className={statusColor[pay.status] ?? 'bg-gray-100 text-gray-600'}>{statusLabels[pay.status] ?? pay.status}</Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{pay.ref_no} • {pay.category} • Hạn: {formatDate(pay.due_date)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-amber-700">{formatCurrency(pay.balance)}</p>
                  {pay.status !== 'paid' && perms.canWrite('payables') && <button onClick={() => markPayablePaid(pay)} className="text-xs bg-green-600 text-white px-2 py-1 rounded-lg font-semibold mt-1 hover:bg-green-700 active:scale-95">Đã TT</button>}
                </div>
              </div>
            </Card>
          ))}</div>}

          {/* EXPENSES */}
          {tab === 'expenses' && (perms.can('finance') || perms.can('approve') || perms.can('audit') || perms.isSuperAdmin) && <div className="space-y-2">{expenses.length === 0 ? <EmptyState icon={DollarSign} title="Chưa có phiếu chi" /> : expenses.map(exp => {
            const requester = exp.requested_by as unknown as { full_name: string };
            const approver = exp.approved_by as unknown as { full_name: string };
            return (
              <Card key={exp.id} className={`p-4 ${exp.status === 'pending' ? 'border-amber-300' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${exp.status === 'pending' ? 'bg-amber-100' : exp.status === 'approved' ? 'bg-green-100' : 'bg-red-100'}`}>
                    {exp.status === 'pending' ? <Clock className="w-4 h-4 text-amber-600" /> : exp.status === 'approved' ? <CheckCircle className="w-4 h-4 text-green-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{exp.description}</p>
                      <Badge className={statusColor[exp.status] ?? 'bg-gray-100 text-gray-600'}>{statusLabels[exp.status] ?? exp.status}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{exp.req_no} • {exp.category} • Bởi: {requester?.full_name ?? '—'}</p>
                    {approver?.full_name && <p className="text-xs text-green-600 mt-0.5">Duyệt: {approver.full_name}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(exp.amount)}</p>
                    {exp.status === 'pending' && (
                      <div className="flex gap-1 mt-1 justify-end">
                        {perms.canWrite('expense_approve') && <button onClick={() => approveExpense(exp)} className="text-xs bg-green-600 text-white px-2 py-1 rounded-lg font-semibold hover:bg-green-700 active:scale-95">Duyệt</button>}
                        {perms.canWrite('expense_approve') && <button onClick={() => rejectExpense(exp)} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-lg font-semibold hover:bg-red-200 active:scale-95">Từ chối</button>}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}</div>}

          {/* AUDIT TRAIL */}
          {tab === 'audit' && (perms.can('audit') || perms.can('approve') || perms.isSuperAdmin) && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input className={inputCls + ' pl-9'} value={auditFilter} onChange={e => setAuditFilter(e.target.value)} placeholder="Lọc theo table_name..." />
                </div>
              </div>
              {filteredAudit.length === 0 ? <EmptyState icon={Shield} title="Chưa có audit entry" /> : filteredAudit.map(entry => {
                const user = entry.user as unknown as { full_name: string };
                const actionColor: Record<string, string> = {
                  INSERT: 'bg-green-100 text-green-700', UPDATE: 'bg-blue-100 text-blue-700', DELETE: 'bg-red-100 text-red-700',
                };
                return (
                  <Card key={entry.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg flex-shrink-0 ${actionColor[entry.action] ?? 'bg-gray-100 text-gray-700'}`}>
                        <Shield className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={actionColor[entry.action] ?? 'bg-gray-100 text-gray-600'}>{entry.action}</Badge>
                          <span className="text-sm font-semibold text-gray-900">{entry.table_name}</span>
                          <span className="text-xs text-gray-400">ID: {entry.record_id?.slice(0, 8)}...</span>
                        </div>
                        <div className="mt-1.5">
                          <DataDiff oldData={entry.old_data} newData={entry.new_data} />
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-gray-500">Bởi: {user?.full_name ?? '—'}</span>
                          <span className="text-xs text-gray-400">• {formatDatetime(entry.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ===== TRANSACTION FORM ===== */}
      <Modal open={showTxnForm} onClose={() => setShowTxnForm(false)} title="Ghi giao dịch" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Hướng *</label>
              <select className={inputCls} value={txnForm.direction} onChange={e => setTxnForm(f => ({ ...f, direction: e.target.value }))}>
                {directionOptions.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Số tiền (VND) *</label>
              <input type="number" className={inputCls} value={txnForm.amount || ''} onChange={e => setTxnForm(f => ({ ...f, amount: Number(e.target.value) }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Danh mục</label>
              <select className={inputCls} value={txnForm.category} onChange={e => setTxnForm(f => ({ ...f, category: e.target.value }))}>
                {Object.entries(txnCategoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Phương thức</label>
              <select className={inputCls} value={txnForm.payment_method} onChange={e => setTxnForm(f => ({ ...f, payment_method: e.target.value }))}>
                {paymentMethods.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>
          <div><label className={labelCls}>Mô tả</label><input className={inputCls} value={txnForm.description} onChange={e => setTxnForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div><label className={labelCls}>Số tham chiếu</label><input className={inputCls} value={txnForm.ref_no} onChange={e => setTxnForm(f => ({ ...f, ref_no: e.target.value }))} placeholder="Mã đơn hàng, số hóa đơn..." /></div>
          <div className="flex gap-2 pt-2">
            <button onClick={createTransaction} disabled={saving || !txnForm.amount} className={btnPrimary + ' flex-1'}><Save className="w-4 h-4" />{saving ? 'Đang lưu...' : 'Ghi giao dịch'}</button>
            <button onClick={() => setShowTxnForm(false)} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50">Hủy</button>
          </div>
        </div>
      </Modal>

      {/* ===== PAYABLE FORM ===== */}
      <Modal open={showPayableForm} onClose={() => setShowPayableForm(false)} title="Thêm công nợ phải trả" size="md">
        <div className="space-y-4">
          <div><label className={labelCls}>Nhà cung cấp *</label><input className={inputCls} value={payableForm.supplier_name} onChange={e => setPayableForm(f => ({ ...f, supplier_name: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Số tiền (VND) *</label><input type="number" className={inputCls} value={payableForm.amount || ''} onChange={e => setPayableForm(f => ({ ...f, amount: Number(e.target.value) }))} /></div>
            <div><label className={labelCls}>Danh mục</label>
              <select className={inputCls} value={payableForm.category} onChange={e => setPayableForm(f => ({ ...f, category: e.target.value }))}>
                <option value="material">Vật tư</option><option value="outsource">Gia công</option><option value="maintenance">Bảo trì</option><option value="rent">Thuê</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Hạn thanh toán</label><input type="date" className={inputCls} value={payableForm.due_date} onChange={e => setPayableForm(f => ({ ...f, due_date: e.target.value }))} /></div>
            <div><label className={labelCls}>Ghi chú</label><input className={inputCls} value={payableForm.notes} onChange={e => setPayableForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={createPayable} disabled={saving || !payableForm.supplier_name || !payableForm.amount} className={btnPrimary + ' flex-1'}><Save className="w-4 h-4" />{saving ? 'Đang lưu...' : 'Tạo công nợ'}</button>
            <button onClick={() => setShowPayableForm(false)} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50">Hủy</button>
          </div>
        </div>
      </Modal>

      {/* ===== EXPENSE REQUEST FORM ===== */}
      <Modal open={showExpenseForm} onClose={() => setShowExpenseForm(false)} title="Tạo phiếu chi" size="md">
        <div className="space-y-4">
          <div><label className={labelCls}>Mô tả *</label><input className={inputCls} value={expenseForm.description} onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))} placeholder="Mua thêm cọ vẽ cao cấp..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Số tiền (VND) *</label><input type="number" className={inputCls} value={expenseForm.amount || ''} onChange={e => setExpenseForm(f => ({ ...f, amount: Number(e.target.value) }))} /></div>
            <div><label className={labelCls}>Danh mục</label>
              <select className={inputCls} value={expenseForm.category} onChange={e => setExpenseForm(f => ({ ...f, category: e.target.value }))}>
                <option value="material">Vật tư</option><option value="equipment">Thiết bị</option><option value="overhead">Chi phí cố định</option><option value="marketing">Marketing</option><option value="maintenance">Bảo trì</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={createExpenseRequest} disabled={saving || !expenseForm.description || !expenseForm.amount} className={btnPrimary + ' flex-1'}><Save className="w-4 h-4" />{saving ? 'Đang lưu...' : 'Tạo phiếu chi'}</button>
            <button onClick={() => setShowExpenseForm(false)} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50">Hủy</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
