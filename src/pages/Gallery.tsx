import { useEffect, useState, useCallback } from 'react';
import { Image, Eye, Star, Phone, ArrowRight, Palette, Plus, Save, Trash2, Megaphone } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import { formatCurrency, formatNumber, formatDate } from '../lib/utils';
import type { GalleryItem, MasterUser } from '../types';
import { usePermissions } from '../lib/permissions';
import { useMultiRealtimeSubscription } from '../lib/useRealtime';

const PEXELS_ARTWORK = [
  'https://images.pexels.com/photos/1579708/pexels-photo-1579708.jpeg?auto=compress&w=600',
  'https://images.pexels.com/photos/1194420/pexels-photo-1194420.jpeg?auto=compress&w=600',
  'https://images.pexels.com/photos/3109816/pexels-photo-3109816.jpeg?auto=compress&w=600',
  'https://images.pexels.com/photos/1183992/pexels-photo-1183992.jpeg?auto=compress&w=600',
  'https://images.pexels.com/photos/4339919/pexels-photo-4339919.jpeg?auto=compress&w=600',
  'https://images.pexels.com/photos/2119706/pexels-photo-2119706.jpeg?auto=compress&w=600',
  'https://images.pexels.com/photos/1585325/pexels-photo-1585325.jpeg?auto=compress&w=600',
  'https://images.pexels.com/photos/3246665/pexels-photo-3246665.jpeg?auto=compress&w=600',
];

const defaultMediumLabels: Record<string, string> = {
  oil: 'Sơn dầu', acrylic: 'Acrylic', watercolor: 'Màu nước',
  print: 'Tranh in', sculpture: 'Điêu khắc',
};

const defaultMediumOptions = [
  { value: 'oil', label: 'Sơn dầu' },
  { value: 'acrylic', label: 'Acrylic' },
  { value: 'watercolor', label: 'Màu nước' },
  { value: 'print', label: 'Tranh in' },
  { value: 'sculpture', label: 'Điêu khắc' },
];

interface MarketingContent {
  id: string;
  title: string;
  type: string;
  channel: string;
  status: string;
  content: string;
  created_at: string;
}

const contentTypeLabels: Record<string, string> = {
  post: 'Bài viết', video: 'Video', story: 'Story', ad: 'Quảng cáo', reel: 'Reel',
};
const contentTypeColor: Record<string, string> = {
  post: 'bg-blue-100 text-blue-700', video: 'bg-purple-100 text-purple-700',
  story: 'bg-amber-100 text-amber-700', ad: 'bg-red-100 text-red-700', reel: 'bg-pink-100 text-pink-700',
};
const channelLabels: Record<string, string> = {
  facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', zalo: 'Zalo', website: 'Website',
};
const marketingStatusLabels: Record<string, string> = {
  draft: 'Nháp', pending: 'Chờ duyệt', approved: 'Đã duyệt', published: 'Đã đăng', archived: 'Lưu trữ',
};
const marketingStatusColor: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700', pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700', published: 'bg-green-100 text-green-700',
  archived: 'bg-gray-100 text-gray-500',
};

type Tab = 'gallery' | 'marketing';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}

