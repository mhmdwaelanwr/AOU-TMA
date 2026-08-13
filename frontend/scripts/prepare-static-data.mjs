import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const frontendRoot=path.resolve(here,'..');
const repoRoot=path.resolve(frontendRoot,'..');
const sourceDir=path.join(repoRoot,'serverless','data');
const targetDir=path.join(frontendRoot,'public','catalog');
fs.mkdirSync(targetDir,{recursive:true});

const courses=JSON.parse(fs.readFileSync(path.join(sourceDir,'courses.json'),'utf8'));
const onsite=JSON.parse(fs.readFileSync(path.join(sourceDir,'onsite_courses.json'),'utf8'));
const onsiteByCode=onsite?.courses||{};
const mergedCourses=courses.map(course=>{const resources=onsiteByCode[String(course.code).toUpperCase()]||null;return{...course,onsite:Boolean(resources),studyVideoUrl:resources?.studyVideoUrl||null,studyFiles:Array.isArray(resources?.studyFiles)?resources.studyFiles:[]}});
fs.writeFileSync(path.join(targetDir,'courses.json'),JSON.stringify(mergedCourses,null,2));
for(const file of ['payment_methods.json','branches.json','onsite_courses.json'])fs.copyFileSync(path.join(sourceDir,file),path.join(targetDir,file));
console.log(`Prepared ${mergedCourses.length} courses, branch metadata and onsite study resources.`);
