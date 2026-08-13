import { memo } from 'react';
import { BookOpenCheck, Building2, CircleDollarSign, Timer } from 'lucide-react';

type Props = { courseCount: number; text: Record<string, string> };

export const Stats = memo(function Stats({ courseCount, text }: Props) {
  const items = [
    [BookOpenCheck, String(courseCount), text.courses, text.searchableCatalog],
    [Building2, '4', text.faculties, text.oneCatalog],
    [CircleDollarSign, '9', text.currencies, text.aouCountries],
    [Timer, text.orderMetricValue, text.orderMetric, text.orderMetricCaption],
  ] as const;
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
