export const ROUTES = {
  // public
  LOGIN: '/login',

  // tenant
  DASHBOARD: '/',
  BILLING: '/billing',
  PRODUCTS: '/products',
  INVENTORY: '/inventory',
  CUSTOMERS: '/customers',
  ORDERS: '/orders',
  ORDER_DETAILS: '/orders/:id',
  REPORTS: '/reports',
  EMPLOYEES: '/employees',
  SETTINGS: '/settings',

  // tenant lifecycle
  ONBOARDING: '/onboarding',
  SUBSCRIPTION_GATE: '/subscription',

  // super admin
  ADMIN_HOME: '/admin',
  ADMIN_SHOPS: '/admin/shops',
  ADMIN_SHOP_DETAILS: '/admin/shops/:id',
  ADMIN_PLANS: '/admin/plans',
  ADMIN_SUBSCRIPTIONS: '/admin/subscriptions',
  ADMIN_FEATURE_FLAGS: '/admin/feature-flags',
  ADMIN_ACTIVITY: '/admin/activity',
  ADMIN_ANALYTICS: '/admin/analytics',
};
