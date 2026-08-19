import { memo, useState, useEffect, useCallback } from 'react';
import { Users, BookOpen, ShoppingCart, CreditCard, AlertTriangle, BarChart3, Tag, DollarSign, Ban, CheckCircle2, XCircle, Plus, Trash2, Settings, RefreshCw, TrendingUp, UserX, ShieldCheck, Edit2, Search } from 'lucide-react';
import type { Language } from '../types';
import { API_URL } from '../lib/config';
import { useAuth } from '../lib/auth';

type Props = { lang: Language; text: Record<string, string> };
type Tab = 'stats' | 'students' | 'courses' | 'orders' | 'payments' | 'complaints' | 'discounts' | 'prices';

type AdminStats = {
  total_orders: number; month_orders: number; total_students: number; total_teachers: number;
  total_revenue_egp: number; open_complaints: number; active_promos: number;
  pending_deposits: number; banned_users: number; course_count: number;
};

type AdminOrder = {
  id: string; course_code: string; course_title: string; service_type: string;
  customer_name: string; contact: string; email: string; currency: string;
  price_egp: number; deposit_amount: number; deposit_paid: boolean; remaining_amount: number;
  status: string; branch_code: string; first_order_discount_pct: number;
  promo_code: string; referral_code: string; admin_notes: string;
  ip_address: string; created_at: string;
};

type AdminUser = {
  id: string; name: string; email: string; provider: string; credit_egp: number;
  is_banned: boolean; created_at: string;
};

type AdminPayment = {
  id: string; order_id: string; amount: number; currency: string;
  payment_method: string; proof_url: string; tx_hash: string;
  status: string; created_at: string;
};

type AdminComplaint = {
  id: string; name: string; email: string; type: string; subject: string;
  description: string; status: string; created_at: string;
};

type AdminPromo = {
  code: string; discount_pct: number; max_uses: number; times_used: number;
  is_active: number; created_at: string; expires_at: string;
};

type AdminCourse = {
  id: string; code: string; title_ar: string; title_en: string;
  description_ar: string; description_en: string; faculty: string;
  base_price_egp: number; is_onsite: number; is_active: number;
  aliases: string; study_video_url: string; study_files: string;
  created_at: string; updated_at: string;
};

const EMPTY_COURSE: AdminCourse = {
  id: '', code: '', title_ar: '', title_en: '', description_ar: '', description_en: '',
  faculty: '', base_price_egp: 150, is_onsite: 0, is_active: 1,
  aliases: '', study_video_url: '', study_files: '', created_at: '', updated_at: ''
};

const FACULTIES = [
  'Computer Studies', 'Business Studies', 'Education', 'Language Studies',
  'Media & Mass Communication', 'Graphic & Multimedia Design'
];

