import { useState } from 'react';
import { Palette, Mail, Lock, ArrowRight, Loader2, AlertCircle, UserPlus, Phone, User, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { MasterUser } from '../types';

const testAccounts = [
  { role: 'Super Admin', name: 'Nguyen Minh Tuan', email: 'tuan.nguyen@artstudio.vn', pin: '1234' },
  { role: 'Sales Dir', name: 'Tran Thi Lan Anh', email: 'lananh.tran@artstudio.vn', pin: '1234' },
  { role: 'Finance', name: 'Nguyen Thi Mai', email: 'mai.nguyen@artstudio.vn', pin: '1234' },
  { role: 'Prod Mgr', name: 'Vo Thanh Nam', email: 'nam.vo@artstudio.vn', pin: '1234' },
  { role: 'Artisan', name: 'Le Van Duc', email: 'duc.le@artstudio.vn', pin: '1234' },
  { role: 'QC', name: 'Bui Thi Kim Oanh', email: 'oanh.bui@artstudio.vn', pin: '1234' },
  { role: 'Storekeep', name: 'Dang Van Hung', email: 'hung.dang@artstudio.vn', pin: '1234' },
  { role: 'Marketing', name: 'Ly Thi Thu Trang', email: 'trang.ly@artstudio.vn', pin: '1234' },
  { role: 'CS', name: 'Tran Thi Ngoc', email: 'ngoc.tran@artstudio.vn', pin: '1234' },
  { role: 'Partner', name: 'Nguyen Phuong Linh', email: 'linh.ng@artstudio.vn', pin: '1234' },
  { role: 'Trainee', name: 'Phan Van Binh', email: 'binh.phan@artstudio.vn', pin: '1234' },
];

interface LoginProps {
  onLogin: (user: MasterUser) => void;
}

type Mode = 'login' | 'register';

export default function Login({ onLogin }: LoginProps) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showGuide, setShowGuide] = useState(false);

  const resetForm = () => {
    setEmail('');
    setPin('');
    setFullName('');
    setPhone('');
    setConfirmPin('');
    setError('');
    setSuccess('');
  };

  const switchMode = (m: Mode) => {
    resetForm();
    setMode(m);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-login`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ action: 'login', email: email.trim().toLowerCase(), pin }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || 'Lỗi kết nối. Vui lòng thử lại.');
        return;
      }

      onLogin(result.user as MasterUser);
    } catch {
      setError('Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (pin.length < 4) {
      setError('PIN phải có ít nhất 4 ký tự.');
      return;
    }
    if (pin !== confirmPin) {
      setError('PIN xác nhận không khớp.');
      return;
    }
    if (!fullName.trim()) {
      setError('Vui lòng nhập họ tên.');
      return;
    }

    setLoading(true);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-login`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'register',
          email: email.trim().toLowerCase(),
          pin,
          full_name: fullName.trim(),
          phone: phone.trim(),
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || 'Lỗi tạo tài khoản.');
        return;
      }

      setSuccess('Đăng ký thành công! Đang chuyển sang trang đăng nhập...');
      setTimeout(() => {
        switchMode('login');
        setSuccess('');
      }, 1500);
    } catch {
      setError('Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setEmail('nghiemproduction@gmail.com');
    setPin('070511');
  };

  const inputCls = 'w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-slate-800 px-4 py-8">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/20 rounded-full animate-pulse" />
        <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 bg-white/15 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-2.5 h-2.5 bg-white/10 rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/20 p-8 sm:p-10">
          {/* Logo and title */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30 mb-4">
              <Palette className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">ArtERP Studio</h1>
            <p className="text-sm text-gray-500 mt-1">Xưởng Tranh Nghệ Thuật</p>
          </div>

          {/* Mode toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            <button
              onClick={() => switchMode('login')}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                mode === 'login' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Đăng nhập
            </button>
            <button
              onClick={() => switchMode('register')}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                mode === 'register' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Đăng ký
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-5 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="mb-5 flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
              <UserPlus className="w-4 h-4 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                  <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@arterp.vn" required autoComplete="email" className={inputCls} />
                </div>
              </div>
              <div>
                <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-1.5">PIN</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                  <input id="pin" type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="Nhập mã PIN" required maxLength={10} inputMode="numeric" className={inputCls + ' tracking-widest'} />
                </div>
              </div>
              <button type="submit" disabled={loading || !email || !pin} className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <><span>Đăng nhập</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          )}

          {/* REGISTER FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label htmlFor="reg-name" className="block text-sm font-medium text-gray-700 mb-1.5">Họ tên *</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                  <input id="reg-name" type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nguyen Van A" required className={inputCls} />
                </div>
              </div>
              <div>
                <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                  <input id="reg-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@arterp.vn" required autoComplete="email" className={inputCls} />
                </div>
              </div>
              <div>
                <label htmlFor="reg-phone" className="block text-sm font-medium text-gray-700 mb-1.5">Số điện thoại</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                  <input id="reg-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0901234567" className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="reg-pin" className="block text-sm font-medium text-gray-700 mb-1.5">PIN *</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                    <input id="reg-pin" type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="Tối thiểu 4 số" required minLength={4} maxLength={10} inputMode="numeric" className={inputCls + ' tracking-widest'} />
                  </div>
                </div>
                <div>
                  <label htmlFor="reg-confirm" className="block text-sm font-medium text-gray-700 mb-1.5">Xác nhận PIN *</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                    <input id="reg-confirm" type="password" value={confirmPin} onChange={e => setConfirmPin(e.target.value)} placeholder="Nhập lại PIN" required minLength={4} maxLength={10} inputMode="numeric" className={inputCls + ' tracking-widest'} />
                  </div>
                </div>
              </div>
              <button type="submit" disabled={loading || !fullName || !email || !pin || !confirmPin} className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 hover:from-emerald-700 hover:to-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <><UserPlus className="w-4 h-4" /><span>Đăng ký</span></>}
              </button>
            </form>
          )}

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white text-gray-400 uppercase tracking-wider">hoặc</span>
            </div>
          </div>

          {/* Demo login button */}
          {mode === 'login' && (
            <button
              onClick={handleDemoLogin}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-50 text-slate-600 text-sm font-medium rounded-xl border border-slate-200 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition-all"
            >
              <span>Demo Login (Super Admin)</span>
            </button>
          )}

          {/* Test accounts guide */}
          {mode === 'login' && (
            <div className="mt-5 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => setShowGuide(v => !v)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <span>Tai khoan test phan quyen</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showGuide ? 'rotate-180' : ''}`} />
              </button>
              {showGuide && (
                <div className="px-4 pb-3 space-y-1.5">
                  {testAccounts.map(a => (
                    <button
                      key={a.email}
                      onClick={() => { setEmail(a.email); setPin(a.pin); }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-white transition-colors group"
                    >
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">{a.role}</span>
                      <span className="text-xs text-gray-700 truncate flex-1">{a.name}</span>
                      <span className="text-[10px] text-gray-400 group-hover:text-blue-600 transition-colors">Dung</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer text */}
          <p className="mt-6 text-center text-xs text-gray-400">
            {mode === 'login' ? 'Phiên bản demo · Chọn tài khoản test bên trên' : 'Tài khoản mới mặc định vai trò: Thực tập sinh'}
          </p>
        </div>
      </div>
    </div>
  );
}
