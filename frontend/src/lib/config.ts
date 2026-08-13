/// <reference types="vite/client" />
import type { CurrencyCode, Faculty } from '../types';

const productionOrigin = '';
export const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000' : productionOrigin);
export const FX_URL = import.meta.env.VITE_FX_URL || (import.meta.env.DEV ? 'http://localhost:3001' : productionOrigin);

export const currencies: Array<{
  code: CurrencyCode;
  country: { ar: string; en: string };
  name: { ar: string; en: string };
  flag: string;
}> = [
  { code: 'EGP', country: { ar: 'مصر', en: 'Egypt' }, name: { ar: 'جنيه مصري', en: 'Egyptian Pound' }, flag: '🇪🇬' },
  { code: 'KWD', country: { ar: 'الكويت', en: 'Kuwait' }, name: { ar: 'دينار كويتي', en: 'Kuwaiti Dinar' }, flag: '🇰🇼' },
  { code: 'SAR', country: { ar: 'السعودية', en: 'Saudi Arabia' }, name: { ar: 'ريال سعودي', en: 'Saudi Riyal' }, flag: '🇸🇦' },
  { code: 'LBP', country: { ar: 'لبنان', en: 'Lebanon' }, name: { ar: 'ليرة لبنانية', en: 'Lebanese Pound' }, flag: '🇱🇧' },
  { code: 'JOD', country: { ar: 'الأردن', en: 'Jordan' }, name: { ar: 'دينار أردني', en: 'Jordanian Dinar' }, flag: '🇯🇴' },
  { code: 'BHD', country: { ar: 'البحرين', en: 'Bahrain' }, name: { ar: 'دينار بحريني', en: 'Bahraini Dinar' }, flag: '🇧🇭' },
  { code: 'OMR', country: { ar: 'عُمان', en: 'Oman' }, name: { ar: 'ريال عُماني', en: 'Omani Rial' }, flag: '🇴🇲' },
  { code: 'SDG', country: { ar: 'السودان', en: 'Sudan' }, name: { ar: 'جنيه سوداني', en: 'Sudanese Pound' }, flag: '🇸🇩' },
  { code: 'ILS', country: { ar: 'فلسطين', en: 'Palestine' }, name: { ar: 'شيكل', en: 'Israeli New Shekel' }, flag: '🇵🇸' },
];

export const facultyOrder: Faculty[] = [
  'all',
  'Computer Studies',
  'Business Studies',
  'Education',
  'Language Studies',
];
