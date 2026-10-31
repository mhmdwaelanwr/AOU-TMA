import { memo } from 'react';
import { BookOpenCheck, Building2, CircleDollarSign, ShieldCheck, Timer } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Language } from '../types';

type Props = { courseCount: number; text: Record<string, string>; catalogOnly: boolean; lang: Language };

export const Stats = memo(function Stats({ courseCount, text, catalogOnly, lang }: Props) {
  const items: Array<[LucideIcon, string, string, string]> = [
    [BookOpenCheck, String(courseCount), text.courses, text.searchableCatalog],
    [Building2, '6', text.faculties, text.oneCatalog],
    [CircleDollarSign, '9', text.currencies, text.aouCountries],
    catalogOnly
      ? [ShieldCheck, 'AOU', lang === 'ar' ? 'مصادر رسمية' : 'Official sources',
          lang === 'ar' ? 'روابط المقررات المتوفرة' : 'Course reference links when available']
      : [Timer, text.orderMetricValue, text.orderMetric, text.orderMetricCaption],
  ];
  return (
    <section className="stats-grid" aria-label="Platform summary">
      {items.map(([Icon, value, title, caption]) => (
        <article className="stat-card" key={`${value}-${title}`}>
          <span className="stat-icon" aria-hidden="true"><Icon size={18} /></span>
          <strong>{value}</strong>
          <span>{title}</span>
          <small>{caption}</small>
        </article>
      ))}
    </section>
  );
});
