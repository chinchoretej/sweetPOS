import { ROLES } from './roles';

// Capability flags. Pages / actions consult these via PermissionGuard
// or the `usePermissions()` hook returned by TenantContext.
export const PERMS = {
  // billing
  BILLING_CREATE: 'billing.create',
  BILLING_VOID: 'billing.void',

  // products
  PRODUCT_VIEW: 'product.view',
  PRODUCT_MANAGE: 'product.manage',

  // inventory
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_ADJUST: 'inventory.adjust',
  INVENTORY_RESTOCK: 'inventory.restock',

  // customers
  CUSTOMER_VIEW: 'customer.view',
  CUSTOMER_MANAGE: 'customer.manage',

  // orders
  ORDER_VIEW: 'order.view',
  ORDER_REFUND: 'order.refund',

  // reports
  REPORT_VIEW: 'report.view',
  REPORT_EXPORT: 'report.export',

  // employees
  EMPLOYEE_VIEW: 'employee.view',
  EMPLOYEE_MANAGE: 'employee.manage',

  // settings
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_MANAGE: 'settings.manage',

  // platform
  PLATFORM_DASHBOARD: 'platform.dashboard',
  PLATFORM_SHOP_MANAGE: 'platform.shop.manage',
  PLATFORM_PLAN_MANAGE: 'platform.plan.manage',
  PLATFORM_SUBSCRIPTION_MANAGE: 'platform.subscription.manage',
  PLATFORM_FEATURE_FLAG: 'platform.feature.flag',
  PLATFORM_ACTIVITY_VIEW: 'platform.activity.view',
};

const ALL_TENANT_PERMS = [
  PERMS.BILLING_CREATE,
  PERMS.BILLING_VOID,
  PERMS.PRODUCT_VIEW,
  PERMS.PRODUCT_MANAGE,
  PERMS.INVENTORY_VIEW,
  PERMS.INVENTORY_ADJUST,
  PERMS.INVENTORY_RESTOCK,
  PERMS.CUSTOMER_VIEW,
  PERMS.CUSTOMER_MANAGE,
  PERMS.ORDER_VIEW,
  PERMS.ORDER_REFUND,
  PERMS.REPORT_VIEW,
  PERMS.REPORT_EXPORT,
  PERMS.EMPLOYEE_VIEW,
  PERMS.EMPLOYEE_MANAGE,
  PERMS.SETTINGS_VIEW,
  PERMS.SETTINGS_MANAGE,
];

const ALL_PLATFORM_PERMS = [
  PERMS.PLATFORM_DASHBOARD,
  PERMS.PLATFORM_SHOP_MANAGE,
  PERMS.PLATFORM_PLAN_MANAGE,
  PERMS.PLATFORM_SUBSCRIPTION_MANAGE,
  PERMS.PLATFORM_FEATURE_FLAG,
  PERMS.PLATFORM_ACTIVITY_VIEW,
];

// Default capability matrix per role.
export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: [...ALL_PLATFORM_PERMS, ...ALL_TENANT_PERMS],

  [ROLES.SHOP_OWNER]: [...ALL_TENANT_PERMS],

  [ROLES.MANAGER]: [
    PERMS.BILLING_CREATE,
    PERMS.BILLING_VOID,
    PERMS.PRODUCT_VIEW,
    PERMS.PRODUCT_MANAGE,
    PERMS.INVENTORY_VIEW,
    PERMS.INVENTORY_ADJUST,
    PERMS.INVENTORY_RESTOCK,
    PERMS.CUSTOMER_VIEW,
    PERMS.CUSTOMER_MANAGE,
    PERMS.ORDER_VIEW,
    PERMS.REPORT_VIEW,
    PERMS.REPORT_EXPORT,
    PERMS.SETTINGS_VIEW,
  ],

  [ROLES.INVENTORY_STAFF]: [
    PERMS.PRODUCT_VIEW,
    PERMS.INVENTORY_VIEW,
    PERMS.INVENTORY_ADJUST,
    PERMS.INVENTORY_RESTOCK,
    PERMS.ORDER_VIEW,
  ],

  [ROLES.CASHIER]: [
    PERMS.BILLING_CREATE,
    PERMS.PRODUCT_VIEW,
    PERMS.CUSTOMER_VIEW,
    PERMS.CUSTOMER_MANAGE,
    PERMS.ORDER_VIEW,
  ],
};

export const permissionsFor = (role, customOverrides = []) => {
  const base = ROLE_PERMISSIONS[role] || [];
  return Array.from(new Set([...base, ...(customOverrides || [])]));
};

export const can = (perms, perm) => Array.isArray(perms) && perms.includes(perm);
