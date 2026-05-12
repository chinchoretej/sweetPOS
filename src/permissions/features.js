// Feature catalog. The effective feature set for a shop is computed as:
//
//   features = { ...PLAN.features, ...featureFlagOverrides }
//
// Pages / menu items consult these via FeatureGuard or `useFeatures()`.

export const FEATURES = {
  BILLING: 'billing',
  INVENTORY: 'inventory',
  REPORTS: 'reports',
  WHATSAPP_BILL: 'whatsappBill',
  GST: 'gst',
  THERMAL_PRINTER: 'thermalPrinter',
  EMPLOYEES: 'employees',
  ANALYTICS: 'analytics',
  MARATHI: 'marathi',
  BARCODE: 'barcode',
  PDF_EXPORT: 'pdfExport',
  CSV_EXPORT: 'csvExport',
  CUSTOMER_HISTORY: 'customerHistory',
};

export const FEATURE_LABEL = {
  [FEATURES.BILLING]: 'Billing & POS',
  [FEATURES.INVENTORY]: 'Inventory Management',
  [FEATURES.REPORTS]: 'Reports & Charts',
  [FEATURES.WHATSAPP_BILL]: 'WhatsApp Bill Sharing',
  [FEATURES.GST]: 'GST on Invoices',
  [FEATURES.THERMAL_PRINTER]: 'Thermal Printer Support',
  [FEATURES.EMPLOYEES]: 'Employee Management',
  [FEATURES.ANALYTICS]: 'Advanced Analytics',
  [FEATURES.MARATHI]: 'Marathi Language',
  [FEATURES.BARCODE]: 'Barcode Scanning',
  [FEATURES.PDF_EXPORT]: 'PDF Invoice Export',
  [FEATURES.CSV_EXPORT]: 'CSV Report Export',
  [FEATURES.CUSTOMER_HISTORY]: 'Customer Purchase History',
};

// Safe defaults for a brand-new shop (Free Trial).
// Plans override these.
export const DEFAULT_FEATURES = {
  [FEATURES.BILLING]: true,
  [FEATURES.INVENTORY]: true,
  [FEATURES.REPORTS]: false,
  [FEATURES.WHATSAPP_BILL]: false,
  [FEATURES.GST]: false,
  [FEATURES.THERMAL_PRINTER]: true,
  [FEATURES.EMPLOYEES]: false,
  [FEATURES.ANALYTICS]: false,
  [FEATURES.MARATHI]: true,
  [FEATURES.BARCODE]: false,
  [FEATURES.PDF_EXPORT]: true,
  [FEATURES.CSV_EXPORT]: false,
  [FEATURES.CUSTOMER_HISTORY]: true,
};

// Resolve effective features: plan defaults < explicit overrides.
export const resolveFeatures = (planFeatures, overrides) => {
  return {
    ...DEFAULT_FEATURES,
    ...(planFeatures || {}),
    ...(overrides || {}),
  };
};

export const hasFeature = (features, key) => !!(features && features[key]);
