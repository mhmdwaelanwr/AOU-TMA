import { BookOpen, BriefcaseBusiness, GraduationCap, LayoutGrid, SearchX, Languages, Newspaper, Palette, Bookmark } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { SAVED_COURSES_KEY, loadSavedCourses, toggleSavedCourse } from '../lib/savedCourses';
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
  query: string;
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
  orderingEnabled: boolean;
};

type Sort = 'code' | 'title' | 'price-asc' | 'price-desc';

export function Catalog({ courses, query, loading, error, faculty, lang, branch, currency, rate, isInternational, text, onFaculty, onOrder, orderingEnabled }: Props) {
  const [visible, setVisible] = useState(16);
  const [sort, setSort] = useState<Sort>('code');
  const [savedCodes, setSavedCodes] = useState<string[]>(loadSavedCourses);
  const [savedOnly, setSavedOnly] = useState(false);
  const savedSet = useMemo(() => new Set(savedCodes), [savedCodes]);

  // Bookmarks are stored only on this device, and kept in sync across tabs.
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === SAVED_COURSES_KEY || event.key === null) {
        setSavedCodes(loadSavedCourses());
      }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  useEffect(() => {
    try {
      const value = JSON.stringify(savedCodes);
      if (localStorage.getItem(SAVED_COURSES_KEY) !== value) {
        localStorage.setItem(SAVED_COURSES_KEY, value);
      }
    } catch {
      // Bookmarking still works in memory when storage is disabled.
    }
  }, [savedCodes]);

  useEffect(() => setVisible(16), [faculty, query, sort, savedOnly]);
  useEffect(() => {
    if (!orderingEnabled && (sort === 'price-asc' || sort === 'price-desc')) setSort('code');
  }, [orderingEnabled, sort]);

  const sorted = useMemo(() => {
    const list = [...courses];
    if (sort === 'price-asc') return list.sort((a, b) => a.priceEgp - b.priceEgp || a.code.localeCompare(b.code));
    if (sort === 'price-desc') return list.sort((a, b) => b.priceEgp - a.priceEgp || a.code.localeCompare(b.code));
    if (sort === 'title') return list.sort((a, b) => (a.title || 'zzzz').localeCompare(b.title || 'zzzz') || a.code.localeCompare(b.code));
    return list.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  }, [courses, sort]);

  const shown = useMemo(() => savedOnly
    ? sorted.filter((course) => savedSet.has(course.code.toUpperCase()))
    : sorted, [sorted, savedOnly, savedSet]);

  return (
    <section className="catalog-section" id="catalog">
      <div className="catalog-heading">
        <div>
          <span className="section-eyebrow">{text.catalogEyebrow}</span>
          <h2>{text.chooseCourse}</h2>
          <p>{text.catalogSubtitle}</p>
        </div>
        <span className="results-chip" role="status" aria-live="polite">{shown.length} {text.results}</span>
      </div>

      <div className="catalog-toolbar">
        <div className="faculty-filters" role="group" aria-label={text.faculties}>
          {facultyKeys.map(([value, labelKey, Icon]) => (
            <button type="button" key={value} className={`filter-chip ${faculty === value ? 'active' : ''}`} onClick={() => onFaculty(value)}>
              <Icon size={14} aria-hidden="true" /><span>{text[labelKey]}</span>
            </button>
          ))}
        </div>
        <button
          className={`saved-filter ${savedOnly ? 'active' : ''}`}
          type="button"
          aria-pressed={savedOnly}
          onClick={() => setSavedOnly((value) => !value)}
        >
          <Bookmark size={16} aria-hidden="true" fill={savedOnly ? 'currentColor' : 'none'} />
          <span>{lang === 'ar' ? 'المحفوظة' : 'Saved'} ({savedCodes.length})</span>
        </button>
        <label className="sort-control">
          <span>{text.sort}</span>
          <select value={sort} onChange={(event) => setSort(event.target.value as Sort)}>
            <option value="code">{text.sortCode}</option>
            <option value="title">{text.sortTitle}</option>
            {orderingEnabled && (
              <>
                <option value="price-asc">{text.sortLow}</option>
                <option value="price-desc">{text.sortHigh}</option>
              </>
            )}
          </select>
        </label>
      </div>

      {loading ? (
        <div className="course-grid">{Array.from({ length: 8 }).map((_, index) => <SkeletonCard key={index} />)}</div>
      ) : error ? (
        <div className="empty-state"><SearchX size={28} /><h3>{text.noResults}</h3><p>{text.requestFailed}</p></div>
      ) : shown.length === 0 ? (
        <div className="empty-state">
          <SearchX size={28} />
          <h3>{savedOnly ? (lang === 'ar' ? 'لا توجد مواد محفوظة ضمن النتائج' : 'No saved courses in these results') : text.noResults}</h3>
          <p>{savedOnly
            ? (lang === 'ar' ? 'احفظ موادك من علامة الإشارة المرجعية، أو ألغِ البحث والفلاتر.' : 'Bookmark a course or clear the search and filters.')
            : text.noResultsHelp}</p>
          {savedOnly && <button type="button" className="secondary-button" onClick={() => setSavedOnly(false)}>
            {lang === 'ar' ? 'عرض كل المواد' : 'Show all courses'}
          </button>}
        </div>
      ) : (
        <>
          <div className="course-grid">
            {shown.slice(0, visible).map((course) => (
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
                orderingEnabled={orderingEnabled}
                saved={savedSet.has(course.code.toUpperCase())}
                onToggleSaved={(code) => setSavedCodes((current) => toggleSavedCourse(current, code))}
              />
            ))}
          </div>
          {visible < shown.length && (
            <div className="load-more-wrap"><button className="secondary-button load-more" type="button" onClick={() => setVisible((value) => value + 16)}>{text.loadMore}<span>{Math.min(visible, shown.length)} / {shown.length}</span></button></div>
          )}
        </>
      )}
    </section>
  );
}
