import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, ChevronRight, Phone, Building2, UserPlus, Trash2, Save, Package, AlertTriangle, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import { formatCurrency, formatDate, statusColor, tierColor } from '../lib/utils';
import type { Customer, Order, Lead, Product, MasterUser } from '../types';
import { usePermissions } from '../lib/permissions';
import { useMultiRealtimeSubscription } from '../lib/useRealtime';

type Tab = 'orders' | 'customers' | 'leads' | 'quotations' | 'complaints';

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  qty: number;
  unit_price: number;
  line_total: number;
  created_at: string;
}

interface Complaint {
  id: string;
  complaint_no: string;
  order_id: string;
  type: string;
  status: string;
  description: string;
  resolution: string;
  refund_amount: number;
  created_at: string;
  order?: { order_no: string };
  customer?: { full_name: string };
}

const statusLabels: Record<string, string> = {
  draft: 'Nháp', confirmed: 'Xác nhận', in_production: 'Đang SX',
  qc_check: 'KT QC', ready: 'Sẵn giao', delivered: 'Đã giao',
  cancelled: 'Hủy', refunded: 'Hoàn tiền',
};
const leadStatusLabels: Record<string, string> = {
  new: 'Mới', contacted: 'Đã LH', qualified: 'Tiềm năng',
  proposal_sent: 'Gửi BG', negotiating: 'Đang TL', won: 'Chốt', lost: 'Mất',
};
const complaintStatusLabels: Record<string, string> = {
  open: 'Mở', investigating: 'Đang điều tra', resolved: 'Đã giải quyết',
};
const complaintTypeLabels: Record<string, string> = {
  quality: 'Chất lượng', delay: 'Giao chậm', other: 'Khác',
};
const complaintTypeOptions = ['quality', 'delay', 'other'];
interface Quotation {
  id: string;
  quote_no: string;
  customer_id: string;
  order_id: string;
  status: string;
  valid_until: string;
  items: Array<{ product_name: string; qty: number; unit_price: number; line_total: number }>;
  subtotal: number;
  total: number;
  notes: string;
  created_at: string;
  customer?: { full_name: string };
  order?: { order_no: string };
}

const quoteStatusLabels: Record<string, string> = {
  draft: 'Nhap', sent: 'Da gui', accepted: 'Chap nhan', rejected: 'Tu choi', expired: 'Het han', cancelled: 'Huy',
};
const quoteStatusFlow: Record<string, string[]> = {
  draft: ['sent', 'cancelled'],
  sent: ['accepted', 'rejected', 'expired'],
  accepted: [],
  rejected: [],
  expired: [],
  cancelled: [],
};

