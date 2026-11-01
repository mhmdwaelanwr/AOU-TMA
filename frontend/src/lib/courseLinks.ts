import { normalizeCourseCode } from './savedCourses';

export function courseFromSearch(search: string): string | null {
  return normalizeCourseCode(new URLSearchParams(search).get('course'));
}

export function courseShareUrl(href: string, value: string): string {
  const code = normalizeCourseCode(value);
  if (!code) throw new Error('invalid_course_code');
  const current = new URL(href);
  if (!['http:', 'https:'].includes(current.protocol)) throw new Error('invalid_site_url');
  const target = new URL('/', current.origin);
  target.searchParams.set('course', code);
  return target.toString();
}

/** Replace the course parameter without changing unrelated query parameters. */
export function updateCourseUrl(href: string, value: string | null): string {
  const url = new URL(href);
  const code = normalizeCourseCode(value);
  if (code) url.searchParams.set('course', code);
  else url.searchParams.delete('course');
  return url.toString();
}
