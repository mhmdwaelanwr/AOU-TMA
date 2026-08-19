import { memo, useState, useCallback } from 'react';
import {
  BarChart3, FileText, BookOpen, Clock, Settings, LogOut,
  Plus, CheckCircle2, RotateCcw, X, Calendar, Award,
  ChevronDown, User,
} from 'lucide-react';
import type { Language } from '../types';
import { useAuth } from '../lib/auth';
import {
  type Task, type TaskStatus, loadTasks, saveTasks,
  modelsData, gradeRowsData, fmtDay,
} from '../lib/tasks';

type Props = {
  lang: Language;
  text: Record<string, string>;
  onBack: () => void;
  onToast: (msg: string, ok?: boolean) => void;
};

type DashboardTab = 'overview' | 'assignments' | 'models' | 'deadlines' | 'account';

type TabDef = { key: DashboardTab; icon: React.ReactNode; labelAr: string; labelEn: string };

const tabs: TabDef[] = [
  { key: 'overview', icon: <BarChart3 size={16} />, labelAr: 'نظرة عامة', labelEn: 'Overview' },
  { key: 'assignments', icon: <FileText size={16} />, labelAr: 'واجباتي', labelEn: 'My Assignments' },
  { key: 'models', icon: <BookOpen size={16} />, labelAr: 'المكتبة والنماذج', labelEn: 'Library & Models' },
  { key: 'deadlines', icon: <Clock size={16} />, labelAr: 'المواعيد القادمة', labelEn: 'Upcoming Deadlines' },
  { key: 'account', icon: <Settings size={16} />, labelAr: 'حسابي', labelEn: 'My Account' },
];

function tabLabel(t: TabDef, lang: Language): string {
  return lang === 'ar' ? t.labelAr : t.labelEn;
}

function StatusBadge({ status, lang }: { status: TaskStatus; lang: Language }) {
  if (status === 'done') {
    return <span className="sd-badge sd-badge-success">{lang === 'ar' ? 'تم التسليم ✓' : 'Delivered ✓'}</span>;
  }
  return <span className="sd-badge sd-badge-warning">{lang === 'ar' ? '⏳ قيد التنفيذ' : '⏳ In Progress'}</span>;
}