export const AdminDashboard = memo(function AdminDashboard({ lang, text }: Props) {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('stats');
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [orderTotal, setOrderTotal] = useState(0);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [paymentTotal, setPaymentTotal] = useState(0);
  const [complaints, setComplaints] = useState<AdminComplaint[]>([]);
  const [complaintTotal, setComplaintTotal] = useState(0);
  const [promos, setPromos] = useState<AdminPromo[]>([]);
  const [courses, setCourses] = useState<AdminCourse[]>([]);

  const [orderFilter, setOrderFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [complaintFilter, setComplaintFilter] = useState('');
  const [courseSearch, setCourseSearch] = useState('');

  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<AdminCourse | null>(null);
  const [courseForm, setCourseForm] = useState<AdminCourse>(EMPTY_COURSE);

  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoDiscount, setNewPromoDiscount] = useState(10);
  const [newPromoMaxUses, setNewPromoMaxUses] = useState(-1);

  const [priceService, setPriceService] = useState('TMA');
  const [priceAmount, setPriceAmount] = useState(150);

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  useEffect(() => { fetchStats(); }, []);

  useEffect(() => {
    if (activeTab === 'orders') fetchOrders();
    else if (activeTab === 'students') fetchUsers();
    else if (activeTab === 'payments') fetchPayments();
    else if (activeTab === 'complaints') fetchComplaints();
    else if (activeTab === 'discounts') fetchPromos();
    else if (activeTab === 'courses') fetchCourses();
  }, [activeTab, orderFilter, paymentFilter, complaintFilter]);

  async function fetchStats() {
    setLoading(true);
    try { const res = await fetch(`${API_URL}/api/admin/stats`, { headers: headers() }); if (res.ok) { const d = await res.json(); setStats(d.stats); } } catch {} setLoading(false);
  }
  async function fetchOrders() {
    try { const q = orderFilter ? `?status=${orderFilter}` : ''; const res = await fetch(`${API_URL}/api/admin/orders${q}`, { headers: headers() }); if (res.ok) { const d = await res.json(); setOrders(d.orders); setOrderTotal(d.total); } } catch {}
  }
  async function fetchUsers() {
    try { const res = await fetch(`${API_URL}/api/admin/users`, { headers: headers() }); if (res.ok) { const d = await res.json(); setUsers(d.users); setUserTotal(d.total); } } catch {}
  }
  async function fetchPayments() {
    try { const q = paymentFilter ? `?status=${paymentFilter}` : ''; const res = await fetch(`${API_URL}/api/admin/payments${q}`, { headers: headers() }); if (res.ok) { const d = await res.json(); setPayments(d.payments); setPaymentTotal(d.total); } } catch {}
  }
  async function fetchComplaints() {
    try { const q = complaintFilter ? `?status=${complaintFilter}` : ''; const res = await fetch(`${API_URL}/api/admin/complaints${q}`, { headers: headers() }); if (res.ok) { const d = await res.json(); setComplaints(d.complaints); setComplaintTotal(d.total); } } catch {}
  }
  async function fetchPromos() {
    try { const res = await fetch(`${API_URL}/api/admin/promos`, { headers: headers() }); if (res.ok) { const d = await res.json(); setPromos(d.promos); } } catch {}
  }
  async function fetchCourses() {
    try { const res = await fetch(`${API_URL}/api/admin/courses`, { headers: headers() }); if (res.ok) { const d = await res.json(); setCourses(d.courses); } } catch {}
  }

  async function handleUpdateOrder(orderId: string, status: string) {
    try { await fetch(`${API_URL}/api/admin/orders/${orderId}`, { method: 'PUT', headers: headers(), body: JSON.stringify({ status }) }); fetchOrders(); } catch {}
  }
  async function handleBanUser(userId: string, ban: boolean) {
    try { await fetch(`${API_URL}/api/admin/users/ban`, { method: 'POST', headers: headers(), body: JSON.stringify({ user_id: userId, ban }) }); fetchUsers(); } catch {}
  }
  async function handleUpdatePayment(paymentId: string, status: string) {
    try { await fetch(`${API_URL}/api/admin/payments/${paymentId}?status=${status}`, { method: 'PUT', headers: headers() }); fetchPayments(); } catch {}
  }
  async function handleCreatePromo() {
    if (!newPromoCode.trim()) return;
    try { await fetch(`${API_URL}/api/admin/promos`, { method: 'POST', headers: headers(), body: JSON.stringify({ code: newPromoCode.trim(), discount_pct: newPromoDiscount, max_uses: newPromoMaxUses }) }); setNewPromoCode(''); setNewPromoDiscount(10); setNewPromoMaxUses(-1); fetchPromos(); } catch {}
  }
  async function handleTogglePromo(code: string, isActive: boolean) {
    try { await fetch(`${API_URL}/api/admin/promos/${code}?is_active=${!isActive}`, { method: 'PUT', headers: headers() }); fetchPromos(); } catch {}
  }
  async function handleDeletePromo(code: string) {
    try { await fetch(`${API_URL}/api/admin/promos/${code}`, { method: 'DELETE', headers: headers() }); fetchPromos(); } catch {}
  }
  async function handleUpdatePrice() {
    try { await fetch(`${API_URL}/api/admin/prices`, { method: 'PUT', headers: headers(), body: JSON.stringify({ service_type: priceService, price_egp: priceAmount }) }); } catch {}
  }

  function openAddCourse() { setEditingCourse(null); setCourseForm(EMPTY_COURSE); setShowCourseForm(true); }
  function openEditCourse(c: AdminCourse) { setEditingCourse(c); setCourseForm({ ...c }); setShowCourseForm(true); }

  async function handleSaveCourse() {
    if (!courseForm.code.trim()) return;
    try {
      const url = editingCourse ? `${API_URL}/api/admin/courses/${editingCourse.code}` : `${API_URL}/api/admin/courses`;
      const method = editingCourse ? 'PUT' : 'POST';
      await fetch(url, { method, headers: headers(), body: JSON.stringify(courseForm) });
      setShowCourseForm(false); setEditingCourse(null); setCourseForm(EMPTY_COURSE); fetchCourses();
    } catch {}
  }
  async function handleDeleteCourse(code: string) {
    if (!confirm(lang === 'ar' ? 'هل أنت متأكد من حذف المادة؟' : 'Are you sure you want to delete this course?')) return;
    try { await fetch(`${API_URL}/api/admin/courses/${code}`, { method: 'DELETE', headers: headers() }); fetchCourses(); } catch {}
  }
  async function handleToggleCourse(code: string) {
    try { await fetch(`${API_URL}/api/admin/courses/${code}/toggle`, { method: 'PUT', headers: headers() }); fetchCourses(); } catch {}
  }

  const tabs: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: 'stats', icon: <BarChart3 size={15} />, label: text.adminStats },
    { id: 'students', icon: <Users size={15} />, label: text.adminStudents },
    { id: 'courses', icon: <BookOpen size={15} />, label: text.adminCourses },
    { id: 'orders', icon: <ShoppingCart size={15} />, label: text.adminOrders },
    { id: 'payments', icon: <CreditCard size={15} />, label: text.adminPayments },
    { id: 'complaints', icon: <AlertTriangle size={15} />, label: text.adminComplaints },
    { id: 'discounts', icon: <Tag size={15} />, label: text.adminDiscounts },
    { id: 'prices', icon: <DollarSign size={15} />, label: lang === 'ar' ? 'الأسعار' : 'Prices' },
  ];

  const statusColor = (s: string) => {
    if (['completed', 'approved', 'resolved'].includes(s)) return 'status-confirmed';
    return 'status-pending';
  };

  const filteredCourses = courses.filter(c => {
    if (!courseSearch) return true;
    const q = courseSearch.toLowerCase();
    return c.code.toLowerCase().includes(q) || c.title_en.toLowerCase().includes(q) || c.title_ar.includes(q);
  });

  if (loading) return (
    <section className="admin-section" id="admin">
      <div className="admin-container">
        <p className="section-eyebrow">ADMIN</p>
        <h2 className="admin-title">{text.admin}</h2>
        <div className="order-history-loading"><RefreshCw size={24} className="spin" /><span>{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</span></div>
      </div>
    </section>
  );

  return (
    <section className="admin-section" id="admin">
      <div className="admin-container">
        <p className="section-eyebrow">ADMIN</p>
        <h2 className="admin-title">{text.admin}</h2>

        <div className="admin-tabs">
          {tabs.map(tab => (
            <button key={tab.id} className={`admin-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
              {tab.icon}<span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="admin-content">
          {/* STATS */}
          {activeTab === 'stats' && stats && (
            <>
              <div className="admin-stats-header">
                <button className="admin-action-btn" onClick={fetchStats}><RefreshCw size={14} /> {lang === 'ar' ? 'تحديث' : 'Refresh'}</button>
              </div>
              <div className="admin-stats-grid">
                {[
                  { label: 'Total Orders', labelAr: 'إجمالي الطلبات', value: stats.total_orders, icon: <ShoppingCart size={18} />, color: 'var(--brand-primary)' },
                  { label: 'This Month', labelAr: 'طلبات الشهر', value: stats.month_orders, icon: <TrendingUp size={18} />, color: '#10b981' },
                  { label: 'Students', labelAr: 'الطلاب', value: stats.total_students, icon: <Users size={18} />, color: '#3b82f6' },
                  { label: 'Courses', labelAr: 'المواد', value: stats.course_count, icon: <BookOpen size={18} />, color: '#8b5cf6' },
                  { label: 'Revenue', labelAr: 'الإيرادات', value: `${stats.total_revenue_egp} EGP`, icon: <DollarSign size={18} />, color: '#f59e0b' },
                  { label: 'Pending Deposits', labelAr: 'مدفوعات معلقة', value: stats.pending_deposits, icon: <CreditCard size={18} />, color: '#f97316' },
                  { label: 'Open Complaints', labelAr: 'شكاوى مفتوحة', value: stats.open_complaints, icon: <AlertTriangle size={18} />, color: '#ef4444' },
                  { label: 'Active Promos', labelAr: 'اكواد خصم', value: stats.active_promos, icon: <Tag size={18} />, color: '#06b6d4' },
                  { label: 'Banned Users', labelAr: 'محظورين', value: stats.banned_users, icon: <UserX size={18} />, color: '#6b7280' },
                ].map((s, i) => (
                  <div className="admin-stat-card" key={i}>
                    <div className="admin-stat-icon" style={{ background: `${s.color}15`, color: s.color }}>{s.icon}</div>
                    <div className="admin-stat-info"><strong>{s.value}</strong><span>{lang === 'ar' ? s.labelAr : s.label}</span></div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* COURSES */}
          {activeTab === 'courses' && (
            <div className="admin-table-wrap">
              <div className="admin-table-header">
                <button className="admin-action-btn approve" onClick={openAddCourse}><Plus size={14} /> {lang === 'ar' ? 'إضافة مادة' : 'Add Course'}</button>
                <div className="admin-search-wrap"><Search size={14} /><input value={courseSearch} onChange={(e) => setCourseSearch(e.target.value)} placeholder={lang === 'ar' ? 'بحث بالكود أو الاسم...' : 'Search by code or name...'} /></div>
              </div>
              <div className="admin-table">
                {filteredCourses.map(c => (
                  <div className="admin-table-row" key={c.code}>
                    <div className="admin-row-main">
                      <strong dir="ltr" className="admin-row-id">{c.code}</strong>
                      <span className="admin-row-name">{lang === 'ar' ? c.title_ar || c.title_en : c.title_en || c.title_ar}</span>
                      <span className="admin-row-code">{c.faculty}</span>
                      <span className="admin-row-code">{c.base_price_egp} EGP</span>
                      <span className={`order-status-badge ${c.is_active ? 'status-confirmed' : 'status-pending'}`}>{c.is_active ? (lang === 'ar' ? 'نشط' : 'Active') : (lang === 'ar' ? 'معطل' : 'Disabled')}</span>
                    </div>
                    <div className="admin-row-actions">
                      <button className="admin-action-btn" onClick={() => openEditCourse(c)}><Edit2 size={14} /> {lang === 'ar' ? 'تعديل' : 'Edit'}</button>
                      <button className="admin-action-btn" onClick={() => handleToggleCourse(c.code)}>{c.is_active ? <><Ban size={14} /> {lang === 'ar' ? 'تعطيل' : 'Disable'}</> : <><CheckCircle2 size={14} /> {lang === 'ar' ? 'تفعيل' : 'Enable'}</>}</button>
                      <button className="admin-action-btn reject" onClick={() => handleDeleteCourse(c.code)}><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
                {filteredCourses.length === 0 && <p className="admin-empty">{lang === 'ar' ? 'مفيش مواد' : 'No courses'}</p>}
              </div>

              {showCourseForm && (
                <div className="admin-modal-backdrop" onClick={() => setShowCourseForm(false)}>
                  <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                    <h3>{editingCourse ? (lang === 'ar' ? 'تعديل مادة' : 'Edit Course') : (lang === 'ar' ? 'إضافة مادة جديدة' : 'Add New Course')}</h3>
                    <div className="admin-form-grid">
                      <label className="form-field"><span>{lang === 'ar' ? 'كود المادة' : 'Course Code'} *</span><input value={courseForm.code} onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value.toUpperCase() })} placeholder="TM105" disabled={!!editingCourse} /></label>
                      <label className="form-field"><span>{lang === 'ar' ? 'الكلية' : 'Faculty'}</span><select value={courseForm.faculty} onChange={(e) => setCourseForm({ ...courseForm, faculty: e.target.value })}><option value="">{lang === 'ar' ? 'اختار كلية' : 'Select faculty'}</option>{FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}</select></label>
                      <label className="form-field"><span>{lang === 'ar' ? 'الاسم بالعربي' : 'Title (AR)'}</span><input value={courseForm.title_ar} onChange={(e) => setCourseForm({ ...courseForm, title_ar: e.target.value })} /></label>
                      <label className="form-field"><span>{lang === 'ar' ? 'الاسم بالإنجليزي' : 'Title (EN)'}</span><input value={courseForm.title_en} onChange={(e) => setCourseForm({ ...courseForm, title_en: e.target.value })} /></label>
                      <label className="form-field full-width"><span>{lang === 'ar' ? 'الوصف بالعربي' : 'Description (AR)'}</span><textarea value={courseForm.description_ar} onChange={(e) => setCourseForm({ ...courseForm, description_ar: e.target.value })} rows={3} /></label>
                      <label className="form-field full-width"><span>{lang === 'ar' ? 'الوصف بالإنجليزي' : 'Description (EN)'}</span><textarea value={courseForm.description_en} onChange={(e) => setCourseForm({ ...courseForm, description_en: e.target.value })} rows={3} /></label>
                      <label className="form-field"><span>{lang === 'ar' ? 'السعر (ج.م)' : 'Price (EGP)'}</span><input type="number" value={courseForm.base_price_egp} onChange={(e) => setCourseForm({ ...courseForm, base_price_egp: Number(e.target.value) })} min={0} /></label>
                      <label className="form-field"><span>{lang === 'ar' ? 'أكواد بديلة' : 'Aliases'}</span><input value={courseForm.aliases} onChange={(e) => setCourseForm({ ...courseForm, aliases: e.target.value })} placeholder="TM105A, TM105B" /></label>
                      <label className="form-field full-width"><span>{lang === 'ar' ? 'رابط فيديو الشرح' : 'Study Video URL'}</span><input value={courseForm.study_video_url} onChange={(e) => setCourseForm({ ...courseForm, study_video_url: e.target.value })} placeholder="https://youtube.com/..." /></label>
                      <div className="admin-checkbox-row">
                        <label className="admin-checkbox"><input type="checkbox" checked={!!courseForm.is_onsite} onChange={(e) => setCourseForm({ ...courseForm, is_onsite: e.target.checked ? 1 : 0 })} /><span>{lang === 'ar' ? 'مادة داخل الجامعة' : 'On-site'}</span></label>
                        <label className="admin-checkbox"><input type="checkbox" checked={!!courseForm.is_active} onChange={(e) => setCourseForm({ ...courseForm, is_active: e.target.checked ? 1 : 0 })} /><span>{lang === 'ar' ? 'نشط' : 'Active'}</span></label>
                      </div>
                    </div>
                    <div className="admin-modal-actions">
                      <button className="admin-action-btn" onClick={() => setShowCourseForm(false)}>{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
                      <button className="admin-action-btn approve" onClick={handleSaveCourse} disabled={!courseForm.code.trim()}>{editingCourse ? (lang === 'ar' ? 'حفظ' : 'Save') : (lang === 'ar' ? 'إضافة' : 'Add')}</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ORDERS */}
          {activeTab === 'orders' && (
            <div className="admin-table-wrap">
              <div className="admin-filter-row">
                <select value={orderFilter} onChange={(e) => setOrderFilter(e.target.value)}>
                  <option value="">{lang === 'ar' ? 'الكل' : 'All'}</option>
                  <option value="deposit_pending">Deposit Pending</option>
                  <option value="deposit_paid">Deposit Paid</option>
                  <option value="completed">{lang === 'ar' ? 'مكتمل' : 'Completed'}</option>
                  <option value="deposit_rejected">{lang === 'ar' ? 'مرفوض' : 'Rejected'}</option>
                </select>
                <span className="admin-total">{orderTotal} {lang === 'ar' ? 'طلب' : 'orders'}</span>
              </div>
              <div className="admin-table">
                {orders.map(o => (
                  <div className="admin-table-row" key={o.id}>
                    <div className="admin-row-main">
                      <strong dir="ltr" className="admin-row-id">{o.id}</strong>
                      <span className="admin-row-name">{o.customer_name}</span>
                      <span dir="ltr" className="admin-row-code">{o.course_code} · {o.service_type}</span>
                      <span className={`order-status-badge ${statusColor(o.status)}`}>{o.status}</span>
                    </div>
                    <div className="admin-row-meta">
                      <span>{o.branch_code} · {o.price_egp} EGP</span>
                      <span>{o.deposit_paid ? '✓ Deposit' : '⏳ Deposit'}</span>
                    </div>
                    <div className="admin-row-actions">
                      {o.status === 'deposit_pending' && <button className="admin-action-btn approve" onClick={() => handleUpdateOrder(o.id, 'deposit_paid')}><CheckCircle2 size={14} /> {lang === 'ar' ? 'تأكيد' : 'Approve'}</button>}
                      {o.status === 'deposit_paid' && <button className="admin-action-btn approve" onClick={() => handleUpdateOrder(o.id, 'completed')}><CheckCircle2 size={14} /> {lang === 'ar' ? 'إكمال' : 'Complete'}</button>}
                      {o.status !== 'completed' && <button className="admin-action-btn reject" onClick={() => handleUpdateOrder(o.id, 'deposit_rejected')}><XCircle size={14} /> {lang === 'ar' ? 'رفض' : 'Reject'}</button>}
                    </div>
                  </div>
                ))}
                {orders.length === 0 && <p className="admin-empty">{lang === 'ar' ? 'مفيش طلبات' : 'No orders'}</p>}
              </div>
            </div>
          )}

          {/* STUDENTS */}
          {activeTab === 'students' && (
            <div className="admin-table-wrap">
              <div className="admin-filter-row"><span className="admin-total">{userTotal} {lang === 'ar' ? 'مستخدم' : 'users'}</span></div>
              <div className="admin-table">
                {users.map(u => (
                  <div className="admin-table-row" key={u.id}>
                    <div className="admin-row-main">
                      <strong className="admin-row-name">{u.name}</strong>
                      <span dir="ltr" className="admin-row-code">{u.email}</span>
                      <span className="admin-row-code">{u.provider}</span>
                      {u.is_banned && <span className="order-status-badge status-pending"><Ban size={10} /> {lang === 'ar' ? 'محظور' : 'Banned'}</span>}
                    </div>
                    <div className="admin-row-meta">
                      <span>{u.credit_egp} EGP {lang === 'ar' ? 'رصيد' : 'credit'}</span>
                      <span>{u.created_at?.slice(0, 10)}</span>
                    </div>
                    <div className="admin-row-actions">
                      <button className={`admin-action-btn ${u.is_banned ? 'approve' : 'reject'}`} onClick={() => handleBanUser(u.id, !u.is_banned)}>
                        {u.is_banned ? <><ShieldCheck size={14} /> {lang === 'ar' ? 'إلغاء الحظر' : 'Unban'}</> : <><Ban size={14} /> {lang === 'ar' ? 'حظر' : 'Ban'}</>}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PAYMENTS */}
          {activeTab === 'payments' && (
            <div className="admin-table-wrap">
              <div className="admin-filter-row">
                <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
                  <option value="">{lang === 'ar' ? 'الكل' : 'All'}</option>
                  <option value="pending">{lang === 'ar' ? 'معلق' : 'Pending'}</option>
                  <option value="approved">{lang === 'ar' ? 'مقبول' : 'Approved'}</option>
                  <option value="rejected">{lang === 'ar' ? 'مرفوض' : 'Rejected'}</option>
                </select>
                <span className="admin-total">{paymentTotal} {lang === 'ar' ? 'دفع' : 'payments'}</span>
              </div>
              <div className="admin-table">
                {payments.map(p => (
                  <div className="admin-table-row" key={p.id}>
                    <div className="admin-row-main">
                      <strong dir="ltr" className="admin-row-id">{p.id}</strong>
                      <span dir="ltr" className="admin-row-code">{p.order_id}</span>
                      <span className="admin-row-name">{p.amount} {p.currency}</span>
                      <span className={`order-status-badge ${statusColor(p.status)}`}>{p.status}</span>
                    </div>
                    <div className="admin-row-meta"><span>{p.payment_method || '—'}</span>{p.tx_hash && <span dir="ltr">Tx: {p.tx_hash.slice(0, 16)}...</span>}</div>
                    <div className="admin-row-actions">
                      {p.status === 'pending' && <>
                        <button className="admin-action-btn approve" onClick={() => handleUpdatePayment(p.id, 'approved')}><CheckCircle2 size={14} /> {lang === 'ar' ? 'قبول' : 'Approve'}</button>
                        <button className="admin-action-btn reject" onClick={() => handleUpdatePayment(p.id, 'rejected')}><XCircle size={14} /> {lang === 'ar' ? 'رفض' : 'Reject'}</button>
                      </>}
                    </div>
                  </div>
                ))}
                {payments.length === 0 && <p className="admin-empty">{lang === 'ar' ? 'مفيش مدفوعات' : 'No payments'}</p>}
              </div>
            </div>
          )}

          {/* COMPLAINTS */}
          {activeTab === 'complaints' && (
            <div className="admin-table-wrap">
              <div className="admin-filter-row">
                <select value={complaintFilter} onChange={(e) => setComplaintFilter(e.target.value)}>
                  <option value="">{lang === 'ar' ? 'الكل' : 'All'}</option>
                  <option value="open">{lang === 'ar' ? 'مفتوح' : 'Open'}</option>
                  <option value="resolved">{lang === 'ar' ? 'محلول' : 'Resolved'}</option>
                </select>
                <span className="admin-total">{complaintTotal} {lang === 'ar' ? 'شكوى' : 'complaints'}</span>
              </div>
              <div className="admin-table">
                {complaints.map(c => (
                  <div className="admin-table-row" key={c.id}>
                    <div className="admin-row-main">
                      <strong className="admin-row-id">{c.id}</strong>
                      <span className="admin-row-name">{c.name}</span>
                      <span className="admin-row-code">{c.type}</span>
                      <span className={`order-status-badge ${statusColor(c.status)}`}>{c.status}</span>
                    </div>
                    <div className="admin-row-meta"><span>{c.subject}</span><span>{c.description?.slice(0, 80)}...</span></div>
                  </div>
                ))}
                {complaints.length === 0 && <p className="admin-empty">{lang === 'ar' ? 'مفيش شكاوى' : 'No complaints'}</p>}
              </div>
            </div>
          )}

          {/* DISCOUNTS */}
          {activeTab === 'discounts' && (
            <div className="admin-table-wrap">
              <div className="admin-promo-form">
                <h4>{lang === 'ar' ? 'إنشاء كود خصم' : 'Create Promo Code'}</h4>
                <div className="admin-promo-inputs">
                  <input value={newPromoCode} onChange={(e) => setNewPromoCode(e.target.value)} placeholder={lang === 'ar' ? 'كود الخصم' : 'Promo code'} maxLength={20} />
                  <input type="number" value={newPromoDiscount} onChange={(e) => setNewPromoDiscount(Number(e.target.value))} min={1} max={100} placeholder="%" style={{ width: 70 }} />
                  <input type="number" value={newPromoMaxUses} onChange={(e) => setNewPromoMaxUses(Number(e.target.value))} placeholder="Max (-1=∞)" style={{ width: 120 }} />
                  <button className="admin-action-btn approve" onClick={handleCreatePromo}><Plus size={14} /> {lang === 'ar' ? 'إنشاء' : 'Create'}</button>
                </div>
              </div>
              <div className="admin-table">
                {promos.map(p => (
                  <div className="admin-table-row" key={p.code}>
                    <div className="admin-row-main">
                      <strong className="admin-row-id">{p.code}</strong>
                      <span className="admin-row-name">{p.discount_pct}%</span>
                      <span className="admin-row-code">{p.times_used}/{p.max_uses < 0 ? '∞' : p.max_uses}</span>
                      <span className={`order-status-badge ${p.is_active ? 'status-confirmed' : 'status-pending'}`}>{p.is_active ? 'Active' : 'Disabled'}</span>
                    </div>
                    <div className="admin-row-actions">
                      <button className="admin-action-btn" onClick={() => handleTogglePromo(p.code, !!p.is_active)}>{p.is_active ? <><Ban size={14} /> Disable</> : <><CheckCircle2 size={14} /> Enable</>}</button>
                      <button className="admin-action-btn reject" onClick={() => handleDeletePromo(p.code)}><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
                {promos.length === 0 && <p className="admin-empty">{lang === 'ar' ? 'مفيش اكواد خصم' : 'No promos'}</p>}
              </div>
            </div>
          )}

          {/* PRICES */}
          {activeTab === 'prices' && (
            <div className="admin-table-wrap">
              <div className="admin-promo-form">
                <h4>{lang === 'ar' ? 'تحديث الأسعار' : 'Update Prices'}</h4>
                <div className="admin-promo-inputs">
                  <select value={priceService} onChange={(e) => setPriceService(e.target.value)}>
                    <option value="TMA">TMA</option>
                    <option value="QUIZ">Quiz</option>
                    <option value="ASSIGNMENT">Assignment</option>
                  </select>
                  <input type="number" value={priceAmount} onChange={(e) => setPriceAmount(Number(e.target.value))} min={0} placeholder="EGP" style={{ width: 100 }} />
                  <button className="admin-action-btn approve" onClick={handleUpdatePrice}><DollarSign size={14} /> {lang === 'ar' ? 'تحديث' : 'Update'}</button>
                </div>
              </div>
              <div className="admin-empty">
                <Settings size={32} />
                <p>{lang === 'ar' ? 'الأسعار: TMA=150, Quiz=29, Assignment=150 EGP' : 'Prices: TMA=150, Quiz=29, Assignment=150 EGP'}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
});
