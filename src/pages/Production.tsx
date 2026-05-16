import { useEffect, useState, useCallback, useRef } from 'react';
import { Factory, CheckCircle, Clock, AlertTriangle, Camera, ChevronRight, Wrench, ClipboardCheck, Save, Plus, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import { formatCurrency, formatDate, formatDatetime, statusColor } from '../lib/utils';
import type { MasterUser, ProductionJob, ProductionTask, SopEntry, QcRecord } from '../types';
import { usePermissions, type RolePermissions } from '../lib/permissions';
import { useMultiRealtimeSubscription } from '../lib/useRealtime';

type Tab = 'jobs' | 'tasks' | 'qc' | 'sop';

const jobStatusLabels: Record<string, string> = {
  queued: 'Hàng đợi', in_progress: 'Đang SX', qc_check: 'KT QC', done: 'Hoàn thành', on_hold: 'Tạm dừng',
};
const taskStatusLabels: Record<string, string> = {
  pending: 'Chờ', in_progress: 'Đang làm', qc_pending: 'Chờ QC', done: 'Xong', rework: 'Làm lại', blocked: 'Bị chặn',
};
const taskStatusFlow: Record<string, string[]> = {
  pending: ['in_progress', 'blocked'],
  in_progress: ['qc_pending', 'done', 'blocked', 'pending'],
  qc_pending: ['done', 'rework'],
  rework: ['in_progress'],
  blocked: ['in_progress', 'pending'],
  done: [],
};
const qcResultOptions = ['pass', 'fail', 'pending'];

interface ConfirmedOrder {
  id: string; order_no: string; customer_name: string;
}

interface WorkflowTemplate {
  id: string; name: string; description: string;
}

interface WorkflowStage {
  id: string; stage_name: string; sort_order: number; sop_code: string;
}

export default function Production({ currentUser }: { currentUser: MasterUser }) {
  const perms = usePermissions(currentUser);
  const [tab, setTab] = useState<Tab>('tasks');
  const [jobs, setJobs] = useState<ProductionJob[]>([]);
  const [tasks, setTasks] = useState<ProductionTask[]>([]);
  const [qcRecords, setQcRecords] = useState<QcRecord[]>([]);
  const [sops, setSops] = useState<SopEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<ProductionTask | null>(null);
  const [selectedSop, setSelectedSop] = useState<SopEntry | null>(null);
  const [showQcForm, setShowQcForm] = useState(false);
  const [qcForm, setQcForm] = useState({ result: 'pass', score: 85, defects: '', notes: '', action: '' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Create Job from Order states
  const [showCreateJobForm, setShowCreateJobForm] = useState(false);
  const [confirmedOrders, setConfirmedOrders] = useState<ConfirmedOrder[]>([]);
  const [workflowTemplates, setWorkflowTemplates] = useState<WorkflowTemplate[]>([]);
  const [jobForm, setJobForm] = useState({ order_id: '', workflow_template_id: '', priority: 'normal', deadline: '' });

  // Waste recording states
  const [showWasteForm, setShowWasteForm] = useState(false);
  const [wasteForm, setWasteForm] = useState({ waste_cost: 0, notes: '' });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const loadData = useCallback(async () => {
    setLoading(true);
    const [jobsRes, tasksRes, qcRes, sopRes] = await Promise.all([
      supabase.from('production_jobs').select('*, order:orders(order_no)').order('created_at', { ascending: false }).limit(20),
      supabase.from('production_tasks').select('*, assignee:master_users(full_name,role_code)').order('sort_order').limit(50),
      supabase.from('qc_records').select('*, order:orders(order_no)').order('created_at', { ascending: false }).limit(30),
      supabase.from('sop_library').select('*').order('sop_code'),
    ]);
    setJobs(jobsRes.data ?? []);
    setTasks(tasksRes.data ?? []);
    setQcRecords(qcRes.data ?? []);
    setSops(sopRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useMultiRealtimeSubscription(['production_jobs', 'production_tasks', 'qc_records'], loadData, [loadData]);

  const loadCreateJobData = async () => {
    const [ordersRes, wfRes] = await Promise.all([
      supabase.from('orders').select('id, order_no, customer:customers(full_name)').eq('status', 'confirmed').order('created_at', { ascending: false }),
      supabase.from('workflow_templates').select('id, name, description').order('name'),
    ]);
    setConfirmedOrders((ordersRes.data ?? []).map((o: { id: string; order_no: string; customer: unknown }) => {
      const cust = o.customer as unknown as { full_name: string };
      return { id: o.id, order_no: o.order_no, customer_name: cust?.full_name ?? '' };
    }));
    setWorkflowTemplates(wfRes.data ?? []);
  };

  const createJobFromOrder = async () => {
    setSaving(true);
    const jobNo = `JOB-${Date.now().toString(36).toUpperCase()}`;

    // Create the production job
    const { data: jobData, error: jobError } = await supabase.from('production_jobs').insert({
      job_no: jobNo,
      order_id: jobForm.order_id || null,
      status: 'queued',
      priority: jobForm.priority,
      deadline: jobForm.deadline || null,
      estimated_hours: 0,
      actual_hours: 0,
      rework_count: 0,
      waste_cost: 0,
    }).select('id').single();

    if (jobError) { showToast('Lỗi: ' + jobError.message); setSaving(false); return; }

    // Fetch workflow stages for the selected template
    if (jobForm.workflow_template_id) {
      const { data: stages } = await supabase.from('workflow_stages').select('id, stage_name, sort_order, sop_code').eq('workflow_template_id', jobForm.workflow_template_id).order('sort_order');
      if (stages && stages.length > 0) {
        const taskInserts = stages.map((s: WorkflowStage) => ({
          job_id: jobData.id,
          stage_name: s.stage_name,
          sort_order: s.sort_order,
          sop_code: s.sop_code || null,
          status: 'pending',
          rework_count: 0,
        }));
        const { error: tasksError } = await supabase.from('production_tasks').insert(taskInserts);
        if (tasksError) { showToast('Lỗi tạo tasks: ' + tasksError.message); setSaving(false); return; }
      }
    }

    showToast('Tạo lệnh SX ' + jobNo + ' thành công!');
    setShowCreateJobForm(false); setJobForm({ order_id: '', workflow_template_id: '', priority: 'normal', deadline: '' }); loadData();
    setSaving(false);
  };

  const recordWaste = async () => {
    if (!selectedTask) return;
    setSaving(true);
    const job = jobs.find(j => j.id === selectedTask.job_id);
    if (!job) { showToast('Không tìm thấy lệnh SX'); setSaving(false); return; }

    const newWasteCost = (job.waste_cost || 0) + wasteForm.waste_cost;
    const { error } = await supabase.from('production_jobs').update({ waste_cost: newWasteCost }).eq('id', job.id);

    if (!error) {
      if (wasteForm.notes) {
        await supabase.from('task_logs').insert({
          task_id: selectedTask.id, log_type: 'waste',
          note: `Hao hụt: ${formatCurrency(wasteForm.waste_cost)} - ${wasteForm.notes}`,
        });
      }
      showToast('Ghi hao hụt thành công!');
      setShowWasteForm(false); setWasteForm({ waste_cost: 0, notes: '' }); setSelectedTask(null); loadData();
    } else showToast('Lỗi: ' + error.message);
    setSaving(false);
  };

  const updateTaskStatus = async (task: ProductionTask, newStatus: string) => {
    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'in_progress' && !task.started_at) updates.started_at = new Date().toISOString();
    if (newStatus === 'done') updates.completed_at = new Date().toISOString();
    if (newStatus === 'rework') updates.rework_count = (task.rework_count || 0) + 1;
    if (newStatus === 'qc_pending') updates.qc_status = 'pending';

    const { error } = await supabase.from('production_tasks').update(updates).eq('id', task.id);
    if (!error) {
      await supabase.from('task_logs').insert({
        task_id: task.id, log_type: 'status_change',
        old_status: task.status, new_status: newStatus,
        note: `${taskStatusLabels[task.status]} → ${taskStatusLabels[newStatus]}`,
      });
      showToast(`${task.stage_name}: ${taskStatusLabels[newStatus]}`);
      setSelectedTask(null); loadData();

      // Automation: auto-advance next task when current task completes
      if (newStatus === 'done') {
        (async () => {
          try {
            // Find next pending task by sort_order in the same job
            const { data: nextTasks } = await supabase.from('production_tasks')
              .select('id, sort_order')
              .eq('job_id', task.job_id)
              .eq('status', 'pending')
              .gt('sort_order', task.sort_order)
              .order('sort_order')
              .limit(1);

            if (nextTasks && nextTasks.length > 0) {
              const nextTask = nextTasks[0];
              await supabase.from('production_tasks').update({
                status: 'in_progress',
                started_at: new Date().toISOString(),
              }).eq('id', nextTask.id);
            }

            // Check if ALL tasks in the job are completed
            const { data: remainingTasks } = await supabase.from('production_tasks')
              .select('id, status')
              .eq('job_id', task.job_id)
              .neq('status', 'done');

            if (!remainingTasks || remainingTasks.length === 0) {
              await supabase.from('production_jobs').update({
                status: 'done',
                completed_date: new Date().toISOString(),
              }).eq('id', task.job_id);
            }
          } catch (err) {
            console.error('Automation error (auto-advance task):', err);
          }
        })();
      }
    } else showToast('Lỗi: ' + error.message);
  };

  const submitQc = async (task: ProductionTask) => {
    setSaving(true);
    const job = jobs.find(j => j.id === task.job_id);
    const qcNo = `QC-${Date.now().toString(36).toUpperCase()}`;
    const defects = qcForm.defects ? qcForm.defects.split(',').map(d => d.trim()) : [];
    const { error } = await supabase.from('qc_records').insert({
      qc_no: qcNo, task_id: task.id, job_id: task.job_id,
      order_id: job?.order_id ?? null,
      result: qcForm.result, score: qcForm.score,
      defects_found: defects, notes: qcForm.notes,
      action_required: qcForm.action,
    });
    if (!error) {
      const taskUpdates: Record<string, unknown> = { qc_status: qcForm.result };
      if (qcForm.result === 'pass') {
        taskUpdates.qc_note = 'Đạt';
        await supabase.from('production_tasks').update(taskUpdates).eq('id', task.id);
        showToast('QC ĐẠT — ' + task.stage_name);
      } else {
        taskUpdates.qc_note = qcForm.notes;
        taskUpdates.fail_reason = qcForm.notes;
        await supabase.from('production_tasks').update(taskUpdates).eq('id', task.id);
        showToast('QC KHÔNG ĐẠT — ' + task.stage_name);

        // Automation: auto-create rework task when QC fails
        (async () => {
          try {
            // Increment rework_count on original task
            await supabase.from('production_tasks').update({
              rework_count: (task.rework_count || 0) + 1,
            }).eq('id', task.id);

            // Create rework task in the same job
            const reworkSortOrder = (task.sort_order || 0) + 0.5;
            await supabase.from('production_tasks').insert({
              job_id: task.job_id,
              stage_name: 'Tái chế (Rework)',
              stage_code: 'rework',
              sort_order: reworkSortOrder,
              status: 'pending',
              rework_count: 0,
            });

            // Increment the job's rework_count
            const job = jobs.find(j => j.id === task.job_id);
            if (job) {
              await supabase.from('production_jobs').update({
                rework_count: (job.rework_count || 0) + 1,
              }).eq('id', job.id);
            }

            // Log to task_logs for the original task
            await supabase.from('task_logs').insert({
              task_id: task.id,
              log_type: 'qc_fail_rework',
              note: 'QC fail - auto-created rework task',
            });

            showToast('QC không đạt - tự động tạo task tái chế');
          } catch (err) {
            console.error('Automation error (auto-create rework):', err);
          }
        })();
      }
      setShowQcForm(false); setSelectedTask(null); loadData();
    } else showToast('Lỗi: ' + error.message);
    setSaving(false);
  };

  const taskStats = {
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    qc_pending: tasks.filter(t => t.status === 'qc_pending').length,
    done: tasks.filter(t => t.status === 'done').length,
    rework: tasks.filter(t => t.status === 'rework').length,
  };

  const allTabs: { id: Tab; label: string; count: number }[] = [
    { id: 'tasks', label: 'Công việc', count: tasks.length },
    { id: 'jobs', label: 'Lệnh SX', count: jobs.length },
    { id: 'qc', label: 'QC Records', count: qcRecords.length },
    { id: 'sop', label: 'SOP', count: sops.length },
  ];

  // Artisan/trainee with only tasks/tasks_limited should NOT see Jobs or QC tabs
  const isTasksOnly = !perms.can('production') && !perms.can('qc') && !perms.isSuperAdmin;
  const tabs = allTabs.filter(t => {
    if (t.id === 'jobs' && isTasksOnly) return false;
    if (t.id === 'qc' && !(perms.can('qc') || perms.can('production') || perms.isSuperAdmin)) return false;
    return true;
  });

  const inputCls = 'w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white';
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';

  return (
    <div className="space-y-4">
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium">{toast}</div>}

      <div><h1 className="text-xl font-bold text-gray-900">Sản xuất / Workflow</h1><p className="text-sm text-gray-500">Quản lý công đoạn, QC, SOP</p></div>

      {/* Task stat pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { label: 'Chờ', count: taskStats.pending, color: 'bg-gray-100 text-gray-700' },
          { label: 'Đang làm', count: taskStats.in_progress, color: 'bg-blue-100 text-blue-700' },
          { label: 'Chờ QC', count: taskStats.qc_pending, color: 'bg-amber-100 text-amber-700' },
          { label: 'Xong', count: taskStats.done, color: 'bg-green-100 text-green-700' },
          { label: 'Làm lại', count: taskStats.rework, color: 'bg-red-100 text-red-700' },
        ].map(s => (
          <div key={s.label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 ${s.color}`}>
            <span>{s.label}</span><span className="font-bold">{s.count}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto flex-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex-shrink-0 flex items-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${tab === t.id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              {t.label}
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${tab === t.id ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-500'}`}>{t.count}</span>
            </button>
          ))}
        </div>
        {tab === 'jobs' && perms.canWrite('production_jobs') && (
          <button onClick={() => { loadCreateJobData(); setJobForm({ order_id: '', workflow_template_id: '', priority: 'normal', deadline: '' }); setShowCreateJobForm(true); }} className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all">
            <Plus className="w-4 h-4" /> Tạo lệnh SX
          </button>
        )}
      </div>

      {loading ? <div className="flex justify-center py-12 text-gray-400 text-sm">Đang tải...</div> : (
        <>
          {/* TASKS */}
          {tab === 'tasks' && (
            <div className="space-y-2">
              {tasks.length === 0 ? <EmptyState icon={Factory} title="Chưa có công việc" /> : tasks.map(task => {
                const assignee = task.assignee as unknown as { full_name: string };
                return (
                  <Card key={task.id} className={`p-4 ${task.status === 'rework' ? 'border-red-200 bg-red-50' : ''}`} onClick={() => setSelectedTask(task)}>
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                        task.status === 'done' ? 'bg-green-100 text-green-700' :
                        task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        task.status === 'rework' ? 'bg-red-100 text-red-700' :
                        task.status === 'qc_pending' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{task.sort_order}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900">{task.stage_name}</p>
                          <Badge className={statusColor(task.status)}>{taskStatusLabels[task.status]}</Badge>
                          {task.rework_count > 0 && <Badge className="bg-red-100 text-red-700">Lại {task.rework_count}x</Badge>}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{assignee?.full_name ?? 'Chưa PC'} • SOP: {task.sop_code || '—'}</p>
                        {task.fail_reason && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{task.fail_reason}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        {task.deadline && <p className={`text-xs ${new Date(task.deadline) < new Date() && task.status !== 'done' ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>{formatDate(task.deadline)}</p>}
                        {task.photo_urls?.length > 0 && <div className="flex items-center gap-1 justify-end mt-1"><Camera className="w-3 h-3 text-blue-500" /><span className="text-xs text-blue-500">{task.photo_urls.length}</span></div>}
                      </div>
                    </div>
                    {task.status === 'done' && task.completed_at && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-green-600 pl-11"><CheckCircle className="w-3 h-3" />{formatDatetime(task.completed_at)}</div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {/* JOBS */}
          {tab === 'jobs' && (
            <div className="space-y-2">
              {jobs.length === 0 ? <EmptyState icon={Factory} title="Chưa có lệnh SX" /> : jobs.map(job => {
                const order = job.order as unknown as { order_no: string };
                return (
                  <Card key={job.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-amber-100 rounded-lg flex-shrink-0"><Factory className="w-4 h-4 text-amber-600" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">{job.job_no}</span>
                          <Badge className={statusColor(job.status)}>{jobStatusLabels[job.status] ?? job.status}</Badge>
                          {job.priority === 'urgent' && <Badge className="bg-red-500 text-white">Khẩn</Badge>}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">Đơn: {order?.order_no ?? '—'}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-400"><Clock className="w-3 h-3 inline" /> {job.estimated_hours}h / {job.actual_hours}h</span>
                          {job.rework_count > 0 && <Badge className="bg-red-100 text-red-700">Rework {job.rework_count}x</Badge>}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-gray-400">Hạn: {formatDate(job.deadline)}</p>
                        {job.waste_cost > 0 && <p className="text-xs text-red-500">Hao hụt: {formatCurrency(job.waste_cost)}</p>}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* QC RECORDS */}
          {tab === 'qc' && (
            <div className="space-y-2">
              {qcRecords.length === 0 ? <EmptyState icon={ClipboardCheck} title="Chưa có bản ghi QC" /> : qcRecords.map(qc => {
                const order = qc.order as unknown as { order_no: string };
                return (
                  <Card key={qc.id} className={`p-4 ${qc.result === 'fail' ? 'border-red-200' : qc.result === 'pass' ? 'border-green-200' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg flex-shrink-0 ${qc.result === 'pass' ? 'bg-green-100' : qc.result === 'fail' ? 'bg-red-100' : 'bg-amber-100'}`}>
                        {qc.result === 'pass' ? <CheckCircle className="w-4 h-4 text-green-600" /> :
                         qc.result === 'fail' ? <AlertTriangle className="w-4 h-4 text-red-600" /> :
                         <Clock className="w-4 h-4 text-amber-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">{qc.qc_no}</span>
                          <Badge className={qc.result === 'pass' ? 'bg-green-100 text-green-700' : qc.result === 'fail' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>
                            {qc.result === 'pass' ? 'ĐẠT' : qc.result === 'fail' ? 'KHÔNG ĐẠT' : 'Đang kiểm'}
                          </Badge>
                          {qc.score > 0 && <Badge className="bg-gray-100 text-gray-700">{qc.score}/100</Badge>}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{order?.order_no ?? '—'} • {formatDatetime(qc.inspected_at)}</p>
                        {qc.defects_found?.length > 0 && <p className="text-xs text-red-600 mt-1">Lỗi: {qc.defects_found.join(', ')}</p>}
                        {qc.notes && <p className="text-xs text-gray-400 mt-0.5">{qc.notes}</p>}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* SOP LIBRARY */}
          {tab === 'sop' && (
            <div className="space-y-2">
              {sops.length === 0 ? <EmptyState icon={Wrench} title="Chưa có SOP" /> : sops.map(sop => (
                <Card key={sop.id} className="p-4" onClick={() => setSelectedSop(sop)}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-700 text-xs font-bold">{sop.sop_code.replace('SOP-', '')}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 truncate">{sop.title}</p>
                        <Badge className="bg-gray-100 text-gray-600">v{sop.version}</Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{sop.purpose}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {sop.applicable_roles.slice(0, 3).map(r => <Badge key={r} className="bg-blue-50 text-blue-600">{r}</Badge>)}
                        {Array.isArray(sop.steps) && <span className="text-xs text-gray-400">{sop.steps.length} bước</span>}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* TASK DETAIL MODAL */}
      {selectedTask && (
        <Modal open={true} onClose={() => setSelectedTask(null)} title={selectedTask.stage_name} size="lg">
          <TaskDetail
            task={selectedTask}
            perms={perms}
            onStatusChange={(s) => updateTaskStatus(selectedTask, s)}
            onQc={() => { setQcForm({ result: 'pass', score: 85, defects: '', notes: '', action: '' }); setShowQcForm(true); }}
            onWaste={() => { setWasteForm({ waste_cost: 0, notes: '' }); setShowWasteForm(true); }}
            onRefresh={loadData}
          />
        </Modal>
      )}

      {/* QC FORM MODAL */}
      {showQcForm && selectedTask && (
        <Modal open={true} onClose={() => setShowQcForm(false)} title={`QC: ${selectedTask.stage_name}`} size="md">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Kết quả *</label>
                <select className={inputCls} value={qcForm.result} onChange={e => setQcForm(f => ({ ...f, result: e.target.value }))}>
                  {qcResultOptions.map(r => <option key={r} value={r}>{r === 'pass' ? 'ĐẠT' : r === 'fail' ? 'KHÔNG ĐẠT' : 'Đang kiểm'}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Điểm (0-100)</label>
                <input type="number" min={0} max={100} className={inputCls} value={qcForm.score} onChange={e => setQcForm(f => ({ ...f, score: Number(e.target.value) }))} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Lỗi phát hiện (phẩy)</label>
              <input className={inputCls} value={qcForm.defects} onChange={e => setQcForm(f => ({ ...f, defects: e.target.value }))} placeholder="màu lệch, vết cọ, khung lệch" />
            </div>
            <div>
              <label className={labelCls}>Ghi chú QC</label>
              <textarea className={inputCls + ' h-20'} value={qcForm.notes} onChange={e => setQcForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Hành động cần làm</label>
              <input className={inputCls} value={qcForm.action} onChange={e => setQcForm(f => ({ ...f, action: e.target.value }))} placeholder="Sửa lại màu vùng cảnh, làm lại khung..." />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => submitQc(selectedTask)} disabled={saving} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50">
                <Save className="w-4 h-4" />{saving ? 'Đang lưu...' : 'Ghi nhận QC'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* WASTE FORM MODAL */}
      {showWasteForm && selectedTask && (
        <Modal open={true} onClose={() => setShowWasteForm(false)} title={`Ghi hao hụt: ${selectedTask.stage_name}`} size="md">
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Chi phí hao hụt (VND) *</label>
              <input type="number" className={inputCls} value={wasteForm.waste_cost || ''} onChange={e => setWasteForm(f => ({ ...f, waste_cost: Number(e.target.value) }))} placeholder="0" />
            </div>
            <div>
              <label className={labelCls}>Ghi chú</label>
              <textarea className={inputCls + ' h-20'} value={wasteForm.notes} onChange={e => setWasteForm(f => ({ ...f, notes: e.target.value }))} placeholder="Mô tả nguyên nhân hao hụt..." />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={recordWaste} disabled={saving || !wasteForm.waste_cost} className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50">
                <AlertTriangle className="w-4 h-4" />{saving ? 'Đang lưu...' : 'Ghi hao hụt'}
              </button>
              <button onClick={() => setShowWasteForm(false)} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50">Hủy</button>
            </div>
          </div>
        </Modal>
      )}

      {/* CREATE JOB FROM ORDER MODAL */}
      {showCreateJobForm && (
        <Modal open={true} onClose={() => setShowCreateJobForm(false)} title="Tạo lệnh sản xuất" size="lg">
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Đơn hàng *</label>
              <select className={inputCls} value={jobForm.order_id} onChange={e => setJobForm(f => ({ ...f, order_id: e.target.value }))}>
                <option value="">— Chọn đơn hàng (confirmed) —</option>
                {confirmedOrders.map(o => <option key={o.id} value={o.id}>{o.order_no} — {o.customer_name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Workflow template</label>
              <select className={inputCls} value={jobForm.workflow_template_id} onChange={e => setJobForm(f => ({ ...f, workflow_template_id: e.target.value }))}>
                <option value="">— Chọn workflow —</option>
                {workflowTemplates.map(wf => <option key={wf.id} value={wf.id}>{wf.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Mức ưu tiên</label>
                <select className={inputCls} value={jobForm.priority} onChange={e => setJobForm(f => ({ ...f, priority: e.target.value }))}>
                  <option value="low">Thấp</option>
                  <option value="normal">Bình thường</option>
                  <option value="high">Cao</option>
                  <option value="urgent">Khẩn cấp</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Hạn hoàn thành</label>
                <input type="date" className={inputCls} value={jobForm.deadline} onChange={e => setJobForm(f => ({ ...f, deadline: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={createJobFromOrder} disabled={saving || !jobForm.order_id} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50">
                <Save className="w-4 h-4" />{saving ? 'Đang tạo...' : 'Tạo lệnh SX'}
              </button>
              <button onClick={() => setShowCreateJobForm(false)} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50">Hủy</button>
            </div>
          </div>
        </Modal>
      )}

      {/* SOP DETAIL MODAL */}
      {selectedSop && (
        <Modal open={true} onClose={() => setSelectedSop(null)} title={`${selectedSop.sop_code} — ${selectedSop.title}`} size="lg">
          <SopDetail sop={selectedSop} />
        </Modal>
      )}
    </div>
  );
}

function TaskDetail({ task, perms, onStatusChange, onQc, onWaste, onRefresh }: { task: ProductionTask; perms: RolePermissions; onStatusChange: (s: string) => void; onQc: () => void; onWaste: () => void; onRefresh: () => void; }) {
  const nextStatuses = taskStatusFlow[task.status] ?? [];
  const assignee = task.assignee as unknown as { full_name: string };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToastLocal = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${task.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('task-photos').upload(filePath, file);
      if (uploadError) { showToastLocal('Lỗi upload: ' + uploadError.message); setUploading(false); return; }

      const { data: urlData } = supabase.storage.from('task-photos').getPublicUrl(filePath);
      const newUrl = urlData.publicUrl;
      const existingUrls = task.photo_urls ?? [];
      const { error: updateError } = await supabase.from('production_tasks').update({
        photo_urls: [...existingUrls, newUrl],
      }).eq('id', task.id);

      if (updateError) { showToastLocal('Lỗi cập nhật: ' + updateError.message); }
      else { showToastLocal('Tải ảnh thành công!'); onRefresh(); }
    } catch (err) {
      showToastLocal('Lỗi: ' + String(err));
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium">{toast}</div>}

      {/* Status change */}
      {nextStatuses.length > 0 && perms.canWrite('production_tasks') && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <p className="text-xs font-semibold text-blue-700 mb-2">Chuyển trạng thái:</p>
          <div className="flex flex-wrap gap-2">
            {nextStatuses.map(s => (
              <button key={s} onClick={() => onStatusChange(s)} className={`text-xs font-semibold px-3 py-1.5 rounded-lg active:scale-95 transition-all ${
                s === 'done' ? 'bg-green-600 text-white hover:bg-green-700' :
                s === 'rework' ? 'bg-red-100 text-red-700 hover:bg-red-200' :
                s === 'blocked' ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' :
                'bg-blue-600 text-white hover:bg-blue-700'
              }`}>{taskStatusLabels[s]}</button>
            ))}
            {task.status === 'qc_pending' && perms.canWrite('qc_records') && (
              <button onClick={onQc} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 active:scale-95 transition-all flex items-center gap-1">
                <ClipboardCheck className="w-3 h-3" /> Nghiệm thu QC
              </button>
            )}
          </div>
        </div>
      )}

      {/* Waste recording button */}
      {task.status !== 'done' && perms.canWrite('production_tasks') && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-xs font-semibold text-red-700 mb-2">Ghi nhận hao hụt:</p>
          <button onClick={onWaste} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 active:scale-95 transition-all flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Ghi hao hụt
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Trạng thái', value: <Badge className={statusColor(task.status)}>{taskStatusLabels[task.status]}</Badge> },
          { label: 'Người làm', value: assignee?.full_name ?? '—' },
          { label: 'SOP', value: task.sop_code || '—' },
          { label: 'QC Status', value: <Badge className={task.qc_status === 'pass' ? 'bg-green-100 text-green-700' : task.qc_status === 'fail' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}>{task.qc_status}</Badge> },
          { label: 'Bắt đầu', value: task.started_at ? formatDatetime(task.started_at) : '—' },
          { label: 'Hoàn thành', value: task.completed_at ? formatDatetime(task.completed_at) : '—' },
          { label: 'Rework', value: task.rework_count > 0 ? `${task.rework_count} lần` : '0' },
          { label: 'Deadline', value: task.deadline ? formatDate(task.deadline) : '—' },
        ].map(r => (
          <div key={r.label} className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">{r.label}</p>
            <div className="text-sm font-medium text-gray-900 mt-0.5">{r.value}</div>
          </div>
        ))}
      </div>
      {task.fail_reason && <div className="bg-red-50 border border-red-200 rounded-lg p-3"><p className="text-xs font-semibold text-red-700 mb-1">Lý do fail</p><p className="text-sm text-red-800">{task.fail_reason}</p></div>}
      {task.notes && <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500 mb-1">Ghi chú</p><p className="text-sm text-gray-700">{task.notes}</p></div>}

      {/* Photo Upload Section */}
      <div className="border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-gray-900">Ảnh xác nhận</h3>
            <span className="text-xs text-gray-400">({(task.photo_urls ?? []).length} ảnh)</span>
          </div>
          {perms.canWrite('production_tasks') && (
            <label className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-700 active:scale-95 transition-all cursor-pointer disabled:opacity-50">
              <Upload className="w-3.5 h-3.5" />
              {uploading ? 'Đang tải...' : 'Tải ảnh lên'}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
            </label>
          )}
        </div>
        {(task.photo_urls ?? []).length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">Chưa có ảnh nào</p>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {(task.photo_urls ?? []).map((url, idx) => (
              <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block">
                <img src={url} alt={`Ảnh ${idx + 1}`} className="w-full h-16 object-cover rounded-lg border border-gray-200 hover:border-blue-400 transition-colors" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SopDetail({ sop }: { sop: SopEntry }) {
  return (
    <div className="space-y-5">
      <div className="bg-blue-50 rounded-xl p-4">
        <p className="text-xs font-semibold text-blue-700 mb-1">Mục đích</p>
        <p className="text-sm text-blue-900">{sop.purpose}</p>
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-2">CÁC BƯỚC THỰC HIỆN</p>
        <div className="space-y-3">
          {(Array.isArray(sop.steps) ? sop.steps : []).map((step: { step: number; title: string; detail: string }) => (
            <div key={step.step} className="flex gap-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">{step.step}</div>
              <div><p className="text-sm font-semibold text-gray-900">{step.title}</p><p className="text-xs text-gray-600 mt-0.5">{step.detail}</p></div>
            </div>
          ))}
        </div>
      </div>
      {sop.qc_criteria?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">TIÊU CHUẨN NGHIỆM THU</p>
          <div className="space-y-1.5">
            {sop.qc_criteria.map((c, i) => (
              <div key={i} className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" /><p className="text-sm text-gray-700">{c}</p></div>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Phiên bản</p><p className="text-sm font-semibold text-gray-900">v{sop.version}</p></div>
        <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Trạng thái</p><Badge className={sop.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>{sop.status === 'active' ? 'Hiệu lực' : sop.status}</Badge></div>
      </div>
    </div>
  );
}