function StatCards({ tasks, lang }: { tasks: Task[]; lang: Language }) {
  const done = tasks.filter(t => t.status === 'done');
  const avg = done.length
    ? (done.reduce((a, b) => a + (b.score || 0), 0) / done.length).toFixed(1)
    : '—';

  const items = [
    { icon: <FileText size={18} />, value: tasks.length, labelAr: 'إجمالي الواجبات', labelEn: 'Total Assignments', color: 'var(--brand-primary)' },
    { icon: <CheckCircle2 size={18} />, value: done.length, labelAr: 'تم تسليمها', labelEn: 'Delivered', color: 'var(--success-primary)' },
    { icon: <Clock size={18} />, value: tasks.length - done.length, labelAr: 'قيد التنفيذ', labelEn: 'In Progress', color: 'var(--warning)' },
    { icon: <Award size={18} />, value: avg, labelAr: 'متوسط الدرجات', labelEn: 'Average Grade', color: '#8b5cf6' },
  ];

  return (
    <div className="sd-stats-grid">
      {items.map((s, i) => (
        <div className="sd-stat-card" key={i}>
          <div className="sd-stat-icon" style={{ background: `${s.color}15`, color: s.color }}>{s.icon}</div>
          <div className="sd-stat-info">
            <strong>{s.value}</strong>
            <span>{lang === 'ar' ? s.labelAr : s.labelEn}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function TaskItem({ task, lang, onAction }: { task: Task; lang: Language; onAction: (id: number, action: 'done' | 'redo') => void }) {
  const left = task.status === 'done' ? <CheckCircle2 size={16} className="sd-task-icon-done" /> : <Clock size={16} className="sd-task-icon-pending" />;
  const subject = lang === 'ar' ? task.subjectAr : task.subjectEn;
  const title = lang === 'ar' ? task.titleAr : task.titleEn;
  const meta = task.status === 'done'
    ? (lang === 'ar' ? `تم تسليمها • درجة ${task.score}/20` : `Delivered • Grade ${task.score}/20`)
    : (lang === 'ar' ? `الاستحقاق: ${task.due}` : `Due: ${task.due}`);

  return (
    <div className="sd-task-item">
      <span className="sd-task-left">{left}</span>
      <div className="sd-task-info">
        <strong>{title} — {subject}</strong>
        <span>{meta}</span>
      </div>
      <StatusBadge status={task.status} lang={lang} />
      {task.status === 'done'
        ? <button className="sd-btn sd-btn-ghost sd-btn-sm" onClick={() => onAction(task.id, 'redo')} type="button">{lang === 'ar' ? 'إعادة' : 'Redo'}</button>
        : <button className="sd-btn sd-btn-primary sd-btn-sm" onClick={() => onAction(task.id, 'done')} type="button">{lang === 'ar' ? 'تم التسليم' : 'Delivered'}</button>
      }
    </div>
  );
}

function DateCardItem({ dateKey, title, note, lang }: { dateKey: string; title: string; note: string; lang: Language }) {
  const f = fmtDay(dateKey, lang);
  return (
    <div className="sd-date-card">
      <div className="sd-date-day">
        <strong>{f.day}</strong>
        <span>{f.mon}</span>
      </div>
      <div>
        <h4>{title}</h4>
        <p>{note}</p>
      </div>
    </div>
  );
}

/* ── Overview Tab ── */
function Overview({ tasks, lang, onToast, onNavigateToAssignments, onUpdateTasks }: {
  tasks: Task[]; lang: Language; onToast: (msg: string, ok?: boolean) => void;
  onNavigateToAssignments: () => void;
  onUpdateTasks: (updater: (prev: Task[]) => Task[]) => void;
}) {
  const handleAction = useCallback((id: number, action: 'done' | 'redo') => {
    onUpdateTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      if (action === 'done') {
        onToast(lang === 'ar' ? 'ممتاز! تم إدراج الواجب كمسلَّم 🎉' : 'Great! Marked as delivered 🎉', true);
        return { ...t, status: 'done' as TaskStatus, score: +(16 + (id % 4) + ((id * 7) % 10) / 10).toFixed(1) };
      }
      onToast(lang === 'ar' ? 'تمت إعادته للقيد التنفيذ للمراجعة' : 'Marked as in-progress for review');
      return { ...t, status: 'pending' as TaskStatus };
    }));
  }, [onUpdateTasks, lang, onToast]);

  const upcoming = tasks.filter(t => t.status === 'pending');
  const all = [...tasks].sort((a, b) => (a.due < b.due ? -1 : 1));

  return (
    <>
      <StatCards tasks={tasks} lang={lang} />
      <div className="sd-panel">
        <div className="sd-panel-head">
          <h2>{lang === 'ar' ? 'أحدث واجباتك' : 'Recent Assignments'}</h2>
          <button className="sd-btn sd-btn-ghost sd-btn-sm" onClick={onNavigateToAssignments} type="button">
            {lang === 'ar' ? 'عرض الكل' : 'View All'}
          </button>
        </div>
        <div className="sd-panel-body">
          <div className="sd-task-list">
            {tasks.slice(0, 3).map(t => (
              <TaskItem key={t.id} task={t} lang={lang} onAction={handleAction} />
            ))}
          </div>
        </div>
      </div>
      <div className="sd-panel">
        <div className="sd-panel-head">
          <h2>{lang === 'ar' ? 'التسليمات القادمة' : 'Upcoming Deadlines'}</h2>
        </div>
        <div className="sd-panel-body">
          <div className="sd-dates-grid">
            {upcoming.length
              ? upcoming.map(t => (
                <DateCardItem
                  key={t.id}
                  dateKey={t.due}
                  title={(lang === 'ar' ? t.titleAr : t.titleEn) + ' — ' + (lang === 'ar' ? t.subjectAr : t.subjectEn)}
                  note={lang === 'ar' ? 'تسليم واجب مُقيّم' : 'Assignment submission'}
                  lang={lang}
                />
              ))
              : <div className="sd-empty" style={{ gridColumn: '1/-1' }}>
                <div className="sd-empty-icon">🎉</div>
                {lang === 'ar' ? 'لا توجد مواعيد قادمة' : 'No upcoming deadlines'}
              </div>
            }
          </div>
          {all.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h2 style={{ fontSize: 16, marginBottom: 12 }}>{lang === 'ar' ? 'كل المواعيد' : 'All Deadlines'}</h2>
              <div className="sd-dates-grid">
                {all.map(t => (
                  <DateCardItem
                    key={t.id}
                    dateKey={t.due}
                    title={(lang === 'ar' ? t.titleAr : t.titleEn) + ' — ' + (lang === 'ar' ? t.subjectAr : t.subjectEn)}
                    note={t.status === 'done' ? (lang === 'ar' ? 'تم تسليمها ✓' : 'Delivered ✓') : (lang === 'ar' ? 'قيد التنفيذ' : 'In Progress')}
                    lang={lang}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ── Assignments Tab ── */
function Assignments({ tasks, lang, onToast, onUpdateTasks }: {
  tasks: Task[]; lang: Language; onToast: (msg: string, ok?: boolean) => void;
  onUpdateTasks: (updater: (prev: Task[]) => Task[]) => void;
}) {
  const [filter, setFilter] = useState<'all' | TaskStatus>('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject: '', title: '', due: '', notes: '' });

  const list = tasks.filter(t => filter === 'all' || t.status === filter);

  function submit() {
    if (!form.subject.trim() || !form.title.trim()) {
      onToast(lang === 'ar' ? 'اكتب اسم المادة والعنوان أولًا' : 'Enter subject and title first');
      return;
    }
    onUpdateTasks(prev => [...prev, {
      id: Date.now(),
      subjectAr: form.subject.trim(),
      subjectEn: form.subject.trim(),
      titleAr: form.title.trim(),
      titleEn: form.title.trim(),
      due: form.due || new Date().toISOString().slice(0, 10),
      status: 'pending' as TaskStatus,
      score: null,
      notesAr: form.notes.trim(),
      notesEn: form.notes.trim(),
    }]);
    setForm({ subject: '', title: '', due: '', notes: '' });
    setShowForm(false);
    onToast(lang === 'ar' ? 'تمت إضافة الواجب بنجاح ✓' : 'Assignment added successfully ✓', true);
  }

  function handleAction(id: number, action: 'done' | 'redo') {
    onUpdateTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      if (action === 'done') {
        onToast(lang === 'ar' ? 'ممتاز! تم إدراج الواجب كمسلَّم 🎉' : 'Great! Marked as delivered 🎉', true);
        return { ...t, status: 'done' as TaskStatus, score: +(16 + (id % 4) + ((id * 7) % 10) / 10).toFixed(1) };
      }
      onToast(lang === 'ar' ? 'تمت إعادته للقيد التنفيذ للمراجعة' : 'Marked as in-progress for review');
      return { ...t, status: 'pending' as TaskStatus };
    }));
  }

  const filterLabels: [string, string][] = [
    ['all', lang === 'ar' ? 'الكل' : 'All'],
    ['pending', lang === 'ar' ? 'قيد التنفيذ' : 'In Progress'],
    ['done', lang === 'ar' ? 'تم التسليم' : 'Delivered'],
  ];

  return (
    <div className="sd-panel">
      <div className="sd-panel-head">
        <h2>📝 {lang === 'ar' ? 'واجباتك' : 'Your Assignments'}</h2>
        <button className="sd-btn sd-btn-primary sd-btn-sm" onClick={() => setShowForm(s => !s)} type="button">
          + {lang === 'ar' ? 'واجب جديد' : 'New Assignment'}
        </button>
      </div>
      <div className="sd-panel-body">
        {showForm && (
          <div className="sd-form-wrap">
            <div className="sd-field-row">
              <div className="sd-field">
                <label>{lang === 'ar' ? 'اسم المادة' : 'Subject'}</label>
                <div className="sd-control">
                  <span className="sd-ic">📖</span>
                  <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
                    placeholder={lang === 'ar' ? 'مثال: اللغة الإنجليزية' : 'e.g. English Language'} />
                </div>
              </div>
              <div className="sd-field">
                <label>{lang === 'ar' ? 'العنوان' : 'Title'}</label>
                <div className="sd-control">
                  <span className="sd-ic">🏷️</span>
                  <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder={lang === 'ar' ? 'مثال: الواجب رقم 2' : 'e.g. Assignment 2'} />
                </div>
              </div>
            </div>
            <div className="sd-field-row">
              <div className="sd-field">
                <label>{lang === 'ar' ? 'موعد التسليم' : 'Due Date'}</label>
                <div className="sd-control">
                  <span className="sd-ic">📅</span>
                  <input type="date" value={form.due} onChange={e => setForm({ ...form, due: e.target.value })} />
                </div>
              </div>
              <div className="sd-field">
                <label>{lang === 'ar' ? 'ملاحظات / تفاصيل' : 'Notes / Details'}</label>
                <div className="sd-control">
                  <span className="sd-ic">💬</span>
                  <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                    placeholder={lang === 'ar' ? 'أي تفاصيل عن الواجب… (اختياري)' : 'Any assignment details... (optional)'} />
                </div>
              </div>
            </div>
            <div className="sd-form-actions">
              <button className="sd-btn sd-btn-primary" onClick={submit} type="button">
                {lang === 'ar' ? 'حفظ الواجب' : 'Save Assignment'}
              </button>
              <button className="sd-btn sd-btn-ghost" onClick={() => setShowForm(false)} type="button">
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        )}

        <div className="sd-filter-bar">
          {filterLabels.map(([k, l]) => (
            <button key={k} className={`sd-chip ${filter === k ? 'sd-chip-active' : ''}`} onClick={() => setFilter(k as typeof filter)} type="button">
              {l}
            </button>
          ))}
        </div>

        <div className="sd-task-list">
          {list.map(t => (
            <TaskItem key={t.id} task={t} lang={lang} onAction={handleAction} />
          ))}
        </div>
        {list.length === 0 && (
          <div className="sd-empty">
            <div className="sd-empty-icon">🗂️</div>
            <p>{lang === 'ar' ? 'لا توجد واجبات هنا. اضغط «واجب جديد» للبدء!' : 'No assignments here. Click "New Assignment" to start!'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Models Tab ── */
function Models({ lang }: { lang: Language }) {
  return (
    <div className="sd-panel">
      <div className="sd-panel-head">
        <h2>📄 {lang === 'ar' ? 'مكتبة النماذج والملخصات' : 'Models & Summaries Library'}</h2>
      </div>
      <div className="sd-panel-body">
        <div className="sd-models-grid">
          {modelsData.map((m, i) => (
            <div className="sd-model-card" key={i}>
              <div className="sd-model-icon">{m.icon}</div>
              <h3>{lang === 'ar' ? m.nameAr : m.nameEn}</h3>
              <p>{lang === 'ar' ? m.descAr : m.descEn}</p>
              <button className="sd-btn sd-btn-ghost sd-btn-sm" style={{ marginTop: 12 }} type="button">
                {lang === 'ar' ? 'التصفح' : 'Browse'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Deadlines Tab ── */
function Deadlines({ tasks, lang }: { tasks: Task[]; lang: Language }) {
  const all = [...tasks].sort((a, b) => (a.due < b.due ? -1 : 1));

  return (
    <>
      <div className="sd-panel">
        <div className="sd-panel-head">
          <h2>⏰ {lang === 'ar' ? 'التقويم الدراسي والمواعيد' : 'Academic Calendar & Deadlines'}</h2>
        </div>
        <div className="sd-panel-body">
          {all.length
            ? <div className="sd-dates-grid">
              {all.map(t => (
                <DateCardItem
                  key={t.id}
                  dateKey={t.due}
                  title={(lang === 'ar' ? t.titleAr : t.titleEn) + ' — ' + (lang === 'ar' ? t.subjectAr : t.subjectEn)}
                  note={t.status === 'done' ? (lang === 'ar' ? 'تم تسليمها ✓' : 'Delivered ✓') : (lang === 'ar' ? 'قيد التنفيذ' : 'In Progress')}
                  lang={lang}
                />
              ))}
            </div>
            : <div className="sd-empty"><div className="sd-empty-icon">📅</div>{lang === 'ar' ? 'لا توجد مواعيد' : 'No deadlines'}</div>
          }
        </div>
      </div>
      <div className="sd-panel">
        <div className="sd-panel-head">
          <h2>📊 {lang === 'ar' ? 'جدول توزيع الدرجات' : 'Grade Distribution Table'}</h2>
        </div>
        <div className="sd-panel-body sd-table-wrap">
          <table className="sd-table">
            <thead>
              <tr>
                <th>{lang === 'ar' ? 'المادة' : 'Subject'}</th>
                <th>{lang === 'ar' ? 'نوع التقييم' : 'Assessment Type'}</th>
                <th>{lang === 'ar' ? 'النسبة' : 'Weight'}</th>
                <th>{lang === 'ar' ? 'التقدم' : 'Progress'}</th>
              </tr>
            </thead>
            <tbody>
              {gradeRowsData.map((g, i) => (
                <tr key={i}>
                  <td>{lang === 'ar' ? g.subjectAr : g.subjectEn}</td>
                  <td>{g.type}</td>
                  <td>{g.pct}</td>
                  <td>
                    <div className="sd-progress"><i style={{ width: g.prog + '%' }} /></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ── Account Tab ── */
function Account({ lang, text, onToast }: { lang: Language; text: Record<string, string>; onToast: (msg: string, ok?: boolean) => void }) {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');

  async function save() {
    if (!name.trim()) return;
    await updateProfile(name.trim());
    onToast(lang === 'ar' ? 'تم حفظ بيانات الحساب ✓' : 'Account updated ✓', true);
  }

  return (
    <>
      <div className="sd-panel">
        <div className="sd-panel-head"><h2>⚙️ {lang === 'ar' ? 'بيانات الحساب' : 'Account Details'}</h2></div>
        <div className="sd-panel-body">
          <div className="sd-field-row">
            <div className="sd-field">
              <label>{lang === 'ar' ? 'الاسم' : 'Name'}</label>
              <div className="sd-control">
                <span className="sd-ic"><User size={14} /></span>
                <input value={name} onChange={e => setName(e.target.value)} />
              </div>
            </div>
            <div className="sd-field">
              <label>{lang === 'ar' ? 'البريد الجامعي' : 'Email'}</label>
              <div className="sd-control">
                <span className="sd-ic">✉️</span>
                <input value={user?.email || ''} disabled />
              </div>
            </div>
          </div>
          <button className="sd-btn sd-btn-primary" onClick={save} type="button">
            {lang === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
          </button>
        </div>
      </div>
      <div className="sd-panel">
        <div className="sd-panel-head"><h2>💳 {lang === 'ar' ? 'باقة الاشتراك' : 'Subscription Plan'}</h2></div>
        <div className="sd-panel-body">
          <div className="sd-task-item">
            <span className="sd-task-left">⭐</span>
            <div className="sd-task-info">
              <strong>{lang === 'ar' ? 'باقة التجريبية — مجانية' : 'Trial Plan — Free'}</strong>
              <span>{lang === 'ar' ? 'تبقى لك: 1 واجب تجريبي • 2 نماذج مواد' : 'Remaining: 1 trial assignment • 2 course models'}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Main Dashboard ── */
export const StudentDashboard = memo(function StudentDashboard({ lang, text, onBack, onToast }: Props) {
  const { user, logout } = useAuth();
  const [view, setView] = useState<DashboardTab>('overview');

  const [tasks, setTasks] = useState<Task[]>(() => {
    if (user?.id) return loadTasks(user.id);
    return loadTasks('guest');
  });

  const updateTasks = useCallback((updater: (prev: Task[]) => Task[]) => {
    setTasks(prev => {
      const next = updater(prev);
      if (user?.id) saveTasks(user.id, next);
      else saveTasks('guest', next);
      return next;
    });
  }, [user]);

  const handleAction = useCallback((id: number, action: 'done' | 'redo') => {
    updateTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      if (action === 'done') {
        onToast(lang === 'ar' ? 'ممتاز! تم إدراج الواجب كمسلَّم 🎉' : 'Great! Marked as delivered 🎉', true);
        return { ...t, status: 'done' as TaskStatus, score: +(16 + (id % 4) + ((id * 7) % 10) / 10).toFixed(1) };
      }
      onToast(lang === 'ar' ? 'تمت إعادته للقيد التنفيذ للمراجعة' : 'Marked as in-progress for review');
      return { ...t, status: 'pending' as TaskStatus };
    }));
  }, [updateTasks, lang, onToast]);

  const firstName = (user?.name || (lang === 'ar' ? 'طالب' : 'Student')).split(' ')[0];

  return (
    <div className="sd-dash">
      <aside className="sd-sidebar">
        <a className="sd-logo" href="#" onClick={e => { e.preventDefault(); onBack(); }}>
          <img src="/tmaly-logo.svg" alt="TMAly" className="sd-logo-img" />
        </a>
        <nav className="sd-side-menu">
          {tabs.map(t => (
            <button
              key={t.key}
              className={`sd-side-item ${view === t.key ? 'sd-side-active' : ''}`}
              onClick={() => setView(t.key)}
              type="button"
            >
              <span className="sd-side-ic">{t.icon}</span>
              {tabLabel(t, lang)}
            </button>
          ))}
        </nav>
        <div className="sd-side-user">
          <span className="sd-avatar">{firstName.charAt(0).toUpperCase()}</span>
          <div>
            <strong>{user?.name || (lang === 'ar' ? 'طالب' : 'Student')}</strong>
            <small>{user?.email}</small>
          </div>
        </div>
      </aside>

      <main className="sd-dash-main">
        <div className="sd-dash-top">
          <div>
            <h1>{lang === 'ar' ? { overview: 'نظرة عامة', assignments: 'واجباتي', models: 'المكتبة والنماذج', deadlines: 'المواعيد القادمة', account: 'حسابي' }[view] : { overview: 'Overview', assignments: 'My Assignments', models: 'Library & Models', deadlines: 'Upcoming Deadlines', account: 'My Account' }[view]}</h1>
            <p>{lang === 'ar' ? { overview: 'تابع تقدمك وواجباتك من مكان واحد.', assignments: 'أضف وتابع جميع واجباتك المُقيّمة.', models: 'نماذج إجابات وملخصات لموادك.', deadlines: 'لا تفوّت أي موعد تسليم.', account: 'إدارة بياناتك وباقة اشتراكك.' }[view] : { overview: 'Track your progress and assignments in one place.', assignments: 'Add and track all your graded assignments.', models: 'Answer models and summaries for your courses.', deadlines: 'Never miss a submission deadline.', account: 'Manage your profile and subscription plan.' }[view]}</p>
          </div>
          <div className="sd-dash-top-actions">
            <button className="sd-btn sd-btn-ghost sd-btn-sm" onClick={() => { logout(); onToast(lang === 'ar' ? 'تم تسجيل الخروج' : 'Signed out'); onBack(); }} type="button">
              <LogOut size={14} />
              <span>{lang === 'ar' ? 'خروج' : 'Sign Out'}</span>
            </button>
          </div>
        </div>

        {view === 'overview' && <Overview tasks={tasks} lang={lang} onToast={onToast} onNavigateToAssignments={() => setView('assignments')} onUpdateTasks={updateTasks} />}
        {view === 'assignments' && <Assignments tasks={tasks} lang={lang} onToast={onToast} onUpdateTasks={updateTasks} />}
        {view === 'models' && <Models lang={lang} />}
        {view === 'deadlines' && <Deadlines tasks={tasks} lang={lang} />}
        {view === 'account' && <Account lang={lang} text={text} onToast={onToast} />}
      </main>
    </div>
  );
});