const complaintStatusFlow: Record<string, string[]> = {
  open: ['investigating', 'resolved'],
  investigating: ['resolved'],
  resolved: [],
};
const defaultSourceOptions = ['direct', 'facebook', 'instagram', 'tiktok', 'referral', 'walk-in', 'zalo'];
const defaultSegmentOptions = ['individual', 'corporate'];
const defaultTierOptions = ['bronze', 'silver', 'gold', 'vip'];
const priorityOptions = ['normal', 'high', 'urgent'];
const deliveryOptions = ['pickup', 'delivery'];
const orderStatusFlow: Record<string, string[]> = {
  draft: ['confirmed', 'cancelled'],
  confirmed: ['in_production', 'cancelled'],
  in_production: ['qc_check', 'cancelled'],
  qc_check: ['ready', 'in_production'],
  ready: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

export default function Sales({ currentUser }: { currentUser: MasterUser }) {
  const perms = usePermissions(currentUser);
  const [tab, setTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal states
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showCustForm, setShowCustForm] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showComplaintForm, setShowComplaintForm] = useState(false);
  const [showQuotationForm, setShowQuotationForm] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Dynamic dropdown options from DB
  const [sourceOptions, setSourceOptions] = useState<string[]>(defaultSourceOptions);
  const [segmentOptions, setSegmentOptions] = useState<string[]>(defaultSegmentOptions);
  const [tierOptions, setTierOptions] = useState<string[]>(defaultTierOptions);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const loadData = useCallback(async () => {
    setLoading(true);
    const [ordersRes, custRes, leadsRes, complaintsRes, quotationsRes, tiersRes, catsRes] = await Promise.all([
      supabase.from('orders').select('*, customer:customers(full_name,phone,tier_code,company)').order('created_at', { ascending: false }),
      supabase.from('customers').select('*').order('total_spent', { ascending: false }),
      supabase.from('leads').select('*').order('created_at', { ascending: false }),
      supabase.from('complaints').select('*, order:orders(order_no), customer:customers(full_name)').order('created_at', { ascending: false }),
      supabase.from('quotations').select('*, customer:customers(full_name), order:orders(order_no)').order('created_at', { ascending: false }),
      supabase.from('master_tiers').select('code, type').eq('type', 'customer'),
      supabase.from('master_categories').select('code, type').in('type', ['source', 'segment']),
    ]);
    setOrders(ordersRes.data ?? []);
    setCustomers(custRes.data ?? []);
    setLeads(leadsRes.data ?? []);
    setComplaints(complaintsRes.data ?? []);
    setQuotations(quotationsRes.data ?? []);

    // Populate dynamic dropdowns from DB, merge with defaults
    const dbTiers = (tiersRes.data ?? []).map((t: { code: string }) => t.code);
    setTierOptions(dbTiers.length > 0 ? dbTiers : defaultTierOptions);

    const dbSources = (catsRes.data ?? []).filter((c: { type: string }) => c.type === 'source').map((c: { code: string }) => c.code);
    const mergedSources = Array.from(new Set([...defaultSourceOptions, ...dbSources]));
    setSourceOptions(mergedSources);

    const dbSegments = (catsRes.data ?? []).filter((c: { type: string }) => c.type === 'segment').map((c: { code: string }) => c.code);
    const mergedSegments = Array.from(new Set([...defaultSegmentOptions, ...dbSegments]));
    setSegmentOptions(mergedSegments);

    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useMultiRealtimeSubscription(['orders', 'customers', 'leads', 'complaints', 'quotations', 'order_items'], loadData, [loadData]);

  const filteredOrders = orders.filter(o => {
    const c = o.customer as unknown as { full_name: string };
    const ms = o.order_no.toLowerCase().includes(search.toLowerCase()) || (c?.full_name?.toLowerCase().includes(search.toLowerCase()) ?? false);
    return ms && (statusFilter === 'all' || o.status === statusFilter);
  });
  const filteredCustomers = customers.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search) || c.company.toLowerCase().includes(search.toLowerCase())
  );
  const filteredLeads = leads.filter(l => l.full_name.toLowerCase().includes(search.toLowerCase()) || l.phone.includes(search));

  // ORDER CRUD
  const [orderForm, setOrderForm] = useState({
    customer_id: '', source: 'direct', priority: 'normal', total_amount: 0, deposit_amount: 0,
    deadline: '', delivery_method: 'pickup', special_instructions: '', internal_notes: '',
  });

  const createOrder = async () => {
    setSaving(true);
    const count = orders.length + 1;
    const orderNo = `ORD-2025-${String(count).padStart(3, '0')}`;
    const deposit = orderForm.deposit_amount || Math.round(orderForm.total_amount * 0.5);
    const { error } = await supabase.from('orders').insert({
      order_no: orderNo,
      customer_id: orderForm.customer_id || null,
      source: orderForm.source,
      priority: orderForm.priority,
      total_amount: orderForm.total_amount,
      deposit_amount: deposit,
      paid_amount: deposit,
      balance_due: orderForm.total_amount - deposit,
      deadline: orderForm.deadline || null,
      delivery_method: orderForm.delivery_method,
      special_instructions: orderForm.special_instructions,
      internal_notes: orderForm.internal_notes,
      status: 'draft',
      payment_status: deposit > 0 ? 'partial' : 'unpaid',
      cogs_estimate: Math.round(orderForm.total_amount * 0.35),
      margin_estimate: Math.round(orderForm.total_amount * 0.65),
    });
    if (error) { showToast('Lỗi: ' + error.message); }
    else { showToast('Tạo đơn ' + orderNo + ' thành công!'); setShowOrderForm(false); loadData(); }
    setSaving(false);
  };

  const updateOrderStatus = async (order: Order, newStatus: string) => {
    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'delivered') updates.completed_date = new Date().toISOString();
    if (newStatus === 'cancelled') { updates.balance_due = 0; updates.payment_status = 'cancelled'; }
    const { error } = await supabase.from('orders').update(updates).eq('id', order.id);
    if (!error) {
      await supabase.from('order_history').insert({
        order_id: order.id, event_type: 'status_change',
        old_value: { status: order.status }, new_value: { status: newStatus },
        note: `${statusLabels[order.status]} → ${statusLabels[newStatus]}`,
      });
      showToast(`${order.order_no}: ${statusLabels[newStatus]}`);
      setSelectedOrder(null); loadData();

      // Automation: auto-create production job when order is confirmed
      if (newStatus === 'confirmed') {
        (async () => {
          try {
            // Find matching workflow template by product type, or first active template as fallback
            const { data: orderItems } = await supabase.from('order_items').select('product_id').eq('order_id', order.id).limit(1);
            const productId = orderItems?.[0]?.product_id;
            let templateId: string | null = null;
            if (productId) {
              const { data: product } = await supabase.from('products').select('product_type').eq('id', productId).single();
              if (product?.product_type) {
                const { data: matched } = await supabase.from('workflow_templates').select('id').eq('product_type', product.product_type).eq('is_active', true).limit(1);
                if (matched && matched.length > 0) templateId = matched[0].id;
              }
            }
            if (!templateId) {
              const { data: fallback } = await supabase.from('workflow_templates').select('id').eq('is_active', true).order('created_at').limit(1);
              if (fallback && fallback.length > 0) templateId = fallback[0].id;
            }

            const jobNo = `JOB-${order.order_no.replace('ORD-2025-', '')}`;
            const { data: jobData, error: jobError } = await supabase.from('production_jobs').insert({
              job_no: jobNo,
              order_id: order.id,
              template_id: templateId,
              status: 'queued',
              priority: order.priority,
              deadline: order.deadline || null,
              estimated_hours: 0,
              actual_hours: 0,
              rework_count: 0,
              waste_cost: 0,
            }).select('id').single();

            if (jobError) { console.error('Auto-create job error:', jobError.message); return; }

            // Fetch workflow stages and create production tasks
            if (templateId) {
              const { data: stages } = await supabase.from('workflow_stages').select('id, stage_name, stage_code, sort_order, sop_code').eq('workflow_template_id', templateId).order('sort_order');
              if (stages && stages.length > 0) {
                const taskInserts = stages.map((s: { id: string; stage_name: string; stage_code: string; sort_order: number; sop_code: string | null }) => ({
                  job_id: jobData.id,
                  stage_name: s.stage_name,
                  stage_code: s.stage_code,
                  sort_order: s.sort_order,
                  status: 'pending',
                  sop_code: s.sop_code || null,
                  rework_count: 0,
                }));
                await supabase.from('production_tasks').insert(taskInserts);
              }
            }

            // Log to order_history
            await supabase.from('order_history').insert({
              order_id: order.id,
              event_type: 'automation',
              note: `Auto-created production job ${jobNo}`,
            });

            showToast(`Tự động tạo lệnh sản xuất ${jobNo}`);
          } catch (err) {
            console.error('Automation error (auto-create job):', err);
          }
        })();
      }
    } else { showToast('Lỗi: ' + error.message); }
  };

  const deleteOrder = async (id: string) => {
    if (!confirm('Xóa đơn hàng này?')) return;
    await supabase.from('order_items').delete().eq('order_id', id);
    await supabase.from('order_history').delete().eq('order_id', id);
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (!error) { showToast('Đã xóa đơn hàng'); setSelectedOrder(null); loadData(); }
    else showToast('Lỗi: ' + error.message);
  };

  // CUSTOMER CRUD
  const [custForm, setCustForm] = useState({
    full_name: '', phone: '', email: '', company: '', address: '', city: '',
    tier_code: 'bronze', segment: 'individual', source: 'walk-in', notes: '',
    persona: '', pain_points: '',
  });

  const openNewCust = () => {
    setCustForm({ full_name: '', phone: '', email: '', company: '', address: '', city: '', tier_code: 'bronze', segment: 'individual', source: 'walk-in', notes: '', persona: '', pain_points: '' });
    setShowCustForm(true);
  };

  const openEditCust = (c: Customer) => {
    setCustForm({
      full_name: c.full_name, phone: c.phone, email: c.email || '', company: c.company || '',
      address: c.address || '', city: c.city || '', tier_code: c.tier_code,
      segment: c.segment, source: c.source, notes: c.notes || '',
      persona: c.persona || '', pain_points: (c.pain_points ?? []).join(', '),
    });
    setSelectedCust(c);
    setShowCustForm(true);
  };

  const saveCust = async () => {
    setSaving(true);
    const painPointsArr = custForm.pain_points ? custForm.pain_points.split(',').map(p => p.trim()).filter(Boolean) : [];
    if (selectedCust) {
      const { error } = await supabase.from('customers').update({
        full_name: custForm.full_name, phone: custForm.phone, email: custForm.email,
        company: custForm.company, address: custForm.address, city: custForm.city,
        tier_code: custForm.tier_code, segment: custForm.segment, source: custForm.source, notes: custForm.notes,
        persona: custForm.persona, pain_points: painPointsArr,
      }).eq('id', selectedCust.id);
      if (!error) { showToast('Cập nhật khách hàng thành công'); setShowCustForm(false); setSelectedCust(null); loadData(); }
      else showToast('Lỗi: ' + error.message);
    } else {
      const count = customers.length + 1;
      const code = `CUS-${String(count).padStart(3, '0')}`;
      const { error } = await supabase.from('customers').insert({
        code, full_name: custForm.full_name, phone: custForm.phone, email: custForm.email,
        company: custForm.company, address: custForm.address, city: custForm.city,
        tier_code: custForm.tier_code, segment: custForm.segment, source: custForm.source, notes: custForm.notes,
        persona: custForm.persona, pain_points: painPointsArr,
        is_active: true,
      });
      if (!error) { showToast('Tạo khách hàng ' + code + ' thành công!'); setShowCustForm(false); loadData(); }
      else showToast('Lỗi: ' + error.message);
    }
    setSaving(false);
  };

  const deleteCust = async (id: string) => {
    if (!confirm('Xóa khách hàng này?')) return;
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (!error) { showToast('Đã xóa khách hàng'); setSelectedCust(null); setShowCustForm(false); loadData(); }
    else showToast('Lỗi: ' + error.message);
  };

  // LEAD CRUD
  const [leadForm, setLeadForm] = useState({
    full_name: '', phone: '', email: '', source: 'facebook', product_interest: '', budget_estimate: 0, notes: '',
  });

  const createLead = async () => {
    setSaving(true);
    const count = leads.length + 1;
    const code = `LEAD-${String(count).padStart(3, '0')}`;
    const { error } = await supabase.from('leads').insert({ code, ...leadForm, status: 'new' });
    if (!error) { showToast('Tạo lead ' + code + ' thành công!'); setShowLeadForm(false); loadData(); }
    else showToast('Lỗi: ' + error.message);
    setSaving(false);
  };

  const updateLeadStatus = async (lead: Lead, newStatus: string) => {
    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'won') updates.converted_at = new Date().toISOString();
    const { error } = await supabase.from('leads').update(updates).eq('id', lead.id);
    if (!error) { showToast(`Lead ${lead.full_name}: ${leadStatusLabels[newStatus]}`); loadData(); }
    else showToast('Lỗi: ' + error.message);
  };

  const deleteLead = async (id: string) => {
    if (!confirm('Xóa lead này?')) return;
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (!error) { showToast('Đã xóa lead'); loadData(); }
    else showToast('Lỗi: ' + error.message);
  };

  // COMPLAINTS CRUD
  const [complaintForm, setComplaintForm] = useState({
    order_id: '', type: 'quality', description: '',
  });

  const createComplaint = async () => {
    setSaving(true);
    const count = complaints.length + 1;
    const complaintNo = `CMP-2025-${String(count).padStart(3, '0')}`;
    const order = orders.find(o => o.id === complaintForm.order_id);
    const { error } = await supabase.from('complaints').insert({
      complaint_no: complaintNo,
      order_id: complaintForm.order_id || null,
      customer_id: order?.customer_id || null,
      type: complaintForm.type,
      description: complaintForm.description,
      status: 'open',
      resolution: '',
      refund_amount: 0,
    });
    if (error) { showToast('Lỗi: ' + error.message); }
    else { showToast('Tạo khiếu nại ' + complaintNo + ' thành công!'); setShowComplaintForm(false); loadData(); }
    setSaving(false);
  };

  const updateComplaintStatus = async (complaint: Complaint, newStatus: string) => {
    const { error } = await supabase.from('complaints').update({ status: newStatus }).eq('id', complaint.id);
    if (!error) { showToast(`${complaint.complaint_no}: ${complaintStatusLabels[newStatus]}`); loadData(); }
    else showToast('Lỗi: ' + error.message);
  };

  const updateComplaintResolution = async (complaint: Complaint, resolution: string, refundAmount: number) => {
    const { error } = await supabase.from('complaints').update({ resolution, refund_amount: refundAmount }).eq('id', complaint.id);
    if (!error) { showToast('Cập nhật giải quyết thành công'); loadData(); }
    else showToast('Lỗi: ' + error.message);
  };

  // QUOTATIONS CRUD
  const [quotationForm, setQuotationForm] = useState({
    customer_id: '',
    valid_until: '',
    items: [{ product_name: '', qty: 1, unit_price: 0, line_total: 0 }] as Array<{ product_name: string; qty: number; unit_price: number; line_total: number }>,
    notes: '',
  });

  const quotationSubtotal = quotationForm.items.reduce((sum, i) => sum + i.line_total, 0);

  const addQuotationItem = () => {
    setQuotationForm(f => ({ ...f, items: [...f.items, { product_name: '', qty: 1, unit_price: 0, line_total: 0 }] }));
  };

  const removeQuotationItem = (idx: number) => {
    if (quotationForm.items.length <= 1) return;
    setQuotationForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  };

  const updateQuotationItem = (idx: number, field: string, value: number | string) => {
    setQuotationForm(f => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [field]: value } as typeof items[0];
      if (field === 'qty' || field === 'unit_price') {
        items[idx].line_total = items[idx].qty * items[idx].unit_price;
      }
      return { ...f, items };
    });
  };

  const createQuotation = async () => {
    setSaving(true);
    const count = quotations.length + 1;
    const quoteNo = `QUO-2025-${String(count).padStart(3, '0')}`;
    const items = quotationForm.items.filter(i => i.product_name.trim() !== '');
    const subtotal = items.reduce((sum, i) => sum + i.line_total, 0);
    const total = subtotal;
    const { error } = await supabase.from('quotations').insert({
      quote_no: quoteNo,
      customer_id: quotationForm.customer_id || null,
      order_id: null,
      status: 'draft',
      valid_until: quotationForm.valid_until || null,
      items: items as unknown as JSON,
      subtotal,
      total,
      notes: quotationForm.notes,
    });
    if (error) { showToast('Lỗi: ' + error.message); }
    else { showToast('Tạo báo giá ' + quoteNo + ' thành công!'); setShowQuotationForm(false); loadData(); }
    setSaving(false);
  };

  const updateQuotationStatus = async (quotation: Quotation, newStatus: string) => {
    const { error } = await supabase.from('quotations').update({ status: newStatus }).eq('id', quotation.id);
    if (!error) { showToast(`${quotation.quote_no}: ${quoteStatusLabels[newStatus]}`); setSelectedQuotation(null); loadData(); }
    else showToast('Lỗi: ' + error.message);
  };

  const convertToOrder = async (quotation: Quotation) => {
    setSaving(true);
    const count = orders.length + 1;
    const orderNo = `ORD-2025-${String(count).padStart(3, '0')}`;
    const deposit = Math.round(quotation.total * 0.5);
    const { data: orderData, error: orderError } = await supabase.from('orders').insert({
      order_no: orderNo,
      customer_id: quotation.customer_id || null,
      source: 'direct',
      priority: 'normal',
      total_amount: quotation.total,
      deposit_amount: deposit,
      paid_amount: deposit,
      balance_due: quotation.total - deposit,
      deadline: quotation.valid_until || null,
      delivery_method: 'pickup',
      special_instructions: '',
      internal_notes: `Converted from quotation ${quotation.quote_no}`,
      status: 'draft',
      payment_status: deposit > 0 ? 'partial' : 'unpaid',
      cogs_estimate: Math.round(quotation.total * 0.35),
      margin_estimate: Math.round(quotation.total * 0.65),
    }).select('id').single();
    if (orderError) { showToast('Lỗi tạo đơn: ' + orderError.message); setSaving(false); return; }
    const { error: updateError } = await supabase.from('quotations').update({ order_id: orderData.id }).eq('id', quotation.id);
    if (updateError) { showToast('Lỗi cập nhật báo giá: ' + updateError.message); setSaving(false); return; }
    showToast('Chuyển báo giá thành đơn hàng ' + orderNo + ' thành công!');
    setSelectedQuotation(null);
    setSaving(false);
    loadData();
  };

  const deleteQuotation = async (id: string) => {
    if (!confirm('Xóa báo giá này?')) return;
    const { error } = await supabase.from('quotations').delete().eq('id', id);
    if (!error) { showToast('Đã xóa báo giá'); setSelectedQuotation(null); loadData(); }
    else showToast('Lỗi: ' + error.message);
  };

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'orders', label: 'Đơn hàng', count: orders.length },
    ...(perms.can('crm') || perms.can('sales') || perms.isSuperAdmin ? [{ id: 'customers' as Tab, label: 'Khách hàng', count: customers.length }] : []),
    ...(perms.can('crm') || perms.can('sales') || perms.isSuperAdmin ? [{ id: 'leads' as Tab, label: 'Lead', count: leads.length }] : []),
    ...(perms.can('complaints') || perms.can('crm') || perms.isSuperAdmin ? [{ id: 'complaints' as Tab, label: 'Khiếu nại', count: complaints.length }] : []),
    ...(perms.can('sales') || perms.isSuperAdmin ? [{ id: 'quotations' as Tab, label: 'Báo giá', count: quotations.length }] : []),
  ];

  const inputCls = 'w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white';
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';
  const btnPrimary = 'flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50';
  const btnDanger = 'flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50';

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium animate-[fadeIn_0.2s]">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Bán hàng / CRM</h1>
          <p className="text-sm text-gray-500">Quản lý đơn hàng, khách hàng, lead</p>
        </div>
        {tab === 'orders' && perms.canWrite('orders') && <button onClick={() => { setOrderForm({ customer_id: '', source: 'direct', priority: 'normal', total_amount: 0, deposit_amount: 0, deadline: '', delivery_method: 'pickup', special_instructions: '', internal_notes: '' }); setShowOrderForm(true); }} className={btnPrimary}><Plus className="w-4 h-4" /> Tạo đơn</button>}
        {tab === 'customers' && perms.canWrite('customers') && <button onClick={openNewCust} className={btnPrimary}><Plus className="w-4 h-4" /> Thêm KH</button>}
        {tab === 'leads' && perms.canWrite('leads') && <button onClick={() => { setLeadForm({ full_name: '', phone: '', email: '', source: 'facebook', product_interest: '', budget_estimate: 0, notes: '' }); setShowLeadForm(true); }} className={btnPrimary}><UserPlus className="w-4 h-4" /> Thêm Lead</button>}
        {tab === 'complaints' && perms.canWrite('complaints') && <button onClick={() => { setComplaintForm({ order_id: '', type: 'quality', description: '' }); setShowComplaintForm(true); }} className={btnPrimary}><AlertTriangle className="w-4 h-4" /> Tạo khiếu nại</button>}
        {tab === 'quotations' && perms.canWrite('quotations') && <button onClick={() => { setQuotationForm({ customer_id: '', valid_until: '', items: [{ product_name: '', qty: 1, unit_price: 0, line_total: 0 }], notes: '' }); setShowQuotationForm(true); }} className={btnPrimary}><Plus className="w-4 h-4" /> Tạo báo giá</button>}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${tab === t.id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
            <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${tab === t.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white" placeholder={tab === 'orders' ? 'Tìm mã đơn, tên khách...' : 'Tìm tên, SĐT...'} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {tab === 'orders' && (
          <select className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">Tất cả</option>
            {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        )}
      </div>

      {loading ? <div className="flex justify-center py-12 text-gray-400 text-sm">Đang tải...</div> : (
        <>
          {/* ORDERS LIST */}
          {tab === 'orders' && (
            <div className="space-y-2">
              {filteredOrders.length === 0 ? <EmptyState icon={Search} title="Không tìm thấy đơn hàng" /> : filteredOrders.map(o => {
                const c = o.customer as unknown as { full_name: string; phone: string; tier_code: string };
                const isPaid = o.payment_status === 'paid';
                const overdue = o.deadline && new Date(o.deadline) < new Date() && !['delivered','cancelled','refunded'].includes(o.status);
                return (
                  <Card key={o.id} className="p-4" onClick={() => setSelectedOrder(o)}>
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-gray-900">{o.order_no}</span>
                          <Badge className={statusColor(o.status)}>{statusLabels[o.status] ?? o.status}</Badge>
                          {overdue && <Badge className="bg-red-100 text-red-700">Trễ</Badge>}
                          {o.priority === 'urgent' && <Badge className="bg-red-500 text-white">Khẩn</Badge>}
                        </div>
                        <p className="text-sm text-gray-700 mt-1 font-medium">{c?.full_name ?? '—'}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-400">{o.source}</span>
                          {o.deadline && <span className={`text-xs ${overdue ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>Hạn: {formatDate(o.deadline)}</span>}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-900">{formatCurrency(o.total_amount)}</p>
                        <Badge className={isPaid ? 'bg-green-100 text-green-700' : o.payment_status === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}>
                          {isPaid ? 'Đã TT' : o.payment_status === 'partial' ? `Còn ${formatCurrency(o.balance_due)}` : 'Chưa TT'}
                        </Badge>
                        <ChevronRight className="w-4 h-4 text-gray-300 ml-auto mt-1" />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* CUSTOMERS LIST */}
          {tab === 'customers' && (perms.can('crm') || perms.can('sales') || perms.isSuperAdmin) && (
            <div className="space-y-2">
              {filteredCustomers.length === 0 ? <EmptyState icon={UserPlus} title="Không tìm thấy khách hàng" /> : filteredCustomers.map(c => (
                <Card key={c.id} className="p-4" onClick={() => openEditCust(c)}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-bold">{c.full_name.split(' ').slice(-1)[0][0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 truncate">{c.full_name}</p>
                        <Badge className={tierColor(c.tier_code)}>{c.tier_code.toUpperCase()}</Badge>
                      </div>
                      {c.company && <p className="text-xs text-gray-500 flex items-center gap-1"><Building2 className="w-3 h-3" />{c.company}</p>}
                      <span className="text-xs text-gray-400 flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-bold text-emerald-700">{formatCurrency(c.total_spent)}</p>
                      <p className="text-xs text-gray-400">{c.total_orders} đơn</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* LEADS LIST */}
          {tab === 'leads' && (perms.can('crm') || perms.can('sales') || perms.isSuperAdmin) && (
            <div className="space-y-2">
              {filteredLeads.length === 0 ? <EmptyState icon={UserPlus} title="Chưa có lead" /> : filteredLeads.map(l => (
                <Card key={l.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">{l.full_name[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900">{l.full_name}</p>
                        <Badge className={statusColor(l.status)}>{leadStatusLabels[l.status] ?? l.status}</Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{l.phone} • {l.source}</p>
                      <p className="text-xs text-gray-600 mt-0.5 truncate">{l.product_interest}</p>
                    </div>
                    <div className="text-right flex-shrink-0 space-y-1">
                      <p className="text-xs font-bold text-blue-700">{formatCurrency(l.budget_estimate)}</p>
                      <div className="flex gap-1 justify-end">
                        {perms.canWrite('leads') && ['contacted', 'qualified', 'proposal_sent', 'negotiating', 'won', 'lost'].filter(s => s !== l.status).slice(0, 2).map(s => (
                          <button key={s} onClick={() => updateLeadStatus(l, s)} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded-lg font-medium">{leadStatusLabels[s]}</button>
                        ))}
                        {perms.canDelete('leads') && <button onClick={() => deleteLead(l.id)} className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded-lg font-medium"><Trash2 className="w-3 h-3" /></button>}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* COMPLAINTS LIST */}
          {tab === 'complaints' && (perms.can('complaints') || perms.can('crm') || perms.isSuperAdmin) && (
            <div className="space-y-2">
              {complaints.length === 0 ? <EmptyState icon={AlertTriangle} title="Chưa có khiếu nại" /> : complaints.map(cmp => {
                const nextStatuses = complaintStatusFlow[cmp.status] ?? [];
                return (
                  <Card key={cmp.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-gray-900">{cmp.complaint_no}</span>
                          <Badge className={statusColor(cmp.status)}>{complaintStatusLabels[cmp.status] ?? cmp.status}</Badge>
                          <Badge className="bg-gray-100 text-gray-600">{complaintTypeLabels[cmp.type] ?? cmp.type}</Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {cmp.order?.order_no ?? '—'} • {cmp.customer?.full_name ?? '—'}
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5 truncate">{cmp.description}</p>
                        {cmp.resolution && <p className="text-xs text-emerald-700 mt-0.5 truncate">Giải quyết: {cmp.resolution}</p>}
                        {cmp.refund_amount > 0 && <p className="text-xs text-red-600 font-semibold mt-0.5">Hoàn tiền: {formatCurrency(cmp.refund_amount)}</p>}
                      </div>
                      <div className="text-right flex-shrink-0 space-y-1">
                        <p className="text-xs text-gray-400">{formatDate(cmp.created_at)}</p>
                        <div className="flex gap-1 justify-end">
                          {perms.canWrite('complaints') && nextStatuses.map(s => (
                            <button key={s} onClick={() => updateComplaintStatus(cmp, s)} className={`text-xs font-semibold px-2 py-1 rounded-lg ${s === 'resolved' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'} active:scale-95 transition-all`}>
                              {complaintStatusLabels[s]}
                            </button>
                          ))}
                          {perms.canWrite('complaints') && <button onClick={() => { const res = prompt('Ghi chú giải quyết:', cmp.resolution || ''); if (res !== null) { const refund = prompt('Số tiền hoàn (VND):', String(cmp.refund_amount || 0)); if (refund !== null) updateComplaintResolution(cmp, res, Number(refund)); } }} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded-lg font-medium">Sửa</button>}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* QUOTATIONS LIST */}
          {tab === 'quotations' && (perms.can('sales') || perms.isSuperAdmin) && (
            <div className="space-y-2">
              {quotations.length === 0 ? <EmptyState icon={FileText} title="Chưa có báo giá" /> : quotations.map(q => {
                const nextStatuses = quoteStatusFlow[q.status] ?? [];
                const itemsCount = q.items?.length ?? 0;
                return (
                  <Card key={q.id} className="p-4" onClick={() => setSelectedQuotation(q)}>
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-gray-900">{q.quote_no}</span>
                          <Badge className={statusColor(q.status)}>{quoteStatusLabels[q.status] ?? q.status}</Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {q.customer?.full_name ?? '—'} • {itemsCount} mặt hàng
                        </p>
                        {q.valid_until && <p className="text-xs text-gray-400 mt-0.5">HL: {formatDate(q.valid_until)}</p>}
                      </div>
                      <div className="text-right flex-shrink-0 space-y-1">
                        <p className="text-sm font-bold text-gray-900">{formatCurrency(q.total)}</p>
                        <div className="flex gap-1 justify-end" onClick={e => e.stopPropagation()}>
                          {perms.canWrite('quotations') && nextStatuses.slice(0, 2).map(s => (
                            <button key={s} onClick={() => updateQuotationStatus(q, s)} className={`text-xs font-semibold px-2 py-1 rounded-lg active:scale-95 transition-all ${s === 'cancelled' || s === 'rejected' || s === 'expired' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}>
                              {quoteStatusLabels[s]}
                            </button>
                          ))}
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

      {/* ===== ORDER DETAIL MODAL ===== */}
      {selectedOrder && (
        <Modal open={true} onClose={() => setSelectedOrder(null)} title={`Đơn ${selectedOrder.order_no}`} size="lg">
          <OrderDetail order={selectedOrder} onStatusChange={(s) => updateOrderStatus(selectedOrder, s)} onDelete={() => deleteOrder(selectedOrder.id)} perms={perms} />
        </Modal>
      )}

      {/* ===== CREATE ORDER MODAL ===== */}
      <Modal open={showOrderForm} onClose={() => setShowOrderForm(false)} title="Tạo đơn hàng mới" size="lg">
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Khách hàng</label>
            <select className={inputCls} value={orderForm.customer_id} onChange={e => setOrderForm(f => ({ ...f, customer_id: e.target.value }))}>
              <option value="">— Chọn khách hàng —</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.full_name} ({c.phone})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Kênh bán</label>
              <select className={inputCls} value={orderForm.source} onChange={e => setOrderForm(f => ({ ...f, source: e.target.value }))}>
                {sourceOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Ưu tiên</label>
              <select className={inputCls} value={orderForm.priority} onChange={e => setOrderForm(f => ({ ...f, priority: e.target.value }))}>
                {priorityOptions.map(p => <option key={p} value={p}>{p === 'urgent' ? 'Khẩn cấp' : p === 'high' ? 'Cao' : 'Bình thường'}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Tổng tiền (VND)</label>
              <input type="number" className={inputCls} value={orderForm.total_amount || ''} onChange={e => setOrderForm(f => ({ ...f, total_amount: Number(e.target.value) }))} placeholder="0" />
            </div>
            <div>
              <label className={labelCls}>Tiền cọc (VND)</label>
              <input type="number" className={inputCls} value={orderForm.deposit_amount || ''} onChange={e => setOrderForm(f => ({ ...f, deposit_amount: Number(e.target.value) }))} placeholder="50% mặc định" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Deadline</label>
              <input type="date" className={inputCls} value={orderForm.deadline} onChange={e => setOrderForm(f => ({ ...f, deadline: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Giao hàng</label>
              <select className={inputCls} value={orderForm.delivery_method} onChange={e => setOrderForm(f => ({ ...f, delivery_method: e.target.value }))}>
                {deliveryOptions.map(d => <option key={d} value={d}>{d === 'pickup' ? 'Lấy tại xưởng' : 'Giao hàng'}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Yêu cầu đặc biệt</label>
            <textarea className={inputCls + ' h-20'} value={orderForm.special_instructions} onChange={e => setOrderForm(f => ({ ...f, special_instructions: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>Ghi chú nội bộ</label>
            <textarea className={inputCls + ' h-16'} value={orderForm.internal_notes} onChange={e => setOrderForm(f => ({ ...f, internal_notes: e.target.value }))} />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={createOrder} disabled={saving || !orderForm.total_amount} className={btnPrimary + ' flex-1'}>{saving ? 'Đang lưu...' : 'Tạo đơn hàng'}</button>
            <button onClick={() => setShowOrderForm(false)} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50">Hủy</button>
          </div>
        </div>
      </Modal>

      {/* ===== CUSTOMER FORM MODAL ===== */}
      <Modal open={showCustForm} onClose={() => { setShowCustForm(false); setSelectedCust(null); }} title={selectedCust ? 'Sửa khách hàng' : 'Thêm khách hàng'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Họ tên *</label>
              <input className={inputCls} value={custForm.full_name} onChange={e => setCustForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Nguyen Van A" />
            </div>
            <div>
              <label className={labelCls}>SĐT *</label>
              <input className={inputCls} value={custForm.phone} onChange={e => setCustForm(f => ({ ...f, phone: e.target.value }))} placeholder="0901234567" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Email</label>
              <input className={inputCls} value={custForm.email} onChange={e => setCustForm(f => ({ ...f, email: e.target.value }))} placeholder="email@gmail.com" />
            </div>
            <div>
              <label className={labelCls}>Công ty</label>
              <input className={inputCls} value={custForm.company} onChange={e => setCustForm(f => ({ ...f, company: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Địa chỉ</label>
              <input className={inputCls} value={custForm.address} onChange={e => setCustForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Thành phố</label>
              <input className={inputCls} value={custForm.city} onChange={e => setCustForm(f => ({ ...f, city: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Hạng</label>
              <select className={inputCls} value={custForm.tier_code} onChange={e => setCustForm(f => ({ ...f, tier_code: e.target.value }))}>
                {tierOptions.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Phân khúc</label>
              <select className={inputCls} value={custForm.segment} onChange={e => setCustForm(f => ({ ...f, segment: e.target.value }))}>
                {segmentOptions.map(s => <option key={s} value={s}>{s === 'individual' ? 'Cá nhân' : 'Doanh nghiệp'}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Nguồn</label>
              <select className={inputCls} value={custForm.source} onChange={e => setCustForm(f => ({ ...f, source: e.target.value }))}>
                {sourceOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Ghi chú</label>
            <textarea className={inputCls + ' h-16'} value={custForm.notes} onChange={e => setCustForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Persona</label>
              <input className={inputCls} value={custForm.persona} onChange={e => setCustForm(f => ({ ...f, persona: e.target.value }))} placeholder="VD: Chủ doanh nghiệp nhỏ, thích nghệ thuật" />
            </div>
            <div>
              <label className={labelCls}>Pain points (phẩy)</label>
              <input className={inputCls} value={custForm.pain_points} onChange={e => setCustForm(f => ({ ...f, pain_points: e.target.value }))} placeholder="VD: giá cao, giao chậm, chất lượng không ổn định" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={saveCust} disabled={saving || !custForm.full_name || !custForm.phone} className={btnPrimary + ' flex-1'}><Save className="w-4 h-4" />{saving ? 'Đang lưu...' : selectedCust ? 'Cập nhật' : 'Tạo khách hàng'}</button>
            {selectedCust && perms.canDelete('customers') && <button onClick={() => deleteCust(selectedCust.id)} className={btnDanger}><Trash2 className="w-4 h-4" />Xóa</button>}
            <button onClick={() => { setShowCustForm(false); setSelectedCust(null); }} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50">Hủy</button>
          </div>
          {selectedCust && <CustomerOrderHistory customerId={selectedCust.id} />}
        </div>
      </Modal>

      {/* ===== LEAD FORM MODAL ===== */}
      <Modal open={showLeadForm} onClose={() => setShowLeadForm(false)} title="Thêm Lead mới" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Họ tên *</label>
              <input className={inputCls} value={leadForm.full_name} onChange={e => setLeadForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>SĐT</label>
              <input className={inputCls} value={leadForm.phone} onChange={e => setLeadForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Email</label>
              <input className={inputCls} value={leadForm.email} onChange={e => setLeadForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Nguồn</label>
              <select className={inputCls} value={leadForm.source} onChange={e => setLeadForm(f => ({ ...f, source: e.target.value }))}>
                {sourceOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Sản phẩm quan tâm</label>
            <input className={inputCls} value={leadForm.product_interest} onChange={e => setLeadForm(f => ({ ...f, product_interest: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>Ngân sách ước tính (VND)</label>
            <input type="number" className={inputCls} value={leadForm.budget_estimate || ''} onChange={e => setLeadForm(f => ({ ...f, budget_estimate: Number(e.target.value) }))} />
          </div>
          <div>
            <label className={labelCls}>Ghi chú</label>
            <textarea className={inputCls + ' h-16'} value={leadForm.notes} onChange={e => setLeadForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={createLead} disabled={saving || !leadForm.full_name} className={btnPrimary + ' flex-1'}>{saving ? 'Đang lưu...' : 'Tạo Lead'}</button>
            <button onClick={() => setShowLeadForm(false)} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50">Hủy</button>
          </div>
        </div>
      </Modal>

      {/* ===== COMPLAINT FORM MODAL ===== */}
      <Modal open={showComplaintForm} onClose={() => setShowComplaintForm(false)} title="Tạo khiếu nại" size="md">
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Đơn hàng</label>
            <select className={inputCls} value={complaintForm.order_id} onChange={e => setComplaintForm(f => ({ ...f, order_id: e.target.value }))}>
              <option value="">— Chọn đơn hàng —</option>
              {orders.map(o => <option key={o.id} value={o.id}>{o.order_no}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Loại khiếu nại</label>
            <select className={inputCls} value={complaintForm.type} onChange={e => setComplaintForm(f => ({ ...f, type: e.target.value }))}>
              {complaintTypeOptions.map(t => <option key={t} value={t}>{complaintTypeLabels[t]}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Mô tả *</label>
            <textarea className={inputCls + ' h-24'} value={complaintForm.description} onChange={e => setComplaintForm(f => ({ ...f, description: e.target.value }))} placeholder="Mô tả chi tiết khiếu nại..." />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={createComplaint} disabled={saving || !complaintForm.description} className={btnPrimary + ' flex-1'}>{saving ? 'Đang lưu...' : 'Tạo khiếu nại'}</button>
            <button onClick={() => setShowComplaintForm(false)} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50">Hủy</button>
          </div>
        </div>
      </Modal>

      {/* ===== QUOTATION FORM MODAL ===== */}
      <Modal open={showQuotationForm} onClose={() => setShowQuotationForm(false)} title="Tạo báo giá mới" size="lg">
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Khách hàng</label>
            <select className={inputCls} value={quotationForm.customer_id} onChange={e => setQuotationForm(f => ({ ...f, customer_id: e.target.value }))}>
              <option value="">— Chọn khách hàng —</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.full_name} ({c.phone})</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Hiệu lực đến</label>
            <input type="date" className={inputCls} value={quotationForm.valid_until} onChange={e => setQuotationForm(f => ({ ...f, valid_until: e.target.value }))} />
          </div>
          <div className="border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900">Danh sách sản phẩm</h3>
              <button onClick={addQuotationItem} className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-700 active:scale-95 transition-all">
                <Plus className="w-3.5 h-3.5" /> Thêm dòng
              </button>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 px-1">
                <div className="col-span-4">Tên sản phẩm</div>
                <div className="col-span-2 text-right">SL</div>
                <div className="col-span-3 text-right">Đơn giá</div>
                <div className="col-span-2 text-right">Thành tiền</div>
                <div className="col-span-1"></div>
              </div>
              {quotationForm.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4">
                    <input className={inputCls} value={item.product_name} onChange={e => updateQuotationItem(idx, 'product_name', e.target.value)} placeholder="Tên SP" />
                  </div>
                  <div className="col-span-2">
                    <input type="number" min={1} className={inputCls + ' text-right'} value={item.qty} onChange={e => updateQuotationItem(idx, 'qty', Math.max(1, Number(e.target.value)))} />
                  </div>
                  <div className="col-span-3">
                    <input type="number" className={inputCls + ' text-right'} value={item.unit_price || ''} onChange={e => updateQuotationItem(idx, 'unit_price', Number(e.target.value))} placeholder="0" />
                  </div>
                  <div className="col-span-2 text-sm font-bold text-blue-700 text-right py-2.5">{formatCurrency(item.line_total)}</div>
                  <div className="col-span-1 text-right">
                    <button onClick={() => removeQuotationItem(idx)} disabled={quotationForm.items.length <= 1} className="text-red-500 hover:text-red-700 transition-colors disabled:opacity-30"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-2 mt-2">
                <div className="flex justify-between text-sm">
                  <span className="font-bold text-gray-900">Tổng cộng</span>
                  <span className="font-bold text-blue-700">{formatCurrency(quotationSubtotal)}</span>
                </div>
              </div>
            </div>
          </div>
          <div>
            <label className={labelCls}>Ghi chú</label>
            <textarea className={inputCls + ' h-16'} value={quotationForm.notes} onChange={e => setQuotationForm(f => ({ ...f, notes: e.target.value }))} placeholder="Ghi chú thêm..." />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={createQuotation} disabled={saving || !quotationForm.items.some(i => i.product_name.trim())} className={btnPrimary + ' flex-1'}>{saving ? 'Đang lưu...' : 'Tạo báo giá'}</button>
            <button onClick={() => setShowQuotationForm(false)} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50">Hủy</button>
          </div>
        </div>
      </Modal>

      {/* ===== QUOTATION DETAIL MODAL ===== */}
      {selectedQuotation && (
        <Modal open={true} onClose={() => setSelectedQuotation(null)} title={`Báo giá ${selectedQuotation.quote_no}`} size="lg">
          <div className="space-y-4">
            {/* Status change buttons */}
            {(quoteStatusFlow[selectedQuotation.status] ?? []).length > 0 && perms.canWrite('quotations') && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-xs font-semibold text-blue-700 mb-2">Chuyển trạng thái:</p>
                <div className="flex flex-wrap gap-2">
                  {(quoteStatusFlow[selectedQuotation.status] ?? []).map(s => (
                    <button key={s} onClick={() => updateQuotationStatus(selectedQuotation, s)} className={`text-xs font-semibold px-3 py-1.5 rounded-lg active:scale-95 transition-all ${s === 'cancelled' || s === 'rejected' || s === 'expired' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                      {quoteStatusLabels[s]}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Trạng thái</p>
                <div className="text-sm font-medium text-gray-900 mt-0.5"><Badge className={statusColor(selectedQuotation.status)}>{quoteStatusLabels[selectedQuotation.status] ?? selectedQuotation.status}</Badge></div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Khách hàng</p>
                <div className="text-sm font-medium text-gray-900 mt-0.5">{selectedQuotation.customer?.full_name ?? '—'}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Hiệu lực đến</p>
                <div className="text-sm font-medium text-gray-900 mt-0.5">{selectedQuotation.valid_until ? formatDate(selectedQuotation.valid_until) : '—'}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Ngày tạo</p>
                <div className="text-sm font-medium text-gray-900 mt-0.5">{formatDate(selectedQuotation.created_at)}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Tổng tiền</p>
                <div className="text-sm font-medium text-gray-900 mt-0.5 font-bold text-blue-700">{formatCurrency(selectedQuotation.total)}</div>
              </div>
              {selectedQuotation.order?.order_no && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Đơn hàng</p>
                  <div className="text-sm font-medium text-gray-900 mt-0.5">{selectedQuotation.order.order_no}</div>
                </div>
              )}
            </div>

            {/* Items table */}
            <div className="border border-gray-200 rounded-xl p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Danh sách sản phẩm</h3>
              {(selectedQuotation.items?.length ?? 0) === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">Chưa có sản phẩm</p>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 px-2">
                    <div className="col-span-4">Sản phẩm</div>
                    <div className="col-span-2 text-right">SL</div>
                    <div className="col-span-3 text-right">Đơn giá</div>
                    <div className="col-span-3 text-right">Thành tiền</div>
                  </div>
                  {(selectedQuotation.items ?? []).map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-lg px-2 py-2.5">
                      <div className="col-span-4 text-sm font-medium text-gray-900 truncate">{item.product_name}</div>
                      <div className="col-span-2 text-sm text-gray-700 text-right">{item.qty}</div>
                      <div className="col-span-3 text-sm text-gray-700 text-right">{formatCurrency(item.unit_price)}</div>
                      <div className="col-span-3 text-sm font-bold text-blue-700 text-right">{formatCurrency(item.line_total)}</div>
                    </div>
                  ))}
                  <div className="grid grid-cols-12 gap-2 items-center border-t border-gray-200 pt-2 px-2">
                    <div className="col-span-4 text-sm font-bold text-gray-900">Tổng cộng</div>
                    <div className="col-span-2"></div>
                    <div className="col-span-3"></div>
                    <div className="col-span-3 text-sm font-bold text-blue-700 text-right">{formatCurrency(selectedQuotation.subtotal)}</div>
                  </div>
                </div>
              )}
            </div>

            {selectedQuotation.notes && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-amber-700 mb-1">Ghi chú</p>
                <p className="text-sm text-amber-800">{selectedQuotation.notes}</p>
              </div>
            )}

            {/* Convert to Order button */}
            {selectedQuotation.status === 'accepted' && !selectedQuotation.order_id && perms.canWrite('orders') && (
              <button onClick={() => convertToOrder(selectedQuotation)} disabled={saving} className={btnPrimary + ' w-full'}>
                <Package className="w-4 h-4" /> {saving ? 'Đang chuyển...' : 'Chuyển thành đơn hàng'}
              </button>
            )}

            <div className="flex gap-2 pt-2 border-t border-gray-100">
              {perms.canDelete('quotations') && <button onClick={() => deleteQuotation(selectedQuotation.id)} className="text-xs text-red-600 hover:text-red-800 font-semibold flex items-center gap-1"><Trash2 className="w-3 h-3" /> Xóa báo giá</button>}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function OrderDetail({ order, onStatusChange, onDelete, perms }: { order: Order; onStatusChange: (s: string) => void; onDelete: () => void; perms: ReturnType<typeof usePermissions>; }) {
  const c = order.customer as unknown as { full_name: string; phone: string; tier_code: string };
  const nextStatuses = orderStatusFlow[order.status] ?? [];

  // Order items state
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [itemForm, setItemForm] = useState({ product_id: '', qty: 1, unit_price: 0 });
  const [toast, setToast] = useState<string | null>(null);

  const showToastLocal = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const inputCls = 'w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white';
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';
  const btnPrimary = 'flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50';

  const loadOrderItems = useCallback(async () => {
    const [itemsRes, prodRes] = await Promise.all([
      supabase.from('order_items').select('*').eq('order_id', order.id).order('created_at', { ascending: true }),
      supabase.from('products').select('*').eq('is_active', true).order('name'),
    ]);
    setOrderItems(itemsRes.data ?? []);
    setProducts(prodRes.data ?? []);
  }, [order.id]);

  useEffect(() => { loadOrderItems(); }, [loadOrderItems]);

  const lineTotal = itemForm.qty * itemForm.unit_price;

  const addItem = async () => {
    setSavingItem(true);
    const product = products.find(p => p.id === itemForm.product_id);
    if (!product) { setSavingItem(false); return; }
    const { error } = await supabase.from('order_items').insert({
      order_id: order.id,
      product_id: itemForm.product_id,
      product_name: product.name,
      qty: itemForm.qty,
      unit_price: itemForm.unit_price,
      line_total: itemForm.qty * itemForm.unit_price,
    });
    if (error) { showToastLocal('Lỗi: ' + error.message); }
    else { showToastLocal('Thêm sản phẩm thành công!'); setShowAddItem(false); setItemForm({ product_id: '', qty: 1, unit_price: 0 }); loadOrderItems(); }
    setSavingItem(false);
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Xóa sản phẩm này?')) return;
    const { error } = await supabase.from('order_items').delete().eq('id', id);
    if (!error) { showToastLocal('Đã xóa sản phẩm'); loadOrderItems(); }
    else showToastLocal('Lỗi: ' + error.message);
  };

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium animate-[fadeIn_0.2s]">
          {toast}
        </div>
      )}

      {/* Status change buttons */}
      {nextStatuses.length > 0 && perms.canWrite('orders') && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <p className="text-xs font-semibold text-blue-700 mb-2">Chuyển trạng thái:</p>
          <div className="flex flex-wrap gap-2">
            {nextStatuses.map(s => (
              <button key={s} onClick={() => onStatusChange(s)} className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${s === 'cancelled' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-blue-600 text-white hover:bg-blue-700'} active:scale-95 transition-all`}>
                {statusLabels[s]}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Trạng thái', value: <Badge className={statusColor(order.status)}>{statusLabels[order.status] ?? order.status}</Badge> },
          { label: 'Khách hàng', value: c?.full_name ?? '—' },
          { label: 'Ngày đặt', value: formatDate(order.order_date) },
          { label: 'Deadline', value: formatDate(order.deadline) },
          { label: 'Tổng tiền', value: <span className="font-bold text-blue-700">{formatCurrency(order.total_amount)}</span> },
          { label: 'Đã TT', value: formatCurrency(order.paid_amount) },
          { label: 'Còn lại', value: <span className={order.balance_due > 0 ? 'text-red-600 font-bold' : 'text-green-600'}>{formatCurrency(order.balance_due)}</span> },
          { label: 'Kênh bán', value: order.source },
          { label: 'Giao hàng', value: order.delivery_method },
          { label: 'COGS', value: formatCurrency(order.cogs_estimate) },
          { label: 'Margin', value: <span className="text-emerald-700 font-semibold">{formatCurrency(order.margin_estimate)}</span> },
          { label: 'Ưu tiên', value: <Badge className={order.priority === 'urgent' ? 'bg-red-100 text-red-700' : order.priority === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}>{order.priority}</Badge> },
        ].map(row => (
          <div key={row.label} className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">{row.label}</p>
            <div className="text-sm font-medium text-gray-900 mt-0.5">{row.value}</div>
          </div>
        ))}
      </div>

      {/* Order Items Section */}
      <div className="border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-gray-900">Sản phẩm trong đơn</h3>
            <span className="text-xs text-gray-400">({orderItems.length} mặt hàng)</span>
          </div>
          {perms.canWrite('orders') && <button onClick={() => { setItemForm({ product_id: '', qty: 1, unit_price: 0 }); setShowAddItem(true); }} className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-700 active:scale-95 transition-all">
            <Plus className="w-3.5 h-3.5" /> Thêm sản phẩm
          </button>}
        </div>

        {orderItems.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">Chưa có sản phẩm nào trong đơn</p>
        ) : (
          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 px-2">
              <div className="col-span-4">Sản phẩm</div>
              <div className="col-span-2 text-right">SL</div>
              <div className="col-span-3 text-right">Đơn giá</div>
              <div className="col-span-2 text-right">Thành tiền</div>
              <div className="col-span-1"></div>
            </div>
            {orderItems.map(item => (
              <div key={item.id} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-lg px-2 py-2.5">
                <div className="col-span-4 text-sm font-medium text-gray-900 truncate">{item.product_name}</div>
                <div className="col-span-2 text-sm text-gray-700 text-right">{item.qty}</div>
                <div className="col-span-3 text-sm text-gray-700 text-right">{formatCurrency(item.unit_price)}</div>
                <div className="col-span-2 text-sm font-bold text-blue-700 text-right">{formatCurrency(item.line_total)}</div>
                <div className="col-span-1 text-right">
                  {perms.canDelete('orders') && <button onClick={() => deleteItem(item.id)} className="text-red-500 hover:text-red-700 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>}
                </div>
              </div>
            ))}
            {/* Total row */}
            <div className="grid grid-cols-12 gap-2 items-center border-t border-gray-200 pt-2 px-2">
              <div className="col-span-4 text-sm font-bold text-gray-900">Tổng cộng</div>
              <div className="col-span-2"></div>
              <div className="col-span-3"></div>
              <div className="col-span-2 text-sm font-bold text-blue-700 text-right">{formatCurrency(orderItems.reduce((sum, i) => sum + i.line_total, 0))}</div>
              <div className="col-span-1"></div>
            </div>
          </div>
        )}

        {/* Add item form */}
        {showAddItem && (
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-3">
            <p className="text-xs font-semibold text-blue-700">Thêm sản phẩm mới</p>
            <div>
              <label className={labelCls}>Sản phẩm</label>
              <select className={inputCls} value={itemForm.product_id} onChange={e => {
                const prod = products.find(p => p.id === e.target.value);
                setItemForm(f => ({ ...f, product_id: e.target.value, unit_price: prod?.price ?? 0 }));
              }}>
                <option value="">— Chọn sản phẩm —</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({formatCurrency(p.price)})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Số lượng</label>
                <input type="number" min={1} className={inputCls} value={itemForm.qty} onChange={e => setItemForm(f => ({ ...f, qty: Math.max(1, Number(e.target.value)) }))} />
              </div>
              <div>
                <label className={labelCls}>Đơn giá (VND)</label>
                <input type="number" className={inputCls} value={itemForm.unit_price || ''} onChange={e => setItemForm(f => ({ ...f, unit_price: Number(e.target.value) }))} />
              </div>
              <div>
                <label className={labelCls}>Thành tiền</label>
                <div className="text-sm font-bold text-blue-700 py-2.5">{formatCurrency(lineTotal)}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={addItem} disabled={savingItem || !itemForm.product_id} className={btnPrimary + ' text-xs px-3 py-2'}>
                {savingItem ? 'Đang lưu...' : 'Thêm'}
              </button>
              <button onClick={() => setShowAddItem(false)} className="px-3 py-2 rounded-lg text-xs font-semibold border border-gray-200 hover:bg-gray-50">Hủy</button>
            </div>
          </div>
        )}
      </div>

      {order.special_instructions && <div className="bg-amber-50 border border-amber-200 rounded-lg p-3"><p className="text-xs font-semibold text-amber-700 mb-1">Yêu cầu đặc biệt</p><p className="text-sm text-amber-800">{order.special_instructions}</p></div>}
      {order.internal_notes && <div className="bg-blue-50 border border-blue-200 rounded-lg p-3"><p className="text-xs font-semibold text-blue-700 mb-1">Ghi chú nội bộ</p><p className="text-sm text-blue-800">{order.internal_notes}</p></div>}
      <div className="flex gap-2 pt-2 border-t border-gray-100">
        {perms.canDelete('orders') && <button onClick={onDelete} className="text-xs text-red-600 hover:text-red-800 font-semibold flex items-center gap-1"><Trash2 className="w-3 h-3" /> Xóa đơn hàng</button>}
      </div>
    </div>
  );
}

function CustomerOrderHistory({ customerId }: { customerId: string }) {
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const loadCustomerOrders = useCallback(async () => {
    setLoadingOrders(true);
    const { data } = await supabase.from('orders').select('*').eq('customer_id', customerId).order('created_at', { ascending: false });
    setCustomerOrders(data ?? []);
    setLoadingOrders(false);
  }, [customerId]);

  useEffect(() => { loadCustomerOrders(); }, [loadCustomerOrders]);

  const totalSpent = customerOrders.reduce((sum, o) => sum + o.total_amount, 0);

  return (
    <div className="border border-gray-200 rounded-xl p-4 mt-2">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-gray-900">Lịch sử mua hàng</h3>
          <span className="text-xs text-gray-400">({customerOrders.length} đơn)</span>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-emerald-700">Tổng: {formatCurrency(totalSpent)}</p>
        </div>
      </div>

      {loadingOrders ? (
        <p className="text-xs text-gray-400 text-center py-4">Đang tải...</p>
      ) : customerOrders.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">Chưa có đơn hàng nào</p>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {customerOrders.map(o => (
            <div key={o.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold text-gray-900">{o.order_no}</span>
                <Badge className={statusColor(o.status)}>{statusLabels[o.status] ?? o.status}</Badge>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-xs text-gray-400">{formatDate(o.created_at)}</span>
                <span className="text-xs font-bold text-blue-700">{formatCurrency(o.total_amount)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
