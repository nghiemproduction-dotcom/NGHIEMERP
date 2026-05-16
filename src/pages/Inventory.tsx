import { useEffect, useState, useCallback } from 'react';
import { Package, AlertTriangle, ArrowUpDown, MapPin, TrendingDown, Warehouse, Plus, Save, Trash2, FileText, DollarSign, BarChart3, Trophy } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import { formatCurrency, formatDate, formatNumber } from '../lib/utils';
import type { InventoryItem, MasterLocation, MasterUser } from '../types';
import { usePermissions } from '../lib/permissions';
import { useMultiRealtimeSubscription } from '../lib/useRealtime';

type Tab = 'stock' | 'transactions' | 'locations' | 'materials' | 'bom' | 'pos';

interface InvTxn {
  id: string; txn_no: string; txn_type: string; qty: number; unit_cost: number; total_cost: number;
  batch_no: string; notes: string; txn_date: string;
  material?: { name: string; unit: string };
  performed_by?: { full_name: string };
  from_location?: { name: string };
  to_location?: { name: string };
}

interface BomTemplate {
  id: string; name: string; description: string; version: number; status: string; created_at: string;
  bom_items?: { material_id: string; qty_per_unit: number; waste_rate: number; material: { name: string; unit: string } }[];
}

interface PartnerSettlement {
  id: string; settle_no: string; period: string; gross_sales: number; commission: number; net_payout: number; status: string; created_at: string;
}

const txnTypeLabels: Record<string, string> = {
  receipt: 'Nh\u1EADp kho', issue: 'Xu\u1EA5t kho', transfer: 'Chuy\u1EC3n kho',
  adjustment: '\u0110i\u1EC1u ch\u1EC9nh', waste: 'Hao h\u1EE5t', return: 'Ho\u00E0n kho',
};
const txnTypeColor: Record<string, string> = {
  receipt: 'bg-green-100 text-green-700', issue: 'bg-blue-100 text-blue-700',
  transfer: 'bg-amber-100 text-amber-700', adjustment: 'bg-gray-100 text-gray-700',
  waste: 'bg-red-100 text-red-700', return: 'bg-violet-100 text-violet-700',
};
const locTypeLabels: Record<string, string> = {
  warehouse: 'Kho', pos: '\u0110i\u1EC3m b\u00E1n', kiosk: 'Kiosk', consignment: 'K\u00FD g\u1EEDi', online: 'Online', partner: '\u0110\u1ED1i t\u00E1c',
};
const locTypeColor: Record<string, string> = {
  warehouse: 'bg-blue-100 text-blue-700', pos: 'bg-emerald-100 text-emerald-700',
  kiosk: 'bg-amber-100 text-amber-700', consignment: 'bg-violet-100 text-violet-700',
  online: 'bg-cyan-100 text-cyan-700', partner: 'bg-rose-100 text-rose-700',
};

