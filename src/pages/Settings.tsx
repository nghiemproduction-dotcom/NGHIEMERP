import { useEffect, useState, useCallback } from 'react';
import { Settings2, Users, Tag, MapPin, Shield, Plus, Save, Trash2, BookOpen, GitBranch, Award, Workflow, ChevronDown, ChevronRight, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { formatCurrency } from '../lib/utils';
import type { MasterRole, MasterUser, MasterLocation } from '../types';
import { usePermissions } from '../lib/permissions';

type Tab = 'users' | 'roles' | 'locations' | 'categories' | 'sops' | 'statuses' | 'tiers' | 'workflows' | 'general';

interface MasterCategory { id: string; code: string; name: string; type: string; unit: string; min_stock: number; is_active: boolean; }
interface AppSetting { id?: string; key: string; value: string; category: string; label: string; description: string; }

interface SopItem { id: string; sop_code: string; title: string; purpose: string; applicable_roles: string[]; steps: Array<{ step: number; title: string; detail: string }>; qc_criteria: string[]; version: number; status: string; }
interface MasterStatus { id: string; code: string; name: string; domain: string; color: string; bg_color: string; sort_order: number; is_terminal: boolean; allowed_next: string[]; }
interface MasterTier { id: string; code: string; name: string; type: string; min_value: number; discount_rate: number; commission_rate: number; benefits: string[]; color: string; }
interface WorkflowTemplate { id: string; code: string; name: string; product_type: string; description: string; is_active: boolean; version: number; }
interface WorkflowStage { id: string; template_id: string; code: string; name: string; sort_order: number; duration_hours: number; required_role: string; requires_qc: boolean; requires_photo: boolean; sop_code: string; auto_assign: boolean; notes: string; }

const catTypeLabel: Record<string, string> = { product: 'Sản phẩm', material: 'Vật tư', tool: 'Công cụ', service: 'Dịch vụ' };
const statusColors: Record<string, string> = { active: 'bg-green-100 text-green-700', on_leave: 'bg-yellow-100 text-yellow-700', inactive: 'bg-gray-100 text-gray-500' };

export default function Settings({ currentUser }: { currentUser: MasterUser }) {
  const perms = usePermissions(currentUser);
  const [tab, setTab] = useState<Tab>('users');
  const [roles, setRoles] = useState<MasterRole[]>([]);
  const [users, setUsers] = useState<MasterUser[]>([]);
  const [locations, setLocations] = useState<MasterLocation[]>([]);
  const [categories, setCategories] = useState<MasterCategory[]>([]);
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [showUserForm, setShowUserForm] = useState(false);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<MasterUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<MasterRole | null>(null);
  const [selectedCat, setSelectedCat] = useState<MasterCategory | null>(null);

  const [userForm, setUserForm] = useState({ code: '', full_name: '', email: '', phone: '', role_code: 'trainee', status: 'active', skills: '', shift: 'full-time', monthly_salary: 0, notes: '' });
  const [roleForm, setRoleForm] = useState({ code: '', name: '', description: '', menu_access: '' });
  const [catForm, setCatForm] = useState({ code: '', name: '', type: 'product', unit: 'cai', min_stock: 0 });

  // New tab states
  const [sops, setSops] = useState<SopItem[]>([]);
  const [statuses, setStatuses] = useState<MasterStatus[]>([]);
  const [tiers, setTiers] = useState<MasterTier[]>([]);
  const [workflowTemplates, setWorkflowTemplates] = useState<WorkflowTemplate[]>([]);
  const [workflowStages, setWorkflowStages] = useState<WorkflowStage[]>([]);
  const [expandedWorkflow, setExpandedWorkflow] = useState<string | null>(null);

  const [showSopForm, setShowSopForm] = useState(false);
  const [showStatusForm, setShowStatusForm] = useState(false);
  const [showTierForm, setShowTierForm] = useState(false);
  const [showWorkflowForm, setShowWorkflowForm] = useState(false);
  const [showStageForm, setShowStageForm] = useState(false);
  const [selectedSop, setSelectedSop] = useState<SopItem | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<MasterStatus | null>(null);
  const [selectedTier, setSelectedTier] = useState<MasterTier | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowTemplate | null>(null);
  const [selectedStage, setSelectedStage] = useState<WorkflowStage | null>(null);
  const [stageTemplateId, setStageTemplateId] = useState<string>('');

  const [sopForm, setSopForm] = useState({ sop_code: '', title: '', purpose: '', applicable_roles: '', steps: [{ step: 1, title: '', detail: '' }] as Array<{ step: number; title: string; detail: string }>, qc_criteria: '', version: 1, status: 'draft' });
  const [statusForm, setStatusForm] = useState({ code: '', name: '', domain: 'order', color: '', bg_color: '', sort_order: 0, is_terminal: false, allowed_next: '' });
  const [tierForm, setTierForm] = useState({ code: '', name: '', type: 'customer', min_value: 0, discount_rate: 0, commission_rate: 0, benefits: '', color: '' });
  const [wfForm, setWfForm] = useState({ code: '', name: '', product_type: '', description: '', is_active: true, version: 1 });
  const [stageForm, setStageForm] = useState({ code: '', name: '', sort_order: 0, duration_hours: 0, required_role: '', requires_qc: false, requires_photo: false, sop_code: '', auto_assign: false, notes: '' });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const loadData = useCallback(async () => {
    setLoading(true);
    const [rolesRes, usersRes, locRes, catRes, settRes, sopRes, statusRes, tierRes, wfRes, wfStageRes] = await Promise.all([
      supabase.from('master_roles').select('*').order('sort_order'),
      supabase.from('master_users').select('*').order('full_name'),
      supabase.from('master_locations').select('*').order('type'),
      supabase.from('master_categories').select('*').order('type'),
      supabase.from('app_settings').select('*').order('category'),
      supabase.from('sop_library').select('*').order('sop_code'),
      supabase.from('master_status').select('*').order('domain').order('sort_order'),
      supabase.from('master_tiers').select('*').order('type').order('min_value'),
      supabase.from('workflow_templates').select('*').order('code'),
      supabase.from('workflow_stages').select('*').order('template_id').order('sort_order'),
    ]);
    setRoles(rolesRes.data ?? []);
    setUsers(usersRes.data ?? []);
    setLocations(locRes.data ?? []);
    setCategories(catRes.data ?? []);
    setSettings(settRes.data ?? []);
    setSops(sopRes.data ?? []);
    setStatuses(statusRes.data ?? []);
    setTiers(tierRes.data ?? []);
    setWorkflowTemplates(wfRes.data ?? []);
    setWorkflowStages(wfStageRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const roleMap = Object.fromEntries(roles.map(r => [r.code, r.name]));

  // USER CRUD
  const openNewUser = () => {
    setUserForm({ code: '', full_name: '', email: '', phone: '', role_code: 'trainee', status: 'active', skills: '', shift: 'full-time', monthly_salary: 0, notes: '' });
    setSelectedUser(null); setShowUserForm(true);
  };
  const openEditUser = (u: MasterUser) => {
    setUserForm({ code: u.code, full_name: u.full_name, email: u.email || '', phone: u.phone || '', role_code: u.role_code, status: u.status, skills: u.skills.join(', '), shift: u.shift, monthly_salary: u.monthly_salary, notes: u.notes || '' });
    setSelectedUser(u); setShowUserForm(true);
  };
  const saveUser = async () => {
    setSaving(true);
    const skills = userForm.skills.split(',').map(s => s.trim()).filter(Boolean);
    if (selectedUser) {
      const { error } = await supabase.from('master_users').update({
        full_name: userForm.full_name, email: userForm.email, phone: userForm.phone,
        role_code: userForm.role_code, status: userForm.status, skills, shift: userForm.shift,
        monthly_salary: userForm.monthly_salary, notes: userForm.notes,
      }).eq('id', selectedUser.id);
      if (!error) { showToast('Cập nhật nhân sự thành công'); setShowUserForm(false); setSelectedUser(null); loadData(); }
      else showToast('Lỗi: ' + error.message);
    } else {
      const count = users.length + 1;
      const code = userForm.code || `USR-${String(count).padStart(3, '0')}`;
      const { error } = await supabase.from('master_users').insert({ code, full_name: userForm.full_name, email: userForm.email, phone: userForm.phone, role_code: userForm.role_code, status: userForm.status, skills, shift: userForm.shift, monthly_salary: userForm.monthly_salary, notes: userForm.notes });
      if (!error) { showToast('Tạo nhân sự ' + code + ' thành công!'); setShowUserForm(false); loadData(); }
      else showToast('Lỗi: ' + error.message);
    }
    setSaving(false);
  };
  const deleteUser = async (id: string) => {
    if (!confirm('Xóa nhân sự này?')) return;
    const { error } = await supabase.from('master_users').delete().eq('id', id);
    if (!error) { showToast('Đã xóa'); setShowUserForm(false); setSelectedUser(null); loadData(); }
    else showToast('Lỗi: ' + error.message);
  };

  // ROLE CRUD
  const openNewRole = () => { setRoleForm({ code: '', name: '', description: '', menu_access: '' }); setSelectedRole(null); setShowRoleForm(true); };
  const openEditRole = (r: MasterRole) => { setRoleForm({ code: r.code, name: r.name, description: r.description, menu_access: r.menu_access.join(', ') }); setSelectedRole(r); setShowRoleForm(true); };
  const saveRole = async () => {
    setSaving(true);
    const menuAccess = roleForm.menu_access.split(',').map(s => s.trim()).filter(Boolean);
    if (selectedRole) {
      const { error } = await supabase.from('master_roles').update({ name: roleForm.name, description: roleForm.description, menu_access: menuAccess }).eq('id', selectedRole.id);
      if (!error) { showToast('Cập nhật vai trò thành công'); setShowRoleForm(false); setSelectedRole(null); loadData(); }
      else showToast('Lỗi: ' + error.message);
    } else {
      const { error } = await supabase.from('master_roles').insert({ code: roleForm.code, name: roleForm.name, description: roleForm.description, menu_access: menuAccess, is_active: true, sort_order: roles.length + 1 });
      if (!error) { showToast('Tạo vai trò thành công!'); setShowRoleForm(false); loadData(); }
      else showToast('Lỗi: ' + error.message);
    }
    setSaving(false);
  };
  const deleteRole = async (id: string) => {
    if (!confirm('Xóa vai trò này?')) return;
    const { error } = await supabase.from('master_roles').delete().eq('id', id);
    if (!error) { showToast('Đã xóa'); setShowRoleForm(false); setSelectedRole(null); loadData(); }
    else showToast('Lỗi: ' + error.message);
  };

  // CATEGORY CRUD
  const openNewCat = () => { setCatForm({ code: '', name: '', type: 'product', unit: 'cai', min_stock: 0 }); setSelectedCat(null); setShowCatForm(true); };
  const openEditCat = (c: MasterCategory) => { setCatForm({ code: c.code, name: c.name, type: c.type, unit: c.unit, min_stock: c.min_stock }); setSelectedCat(c); setShowCatForm(true); };
  const saveCat = async () => {
    setSaving(true);
    if (selectedCat) {
      const { error } = await supabase.from('master_categories').update({ name: catForm.name, type: catForm.type, unit: catForm.unit, min_stock: catForm.min_stock }).eq('id', selectedCat.id);
      if (!error) { showToast('Cập nhật danh mục thành công'); setShowCatForm(false); setSelectedCat(null); loadData(); }
      else showToast('Lỗi: ' + error.message);
    } else {
      const { error } = await supabase.from('master_categories').insert({ code: catForm.code, name: catForm.name, type: catForm.type, unit: catForm.unit, min_stock: catForm.min_stock, is_active: true });
      if (!error) { showToast('Tạo danh mục thành công!'); setShowCatForm(false); loadData(); }
      else showToast('Lỗi: ' + error.message);
    }
    setSaving(false);
  };
  const deleteCat = async (id: string) => {
    if (!confirm('Xóa danh mục này?')) return;
    const { error } = await supabase.from('master_categories').delete().eq('id', id);
    if (!error) { showToast('Đã xóa'); setShowCatForm(false); setSelectedCat(null); loadData(); }
    else showToast('Lỗi: ' + error.message);
  };

  // SOP CRUD
  const openNewSop = () => {
    setSopForm({ sop_code: '', title: '', purpose: '', applicable_roles: '', steps: [{ step: 1, title: '', detail: '' }], qc_criteria: '', version: 1, status: 'draft' });
    setSelectedSop(null); setShowSopForm(true);
  };
  const openEditSop = (s: SopItem) => {
    setSopForm({ sop_code: s.sop_code, title: s.title, purpose: s.purpose, applicable_roles: s.applicable_roles.join(', '), steps: s.steps.length ? s.steps : [{ step: 1, title: '', detail: '' }], qc_criteria: s.qc_criteria.join(', '), version: s.version, status: s.status });
    setSelectedSop(s); setShowSopForm(true);
  };
  const saveSop = async () => {
    setSaving(true);
    const applicable_roles = sopForm.applicable_roles.split(',').map(s => s.trim()).filter(Boolean);
    const steps = sopForm.steps.filter(st => st.title.trim());
    const qc_criteria = sopForm.qc_criteria.split(',').map(s => s.trim()).filter(Boolean);
    if (selectedSop) {
      const { error } = await supabase.from('sop_library').update({ title: sopForm.title, purpose: sopForm.purpose, applicable_roles, steps, qc_criteria, version: sopForm.version, status: sopForm.status }).eq('id', selectedSop.id);
      if (!error) { showToast('Cập nhật SOP thành công'); setShowSopForm(false); setSelectedSop(null); loadData(); }
      else showToast('Lỗi: ' + error.message);
    } else {
      const { error } = await supabase.from('sop_library').insert({ sop_code: sopForm.sop_code, title: sopForm.title, purpose: sopForm.purpose, applicable_roles, steps, qc_criteria, version: sopForm.version, status: sopForm.status });
      if (!error) { showToast('Tạo SOP thành công!'); setShowSopForm(false); loadData(); }
      else showToast('Lỗi: ' + error.message);
    }
    setSaving(false);
  };
  const deleteSop = async (id: string) => {
    if (!confirm('Xóa SOP này?')) return;
    const { error } = await supabase.from('sop_library').delete().eq('id', id);
    if (!error) { showToast('Đã xóa'); setShowSopForm(false); setSelectedSop(null); loadData(); }
    else showToast('Lỗi: ' + error.message);
  };

  // STATUS CRUD
  const openNewStatus = () => {
    setStatusForm({ code: '', name: '', domain: 'order', color: '', bg_color: '', sort_order: 0, is_terminal: false, allowed_next: '' });
    setSelectedStatus(null); setShowStatusForm(true);
  };
  const openEditStatus = (s: MasterStatus) => {
    setStatusForm({ code: s.code, name: s.name, domain: s.domain, color: s.color, bg_color: s.bg_color, sort_order: s.sort_order, is_terminal: s.is_terminal, allowed_next: s.allowed_next.join(', ') });
    setSelectedStatus(s); setShowStatusForm(true);
  };
  const saveStatus = async () => {
    setSaving(true);
    const allowed_next = statusForm.allowed_next.split(',').map(s => s.trim()).filter(Boolean);
    if (selectedStatus) {
      const { error } = await supabase.from('master_status').update({ name: statusForm.name, domain: statusForm.domain, color: statusForm.color, bg_color: statusForm.bg_color, sort_order: statusForm.sort_order, is_terminal: statusForm.is_terminal, allowed_next }).eq('id', selectedStatus.id);
      if (!error) { showToast('Cập nhật trạng thái thành công'); setShowStatusForm(false); setSelectedStatus(null); loadData(); }
      else showToast('Lỗi: ' + error.message);
    } else {
      const { error } = await supabase.from('master_status').insert({ code: statusForm.code, name: statusForm.name, domain: statusForm.domain, color: statusForm.color, bg_color: statusForm.bg_color, sort_order: statusForm.sort_order, is_terminal: statusForm.is_terminal, allowed_next });
      if (!error) { showToast('Tạo trạng thái thành công!'); setShowStatusForm(false); loadData(); }
      else showToast('Lỗi: ' + error.message);
    }
    setSaving(false);
  };
  const deleteStatus = async (id: string) => {
    if (!confirm('Xóa trạng thái này?')) return;
    const { error } = await supabase.from('master_status').delete().eq('id', id);
    if (!error) { showToast('Đã xóa'); setShowStatusForm(false); setSelectedStatus(null); loadData(); }
    else showToast('Lỗi: ' + error.message);
  };

  // TIER CRUD
  const openNewTier = () => {
    setTierForm({ code: '', name: '', type: 'customer', min_value: 0, discount_rate: 0, commission_rate: 0, benefits: '', color: '' });
    setSelectedTier(null); setShowTierForm(true);
  };
  const openEditTier = (t: MasterTier) => {
    setTierForm({ code: t.code, name: t.name, type: t.type, min_value: t.min_value, discount_rate: t.discount_rate, commission_rate: t.commission_rate, benefits: t.benefits.join(', '), color: t.color });
    setSelectedTier(t); setShowTierForm(true);
  };
  const saveTier = async () => {
    setSaving(true);
    const benefits = tierForm.benefits.split(',').map(s => s.trim()).filter(Boolean);
    if (selectedTier) {
      const { error } = await supabase.from('master_tiers').update({ name: tierForm.name, type: tierForm.type, min_value: tierForm.min_value, discount_rate: tierForm.discount_rate, commission_rate: tierForm.commission_rate, benefits, color: tierForm.color }).eq('id', selectedTier.id);
      if (!error) { showToast('Cập nhật hạng thành công'); setShowTierForm(false); setSelectedTier(null); loadData(); }
      else showToast('Lỗi: ' + error.message);
    } else {
      const { error } = await supabase.from('master_tiers').insert({ code: tierForm.code, name: tierForm.name, type: tierForm.type, min_value: tierForm.min_value, discount_rate: tierForm.discount_rate, commission_rate: tierForm.commission_rate, benefits, color: tierForm.color });
      if (!error) { showToast('Tạo hạng thành công!'); setShowTierForm(false); loadData(); }
      else showToast('Lỗi: ' + error.message);
    }
    setSaving(false);
  };
  const deleteTier = async (id: string) => {
    if (!confirm('Xóa hạng này?')) return;
    const { error } = await supabase.from('master_tiers').delete().eq('id', id);
    if (!error) { showToast('Đã xóa'); setShowTierForm(false); setSelectedTier(null); loadData(); }
    else showToast('Lỗi: ' + error.message);
  };

  // WORKFLOW CRUD
  const openNewWorkflow = () => {
    setWfForm({ code: '', name: '', product_type: '', description: '', is_active: true, version: 1 });
    setSelectedWorkflow(null); setShowWorkflowForm(true);
  };
  const openEditWorkflow = (w: WorkflowTemplate) => {
    setWfForm({ code: w.code, name: w.name, product_type: w.product_type, description: w.description, is_active: w.is_active, version: w.version });
    setSelectedWorkflow(w); setShowWorkflowForm(true);
  };
  const saveWorkflow = async () => {
    setSaving(true);
    if (selectedWorkflow) {
      const { error } = await supabase.from('workflow_templates').update({ name: wfForm.name, product_type: wfForm.product_type, description: wfForm.description, is_active: wfForm.is_active, version: wfForm.version }).eq('id', selectedWorkflow.id);
      if (!error) { showToast('Cập nhật workflow thành công'); setShowWorkflowForm(false); setSelectedWorkflow(null); loadData(); }
      else showToast('Lỗi: ' + error.message);
    } else {
      const { error } = await supabase.from('workflow_templates').insert({ code: wfForm.code, name: wfForm.name, product_type: wfForm.product_type, description: wfForm.description, is_active: wfForm.is_active, version: wfForm.version });
      if (!error) { showToast('Tạo workflow thành công!'); setShowWorkflowForm(false); loadData(); }
      else showToast('Lỗi: ' + error.message);
    }
    setSaving(false);
  };
  const deleteWorkflow = async (id: string) => {
    if (!confirm('Xóa workflow này và tất cả stages?')) return;
    await supabase.from('workflow_stages').delete().eq('template_id', id);
    const { error } = await supabase.from('workflow_templates').delete().eq('id', id);
    if (!error) { showToast('Đã xóa'); setShowWorkflowForm(false); setSelectedWorkflow(null); loadData(); }
    else showToast('Lỗi: ' + error.message);
  };

  // STAGE CRUD
  const openNewStage = (templateId: string) => {
    setStageForm({ code: '', name: '', sort_order: 0, duration_hours: 0, required_role: '', requires_qc: false, requires_photo: false, sop_code: '', auto_assign: false, notes: '' });
    setStageTemplateId(templateId); setSelectedStage(null); setShowStageForm(true);
  };
  const openEditStage = (s: WorkflowStage) => {
    setStageForm({ code: s.code, name: s.name, sort_order: s.sort_order, duration_hours: s.duration_hours, required_role: s.required_role, requires_qc: s.requires_qc, requires_photo: s.requires_photo, sop_code: s.sop_code, auto_assign: s.auto_assign, notes: s.notes });
    setStageTemplateId(s.template_id); setSelectedStage(s); setShowStageForm(true);
  };
  const saveStage = async () => {
    setSaving(true);
    if (selectedStage) {
      const { error } = await supabase.from('workflow_stages').update({ code: stageForm.code, name: stageForm.name, sort_order: stageForm.sort_order, duration_hours: stageForm.duration_hours, required_role: stageForm.required_role, requires_qc: stageForm.requires_qc, requires_photo: stageForm.requires_photo, sop_code: stageForm.sop_code, auto_assign: stageForm.auto_assign, notes: stageForm.notes }).eq('id', selectedStage.id);
      if (!error) { showToast('Cập nhật stage thành công'); setShowStageForm(false); setSelectedStage(null); loadData(); }
      else showToast('Lỗi: ' + error.message);
    } else {
      const { error } = await supabase.from('workflow_stages').insert({ template_id: stageTemplateId, code: stageForm.code, name: stageForm.name, sort_order: stageForm.sort_order, duration_hours: stageForm.duration_hours, required_role: stageForm.required_role, requires_qc: stageForm.requires_qc, requires_photo: stageForm.requires_photo, sop_code: stageForm.sop_code, auto_assign: stageForm.auto_assign, notes: stageForm.notes });
      if (!error) { showToast('Tạo stage thành công!'); setShowStageForm(false); loadData(); }
      else showToast('Lỗi: ' + error.message);
    }
    setSaving(false);
  };
  const deleteStage = async (id: string) => {
    if (!confirm('Xóa stage này?')) return;
    const { error } = await supabase.from('workflow_stages').delete().eq('id', id);
    if (!error) { showToast('Đã xóa stage'); setShowStageForm(false); setSelectedStage(null); loadData(); }
    else showToast('Lỗi: ' + error.message);
  };

  // SETTING UPDATE
  const updateSetting = async (key: string, newValue: string) => {
    const { error } = await supabase.from('app_settings').update({ value: newValue }).eq('key', key);
    if (!error) { showToast('Cập nhật ' + key + ' thành công'); loadData(); }
    else showToast('Lỗi: ' + error.message);
  };

  const allTabs: { id: Tab; label: string; icon: typeof Users; visible: boolean }[] = [
    { id: 'users', label: 'Nhân sự', icon: Users, visible: perms.isSuperAdmin },
    { id: 'roles', label: 'Vai trò', icon: Shield, visible: perms.isSuperAdmin },
    { id: 'locations', label: 'Địa điểm', icon: MapPin, visible: perms.can('inventory') || perms.isSuperAdmin },
    { id: 'categories', label: 'Danh mục', icon: Tag, visible: perms.can('inventory') || perms.isSuperAdmin },
    { id: 'sops', label: 'SOP', icon: BookOpen, visible: perms.can('production') || perms.can('qc') || perms.isSuperAdmin },
    { id: 'statuses', label: 'Trạng thái', icon: GitBranch, visible: perms.isSuperAdmin },
    { id: 'tiers', label: 'Hạng', icon: Award, visible: perms.isSuperAdmin },
    { id: 'workflows', label: 'Workflow', icon: Workflow, visible: perms.isSuperAdmin },
    { id: 'general', label: 'Cài đặt', icon: Settings2, visible: perms.isSuperAdmin },
  ];

  const tabs = allTabs.filter(t => t.visible);

  const inputCls = 'w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white';
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';
  const btnPrimary = 'flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50';

  return (
    <div className="space-y-4">
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium">{toast}</div>}

      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-gray-900">Cài đặt & Master Data</h1><p className="text-sm text-gray-500">Cấu hình hệ thống, vai trò, danh mục</p></div>
        {tab === 'users' && perms.isSuperAdmin && <button onClick={openNewUser} className={btnPrimary}><Plus className="w-4 h-4" /> Thêm NV</button>}
        {tab === 'roles' && perms.isSuperAdmin && <button onClick={openNewRole} className={btnPrimary}><Plus className="w-4 h-4" /> Thêm</button>}
        {tab === 'categories' && perms.isSuperAdmin && <button onClick={openNewCat} className={btnPrimary}><Plus className="w-4 h-4" /> Thêm</button>}
        {tab === 'sops' && perms.isSuperAdmin && <button onClick={openNewSop} className={btnPrimary}><Plus className="w-4 h-4" /> Thêm SOP</button>}
        {tab === 'statuses' && perms.isSuperAdmin && <button onClick={openNewStatus} className={btnPrimary}><Plus className="w-4 h-4" /> Thêm</button>}
        {tab === 'tiers' && perms.isSuperAdmin && <button onClick={openNewTier} className={btnPrimary}><Plus className="w-4 h-4" /> Thêm</button>}
        {tab === 'workflows' && perms.isSuperAdmin && <button onClick={openNewWorkflow} className={btnPrimary}><Plus className="w-4 h-4" /> Thêm</button>}
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {tabs.map(t => {
          const Icon = t.icon;
          return <button key={t.id} onClick={() => setTab(t.id)} className={`flex-shrink-0 flex items-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${tab === t.id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}><Icon className="w-3.5 h-3.5" />{t.label}</button>;
        })}
      </div>

      {loading ? <div className="flex justify-center py-12 text-gray-400 text-sm">Đang tải...</div> : (
        <>
          {/* USERS */}
          {tab === 'users' && <div className="space-y-2">{users.map(user => (
            <Card key={user.id} className="p-4" onClick={perms.isSuperAdmin ? () => openEditUser(user) : undefined}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-800 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">{user.full_name.split(' ').slice(-1)[0][0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user.full_name}</p>
                    <Badge className={statusColors[user.status] ?? 'bg-gray-100 text-gray-600'}>{user.status === 'active' ? 'Hoạt động' : user.status === 'on_leave' ? 'Nghỉ phép' : 'Ngừng'}</Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{roleMap[user.role_code] ?? user.role_code}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {user.skills.slice(0, 3).map(s => <Badge key={s} className="bg-slate-100 text-slate-600">{s}</Badge>)}
                    {user.skills.length > 3 && <Badge className="bg-gray-100 text-gray-500">+{user.skills.length - 3}</Badge>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-gray-900">{formatCurrency(user.monthly_salary)}</p>
                  <p className="text-xs text-gray-400">{user.shift}</p>
                </div>
              </div>
            </Card>
          ))}</div>}

          {/* ROLES */}
          {tab === 'roles' && <div className="space-y-2">{roles.map(role => (
            <Card key={role.id} className="p-4" onClick={perms.isSuperAdmin ? () => openEditRole(role) : undefined}>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-slate-100 rounded-lg flex-shrink-0"><Shield className="w-4 h-4 text-slate-600" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{role.name}</p>
                    {role.is_active ? <Badge className="bg-green-100 text-green-700">Hoạt động</Badge> : <Badge className="bg-gray-100 text-gray-500">Ngừng</Badge>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">Mã: {role.code}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{role.description}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {role.menu_access.slice(0, 5).map(m => <Badge key={m} className="bg-blue-50 text-blue-600">{m}</Badge>)}
                    {role.menu_access.length > 5 && <Badge className="bg-gray-100 text-gray-500">+{role.menu_access.length - 5}</Badge>}
                  </div>
                </div>
              </div>
            </Card>
          ))}</div>}

          {/* LOCATIONS */}
          {tab === 'locations' && <div className="space-y-2">{locations.map(loc => (
            <Card key={loc.id} className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg flex-shrink-0"><MapPin className="w-4 h-4 text-emerald-600" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">{loc.name}</p>
                    <Badge className="bg-gray-100 text-gray-600">{loc.type}</Badge>
                    {!loc.is_active && <Badge className="bg-red-100 text-red-600">Ngừng</Badge>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{loc.address}</p>
                  {loc.commission_rate > 0 && <p className="text-xs text-gray-400 mt-0.5">Hoa hồng: {loc.commission_rate}% | DT: {loc.revenue_share}%</p>}
                </div>
              </div>
            </Card>
          ))}</div>}

          {/* CATEGORIES */}
          {tab === 'categories' && <div className="space-y-4">
            {['product', 'material', 'tool', 'service'].map(type => {
              const grouped = categories.filter(c => c.type === type);
              if (!grouped.length) return null;
              return <div key={type}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1 mb-2">{catTypeLabel[type]}</p>
                <div className="space-y-1.5">{grouped.map(cat => (
                  <Card key={cat.id} className="p-3" onClick={perms.isSuperAdmin ? () => openEditCat(cat) : undefined}>
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-gray-100 rounded-lg flex-shrink-0"><Tag className="w-3.5 h-3.5 text-gray-600" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{cat.name}</p>
                        <p className="text-xs text-gray-400">Mã: {cat.code} • ĐVT: {cat.unit} {cat.min_stock > 0 ? `• Min: ${cat.min_stock}` : ''}</p>
                      </div>
                      {cat.is_active ? <Badge className="bg-green-100 text-green-700 flex-shrink-0">Hiệu lực</Badge> : <Badge className="bg-gray-100 text-gray-500 flex-shrink-0">Ngừng</Badge>}
                    </div>
                  </Card>
                ))}</div>
              </div>;
            })}
          </div>}

          {/* SOPS */}
          {tab === 'sops' && <div className="space-y-2">{sops.map(sop => (
            <Card key={sop.id} className="p-4" onClick={perms.isSuperAdmin ? () => openEditSop(sop) : undefined}>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg flex-shrink-0"><BookOpen className="w-4 h-4 text-indigo-600" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{sop.sop_code}</p>
                    <Badge className={sop.status === 'active' ? 'bg-green-100 text-green-700' : sop.status === 'draft' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}>{sop.status === 'active' ? 'Hoạt động' : sop.status === 'draft' ? 'Nháp' : 'Lưu trữ'}</Badge>
                    <span className="text-xs text-gray-400">v{sop.version}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800 mt-0.5">{sop.title}</p>
                  {sop.purpose && <p className="text-xs text-gray-500 mt-0.5 truncate">{sop.purpose}</p>}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {sop.applicable_roles.slice(0, 4).map(r => <Badge key={r} className="bg-indigo-50 text-indigo-600">{r}</Badge>)}
                    {sop.applicable_roles.length > 4 && <Badge className="bg-gray-100 text-gray-500">+{sop.applicable_roles.length - 4}</Badge>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-400">{sop.steps.length} bước</p>
                </div>
              </div>
            </Card>
          ))}</div>}

          {/* STATUSES */}
          {tab === 'statuses' && <div className="space-y-4">
            {['order', 'production', 'qc', 'finance', 'complaint', 'lead', 'general'].map(domain => {
              const grouped = statuses.filter(s => s.domain === domain);
              if (!grouped.length) return null;
              return <div key={domain}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1 mb-2">{domain}</p>
                <div className="space-y-1.5">{grouped.map(st => (
                  <Card key={st.id} className="p-3" onClick={perms.isSuperAdmin ? () => openEditStatus(st) : undefined}>
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full flex-shrink-0 border border-gray-200" style={{ backgroundColor: st.bg_color || st.color || '#e5e7eb' }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900">{st.name}</p>
                          <Badge className="bg-gray-100 text-gray-600">{st.code}</Badge>
                          <Badge className="bg-blue-50 text-blue-600">{st.domain}</Badge>
                          {st.is_terminal && <Badge className="bg-red-50 text-red-600">Terminal</Badge>}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {st.allowed_next.slice(0, 4).map(n => <Badge key={n} className="bg-green-50 text-green-600">{n}</Badge>)}
                          {st.allowed_next.length > 4 && <Badge className="bg-gray-100 text-gray-500">+{st.allowed_next.length - 4}</Badge>}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}</div>
              </div>;
            })}
          </div>}

          {/* TIERS */}
          {tab === 'tiers' && <div className="space-y-4">
            {['customer', 'partner'].map(type => {
              const grouped = tiers.filter(t => t.type === type);
              if (!grouped.length) return null;
              return <div key={type}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1 mb-2">{type === 'customer' ? 'Khách hàng' : 'Đối tác'}</p>
                <div className="space-y-1.5">{grouped.map(tier => (
                  <Card key={tier.id} className="p-3" onClick={perms.isSuperAdmin ? () => openEditTier(tier) : undefined}>
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full flex-shrink-0 border border-gray-200" style={{ backgroundColor: tier.color || '#e5e7eb' }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900">{tier.name}</p>
                          <Badge className="bg-gray-100 text-gray-600">{tier.code}</Badge>
                          <Badge className={tier.type === 'customer' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}>{tier.type === 'customer' ? 'KH' : 'ĐT'}</Badge>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">Min: {tier.min_value} | CK: {tier.discount_rate}% | HH: {tier.commission_rate}%</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {tier.benefits.slice(0, 3).map(b => <Badge key={b} className="bg-amber-50 text-amber-600">{b}</Badge>)}
                          {tier.benefits.length > 3 && <Badge className="bg-gray-100 text-gray-500">+{tier.benefits.length - 3}</Badge>}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}</div>
              </div>;
            })}
          </div>}

          {/* WORKFLOWS */}
          {tab === 'workflows' && <div className="space-y-2">{workflowTemplates.map(wf => {
            const stages = workflowStages.filter(s => s.template_id === wf.id);
            const isExpanded = expandedWorkflow === wf.id;
            return (
              <div key={wf.id}>
                <Card className="p-4" onClick={perms.isSuperAdmin ? () => openEditWorkflow(wf) : undefined}>
                  <div className="flex items-center gap-3">
                    <button onClick={e => { e.stopPropagation(); setExpandedWorkflow(isExpanded ? null : wf.id); }} className="p-1 hover:bg-gray-100 rounded-lg flex-shrink-0">
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    </button>
                    <div className="p-2 bg-violet-100 rounded-lg flex-shrink-0"><Workflow className="w-4 h-4 text-violet-600" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">{wf.code}</p>
                        <Badge className="bg-violet-50 text-violet-600">{wf.product_type}</Badge>
                        {wf.is_active ? <Badge className="bg-green-100 text-green-700">Hoạt động</Badge> : <Badge className="bg-gray-100 text-gray-500">Ngừng</Badge>}
                        <span className="text-xs text-gray-400">v{wf.version}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{wf.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{stages.length} stages</p>
                    </div>
                  </div>
                </Card>
                {isExpanded && <div className="ml-8 mt-1 space-y-1.5">
                  {stages.map(st => (
                    <Card key={st.id} className="p-3" onClick={perms.isSuperAdmin ? () => openEditStage(st) : undefined}>
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-violet-50 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-violet-600">{st.sort_order}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900">{st.name}</p>
                            <Badge className="bg-gray-100 text-gray-600">{st.code}</Badge>
                            {st.requires_qc && <Badge className="bg-orange-50 text-orange-600">QC</Badge>}
                            {st.requires_photo && <Badge className="bg-blue-50 text-blue-600">Photo</Badge>}
                            {st.auto_assign && <Badge className="bg-green-50 text-green-600">Auto</Badge>}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{st.duration_hours}h | {st.required_role}{st.sop_code ? ` | SOP: ${st.sop_code}` : ''}</p>
                        </div>
                        {perms.isSuperAdmin && <button onClick={e => { e.stopPropagation(); deleteStage(st.id); }} className="p-1 text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>}
                      </div>
                    </Card>
                  ))}
                  {perms.isSuperAdmin && <button onClick={() => openNewStage(wf.id)} className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold hover:text-blue-800 py-2 px-3"><Plus className="w-3.5 h-3.5" /> Thêm Stage</button>}
                </div>}
              </div>
            );
          })}</div>}

          {/* GENERAL SETTINGS */}
          {tab === 'general' && <div className="space-y-3">
            {['general', 'sales', 'finance', 'production', 'inventory', 'ui', 'gallery'].map(cat => {
              const grouped = settings.filter(s => s.category === cat);
              if (!grouped.length) return null;
              return <div key={cat}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1 mb-2">{cat.toUpperCase()}</p>
                <Card className="divide-y divide-gray-50">
                  {grouped.map(s => <SettingRow key={s.key} setting={s} onSave={updateSetting} canEdit={perms.isSuperAdmin} />)}
                </Card>
              </div>;
            })}
          </div>}
        </>
      )}

      {/* ===== USER FORM ===== */}
      <Modal open={showUserForm} onClose={() => { setShowUserForm(false); setSelectedUser(null); }} title={selectedUser ? 'Sửa nhân sự' : 'Thêm nhân sự'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Mã NV</label><input className={inputCls} value={userForm.code} onChange={e => setUserForm(f => ({ ...f, code: e.target.value }))} disabled={!!selectedUser} /></div>
            <div><label className={labelCls}>Họ tên *</label><input className={inputCls} value={userForm.full_name} onChange={e => setUserForm(f => ({ ...f, full_name: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Email</label><input className={inputCls} value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><label className={labelCls}>SĐT</label><input className={inputCls} value={userForm.phone} onChange={e => setUserForm(f => ({ ...f, phone: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={labelCls}>Vai trò</label>
              <select className={inputCls} value={userForm.role_code} onChange={e => setUserForm(f => ({ ...f, role_code: e.target.value }))}>
                {roles.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Trạng thái</label>
              <select className={inputCls} value={userForm.status} onChange={e => setUserForm(f => ({ ...f, status: e.target.value }))}>
                <option value="active">Hoạt động</option><option value="on_leave">Nghỉ phép</option><option value="inactive">Ngừng</option>
              </select>
            </div>
            <div><label className={labelCls}>Ca làm</label>
              <select className={inputCls} value={userForm.shift} onChange={e => setUserForm(f => ({ ...f, shift: e.target.value }))}>
                <option value="full-time">Full-time</option><option value="part-time">Part-time</option>
              </select>
            </div>
          </div>
          <div><label className={labelCls}>Kỹ năng (phẩy)</label><input className={inputCls} value={userForm.skills} onChange={e => setUserForm(f => ({ ...f, skills: e.target.value }))} placeholder="oil_painting, portrait, framing" /></div>
          <div><label className={labelCls}>Lương tháng (VND)</label><input type="number" className={inputCls} value={userForm.monthly_salary || ''} onChange={e => setUserForm(f => ({ ...f, monthly_salary: Number(e.target.value) }))} /></div>
          <div><label className={labelCls}>Ghi chú</label><textarea className={inputCls + ' h-16'} value={userForm.notes} onChange={e => setUserForm(f => ({ ...f, notes: e.target.value }))} /></div>
          <div className="flex gap-2 pt-2">
            {perms.isSuperAdmin && <button onClick={saveUser} disabled={saving || !userForm.full_name} className={btnPrimary + ' flex-1'}><Save className="w-4 h-4" />{saving ? 'Đang lưu...' : selectedUser ? 'Cập nhật' : 'Tạo nhân sự'}</button>}
            {perms.isSuperAdmin && selectedUser && <button onClick={() => deleteUser(selectedUser.id)} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50"><Trash2 className="w-4 h-4" />Xóa</button>}
            <button onClick={() => { setShowUserForm(false); setSelectedUser(null); }} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50">Hủy</button>
          </div>
        </div>
      </Modal>

      {/* ===== ROLE FORM ===== */}
      <Modal open={showRoleForm} onClose={() => { setShowRoleForm(false); setSelectedRole(null); }} title={selectedRole ? 'Sửa vai trò' : 'Thêm vai trò'} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Mã *</label><input className={inputCls} value={roleForm.code} onChange={e => setRoleForm(f => ({ ...f, code: e.target.value }))} disabled={!!selectedRole} /></div>
            <div><label className={labelCls}>Tên *</label><input className={inputCls} value={roleForm.name} onChange={e => setRoleForm(f => ({ ...f, name: e.target.value }))} /></div>
          </div>
          <div><label className={labelCls}>Mô tả</label><input className={inputCls} value={roleForm.description} onChange={e => setRoleForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div><label className={labelCls}>Menu truy cập (phẩy)</label><input className={inputCls} value={roleForm.menu_access} onChange={e => setRoleForm(f => ({ ...f, menu_access: e.target.value }))} placeholder="dashboard, sales, production, inventory, finance, settings, gallery, ai" /></div>
          <div className="flex gap-2 pt-2">
            {perms.isSuperAdmin && <button onClick={saveRole} disabled={saving || !roleForm.code || !roleForm.name} className={btnPrimary + ' flex-1'}><Save className="w-4 h-4" />{saving ? 'Đang lưu...' : selectedRole ? 'Cập nhật' : 'Tạo vai trò'}</button>}
            {perms.isSuperAdmin && selectedRole && <button onClick={() => deleteRole(selectedRole.id)} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50"><Trash2 className="w-4 h-4" />Xóa</button>}
            <button onClick={() => { setShowRoleForm(false); setSelectedRole(null); }} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50">Hủy</button>
          </div>
        </div>
      </Modal>

      {/* ===== CATEGORY FORM ===== */}
      <Modal open={showCatForm} onClose={() => { setShowCatForm(false); setSelectedCat(null); }} title={selectedCat ? 'Sửa danh mục' : 'Thêm danh mục'} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Mã *</label><input className={inputCls} value={catForm.code} onChange={e => setCatForm(f => ({ ...f, code: e.target.value }))} disabled={!!selectedCat} /></div>
            <div><label className={labelCls}>Tên *</label><input className={inputCls} value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={labelCls}>Loại</label>
              <select className={inputCls} value={catForm.type} onChange={e => setCatForm(f => ({ ...f, type: e.target.value }))}>
                {Object.entries(catTypeLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>ĐVT</label><input className={inputCls} value={catForm.unit} onChange={e => setCatForm(f => ({ ...f, unit: e.target.value }))} /></div>
            <div><label className={labelCls}>Tồn min</label><input type="number" className={inputCls} value={catForm.min_stock} onChange={e => setCatForm(f => ({ ...f, min_stock: Number(e.target.value) }))} /></div>
          </div>
          <div className="flex gap-2 pt-2">
            {perms.isSuperAdmin && <button onClick={saveCat} disabled={saving || !catForm.code || !catForm.name} className={btnPrimary + ' flex-1'}><Save className="w-4 h-4" />{saving ? 'Đang lưu...' : selectedCat ? 'Cập nhật' : 'Tạo danh mục'}</button>}
            {perms.isSuperAdmin && selectedCat && <button onClick={() => deleteCat(selectedCat.id)} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50"><Trash2 className="w-4 h-4" />Xóa</button>}
            <button onClick={() => { setShowCatForm(false); setSelectedCat(null); }} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50">Hủy</button>
          </div>
        </div>
      </Modal>

      {/* ===== SOP FORM ===== */}
      <Modal open={showSopForm} onClose={() => { setShowSopForm(false); setSelectedSop(null); }} title={selectedSop ? 'Sửa SOP' : 'Thêm SOP'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Mã SOP *</label><input className={inputCls} value={sopForm.sop_code} onChange={e => setSopForm(f => ({ ...f, sop_code: e.target.value }))} disabled={!!selectedSop} /></div>
            <div><label className={labelCls}>Tiêu đề *</label><input className={inputCls} value={sopForm.title} onChange={e => setSopForm(f => ({ ...f, title: e.target.value }))} /></div>
          </div>
          <div><label className={labelCls}>Mục đích</label><input className={inputCls} value={sopForm.purpose} onChange={e => setSopForm(f => ({ ...f, purpose: e.target.value }))} /></div>
          <div><label className={labelCls}>Vai trò áp dụng (phẩy)</label><input className={inputCls} value={sopForm.applicable_roles} onChange={e => setSopForm(f => ({ ...f, applicable_roles: e.target.value }))} placeholder="painter, qc, manager" /></div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelCls}>Các bước</label>
              {perms.isSuperAdmin && <button type="button" onClick={() => setSopForm(f => ({ ...f, steps: [...f.steps, { step: f.steps.length + 1, title: '', detail: '' }] }))} className="text-xs text-blue-600 font-semibold hover:text-blue-800">+ Thêm bước</button>}
            </div>
            <div className="space-y-2">
              {sopForm.steps.map((st, idx) => (
                <div key={idx} className="flex gap-2 items-start bg-gray-50 p-2 rounded-lg">
                  <span className="text-xs font-bold text-gray-400 mt-2.5 w-4 flex-shrink-0">{st.step}</span>
                  <div className="flex-1 space-y-1">
                    <input className={inputCls} placeholder="Tiêu đề bước" value={st.title} onChange={e => { const newSteps = [...sopForm.steps]; newSteps[idx] = { ...newSteps[idx], title: e.target.value }; setSopForm(f => ({ ...f, steps: newSteps })); }} />
                    <input className={inputCls} placeholder="Chi tiết" value={st.detail} onChange={e => { const newSteps = [...sopForm.steps]; newSteps[idx] = { ...newSteps[idx], detail: e.target.value }; setSopForm(f => ({ ...f, steps: newSteps })); }} />
                  </div>
                  {perms.isSuperAdmin && sopForm.steps.length > 1 && <button type="button" onClick={() => setSopForm(f => ({ ...f, steps: f.steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step: i + 1 })) }))} className="p-1.5 text-gray-300 hover:text-red-500 mt-1.5"><X className="w-4 h-4" /></button>}
                </div>
              ))}
            </div>
          </div>
          <div><label className={labelCls}>Tiêu chí QC (phẩy)</label><input className={inputCls} value={sopForm.qc_criteria} onChange={e => setSopForm(f => ({ ...f, qc_criteria: e.target.value }))} placeholder="color_match, surface_quality, dimension_check" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Phiên bản</label><input type="number" className={inputCls} value={sopForm.version} onChange={e => setSopForm(f => ({ ...f, version: Number(e.target.value) }))} /></div>
            <div><label className={labelCls}>Trạng thái</label>
              <select className={inputCls} value={sopForm.status} onChange={e => setSopForm(f => ({ ...f, status: e.target.value }))}>
                <option value="active">Hoạt động</option><option value="draft">Nháp</option><option value="archived">Lưu trữ</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            {perms.isSuperAdmin && <button onClick={saveSop} disabled={saving || !sopForm.sop_code || !sopForm.title} className={btnPrimary + ' flex-1'}><Save className="w-4 h-4" />{saving ? 'Đang lưu...' : selectedSop ? 'Cập nhật' : 'Tạo SOP'}</button>}
            {perms.isSuperAdmin && selectedSop && <button onClick={() => deleteSop(selectedSop.id)} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50"><Trash2 className="w-4 h-4" />Xóa</button>}
            <button onClick={() => { setShowSopForm(false); setSelectedSop(null); }} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50">Hủy</button>
          </div>
        </div>
      </Modal>

      {/* ===== STATUS FORM ===== */}
      <Modal open={showStatusForm} onClose={() => { setShowStatusForm(false); setSelectedStatus(null); }} title={selectedStatus ? 'Sửa trạng thái' : 'Thêm trạng thái'} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Mã *</label><input className={inputCls} value={statusForm.code} onChange={e => setStatusForm(f => ({ ...f, code: e.target.value }))} disabled={!!selectedStatus} /></div>
            <div><label className={labelCls}>Tên *</label><input className={inputCls} value={statusForm.name} onChange={e => setStatusForm(f => ({ ...f, name: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Domain</label>
              <select className={inputCls} value={statusForm.domain} onChange={e => setStatusForm(f => ({ ...f, domain: e.target.value }))}>
                <option value="order">order</option><option value="production">production</option><option value="qc">qc</option><option value="finance">finance</option><option value="complaint">complaint</option><option value="lead">lead</option><option value="general">general</option>
              </select>
            </div>
            <div><label className={labelCls}>Sort order</label><input type="number" className={inputCls} value={statusForm.sort_order} onChange={e => setStatusForm(f => ({ ...f, sort_order: Number(e.target.value) }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Color (text)</label><input className={inputCls} value={statusForm.color} onChange={e => setStatusForm(f => ({ ...f, color: e.target.value }))} placeholder="#16a34a" /></div>
            <div><label className={labelCls}>Bg color</label><input className={inputCls} value={statusForm.bg_color} onChange={e => setStatusForm(f => ({ ...f, bg_color: e.target.value }))} placeholder="#dcfce7" /></div>
          </div>
          <div><label className={labelCls}>Allowed next (phẩy)</label><input className={inputCls} value={statusForm.allowed_next} onChange={e => setStatusForm(f => ({ ...f, allowed_next: e.target.value }))} placeholder="confirmed, in_progress, cancelled" /></div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_terminal" checked={statusForm.is_terminal} onChange={e => setStatusForm(f => ({ ...f, is_terminal: e.target.checked }))} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <label htmlFor="is_terminal" className="text-sm font-medium text-gray-700">Trạng thái kết thúc (terminal)</label>
          </div>
          <div className="flex gap-2 pt-2">
            {perms.isSuperAdmin && <button onClick={saveStatus} disabled={saving || !statusForm.code || !statusForm.name} className={btnPrimary + ' flex-1'}><Save className="w-4 h-4" />{saving ? 'Đang lưu...' : selectedStatus ? 'Cập nhật' : 'Tạo trạng thái'}</button>}
            {perms.isSuperAdmin && selectedStatus && <button onClick={() => deleteStatus(selectedStatus.id)} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50"><Trash2 className="w-4 h-4" />Xóa</button>}
            <button onClick={() => { setShowStatusForm(false); setSelectedStatus(null); }} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50">Hủy</button>
          </div>
        </div>
      </Modal>

      {/* ===== TIER FORM ===== */}
      <Modal open={showTierForm} onClose={() => { setShowTierForm(false); setSelectedTier(null); }} title={selectedTier ? 'Sửa hạng' : 'Thêm hạng'} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Mã *</label><input className={inputCls} value={tierForm.code} onChange={e => setTierForm(f => ({ ...f, code: e.target.value }))} disabled={!!selectedTier} /></div>
            <div><label className={labelCls}>Tên *</label><input className={inputCls} value={tierForm.name} onChange={e => setTierForm(f => ({ ...f, name: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Loại</label>
              <select className={inputCls} value={tierForm.type} onChange={e => setTierForm(f => ({ ...f, type: e.target.value }))}>
                <option value="customer">Khách hàng</option><option value="partner">Đối tác</option>
              </select>
            </div>
            <div><label className={labelCls}>Min value</label><input type="number" className={inputCls} value={tierForm.min_value} onChange={e => setTierForm(f => ({ ...f, min_value: Number(e.target.value) }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Discount rate (%)</label><input type="number" className={inputCls} value={tierForm.discount_rate} onChange={e => setTierForm(f => ({ ...f, discount_rate: Number(e.target.value) }))} /></div>
            <div><label className={labelCls}>Commission rate (%)</label><input type="number" className={inputCls} value={tierForm.commission_rate} onChange={e => setTierForm(f => ({ ...f, commission_rate: Number(e.target.value) }))} /></div>
          </div>
          <div><label className={labelCls}>Benefits (phẩy)</label><input className={inputCls} value={tierForm.benefits} onChange={e => setTierForm(f => ({ ...f, benefits: e.target.value }))} placeholder="free_shipping, priority_support, exclusive_discount" /></div>
          <div><label className={labelCls}>Color</label><input className={inputCls} value={tierForm.color} onChange={e => setTierForm(f => ({ ...f, color: e.target.value }))} placeholder="#f59e0b" /></div>
          <div className="flex gap-2 pt-2">
            {perms.isSuperAdmin && <button onClick={saveTier} disabled={saving || !tierForm.code || !tierForm.name} className={btnPrimary + ' flex-1'}><Save className="w-4 h-4" />{saving ? 'Đang lưu...' : selectedTier ? 'Cập nhật' : 'Tạo hạng'}</button>}
            {perms.isSuperAdmin && selectedTier && <button onClick={() => deleteTier(selectedTier.id)} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50"><Trash2 className="w-4 h-4" />Xóa</button>}
            <button onClick={() => { setShowTierForm(false); setSelectedTier(null); }} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50">Hủy</button>
          </div>
        </div>
      </Modal>

      {/* ===== WORKFLOW FORM ===== */}
      <Modal open={showWorkflowForm} onClose={() => { setShowWorkflowForm(false); setSelectedWorkflow(null); }} title={selectedWorkflow ? 'Sửa workflow' : 'Thêm workflow'} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Mã *</label><input className={inputCls} value={wfForm.code} onChange={e => setWfForm(f => ({ ...f, code: e.target.value }))} disabled={!!selectedWorkflow} /></div>
            <div><label className={labelCls}>Tên *</label><input className={inputCls} value={wfForm.name} onChange={e => setWfForm(f => ({ ...f, name: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Product type</label><input className={inputCls} value={wfForm.product_type} onChange={e => setWfForm(f => ({ ...f, product_type: e.target.value }))} placeholder="oil_painting, photo_print" /></div>
            <div><label className={labelCls}>Version</label><input type="number" className={inputCls} value={wfForm.version} onChange={e => setWfForm(f => ({ ...f, version: Number(e.target.value) }))} /></div>
          </div>
          <div><label className={labelCls}>Mô tả</label><textarea className={inputCls + ' h-16'} value={wfForm.description} onChange={e => setWfForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="wf_active" checked={wfForm.is_active} onChange={e => setWfForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <label htmlFor="wf_active" className="text-sm font-medium text-gray-700">Hoạt động</label>
          </div>
          <div className="flex gap-2 pt-2">
            {perms.isSuperAdmin && <button onClick={saveWorkflow} disabled={saving || !wfForm.code || !wfForm.name} className={btnPrimary + ' flex-1'}><Save className="w-4 h-4" />{saving ? 'Đang lưu...' : selectedWorkflow ? 'Cập nhật' : 'Tạo workflow'}</button>}
            {perms.isSuperAdmin && selectedWorkflow && <button onClick={() => deleteWorkflow(selectedWorkflow.id)} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50"><Trash2 className="w-4 h-4" />Xóa</button>}
            <button onClick={() => { setShowWorkflowForm(false); setSelectedWorkflow(null); }} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50">Hủy</button>
          </div>
        </div>
      </Modal>

      {/* ===== STAGE FORM ===== */}
      <Modal open={showStageForm} onClose={() => { setShowStageForm(false); setSelectedStage(null); }} title={selectedStage ? 'Sửa stage' : 'Thêm stage'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Mã *</label><input className={inputCls} value={stageForm.code} onChange={e => setStageForm(f => ({ ...f, code: e.target.value }))} disabled={!!selectedStage} /></div>
            <div><label className={labelCls}>Tên *</label><input className={inputCls} value={stageForm.name} onChange={e => setStageForm(f => ({ ...f, name: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={labelCls}>Sort order</label><input type="number" className={inputCls} value={stageForm.sort_order} onChange={e => setStageForm(f => ({ ...f, sort_order: Number(e.target.value) }))} /></div>
            <div><label className={labelCls}>Duration (hours)</label><input type="number" className={inputCls} value={stageForm.duration_hours} onChange={e => setStageForm(f => ({ ...f, duration_hours: Number(e.target.value) }))} /></div>
            <div><label className={labelCls}>Required role</label>
              <select className={inputCls} value={stageForm.required_role} onChange={e => setStageForm(f => ({ ...f, required_role: e.target.value }))}>
                <option value="">-- Chọn --</option>
                {roles.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
              </select>
            </div>
          </div>
          <div><label className={labelCls}>SOP code</label>
            <select className={inputCls} value={stageForm.sop_code} onChange={e => setStageForm(f => ({ ...f, sop_code: e.target.value }))}>
              <option value="">-- Chọn --</option>
              {sops.map(s => <option key={s.sop_code} value={s.sop_code}>{s.sop_code} - {s.title}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2"><input type="checkbox" checked={stageForm.requires_qc} onChange={e => setStageForm(f => ({ ...f, requires_qc: e.target.checked }))} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" /><span className="text-sm font-medium text-gray-700">Requires QC</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={stageForm.requires_photo} onChange={e => setStageForm(f => ({ ...f, requires_photo: e.target.checked }))} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" /><span className="text-sm font-medium text-gray-700">Requires Photo</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={stageForm.auto_assign} onChange={e => setStageForm(f => ({ ...f, auto_assign: e.target.checked }))} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" /><span className="text-sm font-medium text-gray-700">Auto Assign</span></label>
          </div>
          <div><label className={labelCls}>Ghi chú</label><textarea className={inputCls + ' h-16'} value={stageForm.notes} onChange={e => setStageForm(f => ({ ...f, notes: e.target.value }))} /></div>
          <div className="flex gap-2 pt-2">
            {perms.isSuperAdmin && <button onClick={saveStage} disabled={saving || !stageForm.code || !stageForm.name} className={btnPrimary + ' flex-1'}><Save className="w-4 h-4" />{saving ? 'Đang lưu...' : selectedStage ? 'Cập nhật' : 'Tạo stage'}</button>}
            {perms.isSuperAdmin && selectedStage && <button onClick={() => deleteStage(selectedStage.id)} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50"><Trash2 className="w-4 h-4" />Xóa</button>}
            <button onClick={() => { setShowStageForm(false); setSelectedStage(null); }} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50">Hủy</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function SettingRow({ setting, onSave, canEdit }: { setting: AppSetting; onSave: (key: string, value: string) => void; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(setting.value);
  return (
    <div className="flex items-center gap-3 p-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{setting.label || setting.key}</p>
        {setting.description && <p className="text-xs text-gray-400 mt-0.5">{setting.description}</p>}
      </div>
      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <input className="text-sm border border-blue-300 rounded-lg px-2 py-1 w-32 focus:outline-none focus:ring-2 focus:ring-blue-500/30" value={value} onChange={e => setValue(e.target.value)} autoFocus />
            <button onClick={() => { onSave(setting.key, value); setEditing(false); }} className="text-xs bg-blue-600 text-white px-2 py-1 rounded-lg font-semibold hover:bg-blue-700">Lưu</button>
            <button onClick={() => { setEditing(false); setValue(setting.value); }} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg font-semibold hover:bg-gray-200">Hủy</button>
          </>
        ) : (
          <>
            <span className="text-sm font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded-lg">{setting.value}</span>
            {canEdit && <button onClick={() => setEditing(true)} className="text-xs text-gray-400 hover:text-gray-700 font-medium">Sửa</button>}
          </>
        )}
      </div>
    </div>
  );
}
