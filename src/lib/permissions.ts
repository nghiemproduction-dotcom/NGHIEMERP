import type { MasterUser } from '../types';

export type Permission =
  | 'all'
  | 'crm'
  | 'sales'
  | 'finance'
  | 'finance_view'
  | 'sales_view'
  | 'production'
  | 'production_view'
  | 'inventory'
  | 'inventory_view'
  | 'qc'
  | 'tasks'
  | 'tasks_limited'
  | 'content'
  | 'gallery'
  | 'pos'
  | 'own_sales'
  | 'complaints'
  | 'audit'
  | 'approve';

export interface RolePermissions {
  can: (perm: Permission) => boolean;
  canWrite: (resource: string) => boolean;
  canDelete: (resource: string) => boolean;
  roleCode: string;
  isSuperAdmin: boolean;
}

const WRITE_PERMISSIONS: Record<string, Permission[]> = {
  orders: ['all', 'sales'],
  customers: ['all', 'crm', 'sales'],
  leads: ['all', 'crm', 'sales'],
  complaints: ['all', 'complaints', 'crm'],
  quotations: ['all', 'sales'],
  production_jobs: ['all', 'production'],
  production_tasks: ['all', 'production', 'tasks', 'tasks_limited'],
  qc_records: ['all', 'qc', 'production'],
  inventory: ['all', 'inventory'],
  materials: ['all', 'inventory'],
  locations: ['all', 'inventory'],
  bom: ['all', 'inventory'],
  transactions: ['all', 'finance'],
  receivables: ['all', 'finance'],
  payables: ['all', 'finance'],
  expenses: ['all', 'finance'],
  expense_approve: ['all', 'approve', 'audit'],
  gallery_items: ['all', 'gallery', 'content'],
  marketing: ['all', 'content', 'gallery'],
  settings: ['all'],
  users: ['all'],
  roles: ['all'],
  ai: ['all', 'content', 'gallery'],
};

const DELETE_PERMISSIONS: Record<string, Permission[]> = {
  orders: ['all', 'sales'],
  customers: ['all', 'sales'],
  leads: ['all', 'sales'],
  quotations: ['all', 'sales'],
  materials: ['all', 'inventory'],
  locations: ['all', 'inventory'],
  transactions: ['all', 'finance'],
  gallery_items: ['all', 'gallery', 'content'],
  users: ['all'],
  roles: ['all'],
};

export function usePermissions(user: MasterUser): RolePermissions {
  const perms = (user.role?.permissions ?? {}) as Record<string, boolean>;
  const roleCode = user.role_code;
  const isSuperAdmin = roleCode === 'super_admin';

  const can = (perm: Permission): boolean => {
    if (isSuperAdmin) return true;
    return !!perms[perm];
  };

  const canWrite = (resource: string): boolean => {
    if (isSuperAdmin) return true;
    const allowed = WRITE_PERMISSIONS[resource] ?? ['all'];
    return allowed.some(p => perms[p]);
  };

  const canDelete = (resource: string): boolean => {
    if (isSuperAdmin) return true;
    const allowed = DELETE_PERMISSIONS[resource] ?? ['all'];
    return allowed.some(p => perms[p]);
  };

  return { can, canWrite, canDelete, roleCode, isSuperAdmin };
}
