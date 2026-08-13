import { useEffect, useRef, useState } from 'react';
import { API_URL } from '../lib/config';
import type { Course, Faculty } from '../types';

const courseCache = new Map<string, Course[]>();
let staticCatalogPromise: Promise<Course[]> | null = null;

function cacheKey(q: string, f: Faculty) {
  return `${q}::${f}`;
}

function coursesEndpoint(q: string, faculty: Faculty) {
  const params = new URLSearchParams();
  params.set('q', q);
  params.set('faculty', faculty);
  const base = API_URL.replace(/\/+$/, '');
  return `${base}/api/courses?${params.toString()}`;
}

function filterCatalog(items: Course[], q: string, faculty: Faculty) {
  const needle = q.trim().toLocaleLowerCase();
  return items.filter((course) => {
    if (faculty !== 'all' && course.faculty !== faculty) return false;
    if (!needle) return true;
    const haystack = `${course.code} ${course.title || ''} ${course.description || ''} ${course.faculty} ${course.facultyAr}`.toLocaleLowerCase();
    return haystack.includes(needle);
  });
}

function loadStaticCatalog() {
  if (!staticCatalogPromise) {
    staticCatalogPromise = fetch('/catalog/courses.json', { cache: 'force-cache' })
      .then(async (response) => {
        if (!response.ok) throw new Error(`static_catalog_${response.status}`);
        const payload = await response.json() as Course[] | { items?: Course[] };
        const items = Array.isArray(payload) ? payload : payload.items;
        if (!Array.isArray(items) || items.length === 0) throw new Error('static_catalog_empty');
        return items;
      })
      .catch((error) => {
        staticCatalogPromise = null;
        throw error;
      });
  }
  return staticCatalogPromise;
}

export function useCourses(query: string, faculty: Faculty) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    if (timerRef.current !== null) clearTimeout(timerRef.current);

    const q = query.trim();
    const key = cacheKey(q, faculty);
    const cached = courseCache.get(key);
    if (cached) {
      setCourses(cached);
      setLoading(false);
      setError(false);
      return;
    }

    timerRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError(false);

      const load = async () => {
        try {
          const response = await fetch(coursesEndpoint(q, faculty), { signal: controller.signal, cache: 'no-store' });
          if (!response.ok) throw new Error(`catalog_failed_${response.status}`);
          const payload = await response.json() as { items?: Course[] };
          const items = Array.isArray(payload.items) ? payload.items : [];

          if (q === '' && faculty === 'all' && items.length === 0) {
            throw new Error('catalog_returned_empty_baseline');
          }

          courseCache.set(key, items);
          setCourses(items);
          setError(false);
        } catch (err: any) {
          if (err?.name === 'AbortError') return;
          console.warn('Catalog API unavailable; using bundled fallback.', err);
          try {
            const staticItems = filterCatalog(await loadStaticCatalog(), q, faculty);
            courseCache.set(key, staticItems);
            setCourses(staticItems);
            setError(false);
          } catch (fallbackError) {
            console.error('Failed to load both API and bundled catalog.', fallbackError);
            setCourses([]);
            setError(true);
          }
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      };

      void load();
    }, 120);

    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, [query, faculty]);

  return { courses, loading, error };
}
