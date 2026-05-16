import {
  LayoutDashboard, ShoppingCart, Factory, Package, DollarSign,
  Settings, Image, Bot, ChevronRight, Palette, Menu, X, LogOut, DoorOpen
} from 'lucide-react';
import type { MasterUser } from '../../types';

const ROOM_ACCESS: Record<string, string[]> = {
  super_admin: ['dashboard', 'sales', 'production', 'inventory', 'finance', 'settings', 'gallery', 'ai'],
  sales_director: ['dashboard', 'sales', 'finance'],
  finance: ['dashboard', 'sales', 'finance'],
  production_manager: ['dashboard', 'production', 'inventory'],
  artisan: ['production'],
  qc_inspector: ['production'],
  storekeeper: ['dashboard', 'inventory'],
  partner_operator: ['sales', 'inventory'],
  customer_care: ['sales'],
  marketing: ['gallery', 'ai'],
  trainee: ['production'],
  auditor: ['finance'],
};

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-blue-600' },
  { id: 'sales', label: 'Ban hang / CRM', icon: ShoppingCart, color: 'text-emerald-600' },
  { id: 'production', label: 'San xuat / QC', icon: Factory, color: 'text-amber-600' },
  { id: 'inventory', label: 'Kho / Doi tac', icon: Package, color: 'text-teal-600' },
  { id: 'finance', label: 'Tai chinh', icon: DollarSign, color: 'text-rose-600' },
  { id: 'gallery', label: 'Gallery', icon: Image, color: 'text-pink-600' },
  { id: 'ai', label: 'AI Assistant', icon: Bot, color: 'text-cyan-600' },
  { id: 'settings', label: 'Cai dat', icon: Settings, color: 'text-gray-600' },
];

interface SidebarProps {
  active: string;
  onNav: (id: string) => void;
  alertCount: number;
  mobileOpen: boolean;
  onMobileToggle: () => void;
  currentUser: MasterUser;
  onLogout: () => void;
}

export default function Sidebar({ active, onNav, alertCount, mobileOpen, onMobileToggle, currentUser, onLogout }: SidebarProps) {
  const handleNav = (id: string) => {
    onNav(id);
    onMobileToggle();
  };

  const isSuperAdmin = currentUser.role_code === 'super_admin';
  const allowedRooms = ROOM_ACCESS[currentUser.role_code] ?? [];
  const visibleItems = navItems.filter(item => {
    if (isSuperAdmin) return true;
    if (item.id === 'gallery') return true; // gallery always accessible
    return allowedRooms.includes(item.id);
  });

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onMobileToggle} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Palette className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-900 text-sm truncate">ArtERP Studio</p>
            <p className="text-xs text-gray-400 truncate">Xuong Tranh Nghe Thuat</p>
          </div>
          <button className="lg:hidden ml-auto p-1 text-gray-400" onClick={onMobileToggle}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {visibleItems.map(item => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-600' : item.color}`} />
                <span className="flex-1 text-left truncate">{item.label}</span>
                {item.id === 'dashboard' && alertCount > 0 && (
                  <span className="flex-shrink-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {alertCount > 9 ? '9+' : alertCount}
                  </span>
                )}
                {isActive && <ChevronRight className="w-3 h-3 flex-shrink-0 text-blue-500" />}
              </button>
            );
          })}

          {/* Divider + Go to lobby */}
          <div className="pt-3 mt-3 border-t border-gray-100">
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
            >
              <DoorOpen className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">Ra khoi nha</span>
            </button>
          </div>
        </nav>

        {/* User footer */}
        <div className="px-3 py-3 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">
                {currentUser.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-900 truncate">{currentUser.full_name}</p>
              <p className="text-xs text-gray-400 truncate">{currentUser.role?.name ?? currentUser.role_code}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 flex items-center gap-3 px-4 h-14">
        <button onClick={onMobileToggle} className="p-2 -ml-2 text-gray-600">
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <Palette className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-sm">ArtERP Studio</span>
        </div>
        {alertCount > 0 && (
          <span className="ml-auto w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {alertCount}
          </span>
        )}
      </div>
    </>
  );
}
