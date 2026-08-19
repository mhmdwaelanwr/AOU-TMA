export type Language = 'ar' | 'en';
export type Theme = 'light' | 'dark';
export type Faculty = 'all' | 'Computer Studies' | 'Business Studies' | 'Education' | 'Language Studies' | 'Media & Mass Communication' | 'Graphic & Multimedia Design';
export type CurrencyCode = 'EGP' | 'KWD' | 'SAR' | 'LBP' | 'JOD' | 'BHD' | 'OMR' | 'SDG' | 'ILS' | 'USDT' | 'MAD';
export type ServiceType = 'TMA' | 'QUIZ' | 'ASSIGNMENT';

export type BranchId = 'egypt' | 'kuwait' | 'saudi' | 'bahrain' | 'jordan' | 'lebanon' | 'oman' | 'sudan' | 'palestine' | 'morocco';

export type Branch = {
  id: BranchId;
  name: { ar: string; en: string };
  currency: CurrencyCode;
  flag: string;
  timezone: string;
  city: { ar: string; en: string };
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
  originalPriceEgp?: number;
  discount?: 'limited_time';
  semester: string;
  type: 'TMA' | 'ONSITE';
  title: string | null;
  titleStatus: 'verified' | 'not_found_in_current_catalogue';
  catalogueSource: string | null;
  description: string | null;
  descriptionStatus: 'verified' | 'pending_official_sync' | 'unresolved_course';
  descriptionSource: string | null;
  icon: CourseIconName;
  onsiteVideoUrl?: string | null;
  onsiteMaterialsUrl?: string | null;
};

export type FxResponse = {
  base: 'EGP';
  currency: CurrencyCode;
  rate: number;
  source: string;
  cachedAt: string;
  providerUpdatedAt?: string | null;
  nextUpdateAt?: string | null;
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

export type PaymentMethodsResponse = {
  count: number;
  items: PaymentMethod[];
};

export type OrderPayload = {
  course_code: string;
  customer_name: string;
  contact: string;
  email?: string;
  notes?: string;
  currency: CurrencyCode;
  service_type: ServiceType;
  branch?: BranchId;
  payment_method?: string;
  promo_code?: string;
  referral_code?: string;
  deposit_proof_url?: string;
  deposit_tx_hash?: string;
  lms_username?: string;
  lms_password?: string;
};

export type OrderResponse = {
  ok: boolean;
  order_id: string;
  status: string;
  deposit_amount: number;
  created_at: string;
};

export type ServicePrices = {
  ok: boolean;
  branch: string;
  prices: Record<ServiceType, number>;
};
