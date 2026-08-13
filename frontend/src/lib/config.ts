/// <reference types="vite/client" />
import type { Branch, BranchCode, CurrencyCode, Faculty } from '../types';

const productionOrigin = '';
export const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000' : productionOrigin);
export const FX_URL = import.meta.env.VITE_FX_URL || (import.meta.env.DEV ? 'http://localhost:3001' : productionOrigin);

export const branches: Branch[] = [
  { code:'EG', countryCode:'EG', currency:'EGP', flag:'🇪🇬', country:{ar:'مصر',en:'Egypt'}, branch:{ar:'فرع مصر',en:'Egypt Branch'} },
  { code:'KW', countryCode:'KW', currency:'KWD', flag:'🇰🇼', country:{ar:'الكويت',en:'Kuwait'}, branch:{ar:'فرع الكويت',en:'Kuwait Branch'} },
  { code:'SA', countryCode:'SA', currency:'SAR', flag:'🇸🇦', country:{ar:'السعودية',en:'Saudi Arabia'}, branch:{ar:'فرع السعودية',en:'Saudi Arabia Branch'} },
  { code:'LB', countryCode:'LB', currency:'LBP', flag:'🇱🇧', country:{ar:'لبنان',en:'Lebanon'}, branch:{ar:'فرع لبنان',en:'Lebanon Branch'} },
  { code:'JO', countryCode:'JO', currency:'JOD', flag:'🇯🇴', country:{ar:'الأردن',en:'Jordan'}, branch:{ar:'فرع الأردن',en:'Jordan Branch'} },
  { code:'BH', countryCode:'BH', currency:'BHD', flag:'🇧🇭', country:{ar:'البحرين',en:'Bahrain'}, branch:{ar:'فرع البحرين',en:'Bahrain Branch'} },
  { code:'OM', countryCode:'OM', currency:'OMR', flag:'🇴🇲', country:{ar:'عُمان',en:'Oman'}, branch:{ar:'فرع عُمان',en:'Oman Branch'} },
  { code:'SD', countryCode:'SD', currency:'SDG', flag:'🇸🇩', country:{ar:'السودان',en:'Sudan'}, branch:{ar:'فرع السودان',en:'Sudan Branch'} },
  { code:'PS', countryCode:'PS', currency:'ILS', flag:'🇵🇸', country:{ar:'فلسطين',en:'Palestine'}, branch:{ar:'فرع فلسطين',en:'Palestine Branch'} },
];

export const branchByCode = Object.fromEntries(branches.map((item) => [item.code, item])) as Record<BranchCode, Branch>;
export const branchByCountry = Object.fromEntries(branches.map((item) => [item.countryCode, item.code])) as Record<string, BranchCode>;

export const currencies: Array<{code:CurrencyCode; country:{ar:string;en:string}; name:{ar:string;en:string}; flag:string}> = [
  { code:'EGP', country:{ar:'مصر',en:'Egypt'}, name:{ar:'جنيه مصري',en:'Egyptian Pound'}, flag:'🇪🇬' },
  { code:'KWD', country:{ar:'الكويت',en:'Kuwait'}, name:{ar:'دينار كويتي',en:'Kuwaiti Dinar'}, flag:'🇰🇼' },
  { code:'SAR', country:{ar:'السعودية',en:'Saudi Arabia'}, name:{ar:'ريال سعودي',en:'Saudi Riyal'}, flag:'🇸🇦' },
  { code:'LBP', country:{ar:'لبنان',en:'Lebanon'}, name:{ar:'ليرة لبنانية',en:'Lebanese Pound'}, flag:'🇱🇧' },
  { code:'JOD', country:{ar:'الأردن',en:'Jordan'}, name:{ar:'دينار أردني',en:'Jordanian Dinar'}, flag:'🇯🇴' },
  { code:'BHD', country:{ar:'البحرين',en:'Bahrain'}, name:{ar:'دينار بحريني',en:'Bahraini Dinar'}, flag:'🇧🇭' },
  { code:'OMR', country:{ar:'عُمان',en:'Oman'}, name:{ar:'ريال عُماني',en:'Omani Rial'}, flag:'🇴🇲' },
  { code:'SDG', country:{ar:'السودان',en:'Sudan'}, name:{ar:'جنيه سوداني',en:'Sudanese Pound'}, flag:'🇸🇩' },
  { code:'ILS', country:{ar:'فلسطين',en:'Palestine'}, name:{ar:'شيكل',en:'Israeli New Shekel'}, flag:'🇵🇸' },
];

export function isBranchCode(value: unknown): value is BranchCode {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(branchByCode, value);
}

export function inferBranchFromBrowser(): BranchCode {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const timezoneMap: Record<string, BranchCode> = {
      'Africa/Cairo':'EG','Asia/Kuwait':'KW','Asia/Riyadh':'SA','Asia/Beirut':'LB','Asia/Amman':'JO',
      'Asia/Bahrain':'BH','Asia/Muscat':'OM','Africa/Khartoum':'SD','Asia/Gaza':'PS','Asia/Hebron':'PS',
    };
    if (timezoneMap[zone]) return timezoneMap[zone];
    const localeRegion = (navigator.language || '').match(/-([A-Za-z]{2})$/)?.[1]?.toUpperCase();
    if (localeRegion && branchByCountry[localeRegion]) return branchByCountry[localeRegion];
  } catch {}
  return 'EG';
}

export const facultyOrder: Faculty[] = ['all','Computer Studies','Business Studies','Education','Language Studies'];