export default function Gallery({ currentUser }: { currentUser?: MasterUser }) {
  const perms = usePermissions(currentUser ?? { role_code: 'guest', role: { menu_access: [], permissions: {}, is_active: true, sort_order: 0, id: '', code: 'guest', name: 'Guest', description: '' } } as MasterUser);
  const isGuest = !currentUser || currentUser.role_code === 'guest';
  const [tab, setTab] = useState<Tab>('gallery');
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [selected, setSelected] = useState<GalleryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterMedium, setFilterMedium] = useState('all');
  const [filterAvail, setFilterAvail] = useState(false);

  // CRUD states
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Dynamic medium options from DB
  const [mediumOptions, setMediumOptions] = useState(defaultMediumOptions);
  const [mediumLabels, setMediumLabels] = useState<Record<string, string>>(defaultMediumLabels);

  const [galleryForm, setGalleryForm] = useState({
    title: '',
    slug: '',
    description: '',
    medium: 'oil',
    dimensions: '',
    style: '',
    artist: '',
    price: 0,
    is_available: true,
    is_featured: false,
    tags: '',
  });

  // Marketing states
  const [marketingItems, setMarketingItems] = useState<MarketingContent[]>([]);
  const [showMktForm, setShowMktForm] = useState(false);
  const [mktForm, setMktForm] = useState({
    title: '',
    type: 'post',
    channel: 'facebook',
    status: 'draft',
    content: '',
  });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const loadData = useCallback(async () => {
    setLoading(true);
    const [galleryRes, mktRes, catsRes] = await Promise.all([
      supabase
        .from('gallery_items')
        .select('*')
        .not('published_at', 'is', null)
        .order('is_featured', { ascending: false })
        .order('view_count', { ascending: false }),
      supabase.from('marketing_content').select('*').order('created_at', { ascending: false }),
      supabase.from('master_categories').select('code, name, type').eq('type', 'medium'),
    ]);
    setItems(galleryRes.data ?? []);
    setMarketingItems(mktRes.data ?? []);

    // Populate dynamic medium options from DB, merge with defaults
    const dbMediums = (catsRes.data ?? []) as { code: string; name: string; type: string }[];
    if (dbMediums.length > 0) {
      const dbLabels: Record<string, string> = {};
      const dbOptions: { value: string; label: string }[] = [];
      for (const cat of dbMediums) {
        dbLabels[cat.code] = cat.name;
        dbOptions.push({ value: cat.code, label: cat.name });
      }
      // Merge: DB entries + defaults, DB takes precedence
      const mergedLabels = { ...defaultMediumLabels, ...dbLabels };
      const existingValues = new Set(dbOptions.map(o => o.value));
      const mergedOptions = [...dbOptions, ...defaultMediumOptions.filter(o => !existingValues.has(o.value))];
      setMediumLabels(mergedLabels);
      setMediumOptions(mergedOptions);
    }

    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useMultiRealtimeSubscription(['gallery_items', 'marketing_content'], loadData, [loadData]);

  const mediums = ['all', ...Array.from(new Set(items.map(i => i.medium).filter(Boolean)))];

  const filtered = items.filter(i => {
    const matchMedium = filterMedium === 'all' || i.medium === filterMedium;
    const matchAvail = !filterAvail || i.is_available;
    return matchMedium && matchAvail;
  });

  // GALLERY CRUD
  const openNewGallery = () => {
    setGalleryForm({
      title: '', slug: '', description: '', medium: 'oil',
      dimensions: '', style: '', artist: '', price: 0,
      is_available: true, is_featured: false, tags: '',
    });
    setSelected(null);
    setShowForm(true);
  };

  const openEditGallery = (item: GalleryItem) => {
    setGalleryForm({
      title: item.title,
      slug: item.slug,
      description: item.description || '',
      medium: item.medium,
      dimensions: item.dimensions || '',
      style: item.style || '',
      artist: item.artist || '',
      price: item.price,
      is_available: item.is_available,
      is_featured: item.is_featured,
      tags: item.tags?.join(', ') || '',
    });
    setSelected(item);
    setShowForm(true);
  };

  const saveGallery = async () => {
    setSaving(true);
    const tagsArray = galleryForm.tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    if (selected) {
      const { error } = await supabase
        .from('gallery_items')
        .update({
          title: galleryForm.title,
          slug: galleryForm.slug,
          description: galleryForm.description || null,
          medium: galleryForm.medium,
          dimensions: galleryForm.dimensions || null,
          style: galleryForm.style || null,
          artist: galleryForm.artist || null,
          price: galleryForm.price,
          is_available: galleryForm.is_available,
          is_featured: galleryForm.is_featured,
          tags: tagsArray,
        })
        .eq('id', selected.id);
      if (!error) {
        showToast('Cập nhật tác phẩm thành công');
        setShowForm(false);
        setSelected(null);
        loadData();
      } else {
        showToast('Lỗi: ' + error.message);
      }
    } else {
      const { error } = await supabase.from('gallery_items').insert({
        title: galleryForm.title,
        slug: galleryForm.slug,
        description: galleryForm.description || null,
        medium: galleryForm.medium,
        dimensions: galleryForm.dimensions || null,
        style: galleryForm.style || null,
        artist: galleryForm.artist || null,
        price: galleryForm.price,
        is_available: galleryForm.is_available,
        is_featured: galleryForm.is_featured,
        tags: tagsArray,
        view_count: 0,
        published_at: new Date().toISOString(),
        image_urls: [],
      });
      if (!error) {
        showToast('Tạo tác phẩm thành công!');
        setShowForm(false);
        loadData();
      } else {
        showToast('Lỗi: ' + error.message);
      }
    }
    setSaving(false);
  };

  const deleteGallery = async (id: string) => {
    if (!confirm('Xóa tác phẩm này?')) return;
    const { error } = await supabase.from('gallery_items').delete().eq('id', id);
    if (!error) {
      showToast('Đã xóa tác phẩm');
      setShowForm(false);
      setSelected(null);
      loadData();
    } else {
      showToast('Lỗi: ' + error.message);
    }
  };

  // MARKETING CONTENT CRUD
  const createMarketing = async () => {
    setSaving(true);
    const { error } = await supabase.from('marketing_content').insert({
      title: mktForm.title,
      type: mktForm.type,
      channel: mktForm.channel,
      status: mktForm.status,
      content: mktForm.content || null,
    });
    if (!error) {
      showToast('Tạo nội dung marketing thành công!');
      setShowMktForm(false);
      loadData();
    } else {
      showToast('Lỗi: ' + error.message);
    }
    setSaving(false);
  };

  const inputCls = 'w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white';
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';
  const btnPrimary = 'flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50';
  const btnDanger = 'flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50';

  const allTabs: { id: Tab; label: string; count: number }[] = [
    { id: 'gallery', label: 'Tác phẩm', count: items.length },
    { id: 'marketing', label: 'Nội dung Marketing', count: marketingItems.length },
  ];
  const tabs = allTabs.filter(t =>
    t.id === 'gallery' || (perms.can('content') || perms.can('gallery') || perms.isSuperAdmin)
  );

  if (loading) return (
    <div className="flex justify-center py-20 text-gray-400 text-sm">Đang tải gallery...</div>
  );

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium animate-[fadeIn_0.2s]">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-blue-900 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-3">
          <Palette className="w-6 h-6 text-blue-300" />
          <span className="text-blue-300 text-sm font-medium">Gallery Nghệ Thuật</span>
        </div>
        <h1 className="text-2xl font-bold mb-1">Xưởng Tranh Nghệ Thuật</h1>
        <p className="text-blue-200 text-sm">Nghệ thuật sống động · Tranh chuyên biệt cao cấp</p>
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-xl font-bold">{items.length}</p>
              <p className="text-xs text-blue-300">Tác phẩm</p>
            </div>
            <div className="w-px h-8 bg-blue-700" />
            <div className="text-center">
              <p className="text-xl font-bold">{items.filter(i => i.is_available).length}</p>
              <p className="text-xs text-blue-300">Còn bán</p>
            </div>
            <div className="w-px h-8 bg-blue-700" />
            <div className="text-center">
              <p className="text-xl font-bold">{items.reduce((s, i) => s + i.view_count, 0)}</p>
              <p className="text-xs text-blue-300">Lượt xem</p>
            </div>
          </div>
          {tab === 'gallery' && perms.canWrite('gallery_items') && (
            <button onClick={openNewGallery} className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2.5 rounded-xl text-sm font-semibold active:scale-95 transition-all backdrop-blur-sm">
              <Plus className="w-4 h-4" /> Thêm tác phẩm
            </button>
          )}
          {tab === 'marketing' && perms.canWrite('marketing') && (
            <button onClick={() => { setMktForm({ title: '', type: 'post', channel: 'facebook', status: 'draft', content: '' }); setShowMktForm(true); }} className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2.5 rounded-xl text-sm font-semibold active:scale-95 transition-all backdrop-blur-sm">
              <Plus className="w-4 h-4" /> Tạo nội dung
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${tab === t.id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.id === 'gallery' ? <Palette className="w-3.5 h-3.5" /> : <Megaphone className="w-3.5 h-3.5" />}
            {t.label}
            <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${tab === t.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* ===== GALLERY TAB ===== */}
      {tab === 'gallery' && (
        <>
          {/* Filters */}
          <div className="flex gap-2 items-center flex-wrap">
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl flex-1">
              {mediums.map(m => (
                <button
                  key={m}
                  onClick={() => setFilterMedium(m)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                    filterMedium === m ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {m === 'all' ? 'Tất cả' : mediumLabels[m] ?? m}
                </button>
              ))}
            </div>
            <button
              onClick={() => setFilterAvail(v => !v)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                filterAvail ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400'
              }`}
            >
              Còn bán
            </button>
          </div>

          {/* Grid */}
          {filtered.length === 0 ? (
            <EmptyState icon={Image} title="Không có tác phẩm nào" description="Thay đổi bộ lọc để xem thêm" />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map((item, idx) => {
                const img = item.image_urls?.[0] || PEXELS_ARTWORK[idx % PEXELS_ARTWORK.length];
                return (
                  <Card key={item.id} className="overflow-hidden" onClick={perms.canWrite('gallery_items') ? () => openEditGallery(item) : undefined}>
                    <div className="relative">
                      <img
                        src={img}
                        alt={item.title}
                        className="w-full h-40 object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute top-2 right-2 flex gap-1">
                        {item.is_featured && (
                          <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                            <Star className="w-3 h-3 text-white" fill="white" />
                          </div>
                        )}
                        {!item.is_available && (
                          <Badge className="bg-gray-800/80 text-white text-xs">Đã bán</Badge>
                        )}
                      </div>
                      <div className="absolute bottom-2 left-2 right-2">
                        <p className="text-white text-xs font-bold truncate leading-snug">{item.title}</p>
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500">{mediumLabels[item.medium] ?? item.medium} · {item.dimensions}</p>
                          <p className="text-sm font-bold text-blue-700 mt-0.5">{formatCurrency(item.price)}</p>
                        </div>
                        <div className="flex items-center gap-1 text-gray-400">
                          <Eye className="w-3 h-3" />
                          <span className="text-xs">{formatNumber(item.view_count)}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Contact CTA */}
          <Card className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <h3 className="font-bold text-gray-900 mb-1">Đặt tranh theo yêu cầu?</h3>
            <p className="text-sm text-gray-600 mb-4">Chúng tôi vẽ tranh chuyên biệt theo đúng yêu cầu của bạn — chân dung, phong cảnh, tranh trang trí nội thất.</p>
            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all">
                <Phone className="w-4 h-4" /> Liên hệ ngay
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 bg-white text-gray-700 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all">
                Xem thêm <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </Card>
        </>
      )}

      {/* ===== MARKETING TAB ===== */}
      {tab === 'marketing' && (
        <>
          {marketingItems.length === 0 ? (
            <EmptyState icon={Megaphone} title="Chưa có nội dung marketing" description="Tạo nội dung marketing để quảng bá tác phẩm" />
          ) : (
            <div className="space-y-2">
              {marketingItems.map(mkt => (
                <Card key={mkt.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg flex-shrink-0 ${contentTypeColor[mkt.type] ?? 'bg-gray-100 text-gray-700'}`}>
                      <Megaphone className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900 truncate">{mkt.title}</p>
                        <Badge className={contentTypeColor[mkt.type] ?? 'bg-gray-100 text-gray-600'}>
                          {contentTypeLabels[mkt.type] ?? mkt.type}
                        </Badge>
                        <Badge className={marketingStatusColor[mkt.status] ?? 'bg-gray-100 text-gray-600'}>
                          {marketingStatusLabels[mkt.status] ?? mkt.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500">{channelLabels[mkt.channel] ?? mkt.channel}</span>
                        <span className="text-xs text-gray-400">{formatDate(mkt.created_at)}</span>
                      </div>
                      {mkt.content && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{mkt.content}</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* ===== GALLERY FORM MODAL ===== */}
      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); setSelected(null); }}
        title={selected ? 'Sửa tác phẩm' : 'Thêm tác phẩm'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Tiêu đề *</label>
              <input
                className={inputCls}
                value={galleryForm.title}
                onChange={e => {
                  const title = e.target.value;
                  setGalleryForm(f => ({
                    ...f,
                    title,
                    slug: f.slug === slugify(f.title) || !f.slug ? slugify(title) : f.slug,
                  }));
                }}
                placeholder="Tên tác phẩm"
              />
            </div>
            <div>
              <label className={labelCls}>Slug</label>
              <input
                className={inputCls}
                value={galleryForm.slug}
                onChange={e => setGalleryForm(f => ({ ...f, slug: e.target.value }))}
                placeholder="tu-dong-tu-tieu-de"
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Mô tả</label>
            <textarea
              className={inputCls + ' h-20'}
              value={galleryForm.description}
              onChange={e => setGalleryForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Mô tả về tác phẩm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Chất liệu</label>
              <select
                className={inputCls}
                value={galleryForm.medium}
                onChange={e => setGalleryForm(f => ({ ...f, medium: e.target.value }))}
              >
                {mediumOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Kích thước</label>
              <input
                className={inputCls}
                value={galleryForm.dimensions}
                onChange={e => setGalleryForm(f => ({ ...f, dimensions: e.target.value }))}
                placeholder="100x80 cm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Phong cách</label>
              <input
                className={inputCls}
                value={galleryForm.style}
                onChange={e => setGalleryForm(f => ({ ...f, style: e.target.value }))}
                placeholder="Trừu tượng, Hiện đại..."
              />
            </div>
            <div>
              <label className={labelCls}>Họa sĩ</label>
              <input
                className={inputCls}
                value={galleryForm.artist}
                onChange={e => setGalleryForm(f => ({ ...f, artist: e.target.value }))}
                placeholder="Tên họa sĩ"
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Giá (VND)</label>
            <input
              type="number"
              className={inputCls}
              value={galleryForm.price || ''}
              onChange={e => setGalleryForm(f => ({ ...f, price: Number(e.target.value) }))}
              placeholder="0"
            />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                checked={galleryForm.is_available}
                onChange={e => setGalleryForm(f => ({ ...f, is_available: e.target.checked }))}
              />
              <span className="text-sm text-gray-700">Còn bán</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 text-yellow-600 rounded border-gray-300 focus:ring-yellow-500"
                checked={galleryForm.is_featured}
                onChange={e => setGalleryForm(f => ({ ...f, is_featured: e.target.checked }))}
              />
              <span className="text-sm text-gray-700">Nổi bật</span>
            </label>
          </div>
          <div>
            <label className={labelCls}>Tags (phân cách bằng dấu phẩy)</label>
            <input
              className={inputCls}
              value={galleryForm.tags}
              onChange={e => setGalleryForm(f => ({ ...f, tags: e.target.value }))}
              placeholder="tranh-sơn-dầu, phong-cảnh, nội-thất"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={saveGallery}
              disabled={saving || !galleryForm.title}
              className={btnPrimary + ' flex-1'}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Đang lưu...' : selected ? 'Cập nhật' : 'Tạo tác phẩm'}
            </button>
            {selected && perms.canWrite('gallery_items') && (
              <button
                onClick={() => deleteGallery(selected.id)}
                className={btnDanger}
              >
                <Trash2 className="w-4 h-4" /> Xóa
              </button>
            )}
            <button
              onClick={() => { setShowForm(false); setSelected(null); }}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50"
            >
              Hủy
            </button>
          </div>
        </div>
      </Modal>

      {/* ===== MARKETING CONTENT FORM MODAL ===== */}
      <Modal
        open={showMktForm}
        onClose={() => setShowMktForm(false)}
        title="Tạo nội dung marketing"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Tiêu đề *</label>
            <input
              className={inputCls}
              value={mktForm.title}
              onChange={e => setMktForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Tiêu đề nội dung"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Loại</label>
              <select
                className={inputCls}
                value={mktForm.type}
                onChange={e => setMktForm(f => ({ ...f, type: e.target.value }))}
              >
                {Object.entries(contentTypeLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Kênh</label>
              <select
                className={inputCls}
                value={mktForm.channel}
                onChange={e => setMktForm(f => ({ ...f, channel: e.target.value }))}
              >
                {Object.entries(channelLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Trạng thái</label>
            <select
              className={inputCls}
              value={mktForm.status}
              onChange={e => setMktForm(f => ({ ...f, status: e.target.value }))}
            >
              {Object.entries(marketingStatusLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Nội dung</label>
            <textarea
              className={inputCls + ' h-24'}
              value={mktForm.content}
              onChange={e => setMktForm(f => ({ ...f, content: e.target.value }))}
              placeholder="Nội dung marketing..."
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={createMarketing}
              disabled={saving || !mktForm.title}
              className={btnPrimary + ' flex-1'}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Đang lưu...' : 'Tạo nội dung'}
            </button>
            <button
              onClick={() => setShowMktForm(false)}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50"
            >
              Hủy
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
