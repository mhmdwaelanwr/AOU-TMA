import { useEffect, useRef, useState } from 'react';
import { API_URL } from '../lib/config';
import type { Course, Faculty } from '../types';

const courseCache = new Map<string, Course[]>();

function cacheKey(q: string, f: Faculty) {
  return `${q}::${f}`;
}

function coursesEndpoint(q: string, faculty: Faculty) {
  const params = new URLSearchParams();
  params.set('q', q);
  params.set('faculty', faculty);

  // API_URL is intentionally empty in production so Vercel/Netlify can use
  // same-origin serverless routes. fetch() accepts relative URLs, while
  // new URL('/api/...') without an explicit base throws "Invalid URL".
  const base = API_URL.replace(/\/+$/, '');
  return `${base}/api/courses?${params.toString()}`;
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

      fetch(coursesEndpoint(q, faculty), { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error(`catalog_failed_${response.status}`);
          return response.json() as Promise<{ items: Course[] }>;
        })
        .then((payload) => {
          const items = Array.isArray(payload.items) ? payload.items : [];
          courseCache.set(key, items);
          setCourses(items);
        })
        .catch((err) => {
          if (err?.name !== 'AbortError') {
            console.error('Failed to load course catalog', err);
            setCourses([]);
            setError(true);
          }
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
