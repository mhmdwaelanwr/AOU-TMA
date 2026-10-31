import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, '..');
const repoRoot = path.resolve(frontendRoot, '..');
const siblingData = path.join(repoRoot, 'serverless', 'data');
const publicCatalog = path.join(frontendRoot, 'public', 'catalog');

// Every Vercel service builds in its own root. The checked-in catalog
// remains available if sibling serverless files are not included.
const sourceDir = fs.existsSync(path.join(siblingData, 'courses.json'))
  ? siblingData
  : publicCatalog;
fs.mkdirSync(publicCatalog, { recursive: true });

for (const file of ['courses.json', 'payment_methods.json', 'branches.json', 'onsite_courses.json']) {
  if (!fs.existsSync(path.join(sourceDir, file))) {
    throw new Error(`Missing catalog file: ${file}`);
  }
}

const courses = JSON.parse(fs.readFileSync(path.join(sourceDir, 'courses.json'), 'utf8'));
const onsite = JSON.parse(fs.readFileSync(path.join(sourceDir, 'onsite_courses.json'), 'utf8'));
const onsiteByCode = onsite?.courses || {};
const mergedCourses = courses.map(course => {
  const resources = onsiteByCode[String(course.code).toUpperCase()] || null;
  return {
    ...course,
    onsite: Boolean(resources),
    studyVideoUrl: resources?.studyVideoUrl || null,
    studyFiles: Array.isArray(resources?.studyFiles) ? resources.studyFiles : [],
  };
});

fs.writeFileSync(path.join(publicCatalog, 'courses.json'), JSON.stringify(mergedCourses, null, 2));
for (const file of ['payment_methods.json', 'branches.json', 'onsite_courses.json']) {
  if (sourceDir !== publicCatalog) {
    fs.copyFileSync(path.join(sourceDir, file), path.join(publicCatalog, file));
  }
}
console.log(`Prepared ${mergedCourses.length} courses from ${sourceDir === publicCatalog ? 'bundled' : 'repository'} data.`);
