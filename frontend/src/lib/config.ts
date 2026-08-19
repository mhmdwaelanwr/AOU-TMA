/// <reference types="vite/client" />
import type { Branch, BranchId, CurrencyCode, Faculty } from '../types';

const productionOrigin = '';
export const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000' : productionOrigin);
export const FX_URL = import.meta.env.VITE_FX_URL || (import.meta.env.DEV ? 'http://localhost:3001' : productionOrigin);

export const branches: Branch[] = [
  { id: 'egypt', name: { ar: 'مصر', en: 'Egypt' }, currency: 'EGP', flag: '🇪🇬', timezone: 'Africa/Cairo', city: { ar: 'القاهرة', en: 'Cairo' } },
  { id: 'kuwait', name: { ar: 'الكويت', en: 'Kuwait' }, currency: 'KWD', flag: '🇰🇼', timezone: 'Asia/Kuwait', city: { ar: 'الكويت', en: 'Kuwait City' } },
  { id: 'saudi', name: { ar: 'السعودية', en: 'Saudi Arabia' }, currency: 'SAR', flag: '🇸🇦', timezone: 'Asia/Riyadh', city: { ar: 'الرياض', en: 'Riyadh' } },
  { id: 'bahrain', name: { ar: 'البحرين', en: 'Bahrain' }, currency: 'BHD', flag: '🇧🇭', timezone: 'Asia/Bahrain', city: { ar: 'المنامة', en: 'Manama' } },
  { id: 'jordan', name: { ar: 'الأردن', en: 'Jordan' }, currency: 'JOD', flag: '🇯🇴', timezone: 'Asia/Amman', city: { ar: 'عمّان', en: 'Amman' } },
  { id: 'lebanon', name: { ar: 'لبنان', en: 'Lebanon' }, currency: 'LBP', flag: '🇱🇧', timezone: 'Asia/Beirut', city: { ar: 'بيروت', en: 'Beirut' } },
  { id: 'oman', name: { ar: 'عُمان', en: 'Oman' }, currency: 'OMR', flag: '🇴🇲', timezone: 'Asia/Muscat', city: { ar: 'مسقط', en: 'Muscat' } },
  { id: 'sudan', name: { ar: 'السودان', en: 'Sudan' }, currency: 'SDG', flag: '🇸🇩', timezone: 'Africa/Khartoum', city: { ar: 'الخرطوم', en: 'Khartoum' } },
  { id: 'palestine', name: { ar: 'فلسطين', en: 'Palestine' }, currency: 'ILS', flag: '🇵🇸', timezone: 'Asia/Jerusalem', city: { ar: 'البيرة', en: 'Al-Bireh' } },
  { id: 'morocco', name: { ar: 'المغرب', en: 'Morocco' }, currency: 'MAD', flag: '🇲🇦', timezone: 'Africa/Casablanca', city: { ar: 'الدار البيضاء', en: 'Casablanca' } },
];

export function getBranch(id: BranchId): Branch {
  return branches.find((b) => b.id === id) || branches[0];
}

export function getCurrencyForBranch(branchId: BranchId): CurrencyCode {
  return getBranch(branchId).currency;
}

export function isNonEgyptBranch(branchId: BranchId): boolean {
  return branchId !== 'egypt';
}

export function getCurrencySymbol(currency: CurrencyCode): string {
  const symbols: Record<CurrencyCode, string> = {
    EGP: 'ج.م', KWD: 'د.ك', SAR: 'ر.س', LBP: 'ل.ب',
    JOD: 'د.أ', BHD: 'د.ب', OMR: 'ر.ع', SDG: 'ج.س',
    ILS: '₪', USDT: '₮', MAD: 'د.م',
  };
  return symbols[currency] || currency;
}

export function getCurrencyDecimals(currency: CurrencyCode): number {
  if (['KWD', 'JOD', 'BHD', 'OMR'].includes(currency)) return 3;
  if (['LBP', 'SDG'].includes(currency)) return 0;
  return 2;
}

export const facultyOrder: Faculty[] = [
  'all',
  'Computer Studies',
  'Business Studies',
  'Education',
  'Language Studies',
  'Media & Mass Communication',
  'Graphic & Multimedia Design',
];

export function detectBranchByTimezone(): BranchId {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const match = branches.find((b) => tz.startsWith(b.timezone.split('/')[0]));
    if (match) return match.id;
    if (tz.includes('Africa/Cairo') || tz.includes('Egypt')) return 'egypt';
    if (tz.includes('Asia/Riyadh') || tz.includes('Asia/Jeddah')) return 'saudi';
    if (tz.includes('Asia/Kuwait')) return 'kuwait';
    if (tz.includes('Asia/Bahrain')) return 'bahrain';
    if (tz.includes('Asia/Amman')) return 'jordan';
    if (tz.includes('Asia/Beirut')) return 'lebanon';
    if (tz.includes('Asia/Muscat')) return 'oman';
    if (tz.includes('Africa/Khartoum')) return 'sudan';
    if (tz.includes('Asia/Jerusalem') || tz.includes('Asia/Gaza')) return 'palestine';
    if (tz.includes('Africa/Casablanca') || tz.includes('Africa/El_Aaiun')) return 'morocco';
  } catch {}
  return 'egypt';
}
