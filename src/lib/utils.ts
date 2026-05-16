export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(n);
}

export function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d));
}

export function formatDatetime(d: string | null | undefined): string {
  if (!d) return '—';
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d));
}

export function daysAgo(d: string): number {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

export function daysUntil(d: string): number {
  return Math.floor((new Date(d).getTime() - Date.now()) / 86400000);
}

export function isOverdue(deadline: string): boolean {
  return new Date(deadline) < new Date();
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    confirmed: 'bg-blue-100 text-blue-700',
    in_production: 'bg-amber-100 text-amber-700',
    qc_check: 'bg-violet-100 text-violet-700',
    ready: 'bg-emerald-100 text-emerald-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    refunded: 'bg-gray-100 text-gray-500',
    pending: 'bg-gray-100 text-gray-600',
    in_progress: 'bg-blue-100 text-blue-700',
    qc_pending: 'bg-amber-100 text-amber-700',
    done: 'bg-green-100 text-green-700',
    rework: 'bg-red-100 text-red-700',
    blocked: 'bg-gray-200 text-gray-500',
    active: 'bg-green-100 text-green-700',
    on_leave: 'bg-yellow-100 text-yellow-700',
    inactive: 'bg-gray-100 text-gray-500',
    overdue: 'bg-red-100 text-red-700',
    open: 'bg-blue-100 text-blue-700',
    paid: 'bg-green-100 text-green-700',
    partial: 'bg-amber-100 text-amber-700',
    unpaid: 'bg-red-100 text-red-700',
    new: 'bg-blue-100 text-blue-700',
    contacted: 'bg-indigo-100 text-indigo-700',
    qualified: 'bg-cyan-100 text-cyan-700',
    proposal_sent: 'bg-purple-100 text-purple-700',
    negotiating: 'bg-orange-100 text-orange-700',
    won: 'bg-green-100 text-green-700',
    lost: 'bg-red-100 text-red-700',
  };
  return map[status] ?? 'bg-gray-100 text-gray-600';
}

export function priorityColor(p: string): string {
  const map: Record<string, string> = {
    urgent: 'bg-red-500 text-white',
    high: 'bg-orange-500 text-white',
    normal: 'bg-blue-500 text-white',
    low: 'bg-gray-400 text-white',
  };
  return map[p] ?? 'bg-gray-300 text-gray-700';
}

export function severityColor(s: string): string {
  const map: Record<string, string> = {
    critical: 'border-l-red-500 bg-red-50',
    high: 'border-l-orange-500 bg-orange-50',
    warning: 'border-l-amber-500 bg-amber-50',
    medium: 'border-l-yellow-500 bg-yellow-50',
    info: 'border-l-blue-500 bg-blue-50',
  };
  return map[s] ?? 'border-l-gray-400 bg-gray-50';
}

export function tierColor(t: string): string {
  const map: Record<string, string> = {
    vip: 'bg-yellow-100 text-yellow-800',
    gold: 'bg-amber-100 text-amber-800',
    silver: 'bg-slate-100 text-slate-700',
    bronze: 'bg-orange-100 text-orange-700',
    standard: 'bg-gray-100 text-gray-600',
  };
  return map[t] ?? 'bg-gray-100 text-gray-600';
}

export function shortName(name: string): string {
  return name.split(' ').slice(-2).map(n => n[0]).join('').toUpperCase();
}
