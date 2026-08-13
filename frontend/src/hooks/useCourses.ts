import { useEffect, useRef, useState } from 'react';
import { API_URL } from '../lib/config';
import type { Course, Faculty } from '../types';

const courseCache = new Map<string, Course[]>();

function cacheKey(q: string, f: Faculty) {
  return `${q}::${f}`;
}

export function useCourses(query: string, faculty: Faculty) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();
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

      const url = new URL(`${API_URL}/api/courses`);
      url.searchParams.set('q', q);
      url.searchParams.set('faculty', faculty);

      fetch(url, { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error('catalog_failed');
          return response.json() as Promise<{ items: Course[] }>;
        })
        .then((payload) => {
          const items = payload.items || [];
          courseCache.set(key, items);
          setCourses(items);
        })
        .catch((err) => {
          if (err?.name !== 'AbortError') setError(true);
        })
        .finally(() => setLoading(false));
    }, 200);

    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [query, faculty]);

  return { courses, loading, error };
}
