/** Saved courses live in this browser only. No account or API is involved. */
export const SAVED_COURSES_KEY = 'aou-saved-courses-v1';
export const MAX_SAVED_COURSES = 100;

export function normalizeCourseCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  return /^[A-Z][A-Z0-9-]{1,15}$/.test(code) ? code : null;
}

export function parseSavedCourses(raw: string | null): string[] {
  if (!raw || raw.length > 10000) return [];
  try {
    const values: unknown = JSON.parse(raw);
    if (!Array.isArray(values)) return [];
    const result: string[] = [];
    const seen = new Set<string>();
    for (const value of values) {
      const code = normalizeCourseCode(value);
      if (code && !seen.has(code)) {
        result.push(code);
        seen.add(code);
        if (result.length >= MAX_SAVED_COURSES) break;
      }
    }
    return result;
  } catch {
    return [];
  }
}

export function toggleSavedCourse(codes: readonly string[], value: string): string[] {
  const code = normalizeCourseCode(value);
  if (!code) return [...codes];
  const safe = parseSavedCourses(JSON.stringify(codes));
  return safe.includes(code)
    ? safe.filter((item) => item !== code)
    : [code, ...safe].slice(0, MAX_SAVED_COURSES);
}

export function loadSavedCourses(): string[] {
  try {
    return parseSavedCourses(window.localStorage.getItem(SAVED_COURSES_KEY));
  } catch {
    return [];
  }
}
