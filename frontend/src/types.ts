export type Language = 'ar' | 'en';
export type Theme = 'light' | 'dark';
export type ThemePreference = Theme | 'system';
export type Faculty = 'all' | 'Computer Studies' | 'Business Studies' | 'Education' | 'Language Studies';
export type CurrencyCode = 'EGP' | 'KWD' | 'SAR' | 'LBP' | 'JOD' | 'BHD' | 'OMR' | 'SDG' | 'ILS';
export type PaymentCurrency = CurrencyCode | 'USDT';
export type BranchCode = 'EG' | 'KW' | 'SA' | 'LB' | 'JO' | 'BH' | 'OM' | 'SD' | 'PS';

export type Branch = {
  code: BranchCode;
  countryCode: string;
  currency: CurrencyCode;
  flag: string;
  country: { ar: string; en: string };
  branch: { ar: string; en: string };
};

export type StudyFile = {
  label: string;
  url: string;
  type?: 'pdf' | 'zip' | 'link' | 'doc';
};

export type CourseIconName =
  | 'code-2' | 'chart-no-axes-combined' | 'landmark' | 'briefcase-business'
  | 'languages' | 'graduation-cap' | 'radio' | 'scale' | 'heart-pulse'
  | 'laptop' | 'book-open' | 'database';

export type Course = {
  code: string;
  faculty: string;
  facultyAr: string;
  priceEgp: number;
  semester: string;
  type: string;
  title: string | null;
  titleStatus: 'verified' | 'not_found_in_current_catalogue';
  catalogueSource: string | null;
  description: string | null;
  descriptionStatus: 'verified' | 'pending_official_sync' | 'unresolved_course' | 'legacy_code';
  descriptionSource: string | null;
  icon: CourseIconName;
  onsite?: boolean;
  studyVideoUrl?: string | null;
  studyFiles?: StudyFile[];
};

export type FxResponse = {
  base: 'EGP';
  currency: CurrencyCode;
  rate: number;
  usdtRate?: number | null;
  usdtUsdPrice?: number | null;
  usdtSource?: string | null;
  source: string;
  cachedAt: string;
  providerUpdatedAt?: string | null;
  nextUpdateAt?: string | null;
  cryptoUpdatedAt?: string | null;
  status: 'fresh' | 'stale' | 'base';
};

export type PaymentMethod = {
  id: string;
  group: 'wallet' | 'bank' | 'crypto';
  label: string;
  currency: 'EGP' | 'USDT';
  network: string | null;
  icon: string;
  configured: boolean;
  destination: string | null;
  instructions: string | null;
};

export type PaymentMethodsResponse = { count: number; items: PaymentMethod[] };

export type OrderPayload = {
  course_code: string;
  customer_name: string;
  contact: string;
  notes?: string;
  currency: PaymentCurrency;
  branch_code: BranchCode;
  claim_type: 'paid' | 'free_onsite';
  quoted_local_amount?: number;
  quoted_local_currency?: CurrencyCode;
  quoted_usdt_amount?: number;
  payment_method?: string;
  payment_reference?: string;
};

export type OrderResponse = {
  ok: boolean;
  order_id: string;
  status: string;
  created_at: string;
};
