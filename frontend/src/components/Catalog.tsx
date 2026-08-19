import { BookOpen, BriefcaseBusiness, GraduationCap, LayoutGrid, SearchX, Languages, Newspaper, Palette } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Branch, Course, CurrencyCode, Faculty, Language } from '../types';
import { CourseCard } from './CourseCard';
import { SkeletonCard } from './SkeletonCard';

const facultyKeys: Array<[Faculty, string, typeof LayoutGrid]> = [
  ['all', 'all', LayoutGrid],
  ['Computer Studies', 'facultyComputer', BookOpen],
  ['Business Studies', 'facultyBusiness', BriefcaseBusiness],
  ['Education', 'facultyEducation', GraduationCap],
  ['Language Studies', 'facultyLanguage', Languages],
  ['Media & Mass Communication', 'facultyMedia', Newspaper],
  ['Graphic & Multimedia Design', 'facultyGmmd', Palette],
];

type Props = {
  courses: Course[];
  loading: boolean;
  error: boolean;
  faculty: Faculty;
  lang: Language;
  branch: Branch;
  currency: CurrencyCode;
  rate: number;
  isInternational: boolean;
  text: Record<string, string>;
  onFaculty: (faculty: Faculty) => void;
  onOrder: (course: Course) => void;
};

type Sort = 'code' | 'title' | 'price-asc' | 'price-desc';

export function Catalog({ courses, loading, error, faculty, lang, branch, currency, rate, isInternational, text, onFaculty, onOrder }: Props) {
  const [visible, setVisible] = useState(16);
  const [sort, setSort] = useState<Sort>('code');

  useEffect(() => setVisible(16), [faculty, courses.length, sort]);

  const sorted = useMemo(() => {
    const list = [...courses];
    if (sort === 'price-asc') return list.sort((a, b) => a.priceEgp - b.priceEgp || a.code.localeCompare(b.code));
    if (sort === 'price-desc') return list.sort((a, b) => b.priceEgp - a.priceEgp || a.code.localeCompare(b.code));
    if (sort === 'title') return list.sort((a, b) => (a.title || 'zzzz').localeCompare(b.title || 'zzzz') || a.code.localeCompare(b.code));
    return list.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  }, [courses, sort]);

  return (
    <section className="catalog-section" id="catalog">
      <div className="catalog-heading">
        <div>
          <span className="section-eyebrow">{text.catalogEyebrow}</span>
          <h2>{text.chooseCourse}</h2>
          <p>{text.catalogSubtitle}</p>
        </div>
        <span className="results-chip">{courses.length} {text.results}</span>
      </div>

      <div className="catalog-toolbar">
        <div className="faculty-filters" role="group" aria-label={text.faculties}>
          {facultyKeys.map(([value, labelKey, Icon]) => (
            <button type="button" key={value} className={`filter-chip ${faculty === value ? 'active' : ''}`} onClick={() => onFaculty(value)}>
              <Icon size={14} aria-hidden="true" /><span>{text[labelKey]}</span>
            </button>
          ))}
        </div>
        <label className="sort-control">
          <span>{text.sort}</span>
          <select value={sort} onChange={(event) => setSort(event.target.value as Sort)}>
            <option value="code">{text.sortCode}</option>
            <option value="title">{text.sortTitle}</option>
            <option value="price-asc">{text.sortLow}</option>
            <option value="price-desc">{text.sortHigh}</option>
          </select>
        </label>
      </div>

      {loading ? (
        <div className="course-grid">{Array.from({ length: 8 }).map((_, index) => <SkeletonCard key={index} />)}</div>
      ) : error ? (
        <div className="empty-state"><SearchX size={28} /><h3>{text.noResults}</h3><p>{text.requestFailed}</p></div>
      ) : sorted.length === 0 ? (
        <div className="empty-state"><SearchX size={28} /><h3>{text.noResults}</h3><p>{text.noResultsHelp}</p></div>
      ) : (
        <>
          <div className="course-grid">
            {sorted.slice(0, visible).map((course) => (
              <CourseCard
                key={course.code}
                course={course}
                lang={lang}
                branch={branch}
                currency={currency}
                rate={rate}
                isInternational={isInternational}
                text={text}
                onOrder={onOrder}
              />
            ))}
          </div>
          {visible < sorted.length && (
            <div className="load-more-wrap"><button className="secondary-button load-more" type="button" onClick={() => setVisible((value) => value + 16)}>{text.loadMore}<span>{Math.min(visible, sorted.length)} / {sorted.length}</span></button></div>
          )}
        </>
      )}
    </section>
  );
}
