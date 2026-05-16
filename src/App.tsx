import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import Sales from './pages/Sales';
import Production from './pages/Production';
import Inventory from './pages/Inventory';
import Finance from './pages/Finance';
import Settings from './pages/Settings';
import Gallery from './pages/Gallery';
import AIHub from './pages/AIHub';
import Login from './pages/Login';
import { supabase } from './lib/supabase';
import { Bell, X, CheckCheck, AlertCircle, Info, AlertTriangle, CheckCircle, Palette, LogIn } from 'lucide-react';
import Badge from './components/ui/Badge';
import { formatDatetime } from './lib/utils';
import type { MasterUser } from './types';

type Page = 'dashboard' | 'sales' | 'production' | 'inventory' | 'finance' | 'settings' | 'gallery' | 'ai';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

function NotificationIcon({ type }: { type: string }) {
  switch (type) {
    case 'error':
    case 'critical':
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    case 'success':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'info':
    default:
      return <Info className="w-4 h-4 text-blue-500" />;
  }
}

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

const DEFAULT_ROOM: Record<string, Page> = {
  super_admin: 'dashboard',
  sales_director: 'sales',
  finance: 'finance',
  production_manager: 'production',
  artisan: 'production',
  qc_inspector: 'production',
  storekeeper: 'inventory',
  partner_operator: 'sales',
  customer_care: 'sales',
  marketing: 'gallery',
  trainee: 'production',
  auditor: 'finance',
};