function PartnerSettlementsList({ locationId }: { locationId: string }) {
  const [settlements, setSettlements] = useState<PartnerSettlement[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase.from('partner_settlements').select('*').eq('location_id', locationId).order('created_at', { ascending: false });
    setSettlements(data ?? []);
  }, [locationId]);

  useEffect(() => { load(); }, [load]);

  if (settlements.length === 0) return <p className="text-xs text-gray-400">Ch\u01B0a c\u00F3 settlement</p>;

  return (
    <div className="space-y-1">
      {settlements.map(s => (
        <div key={s.id} className="flex items-center justify-between text-xs bg-white rounded-lg px-2 py-1.5 border border-gray-100">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">{s.settle_no}</span>
            <span className="text-gray-500">{s.period}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-500">Doanh: {formatCurrency(s.gross_sales)}</span>
            <span className="text-gray-500">HH: {formatCurrency(s.commission)}</span>
            <span className="font-semibold text-gray-900">Net: {formatCurrency(s.net_payout)}</span>
            <Badge className={s.status === 'paid' ? 'bg-green-100 text-green-700' : s.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}>
              {s.status === 'paid' ? '\u0110\u00E3 TT' : s.status === 'pending' ? 'Ch\u1EDD' : s.status}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Inventory({ currentUser }: { currentUser: MasterUser }) {
  const perms = usePermissions(currentUser);
  const [tab, setTab] = useState<Tab>('stock');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<InvTxn[]>([]);
  const [locations, setLocations] = useState<MasterLocation[]>([]);
  const [materials, setMaterials] = useState<{ id: string; code: string; name: string; unit: string; cost_per_unit: number; min_stock: number; type: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [showTxnForm, setShowTxnForm] = useState(false);
  const [showMatForm, setShowMatForm] = useState(false);
  const [showLocForm, setShowLocForm] = useState(false);
  const [selectedLoc, setSelectedLoc] = useState<MasterLocation | null>(null);
  const [bomTemplates, setBomTemplates] = useState<BomTemplate[]>([]);
  const [showBomForm, setShowBomForm] = useState(false);
  const [bomForm, setBomForm] = useState({ name: '', description: '', version: 1, items: [{ material_id: '', qty_per_unit: 0, waste_rate: 0 }] });
  const [showSettlementForm, setShowSettlementForm] = useState(false);
  const [selectedPartnerLoc, setSelectedPartnerLoc] = useState<MasterLocation | null>(null);
  const [settlementForm, setSettlementForm] = useState({ period: '', gross_sales: 0, commission: 0, net_payout: 0 });

  // POS Report states
  const [posOrders, setPosOrders] = useState<{ location_id: string; total_amount: number; status: string; created_at: string }[]>([]);
  const [posLocations, setPosLocations] = useState<{ id: string; name: string; type: string }[]>([]);
  const [posDateFilter, setPosDateFilter] = useState<'this_month' | 'last_month' | 'all'>('this_month');

  const [txnForm, setTxnForm] = useState({ txn_type: 'receipt', material_id: '', location_id: '', qty: 0, unit_cost: 0, notes: '', batch_no: '' });
  const [matForm, setMatForm] = useState({ code: '', name: '', type: 'raw', unit: 'kg', cost_per_unit: 0, min_stock: 0 });
  const [locForm, setLocForm] = useState({ code: '', name: '', type: 'warehouse', address: '', partner_type: 'internal', commission_rate: 0, revenue_share: 0 });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const loadData = useCallback(async () => {
    setLoading(true);
    const [itemsRes, txnRes, locRes, matRes, bomRes, posOrdRes, posLocRes] = await Promise.all([
      supabase.from('inventory_items').select('*, material:materials(name,unit,min_stock,code), location:master_locations(name,type,code)').order('qty_on_hand', { ascending: true }),
      supabase.from('inventory_transactions').select('*, material:materials(name,unit), performed_by:master_users(full_name), from_location:master_locations!from_location_id(name), to_location:master_locations!to_location_id(name)').order('txn_date', { ascending: false }).limit(40),
      supabase.from('master_locations').select('*').order('type'),
      supabase.from('materials').select('*').order('name'),
      supabase.from('bom_templates').select('*, bom_items(material_id, qty_per_unit, waste_rate, material:materials(name, unit))').order('created_at', { ascending: false }),
      supabase.from('orders').select('location_id, total_amount, status, created_at'),
      supabase.from('master_locations').select('id, name, type').order('name'),
    ]);
    setItems(itemsRes.data ?? []);
    setTransactions(txnRes.data ?? []);
    setLocations(locRes.data ?? []);
    setMaterials(matRes.data ?? []);
    setBomTemplates(bomRes.data ?? []);
    setPosOrders(posOrdRes.data ?? []);
    setPosLocations(posLocRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useMultiRealtimeSubscription(['inventory_items', 'inventory_transactions', 'materials', 'locations'], loadData, [loadData]);

  const lowStockItems = items.filter(item => {
    const mat = item.material as unknown as { min_stock: number };
    return mat && item.qty_on_hand <= mat.min_stock && mat.min_stock > 0;
  });

  // INVENTORY TRANSACTION CRUD
  const createTxn = async () => {
    setSaving(true);
    const count = transactions.length + 1;
    const txnNo = `ITXN-${String(count).padStart(3, '0')}`;
    const mat = materials.find(m => m.id === txnForm.material_id);
    const unitCost = txnForm.unit_cost || mat?.cost_per_unit || 0;
    const totalCost = txnForm.qty * unitCost;

    const { error } = await supabase.from('inventory_transactions').insert({
      txn_no: txnNo, txn_type: txnForm.txn_type,
      material_id: txnForm.material_id || null,
      from_location_id: txnForm.txn_type === 'issue' || txnForm.txn_type === 'transfer' ? txnForm.location_id : null,
      to_location_id: txnForm.txn_type === 'receipt' || txnForm.txn_type === 'transfer' ? txnForm.location_id : null,
      qty: txnForm.qty, unit_cost: unitCost, total_cost: totalCost,
      batch_no: txnForm.batch_no, notes: txnForm.notes,
      txn_date: new Date().toISOString(),
    });
    if (!error) {
      // Update inventory_items
      if (txnForm.material_id && txnForm.location_id) {
        const locId = txnForm.txn_type === 'issue' ? txnForm.location_id : txnForm.location_id;
        const existing = items.find(i => i.material_id === txnForm.material_id && i.location_id === locId);
        if (existing) {
          const delta = txnForm.txn_type === 'receipt' || txnForm.txn_type === 'return' ? txnForm.qty : -txnForm.qty;
          await supabase.from('inventory_items').update({
            qty_on_hand: existing.qty_on_hand + delta,
            avg_cost: txnForm.txn_type === 'receipt' ? (existing.avg_cost * existing.qty_on_hand + totalCost) / (existing.qty_on_hand + delta) : existing.avg_cost,
          }).eq('id', existing.id);
        } else if (txnForm.txn_type === 'receipt') {
          await supabase.from('inventory_items').insert({
            material_id: txnForm.material_id, location_id: txnForm.location_id,
            qty_on_hand: txnForm.qty, avg_cost: unitCost,
          });
        }
      }
      showToast('Giao d\u1ECBch ' + txnNo + ' th\u00E0nh c\u00F4ng!');
      setShowTxnForm(false); loadData();
    } else showToast('L\u1ED7i: ' + error.message);
    setSaving(false);
  };

  // MATERIAL CRUD
  const createMaterial = async () => {
    setSaving(true);
    const { error } = await supabase.from('materials').insert(matForm);
    if (!error) { showToast('T\u1EA1o v\u1EADt t\u01B0 th\u00E0nh c\u00F4ng!'); setShowMatForm(false); loadData(); }
    else showToast('L\u1ED7i: ' + error.message);
    setSaving(false);
  };

  const deleteMaterial = async (id: string) => {
    if (!confirm('X\u00F3a v\u1EADt t\u01B0 n\u00E0y?')) return;
    const { error } = await supabase.from('materials').delete().eq('id', id);
    if (!error) { showToast('\u0110\u00E3 x\u00F3a v\u1EADt t\u01B0'); loadData(); }
    else showToast('L\u1ED7i: ' + error.message);
  };

  // LOCATION CRUD
  const saveLocation = async () => {
    setSaving(true);
    if (selectedLoc) {
      const { error } = await supabase.from('master_locations').update({
        name: locForm.name, type: locForm.type, address: locForm.address,
        partner_type: locForm.partner_type, commission_rate: locForm.commission_rate,
        revenue_share: locForm.revenue_share,
      }).eq('id', selectedLoc.id);
      if (!error) { showToast('C\u1EADp nh\u1EADt \u0111\u1ECBa \u0111i\u1EC3m th\u00E0nh c\u00F4ng'); setShowLocForm(false); setSelectedLoc(null); loadData(); }
      else showToast('L\u1ED7i: ' + error.message);
    } else {
      const { error } = await supabase.from('master_locations').insert({ ...locForm, is_active: true });
      if (!error) { showToast('T\u1EA1o \u0111\u1ECBa \u0111i\u1EC3m th\u00E0nh c\u00F4ng!'); setShowLocForm(false); loadData(); }
      else showToast('L\u1ED7i: ' + error.message);
    }
    setSaving(false);
  };

  const deleteLocation = async (id: string) => {
    if (!confirm('X\u00F3a \u0111\u1ECBa \u0111i\u1EC3m n\u00E0y?')) return;
    const { error } = await supabase.from('master_locations').delete().eq('id', id);
    if (!error) { showToast('\u0110\u00E3 x\u00F3a'); setShowLocForm(false); setSelectedLoc(null); loadData(); }
    else showToast('L\u1ED7i: ' + error.message);
  };

  // BOM TEMPLATE CRUD
  const createBomTemplate = async () => {
    setSaving(true);
    const count = bomTemplates.length + 1;
    const bomNo = `BOM-${String(count).padStart(3, '0')}`;
    const { data: bomData, error: bomError } = await supabase.from('bom_templates').insert({
      name: bomForm.name || bomNo, description: bomForm.description, version: bomForm.version, status: 'active',
    }).select('id').single();
    if (bomError) { showToast('L\u1ED7i: ' + bomError.message); setSaving(false); return; }
    const bomItems = bomForm.items.filter(i => i.material_id).map(i => ({
      bom_template_id: bomData.id, material_id: i.material_id,
      qty_per_unit: i.qty_per_unit, waste_rate: i.waste_rate,
    }));
    if (bomItems.length > 0) {
      const { error: itemsError } = await supabase.from('bom_items').insert(bomItems);
      if (itemsError) { showToast('L\u1ED7i items: ' + itemsError.message); setSaving(false); return; }
    }
    showToast('T\u1EA1o BOM th\u00E0nh c\u00F4ng!');
    setShowBomForm(false); setBomForm({ name: '', description: '', version: 1, items: [{ material_id: '', qty_per_unit: 0, waste_rate: 0 }] }); loadData();
    setSaving(false);
  };

  // PARTNER SETTLEMENTS
  const createSettlement = async () => {
    if (!selectedPartnerLoc) return;
    setSaving(true);
    const settleNo = `STL-${Date.now().toString(36).toUpperCase()}`;
    const { error } = await supabase.from('partner_settlements').insert({
      settle_no: settleNo, location_id: selectedPartnerLoc.id,
      period: settlementForm.period, gross_sales: settlementForm.gross_sales,
      commission: settlementForm.commission, net_payout: settlementForm.net_payout,
      status: 'pending',
    });
    if (!error) { showToast('T\u1EA1o settlement th\u00E0nh c\u00F4ng!'); setShowSettlementForm(false); }
    else showToast('L\u1ED7i: ' + error.message);
    setSaving(false);
  };

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'stock', label: 'T\u1ED3n kho', count: items.length },
    { id: 'transactions', label: 'L\u1ECBch s\u1EED', count: transactions.length },
    ...(perms.can('inventory') || perms.can('inventory_view') || perms.isSuperAdmin ? [
      { id: 'materials' as Tab, label: 'V\u1EADt t\u01B0', count: materials.length },
      { id: 'locations' as Tab, label: '\u0110\u1ECBa \u0111i\u1EC3m', count: locations.length },
      { id: 'bom' as Tab, label: 'BOM', count: bomTemplates.length },
    ] : []),
    ...(perms.can('pos') || perms.can('inventory') || perms.isSuperAdmin ? [
      { id: 'pos' as Tab, label: 'POS Report', count: posLocations.length },
    ] : []),
  ];

  const inputCls = 'w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white';
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';
  const btnPrimary = 'flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50';

  return (
    <div className="space-y-4">
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium">{toast}</div>}

      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-gray-900">Kho / \u0110\u1ED1i t\u00E1c</h1><p className="text-sm text-gray-500">Qu\u1EA3n l\u00FD t\u1ED3n kho, giao d\u1ECBch, \u0111\u1ECBa \u0111i\u1EC3m</p></div>
        <div className="flex gap-2">
          {tab === 'transactions' && perms.canWrite('inventory') && <button onClick={() => { setTxnForm({ txn_type: 'receipt', material_id: '', location_id: '', qty: 0, unit_cost: 0, notes: '', batch_no: '' }); setShowTxnForm(true); }} className={btnPrimary}><Plus className="w-4 h-4" /> Nh\u1EADp/Xu\u1EA5t</button>}
          {tab === 'materials' && perms.canWrite('materials') && <button onClick={() => { setMatForm({ code: '', name: '', type: 'raw', unit: 'kg', cost_per_unit: 0, min_stock: 0 }); setShowMatForm(true); }} className={btnPrimary}><Plus className="w-4 h-4" /> Th\u00EAm VT</button>}
          {tab === 'locations' && perms.canWrite('locations') && <button onClick={() => { setLocForm({ code: '', name: '', type: 'warehouse', address: '', partner_type: 'internal', commission_rate: 0, revenue_share: 0 }); setSelectedLoc(null); setShowLocForm(true); }} className={btnPrimary}><Plus className="w-4 h-4" /> Th\u00EAm</button>}
          {tab === 'bom' && perms.canWrite('bom') && <button onClick={() => { setBomForm({ name: '', description: '', version: 1, items: [{ material_id: '', qty_per_unit: 0, waste_rate: 0 }] }); setShowBomForm(true); }} className={btnPrimary}><Plus className="w-4 h-4" /> T\u1EA1o BOM</button>}
        </div>
      </div>

      {lowStockItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div><p className="text-sm font-semibold text-amber-800">{lowStockItems.length} m\u1EB7t h\u00E0ng d\u01B0\u1EDBi m\u1EE9c t\u1ED1i thi\u1EC3u</p>
            <p className="text-xs text-amber-600 mt-0.5">{lowStockItems.slice(0, 3).map(i => { const m = i.material as unknown as { name: string }; return m?.name; }).filter(Boolean).join(', ')}{lowStockItems.length > 3 && ` +${lowStockItems.length - 3} kh\u00E1c`}</p>
          </div>
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex-shrink-0 flex items-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${tab === t.id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
            <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${tab === t.id ? 'bg-violet-100 text-violet-700' : 'bg-gray-200 text-gray-500'}`}>{t.count}</span>
          </button>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-12 text-gray-400 text-sm">\u0110ang t\u1EA3i...</div> : (
        <>
          {/* STOCK */}
          {tab === 'stock' && <div className="space-y-2">{items.map(item => {
            const mat = item.material as unknown as { name: string; unit: string; min_stock: number; code: string };
            const loc = item.location as unknown as { name: string; type: string; code: string };
            const isLow = mat && item.qty_on_hand <= mat.min_stock && mat.min_stock > 0;
            const fillPct = mat?.min_stock > 0 ? Math.min((item.qty_on_hand / (mat.min_stock * 3)) * 100, 100) : 50;
            return (
              <Card key={item.id} className={`p-4 ${isLow ? 'border-amber-300' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${isLow ? 'bg-amber-100' : 'bg-blue-100'}`}>
                    {isLow ? <TrendingDown className="w-4 h-4 text-amber-600" /> : <Package className="w-4 h-4 text-blue-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{mat?.name ?? 'N/A'}</p>
                      {isLow && <Badge className="bg-amber-100 text-amber-700">S\u1EAFp h\u1EBFt</Badge>}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{loc?.name ?? '\u2014'}</p>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">T\u1ED3n: <span className={`font-bold ${isLow ? 'text-amber-700' : 'text-gray-900'}`}>{formatNumber(item.qty_on_hand)} {mat?.unit}</span></span>
                        <span className="text-gray-400">Min: {mat?.min_stock} {mat?.unit}</span>
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${isLow ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${fillPct}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-gray-900">{formatCurrency(item.avg_cost * item.qty_on_hand)}</p>
                    <p className="text-xs text-gray-400">Gi\u00E1 tb: {formatCurrency(item.avg_cost)}</p>
                  </div>
                </div>
              </Card>
            );
          })}</div>}

          {/* MATERIALS */}
          {tab === 'materials' && (perms.can('inventory') || perms.can('inventory_view') || perms.isSuperAdmin) && <div className="space-y-2">{materials.map(mat => (
            <Card key={mat.id} className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg flex-shrink-0 ${mat.type === 'raw' ? 'bg-blue-100' : mat.type === 'tool' ? 'bg-amber-100' : mat.type === 'packaging' ? 'bg-violet-100' : 'bg-gray-100'}`}>
                  <Package className={`w-4 h-4 ${mat.type === 'raw' ? 'text-blue-600' : mat.type === 'tool' ? 'text-amber-600' : 'text-gray-600'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">{mat.name}</p>
                    <Badge className={mat.type === 'raw' ? 'bg-blue-100 text-blue-700' : mat.type === 'tool' ? 'bg-amber-100 text-amber-700' : mat.type === 'packaging' ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600'}>
                      {mat.type === 'raw' ? 'Nguy\u00EAn li\u1EC7u' : mat.type === 'tool' ? 'C\u00F4ng c\u1EE5' : mat.type === 'packaging' ? '\u0110\u00F3ng g\u00F3i' : mat.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">M\u00E3: {mat.code} \u2022 \u0110VT: {mat.unit} \u2022 Min: {mat.min_stock}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-gray-900">{formatCurrency(mat.cost_per_unit)}/{mat.unit}</p>
                  {perms.canDelete('materials') && <button onClick={() => deleteMaterial(mat.id)} className="text-xs text-red-500 hover:text-red-700 mt-1"><Trash2 className="w-3 h-3 inline" /> X\u00F3a</button>}
                </div>
              </div>
            </Card>
          ))}</div>}

          {/* TRANSACTIONS */}
          {tab === 'transactions' && <div className="space-y-2">{transactions.length === 0 ? <EmptyState icon={ArrowUpDown} title="Ch\u01B0a c\u00F3 giao d\u1ECBch" /> : transactions.map(txn => {
            const mat = txn.material as unknown as { name: string; unit: string };
            const performer = txn.performed_by as unknown as { full_name: string };
            const fromLoc = txn.from_location as unknown as { name: string };
            const toLoc = txn.to_location as unknown as { name: string };
            return (
              <Card key={txn.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`px-2 py-1 rounded-lg flex-shrink-0 ${txnTypeColor[txn.txn_type] ?? 'bg-gray-100 text-gray-700'}`}>
                    <span className="text-xs font-semibold">{txnTypeLabels[txn.txn_type] ?? txn.txn_type}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{mat?.name ?? '\u2014'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{fromLoc?.name && `T\u1EEB: ${fromLoc.name}`}{toLoc?.name && ` \u2192 ${toLoc.name}`}</p>
                    {performer?.full_name && <p className="text-xs text-gray-400 mt-0.5">B\u1EDFi: {performer.full_name}</p>}
                    {txn.notes && <p className="text-xs text-gray-400 mt-0.5 italic">{txn.notes}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-bold ${txn.txn_type === 'receipt' || txn.txn_type === 'return' ? 'text-green-700' : 'text-red-600'}`}>
                      {txn.txn_type === 'receipt' || txn.txn_type === 'return' ? '+' : '-'}{formatNumber(txn.qty)} {mat?.unit}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(txn.txn_date)}</p>
                  </div>
                </div>
              </Card>
            );
          })}</div>}

          {/* LOCATIONS */}
          {tab === 'locations' && (perms.can('inventory') || perms.can('inventory_view') || perms.isSuperAdmin) && (
            <div className="space-y-2">
              {locations.map(loc => (
                <div key={loc.id} className="space-y-2">
                  <Card className="p-4" {...(perms.canDelete('locations') ? { onClick: () => { setLocForm({ code: loc.code, name: loc.name, type: loc.type, address: loc.address || '', partner_type: loc.partner_type, commission_rate: loc.commission_rate, revenue_share: loc.revenue_share }); setSelectedLoc(loc); setShowLocForm(true); } } : {})}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg flex-shrink-0 ${locTypeColor[loc.type] ?? 'bg-gray-100 text-gray-700'}`}>
                        {loc.type === 'warehouse' ? <Warehouse className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900 truncate">{loc.name}</p>
                          <Badge className={locTypeColor[loc.type] ?? 'bg-gray-100 text-gray-600'}>{locTypeLabels[loc.type] ?? loc.type}</Badge>
                          {!loc.is_active && <Badge className="bg-gray-100 text-gray-500">Ng\u1EEBng</Badge>}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{loc.address}</p>
                        {loc.partner_type !== 'internal' && <p className="text-xs text-gray-400 mt-0.5">Hoa h\u1ED3ng: {loc.commission_rate}% \u2022 DT: {loc.revenue_share}%</p>}
                      </div>
                    </div>
                  </Card>
                  {loc.partner_type !== 'internal' && (
                    <div className="ml-4 bg-violet-50 border border-violet-200 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-violet-700 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Settlements</p>
                        {perms.canWrite('inventory') && <button onClick={(e) => { e.stopPropagation(); setSelectedPartnerLoc(loc); setSettlementForm({ period: '', gross_sales: 0, commission: 0, net_payout: 0 }); setShowSettlementForm(true); }} className="text-xs font-semibold bg-violet-600 text-white px-2 py-1 rounded-lg hover:bg-violet-700 active:scale-95 transition-all flex items-center gap-1"><Plus className="w-3 h-3" /> T\u1EA1o settlement</button>}
                      </div>
                      <PartnerSettlementsList locationId={loc.id} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* BOM TEMPLATES */}
          {tab === 'bom' && (perms.can('inventory') || perms.can('inventory_view') || perms.isSuperAdmin) && <div className="space-y-2">{bomTemplates.length === 0 ? <EmptyState icon={FileText} title="Ch\u01B0a c\u00F3 BOM template" /> : bomTemplates.map(bom => (
            <Card key={bom.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-violet-100 rounded-lg flex-shrink-0"><FileText className="w-4 h-4 text-violet-600" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">{bom.name}</p>
                    <Badge className="bg-violet-100 text-violet-700">v{bom.version}</Badge>
                    <Badge className={bom.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>{bom.status === 'active' ? 'Hi\u1EC7u l\u1EF1c' : bom.status}</Badge>
                  </div>
                  {bom.description && <p className="text-xs text-gray-500 mt-0.5">{bom.description}</p>}
                  {bom.bom_items && bom.bom_items.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {bom.bom_items.map((item, idx) => {
                        const mat = item.material as unknown as { name: string; unit: string };
                        return (
                          <div key={idx} className="flex items-center gap-2 text-xs bg-gray-50 rounded-lg px-2 py-1.5">
                            <span className="font-medium text-gray-900">{mat?.name ?? '\u2014'}</span>
                            <span className="text-gray-500">{formatNumber(item.qty_per_unit)} {mat?.unit}</span>
                            {item.waste_rate > 0 && <Badge className="bg-red-100 text-red-700">HL: {item.waste_rate}%</Badge>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}</div>}

          {/* POS REPORT */}
          {tab === 'pos' && (perms.can('pos') || perms.can('inventory') || perms.isSuperAdmin) && (() => {
            const now = new Date();
            const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
            const lastMonthEnd = thisMonthStart;

            const filtered = posOrders.filter(o => {
              if (posDateFilter === 'this_month') return o.created_at >= thisMonthStart;
              if (posDateFilter === 'last_month') return o.created_at >= lastMonthStart && o.created_at < lastMonthEnd;
              return true;
            });

            const locMap = new Map(posLocations.map(l => [l.id, l.name]));
            const aggregated = new Map<string, { name: string; type: string; orderCount: number; totalRevenue: number }>();
            for (const o of filtered) {
              if (!o.location_id) continue;
              const existing = aggregated.get(o.location_id) ?? { name: locMap.get(o.location_id) ?? 'Unknown', type: posLocations.find(l => l.id === o.location_id)?.type ?? '', orderCount: 0, totalRevenue: 0 };
              existing.orderCount++;
              existing.totalRevenue += o.total_amount || 0;
              aggregated.set(o.location_id, existing);
            }

            const reportData = Array.from(aggregated.entries()).map(([id, data]) => ({
              id, ...data,
              avgOrderValue: data.orderCount > 0 ? data.totalRevenue / data.orderCount : 0,
            })).sort((a, b) => b.totalRevenue - a.totalRevenue);

            const topPerformer = reportData.length > 0 ? reportData[0].id : null;

            return (
              <div className="space-y-3">
                {/* Date filter */}
                <div className="flex gap-2">
                  {([['this_month', 'Th\u00E1ng n\u00E0y'], ['last_month', 'Th\u00E1ng tr\u01B0\u1EDBc'], ['all', 'T\u1EA5t c\u1EA3']] as const).map(([val, label]) => (
                    <button key={val} onClick={() => setPosDateFilter(val)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${posDateFilter === val ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {label}
                    </button>
                  ))}
                </div>

                {/* Summary */}
                <div className="grid grid-cols-3 gap-2">
                  <Card className="p-3 text-center">
                    <p className="text-xs text-gray-500">T\u1ED5ng \u0111\u01A1n</p>
                    <p className="text-lg font-bold text-gray-900">{filtered.length}</p>
                  </Card>
                  <Card className="p-3 text-center">
                    <p className="text-xs text-gray-500">Doanh thu</p>
                    <p className="text-lg font-bold text-blue-700">{formatCurrency(filtered.reduce((s, o) => s + (o.total_amount || 0), 0))}</p>
                  </Card>
                  <Card className="p-3 text-center">
                    <p className="text-xs text-gray-500">TB/\u0111\u01A1n</p>
                    <p className="text-lg font-bold text-emerald-700">{formatCurrency(filtered.length > 0 ? filtered.reduce((s, o) => s + (o.total_amount || 0), 0) / filtered.length : 0)}</p>
                  </Card>
                </div>

                {/* Location cards */}
                {reportData.length === 0 ? (
                  <EmptyState icon={BarChart3} title="Ch\u01B0a c\u00F3 d\u1EEF li\u1EC7u POS" />
                ) : reportData.map(loc => (
                  <Card key={loc.id} className={`p-4 ${loc.id === topPerformer ? 'border-amber-300 bg-amber-50' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg flex-shrink-0 ${loc.id === topPerformer ? 'bg-amber-100' : 'bg-blue-100'}`}>
                        {loc.id === topPerformer ? <Trophy className="w-4 h-4 text-amber-600" /> : <BarChart3 className="w-4 h-4 text-blue-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900 truncate">{loc.name}</p>
                          <Badge className={locTypeColor[loc.type] ?? 'bg-gray-100 text-gray-600'}>{locTypeLabels[loc.type] ?? loc.type}</Badge>
                          {loc.id === topPerformer && <Badge className="bg-amber-100 text-amber-700">Top</Badge>}
                        </div>
                        <div className="grid grid-cols-3 gap-3 mt-2">
                          <div>
                            <p className="text-xs text-gray-500">S\u1ED1 \u0111\u01A1n</p>
                            <p className="text-sm font-bold text-gray-900">{formatNumber(loc.orderCount)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Doanh thu</p>
                            <p className="text-sm font-bold text-blue-700">{formatCurrency(loc.totalRevenue)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">TB/\u0111\u01A1n</p>
                            <p className="text-sm font-bold text-emerald-700">{formatCurrency(loc.avgOrderValue)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            );
          })()}
        </>
      )}

      {/* TRANSACTION FORM */}
      <Modal open={showTxnForm} onClose={() => setShowTxnForm(false)} title="Nh\u1EADp / Xu\u1EA5t kho" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Lo\u1EA1i giao d\u1ECBch</label>
              <select className={inputCls} value={txnForm.txn_type} onChange={e => setTxnForm(f => ({ ...f, txn_type: e.target.value }))}>
                {Object.entries(txnTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>V\u1EADt t\u01B0</label>
              <select className={inputCls} value={txnForm.material_id} onChange={e => setTxnForm(f => ({ ...f, material_id: e.target.value }))}>
                <option value="">\u2014 Ch\u1ECDn v\u1EADt t\u01B0 \u2014</option>
                {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
              </select>
            </div>
          </div>
          <div><label className={labelCls}>\u0110\u1ECBa \u0111i\u1EC3m</label>
            <select className={inputCls} value={txnForm.location_id} onChange={e => setTxnForm(f => ({ ...f, location_id: e.target.value }))}>
              <option value="">\u2014 Ch\u1ECDn \u0111\u1ECBa \u0111i\u1EC3m \u2014</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>S\u1ED1 l\u01B0\u1EE3ng</label>
              <input type="number" className={inputCls} value={txnForm.qty || ''} onChange={e => setTxnForm(f => ({ ...f, qty: Number(e.target.value) }))} />
            </div>
            <div><label className={labelCls}>\u0110\u01A1n gi\u00E1 (VND)</label>
              <input type="number" className={inputCls} value={txnForm.unit_cost || ''} onChange={e => setTxnForm(f => ({ ...f, unit_cost: Number(e.target.value) }))} placeholder="\u0110\u1EC3 tr\u1ED1ng = gi\u00E1 v\u1EADt t\u01B0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>S\u1ED1 l\u00F4</label><input className={inputCls} value={txnForm.batch_no} onChange={e => setTxnForm(f => ({ ...f, batch_no: e.target.value }))} /></div>
            <div><label className={labelCls}>Ghi ch\u00FA</label><input className={inputCls} value={txnForm.notes} onChange={e => setTxnForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={createTxn} disabled={saving || !txnForm.qty || !txnForm.material_id} className={btnPrimary + ' flex-1'}><Save className="w-4 h-4" />{saving ? '\u0110ang l\u01B0u...' : 'Th\u1EF1c hi\u1EC7n'}</button>
            <button onClick={() => setShowTxnForm(false)} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50">H\u1EE7y</button>
          </div>
        </div>
      </Modal>

      {/* MATERIAL FORM */}
      <Modal open={showMatForm} onClose={() => setShowMatForm(false)} title="Th\u00EAm v\u1EADt t\u01B0" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>M\u00E3 *</label><input className={inputCls} value={matForm.code} onChange={e => setMatForm(f => ({ ...f, code: e.target.value }))} placeholder="MAT-016" /></div>
            <div><label className={labelCls}>T\u00EAn *</label><input className={inputCls} value={matForm.name} onChange={e => setMatForm(f => ({ ...f, name: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={labelCls}>Lo\u1EA1i</label>
              <select className={inputCls} value={matForm.type} onChange={e => setMatForm(f => ({ ...f, type: e.target.value }))}>
                <option value="raw">Nguy\u00EAn li\u1EC7u</option><option value="tool">C\u00F4ng c\u1EE5</option><option value="packaging">\u0110\u00F3ng g\u00F3i</option>
              </select>
            </div>
            <div><label className={labelCls}>\u0110VT</label><input className={inputCls} value={matForm.unit} onChange={e => setMatForm(f => ({ ...f, unit: e.target.value }))} /></div>
            <div><label className={labelCls}>T\u1ED3n min</label><input type="number" className={inputCls} value={matForm.min_stock} onChange={e => setMatForm(f => ({ ...f, min_stock: Number(e.target.value) }))} /></div>
          </div>
          <div><label className={labelCls}>Gi\u00E1 / \u0110VT (VND)</label><input type="number" className={inputCls} value={matForm.cost_per_unit || ''} onChange={e => setMatForm(f => ({ ...f, cost_per_unit: Number(e.target.value) }))} /></div>
          <div className="flex gap-2 pt-2">
            <button onClick={createMaterial} disabled={saving || !matForm.code || !matForm.name} className={btnPrimary + ' flex-1'}><Save className="w-4 h-4" />{saving ? '\u0110ang l\u01B0u...' : 'T\u1EA1o v\u1EADt t\u01B0'}</button>
            <button onClick={() => setShowMatForm(false)} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50">H\u1EE7y</button>
          </div>
        </div>
      </Modal>

      {/* LOCATION FORM */}
      <Modal open={showLocForm} onClose={() => { setShowLocForm(false); setSelectedLoc(null); }} title={selectedLoc ? 'S\u1EEDa \u0111\u1ECBa \u0111i\u1EC3m' : 'Th\u00EAm \u0111\u1ECBa \u0111i\u1EC3m'} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>M\u00E3 *</label><input className={inputCls} value={locForm.code} onChange={e => setLocForm(f => ({ ...f, code: e.target.value }))} disabled={!!selectedLoc} /></div>
            <div><label className={labelCls}>T\u00EAn *</label><input className={inputCls} value={locForm.name} onChange={e => setLocForm(f => ({ ...f, name: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Lo\u1EA1i</label>
              <select className={inputCls} value={locForm.type} onChange={e => setLocForm(f => ({ ...f, type: e.target.value }))}>
                {Object.entries(locTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>\u0110\u1ED1i t\u00E1c</label>
              <select className={inputCls} value={locForm.partner_type} onChange={e => setLocForm(f => ({ ...f, partner_type: e.target.value }))}>
                <option value="internal">N\u1ED9i b\u1ED9</option><option value="partner">\u0110\u1ED1i t\u00E1c</option><option value="consignment">K\u00FD g\u1EEDi</option>
              </select>
            </div>
          </div>
          <div><label className={labelCls}>\u0110\u1ECBa ch\u1EC9</label><input className={inputCls} value={locForm.address} onChange={e => setLocForm(f => ({ ...f, address: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Hoa h\u1ED3ng (%)</label><input type="number" className={inputCls} value={locForm.commission_rate} onChange={e => setLocForm(f => ({ ...f, commission_rate: Number(e.target.value) }))} /></div>
            <div><label className={labelCls}>Chia s\u1EBB DT (%)</label><input type="number" className={inputCls} value={locForm.revenue_share} onChange={e => setLocForm(f => ({ ...f, revenue_share: Number(e.target.value) }))} /></div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={saveLocation} disabled={saving || !locForm.code || !locForm.name} className={btnPrimary + ' flex-1'}><Save className="w-4 h-4" />{saving ? '\u0110ang l\u01B0u...' : selectedLoc ? 'C\u1EADp nh\u1EADt' : 'T\u1EA1o \u0111\u1ECBa \u0111i\u1EC3m'}</button>
            {selectedLoc && perms.canDelete('locations') && <button onClick={() => deleteLocation(selectedLoc.id)} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50"><Trash2 className="w-4 h-4" />X\u00F3a</button>}
            <button onClick={() => { setShowLocForm(false); setSelectedLoc(null); }} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50">H\u1EE7y</button>
          </div>
        </div>
      </Modal>

      {/* BOM FORM */}
      <Modal open={showBomForm} onClose={() => setShowBomForm(false)} title="T\u1EA1o BOM template" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>T\u00EAn BOM *</label><input className={inputCls} value={bomForm.name} onChange={e => setBomForm(f => ({ ...f, name: e.target.value }))} placeholder="BOM-001" /></div>
            <div><label className={labelCls}>Phi\u00EAn b\u1EA3n</label><input type="number" className={inputCls} value={bomForm.version} onChange={e => setBomForm(f => ({ ...f, version: Number(e.target.value) }))} /></div>
          </div>
          <div><label className={labelCls}>M\u00F4 t\u1EA3</label><input className={inputCls} value={bomForm.description} onChange={e => setBomForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelCls}>Danh s\u00E1ch v\u1EADt t\u01B0</label>
              <button onClick={() => setBomForm(f => ({ ...f, items: [...f.items, { material_id: '', qty_per_unit: 0, waste_rate: 0 }] }))} className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"><Plus className="w-3 h-3" /> Th\u00EAm d\u00F2ng</button>
            </div>
            <div className="space-y-2">
              {bomForm.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-4 gap-2 items-end">
                  <div className="col-span-2">
                    <select className={inputCls} value={item.material_id} onChange={e => { const newItems = [...bomForm.items]; newItems[idx] = { ...newItems[idx], material_id: e.target.value }; setBomForm(f => ({ ...f, items: newItems })); }}>
                      <option value="">\u2014 Ch\u1ECDn v\u1EADt t\u01B0 \u2014</option>
                      {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                    </select>
                  </div>
                  <div><input type="number" className={inputCls} value={item.qty_per_unit || ''} onChange={e => { const newItems = [...bomForm.items]; newItems[idx] = { ...newItems[idx], qty_per_unit: Number(e.target.value) }; setBomForm(f => ({ ...f, items: newItems })); }} placeholder="SL/\u0111v" /></div>
                  <div className="flex gap-1">
                    <input type="number" className={inputCls} value={item.waste_rate || ''} onChange={e => { const newItems = [...bomForm.items]; newItems[idx] = { ...newItems[idx], waste_rate: Number(e.target.value) }; setBomForm(f => ({ ...f, items: newItems })); }} placeholder="HL %" />
                    {bomForm.items.length > 1 && <button onClick={() => setBomForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="w-3 h-3" /></button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={createBomTemplate} disabled={saving || !bomForm.name} className={btnPrimary + ' flex-1'}><Save className="w-4 h-4" />{saving ? '\u0110ang l\u01B0u...' : 'T\u1EA1o BOM'}</button>
            <button onClick={() => setShowBomForm(false)} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50">H\u1EE7y</button>
          </div>
        </div>
      </Modal>

      {/* SETTLEMENT FORM */}
      <Modal open={showSettlementForm} onClose={() => setShowSettlementForm(false)} title="T\u1EA1o settlement" size="md">
        <div className="space-y-4">
          <div><label className={labelCls}>K\u1EF3 *</label><input className={inputCls} value={settlementForm.period} onChange={e => setSettlementForm(f => ({ ...f, period: e.target.value }))} placeholder="2025-01" /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={labelCls}>Doanh s\u1ED1 (VND)</label><input type="number" className={inputCls} value={settlementForm.gross_sales || ''} onChange={e => setSettlementForm(f => ({ ...f, gross_sales: Number(e.target.value) }))} /></div>
            <div><label className={labelCls}>Hoa h\u1ED3ng (VND)</label><input type="number" className={inputCls} value={settlementForm.commission || ''} onChange={e => setSettlementForm(f => ({ ...f, commission: Number(e.target.value) }))} /></div>
            <div><label className={labelCls}>Net payout (VND)</label><input type="number" className={inputCls} value={settlementForm.net_payout || ''} onChange={e => setSettlementForm(f => ({ ...f, net_payout: Number(e.target.value) }))} /></div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={createSettlement} disabled={saving || !settlementForm.period} className={btnPrimary + ' flex-1'}><Save className="w-4 h-4" />{saving ? '\u0110ang l\u01B0u...' : 'T\u1EA1o settlement'}</button>
            <button onClick={() => setShowSettlementForm(false)} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50">H\u1EE7y</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
