import { FEATURES } from '../permissions/features';

export const PLAN_IDS = {
  TRIAL: 'trial',
  BASIC: 'basic',
  PREMIUM: 'premium',
  ENTERPRISE: 'enterprise',
};

export const SUBSCRIPTION_STATUS = {
  TRIAL: 'trial',
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  CANCELLED: 'cancelled',
  SUSPENDED: 'suspended',
  EXPIRED: 'expired',
};

export const SHOP_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  TRIAL: 'trial',
  ARCHIVED: 'archived',
};

// Built-in plan catalog. These are seeded into Firestore on first load
// of the Super Admin dashboard if no plans exist.
export const BUILTIN_PLANS = [
  {
    id: PLAN_IDS.TRIAL,
    name: 'Free Trial',
    tagline: '14-day full-feature trial',
    monthlyPrice: 0,
    yearlyPrice: 0,
    trialDays: 14,
    isActive: true,
    isBuiltin: true,
    features: {
      [FEATURES.BILLING]: true,
      [FEATURES.INVENTORY]: true,
      [FEATURES.REPORTS]: true,
      [FEATURES.WHATSAPP_BILL]: true,
      [FEATURES.GST]: true,
      [FEATURES.THERMAL_PRINTER]: true,
      [FEATURES.EMPLOYEES]: false,
      [FEATURES.ANALYTICS]: true,
      [FEATURES.MARATHI]: true,
      [FEATURES.BARCODE]: false,
      [FEATURES.PDF_EXPORT]: true,
      [FEATURES.CSV_EXPORT]: true,
      [FEATURES.CUSTOMER_HISTORY]: true,
    },
    limits: { maxEmployees: 1, maxProducts: 50, maxOrdersPerMonth: 200 },
  },
  {
    id: PLAN_IDS.BASIC,
    name: 'Basic',
    tagline: 'For small mithai shops',
    monthlyPrice: 499,
    yearlyPrice: 4990,
    isActive: true,
    isBuiltin: true,
    features: {
      [FEATURES.BILLING]: true,
      [FEATURES.INVENTORY]: true,
      [FEATURES.REPORTS]: true,
      [FEATURES.WHATSAPP_BILL]: false,
      [FEATURES.GST]: true,
      [FEATURES.THERMAL_PRINTER]: true,
      [FEATURES.EMPLOYEES]: false,
      [FEATURES.ANALYTICS]: false,
      [FEATURES.MARATHI]: true,
      [FEATURES.BARCODE]: false,
      [FEATURES.PDF_EXPORT]: true,
      [FEATURES.CSV_EXPORT]: false,
      [FEATURES.CUSTOMER_HISTORY]: true,
    },
    limits: { maxEmployees: 2, maxProducts: 200, maxOrdersPerMonth: 1000 },
  },
  {
    id: PLAN_IDS.PREMIUM,
    name: 'Premium',
    tagline: 'For multi-employee shops',
    monthlyPrice: 1499,
    yearlyPrice: 14990,
    isActive: true,
    isBuiltin: true,
    isPopular: true,
    features: {
      [FEATURES.BILLING]: true,
      [FEATURES.INVENTORY]: true,
      [FEATURES.REPORTS]: true,
      [FEATURES.WHATSAPP_BILL]: true,
      [FEATURES.GST]: true,
      [FEATURES.THERMAL_PRINTER]: true,
      [FEATURES.EMPLOYEES]: true,
      [FEATURES.ANALYTICS]: true,
      [FEATURES.MARATHI]: true,
      [FEATURES.BARCODE]: true,
      [FEATURES.PDF_EXPORT]: true,
      [FEATURES.CSV_EXPORT]: true,
      [FEATURES.CUSTOMER_HISTORY]: true,
    },
    limits: { maxEmployees: 10, maxProducts: 1000, maxOrdersPerMonth: 10000 },
  },
  {
    id: PLAN_IDS.ENTERPRISE,
    name: 'Enterprise',
    tagline: 'Unlimited everything',
    monthlyPrice: 4999,
    yearlyPrice: 49990,
    isActive: true,
    isBuiltin: true,
    features: {
      [FEATURES.BILLING]: true,
      [FEATURES.INVENTORY]: true,
      [FEATURES.REPORTS]: true,
      [FEATURES.WHATSAPP_BILL]: true,
      [FEATURES.GST]: true,
      [FEATURES.THERMAL_PRINTER]: true,
      [FEATURES.EMPLOYEES]: true,
      [FEATURES.ANALYTICS]: true,
      [FEATURES.MARATHI]: true,
      [FEATURES.BARCODE]: true,
      [FEATURES.PDF_EXPORT]: true,
      [FEATURES.CSV_EXPORT]: true,
      [FEATURES.CUSTOMER_HISTORY]: true,
    },
    limits: { maxEmployees: -1, maxProducts: -1, maxOrdersPerMonth: -1 }, // -1 = unlimited
  },
];

export const getBuiltinPlan = (id) => BUILTIN_PLANS.find((p) => p.id === id);