export default function App() {
  const [page, setPage] = useState<Page>('gallery');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentUser, setCurrentUser] = useState<MasterUser | null>(() => {
    try {
      const saved = localStorage.getItem('arterp_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleLogin = (user: MasterUser) => {
    localStorage.setItem('arterp_user', JSON.stringify(user));
    setCurrentUser(user);
    const defaultRoom = DEFAULT_ROOM[user.role_code] ?? 'gallery';
    setPage(defaultRoom);
  };

  const handleLogout = () => {
    localStorage.removeItem('arterp_user');
    setCurrentUser(null);
    setPage('gallery');
  };

  // Route guard: redirect unauthorized users to their allowed room
  useEffect(() => {
    if (!currentUser) {
      if (page !== 'gallery') setPage('gallery');
      return;
    }
    if (page === 'gallery') return; // gallery is always accessible
    const allowed = ROOM_ACCESS[currentUser.role_code] ?? [];
    const isSuperAdmin = currentUser.role_code === 'super_admin';
    if (!isSuperAdmin && !allowed.includes(page)) {
      const defaultRoom = DEFAULT_ROOM[currentUser.role_code] ?? 'gallery';
      setPage(defaultRoom);
    }
  }, [page, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    supabase
      .from('alerts')
      .select('id', { count: 'exact' })
      .eq('is_resolved', false)
      .then(({ count }) => setAlertCount(count ?? 0));
  }, [currentUser]);

  const fetchNotifications = useCallback(async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) {
      setNotifications(data as Notification[]);
      setUnreadCount(data.filter((n: Notification) => !n.is_read).length);
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    fetchNotifications();

    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => {
        fetchNotifications();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications' }, () => {
        fetchNotifications();
      })
      .subscribe();

    const alertChannel = supabase
      .channel('alerts-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, () => {
        supabase.from('alerts').select('id', { count: 'exact' }).eq('is_resolved', false)
          .then(({ count }) => setAlertCount(count ?? 0));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'alerts' }, () => {
        supabase.from('alerts').select('id', { count: 'exact' }).eq('is_resolved', false)
          .then(({ count }) => setAlertCount(count ?? 0));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(alertChannel);
    };
  }, [fetchNotifications, currentUser]);

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleNav = (p: string) => {
    setPage(p as Page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const pageTitles: Record<Page, string> = {
    dashboard: 'Dashboard',
    sales: 'Ban hang / CRM',
    production: 'San xuat / QC',
    inventory: 'Kho / Doi tac',
    finance: 'Tai chinh',
    settings: 'Cai dat',
    gallery: 'Gallery Cong khai',
    ai: 'AI Assistant',
  };

  // ===== PUBLIC GALLERY (no login required) =====
  if (!currentUser && page === 'gallery') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Public gallery top bar */}
        <header className="fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
                <Palette className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="font-bold text-gray-900 text-sm">ArtERP Studio</span>
            </div>
            <button
              onClick={() => setPage('login' as Page)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
            >
              <LogIn className="w-4 h-4" />
              Dang nhap
            </button>
          </div>
        </header>

        <main className="pt-14">
          <Gallery currentUser={{ role_code: 'guest', role: { menu_access: [], permissions: {}, is_active: true, sort_order: 0, id: '', code: 'guest', name: 'Guest', description: '' } } as MasterUser} />
        </main>
      </div>
    );
  }

  // ===== LOGIN SCREEN =====
  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  // ===== AUTHENTICATED APP (rooms with access control) =====
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        active={page}
        onNav={handleNav}
        alertCount={alertCount}
        mobileOpen={mobileOpen}
        onMobileToggle={() => setMobileOpen(v => !v)}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <main className="lg:pl-64 pt-14 lg:pt-0 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 py-5 pb-24">
          {/* Desktop breadcrumb */}
          <div className="hidden lg:flex items-center justify-between mb-5 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="font-semibold text-gray-900">ArtERP Studio</span>
              <span>-</span>
              <span className="text-gray-700">{pageTitles[page]}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                {new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())}
              </span>
              <button
                onClick={() => setNotifOpen(true)}
                className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 min-w-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {currentUser.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {page === 'dashboard' && <Dashboard onNav={handleNav} currentUser={currentUser} />}
          {page === 'sales' && <Sales currentUser={currentUser} />}
          {page === 'production' && <Production currentUser={currentUser} />}
          {page === 'inventory' && <Inventory currentUser={currentUser} />}
          {page === 'finance' && <Finance currentUser={currentUser} />}
          {page === 'settings' && <Settings currentUser={currentUser} />}
          {page === 'gallery' && <Gallery currentUser={currentUser} />}
          {page === 'ai' && <AIHub currentUser={currentUser} />}
        </div>
      </main>

      {/* Mobile notification bell */}
      <div className="lg:hidden fixed top-0 right-12 z-30 flex items-center h-14">
        <button
          onClick={() => setNotifOpen(true)}
          className="relative p-2 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 min-w-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notification panel overlay */}
      {notifOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setNotifOpen(false)} />
          <div className="relative w-full max-w-sm bg-white shadow-xl h-full flex flex-col animate-slide-in">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-gray-700" />
                <h2 className="text-sm font-semibold text-gray-900">Thong bao</h2>
                {unreadCount > 0 && (
                  <Badge className="bg-red-100 text-red-700">{unreadCount} moi</Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    title="Danh dau tat ca da doc"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Doc tat ca</span>
                  </button>
                )}
                <button
                  onClick={() => setNotifOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {notifications.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Bell className="w-8 h-8 mb-2" />
                  <p className="text-sm">Khong co thong bao</p>
                </div>
              )}
              {notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => {
                    if (!n.is_read) markAsRead(n.id);
                  }}
                  className={`w-full text-left px-4 py-3 flex gap-3 transition-colors hover:bg-gray-50 ${
                    !n.is_read ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <NotificationIcon type={n.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium truncate ${!n.is_read ? 'text-gray-900' : 'text-gray-600'}`}>
                        {n.title}
                      </span>
                      {!n.is_read && (
                        <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                    </div>
                    {n.body && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                    )}
                    <p className="text-[11px] text-gray-400 mt-1">{formatDatetime(n.created_at)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200">
        <div className="grid grid-cols-5 py-1">
          {[
            { id: 'dashboard', label: 'Tong quan', emoji: '📊' },
            { id: 'sales', label: 'Ban hang', emoji: '🛒' },
            { id: 'production', label: 'SX/QC', emoji: '🏭' },
            { id: 'inventory', label: 'Kho', emoji: '📦' },
            { id: 'finance', label: 'Tai chinh', emoji: '💰' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`flex flex-col items-center justify-center py-2 text-xs font-medium transition-all ${
                page === item.id ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className="text-lg mb-0.5">{item.emoji}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
