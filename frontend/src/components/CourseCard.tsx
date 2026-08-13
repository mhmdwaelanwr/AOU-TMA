import { memo } from 'react';
import { ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react';
import type { Course, CurrencyCode, Language } from '../types';
import { CourseIcon } from './CourseIcon';

type Props = {
  course: Course;
  lang: Language;
  currency: CurrencyCode;
  rate: number;
  text: Record<string, string>;
  onOrder: (course: Course) => void;
};

export function formatMoney(value: number, currency: CurrencyCode, lang: Language) {
  const maximumFractionDigits = ['KWD', 'JOD', 'BHD', 'OMR'].includes(currency) ? 3 : currency === 'LBP' || currency === 'SDG' ? 0 : 2;
  return new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { maximumFractionDigits }).format(value);
}

function shortDescription(course: Course, text: Record<string, string>) {
  if (course.description) return course.description;
  if (course.descriptionStatus === 'pending_official_sync') return text.descriptionPending;
  return text.descriptionUnavailable;
}

export const CourseCard = memo(function CourseCard({ course, lang, currency, rate, text, onOrder }: Props) {
  const converted = course.priceEgp * rate;
  const Arrow = lang === 'ar' ? ArrowLeft : ArrowRight;
  const description = shortDescription(course, text);

  return (
    <article className="course-card">
      <div className="course-card-head">
        <div className="course-heading-copy">
          <div className="course-code-line">
            <span className="course-icon" aria-hidden="true"><CourseIcon name={course.icon} size={17} /></span>
            <h3 dir="ltr">{course.code}</h3>
          </div>
          <p className={`course-title ${course.title ? '' : 'unresolved'}`} title={course.title || text.titleUnavailable}>
            {course.title || text.titleUnavailable}
          </p>
          <span className="course-faculty">{lang === 'ar' ? course.facultyAr : course.faculty}</span>
        </div>
        <span className="tma-badge">{course.type}</span>
      </div>

      <p className={`course-description ${course.description ? '' : 'pending'}`} title={description}>
        {description}
      </p>

      {course.descriptionSource && course.description && (
        <a className="course-source" href={course.descriptionSource} target="_blank" rel="noreferrer">
          <ExternalLink size={12} /><span>{text.aouSource}</span>
        </a>
      )}

      <div className="card-divider" />

      <div className="course-meta">
        <div><small>{text.semester}</small><strong>{course.semester.replace('2025/2026', '25/26')}</strong></div>
        <div><small>{text.service}</small><strong>{text.tmaSupport}</strong></div>
      </div>

      <div className="course-footer">
        <div className="price-block">
          <small>{text.startsFrom}</small>
          <strong>{formatMoney(converted, currency, lang)} <em>{currency}</em></strong>
        </div>
        <button className="primary-button" type="button" onClick={() => onOrder(course)}>
          <span>{text.orderNow}</span><Arrow size={15} />
        </button>
      </div>
    </article>
  );
});
