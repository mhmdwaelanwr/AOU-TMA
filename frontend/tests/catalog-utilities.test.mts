import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_SAVED_COURSES, normalizeCourseCode, parseSavedCourses, toggleSavedCourse,
} from '../src/lib/savedCourses.ts';
import { courseFromSearch, courseShareUrl, updateCourseUrl } from '../src/lib/courseLinks.ts';

test('saved courses reject bad JSON and malformed values', () => {
  assert.deepEqual(parseSavedCourses(null), []);
  assert.deepEqual(parseSavedCourses('{not json}'), []);
  assert.deepEqual(parseSavedCourses('{"data":[]}'), []);
  assert.deepEqual(parseSavedCourses(JSON.stringify(['tm105', ' TM105 ', 'M110', '', 14, '<script>'])), ['TM105', 'M110']);
  assert.equal(normalizeCourseCode('  t216a  '), 'T216A');
  assert.equal(normalizeCourseCode('../../admin'), null);
  assert.equal(normalizeCourseCode('a'), null);
});

test('bookmark toggle is deterministic, case-insensitive and bounded', () => {
  const first = toggleSavedCourse([], 'tm105');
  assert.deepEqual(first, ['TM105']);
  assert.deepEqual(toggleSavedCourse(first, 'TM105'), []);
  assert.deepEqual(toggleSavedCourse(first, 'm110'), ['M110', 'TM105']);
  const huge = Array.from({ length: 150 }, (_, i) => 'TM' + String(i + 100));
  const parsed = parseSavedCourses(JSON.stringify(huge));
  assert.equal(parsed.length, MAX_SAVED_COURSES);
  assert.equal(toggleSavedCourse(parsed, 'M110').length, MAX_SAVED_COURSES);
  assert.deepEqual(toggleSavedCourse(['TM105'], 'unsafe!'), ['TM105']);
});

test('shareable course URLs use only the public origin and sanitized code', () => {
  const url = courseShareUrl('https://study.example/catalog?utm_source=test#top', ' tm105 ');
  assert.equal(url, 'https://study.example/?course=TM105');
  assert.equal(courseFromSearch('?course=tm105'), 'TM105');
  assert.equal(courseFromSearch('?course=%2F%2Fadmin'), null);
  assert.equal(courseFromSearch('?course='), null);
  assert.throws(() => courseShareUrl('javascript:alert(1)', 'TM105'));
  assert.throws(() => courseShareUrl('https://study.example', '../TM105'));
});

test('opening and closing details preserves unrelated URL parameters', () => {
  const start = 'https://study.example/?lang=ar&x=1#catalog';
  const open = updateCourseUrl(start, 'TM105');
  assert.equal(new URL(open).searchParams.get('course'), 'TM105');
  assert.equal(new URL(open).searchParams.get('lang'), 'ar');
  assert.equal(new URL(open).hash, '#catalog');
  const closed = updateCourseUrl(open, null);
  assert.equal(new URL(closed).searchParams.has('course'), false);
  assert.equal(new URL(closed).searchParams.get('x'), '1');
});
