import { useEffect, useId, useRef } from 'react';
import { BookOpen, CalendarDays, ExternalLink, FileText, Info, X } from 'lucide-react';
import type { Course, Language } from '../types';

type Props = {
  course: Course | null;
  lang: Language;
  onClose: () => void;
};

function safeHttpsUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' ? parsed.href : null;
  } catch {
    return null;
  }
}

function officialSource(value: string | null | undefined): string | null {
  const safe = safeHttpsUrl(value);
  if (!safe) return null;
  const hostname = new URL(safe).hostname.toLowerCase();
  return hostname === 'aou.edu.eg' || hostname.endsWith('.aou.edu.eg') ? safe : null;
}

export function CourseDetailsModal({ course, lang, onClose }: Props) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!course) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.classList.add('modal-open');
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = [...(panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled])'
      ) ?? [])];
      if (!focusable.length) return;
      if (event.shiftKey && document.activeElement === focusable[0]) {
        event.preventDefault();
        focusable[focusable.length - 1].focus();
      } else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) {
        event.preventDefault();
        focusable[0].focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.classList.remove('modal-open');
      window.removeEventListener('keydown', handleKeyDown);
      previous?.focus();
    };
  }, [course, onClose]);

  if (!course) return null;

  const ar = lang === 'ar';
  const source = officialSource(course.descriptionSource) || officialSource(course.catalogueSource);
  const videoUrl = safeHttpsUrl(course.studyVideoUrl || course.onsiteVideoUrl);
  const fileLinks = (course.studyFiles || [])
    .map((file) => ({ name: file.name, url: safeHttpsUrl(file.url) }))
    .filter((file) => file.url);
  const isOnsite = course.type === 'ONSITE' || course.onsite;

  return (
    <div className="catalog-details-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        ref={panelRef}
        className="catalog-details-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <div className="catalog-details-top">
          <span className="catalog-details-code" dir="ltr">{course.code}</span>
          <button ref={closeRef} type="button" className="catalog-details-close"
            aria-label={ar ? 'إغلاق تفاصيل المادة' : 'Close course details'} onClick={onClose}>
            <X size={19} />
          </button>
        </div>
        <h2 id={titleId}>{course.title || (ar ? 'عنوان المادة غير متاح' : 'Course title unavailable')}</h2>
        <p className="catalog-details-faculty">{ar ? course.facultyAr : course.faculty}</p>

        <div className="catalog-details-meta">
          <span><CalendarDays size={16} /> {ar ? 'الفصل:' : 'Semester:'} {course.semester}</span>
          <span><BookOpen size={16} /> {isOnsite ? (ar ? 'مراجعة حضورية' : 'On-site review') : (ar ? 'مقرر دراسي' : 'Course')}</span>
        </div>

        <div className="catalog-details-body">
          <h3>{ar ? 'نبذة عن المقرر' : 'Course overview'}</h3>
          <p id={descriptionId}>
            {course.description || (ar
              ? 'وصف المادة غير متاح حاليًا؛ راجع المصدر الرسمي للحصول على أحدث التفاصيل.'
              : 'A description is not currently available. Check the official source for updates.')}
          </p>
        </div>

        {(videoUrl || fileLinks.length > 0) && (
          <div className="catalog-details-resources">
            <h3><FileText size={17} /> {ar ? 'مصادر للمذاكرة' : 'Study resources'}</h3>
            {videoUrl && <a href={videoUrl} target="_blank" rel="noopener noreferrer">
              {ar ? 'فيديو شرح متاح' : 'Available study video'} <ExternalLink size={14} />
            </a>}
            {fileLinks.map((file, index) => (
              <a key={index} href={file.url!} target="_blank" rel="noopener noreferrer">
                {file.name} <ExternalLink size={14} />
              </a>
            ))}
          </div>
        )}

        <div className="catalog-details-note">
          <Info size={18} />
          <p>{ar
            ? 'المنصة في وضع تصفح المواد فقط. الطلبات والدفع وتسجيل الحسابات غير متاحة حاليًا لحين تجهيز تخزين دائم وآمن. لا تحتاج لإدخال أي بيانات شخصية.'
            : 'Catalog preview mode: ordering, payments and accounts are currently unavailable until durable storage is ready. No personal information is required.'}</p>
        </div>
        <div className="catalog-details-actions">
          {source && (
            <a className="catalog-details-official" href={source} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={16} /> {ar ? 'المصدر الرسمي للجامعة' : 'Official university source'}
            </a>
          )}
          <button type="button" className="primary-button" onClick={onClose}>
            {ar ? 'العودة إلى المواد' : 'Back to courses'}
          </button>
        </div>
      </section>
    </div>
  );
}
