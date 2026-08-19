import { memo } from 'react';
import { ArrowLeft, ArrowRight, ExternalLink, Gift, Play, FileText } from 'lucide-react';
import type { Branch, Course, CurrencyCode, Language } from '../types';
import { CourseIcon } from './CourseIcon';
import { getCurrencyDecimals, getCurrencySymbol } from '../lib/config';

type Props = {
  course: Course;
  lang: Language;
  branch: Branch;
  currency: CurrencyCode;
  rate: number;
  isInternational: boolean;
  text: Record<string, string>;
  onOrder: (course: Course) => void;
};

export function formatMoney(value: number, currency: CurrencyCode, lang: Language) {
  const maximumFractionDigits = getCurrencyDecimals(currency);
  return new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { maximumFractionDigits }).format(value);
}

function shortDescription(course: Course, text: Record<string, string>) {
  if (course.description) return course.description;
  if (course.descriptionStatus === 'pending_official_sync') return text.descriptionPending;
  return text.descriptionUnavailable;
}

export const CourseCard = memo(function CourseCard({ course, lang, branch, currency, rate, isInternational, text, onOrder }: Props) {
  const converted = course.priceEgp * rate;
  const Arrow = lang === 'ar' ? ArrowLeft : ArrowRight;
  const description = shortDescription(course, text);
  const isOnsite = course.type === 'ONSITE';

  return (
    <article className={`course-card ${isOnsite ? 'course-card-onsite' : ''}`}>
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
        {isOnsite ? (
          <span className="onsite-badge">{text.onsiteExam}</span>
        ) : (
          <span className="tma-badge">{course.type}</span>
        )}
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
        <div><small>{text.service}</small><strong>{isOnsite ? text.onsiteExam : text.tmaSupport}</strong></div>
      </div>

      <div className="course-footer">
        {isOnsite ? (
          <div className="onsite-footer">
            <div className="price-block">
              <small>{text.claimPrice}</small>
              <strong className="free-price">{text.free}</strong>
            </div>
            <button className="onsite-button" type="button" onClick={() => onOrder(course)}>
              <Gift size={15} />
              <span>{text.claimFree}</span>
            </button>
          </div>
        ) : (
          <>
            <div className="price-block">
              <small>{text.startsFrom}</small>
              <div className="price-row">
                {course.originalPriceEgp && (
                  <span className="price-original" dir="ltr">{formatMoney(course.originalPriceEgp * rate, currency, lang)} <em>{isInternational ? 'USDT' : currency}</em></span>
                )}
                <strong dir="ltr">{formatMoney(converted, currency, lang)} <em>{isInternational ? 'USDT' : currency}</em></strong>
              </div>
              {course.discount === 'limited_time' && <span className="discount-badge">{lang === 'ar' ? 'خصم لفترة محدودة' : 'Limited offer'}</span>}
            </div>
            <button className="primary-button" type="button" onClick={() => onOrder(course)}>
              <span>{text.orderNow}</span><Arrow size={15} />
            </button>
          </>
        )}
      </div>
    </article>
  );
});
