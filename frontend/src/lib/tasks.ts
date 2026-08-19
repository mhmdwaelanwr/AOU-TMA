import type { Language } from '../types';

export type TaskStatus = 'done' | 'pending';

export type Task = {
  id: number;
  subjectAr: string;
  subjectEn: string;
  titleAr: string;
  titleEn: string;
  due: string;
  status: TaskStatus;
  score: number | null;
  notesAr: string;
  notesEn: string;
};

export type Model = {
  icon: string;
  nameAr: string;
  nameEn: string;
  descAr: string;
  descEn: string;
};

export type GradeRow = {
  subjectAr: string;
  subjectEn: string;
  type: string;
  pct: string;
  prog: number;
};

const LS_KEY_PREFIX = 'tma_tasks_';

export function tasksKey(userId: string): string {
  return LS_KEY_PREFIX + userId;
}

export function loadTasks(userId: string): Task[] {
  try {
    const raw = localStorage.getItem(tasksKey(userId));
    if (raw) return JSON.parse(raw);
  } catch {}
  return [...tasksSeed];
}

export function saveTasks(userId: string, tasks: Task[]): void {
  localStorage.setItem(tasksKey(userId), JSON.stringify(tasks));
}

export const tasksSeed: Task[] = [
  {
    id: 1,
    subjectAr: 'اللغة الإنجليزية',
    subjectEn: 'English Language',
    titleAr: 'الواجب المُقيّم رقم 2',
    titleEn: 'Graded Assignment 2',
    due: '2026-08-18',
    status: 'done',
    score: 18.5,
    notesAr: 'مقال عن التكنولوجيا والتعليم • اتقدم قبل الموعد',
    notesEn: 'Essay on technology and education • Submitted early',
  },
  {
    id: 2,
    subjectAr: 'إدارة الأعمال',
    subjectEn: 'Business Administration',
    titleAr: 'TMA الفصل الأول',
    titleEn: 'TMA Semester 1',
    due: '2026-08-12',
    status: 'done',
    score: 19,
    notesAr: 'دراسة حالة عن ريادة الأعمال في السوق المحلي',
    notesEn: 'Case study on entrepreneurship in the local market',
  },
  {
    id: 3,
    subjectAr: 'علم النفس التربوي',
    subjectEn: 'Educational Psychology',
    titleAr: 'الواجب المُقيّم رقم 1',
    titleEn: 'Graded Assignment 1',
    due: '2026-08-22',
    status: 'pending',
    score: null,
    notesAr: 'موضوع: نظريات التعلم وتطبيقاتها في الفصل',
    notesEn: 'Topic: Learning theories and their classroom applications',
  },
  {
    id: 4,
    subjectAr: 'مبادئ القانون',
    subjectEn: 'Principles of Law',
    titleAr: 'ملخص وتقرير قانوني',
    titleEn: 'Legal Summary & Report',
    due: '2026-08-30',
    status: 'pending',
    score: null,
    notesAr: 'تحليل نص قانوني مختار من الكتاب المقرر',
    notesEn: 'Analysis of a legal text from the prescribed textbook',
  },
];

export const modelsData: Model[] = [
  { icon: '🔤', nameAr: 'اللغة الإنجليزية', nameEn: 'English Language', descAr: '3 نماذج إجابات • ملخص قواعد شامل', descEn: '3 answer models • Comprehensive grammar summary' },
  { icon: '💼', nameAr: 'إدارة الأعمال', nameEn: 'Business Administration', descAr: '2 نماذج إجابات • مخططات دراسية', descEn: '2 answer models • Study outlines' },
  { icon: '🧠', nameAr: 'علم النفس التربوي', nameEn: 'Educational Psychology', descAr: '2 نماذج إجابات • ملخص فصل كامل', descEn: '2 answer models • Full chapter summary' },
  { icon: '⚖️', nameAr: 'مبادئ القانون', nameEn: 'Principles of Law', descAr: '1 نموذج إجابة • ملخص مذكرات', descEn: '1 answer model • Memo summary' },
  { icon: '📊', nameAr: 'الإحصاء', nameEn: 'Statistics', descAr: '1 نموذج إجابة • جداول ورقة عمل', descEn: '1 answer model • Tables & worksheet' },
  { icon: '🧮', nameAr: 'الرياضيات', nameEn: 'Mathematics', descAr: '2 نموذج إجابة • حلول مسائل مقررة', descEn: '2 answer models • Course problem solutions' },
];

export const gradeRowsData: GradeRow[] = [
  { subjectAr: 'اللغة الإنجليزية', subjectEn: 'English Language', type: 'TMA + Quiz', pct: '30%', prog: 75 },
  { subjectAr: 'إدارة الأعمال', subjectEn: 'Business Admin', type: 'TMA + Activity', pct: '40%', prog: 90 },
  { subjectAr: 'علم النفس التربوي', subjectEn: 'Educational Psychology', type: 'TMA + Discussion', pct: '30%', prog: 55 },
];

const monthNamesAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const monthNamesEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function fmtDate(dateStr: string, lang: Language): string {
  const dt = new Date(dateStr + 'T00:00:00');
  if (lang === 'ar') {
    return dt.getDate() + ' ' + monthNamesAr[dt.getMonth()] + ' ' + dt.getFullYear();
  }
  return dt.getDate() + ' ' + monthNamesEn[dt.getMonth()] + ' ' + dt.getFullYear();
}

export function fmtDay(dateStr: string, lang: Language): { day: number; mon: string } {
  const dt = new Date(dateStr + 'T00:00:00');
  if (lang === 'ar') {
    return { day: dt.getDate(), mon: monthNamesAr[dt.getMonth()].slice(0, 4) + '.' };
  }
  return { day: dt.getDate(), mon: monthNamesEn[dt.getMonth()] };
}
