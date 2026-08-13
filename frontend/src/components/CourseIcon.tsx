import {
  BookOpen, BriefcaseBusiness, ChartNoAxesCombined, Code2, Database, GraduationCap,
  HeartPulse, Landmark, Languages, Laptop, Radio, Scale,
} from 'lucide-react';
import type { CourseIconName } from '../types';

const icons = {
  'book-open': BookOpen,
  'briefcase-business': BriefcaseBusiness,
  'chart-no-axes-combined': ChartNoAxesCombined,
  'code-2': Code2,
  database: Database,
  'graduation-cap': GraduationCap,
  'heart-pulse': HeartPulse,
  landmark: Landmark,
  languages: Languages,
  laptop: Laptop,
  radio: Radio,
  scale: Scale,
} satisfies Record<CourseIconName, typeof BookOpen>;

export function CourseIcon({ name, size = 18 }: { name: CourseIconName; size?: number }) {
  const Icon = icons[name] || BookOpen;
  return <Icon size={size} strokeWidth={1.9} aria-hidden="true" />;
}
