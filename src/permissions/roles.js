// Role hierarchy. Higher number = more privileges.
// LEGACY values 'admin' / 'cashier' (from v1) are mapped to new roles
// during AuthContext load so existing accounts keep working.

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  SHOP_OWNER: 'shop_owner',
  MANAGER: 'manager',
  INVENTORY_STAFF: 'inventory_staff',
  CASHIER: 'cashier',
};

export const ROLE_RANK = {
  [ROLES.SUPER_ADMIN]: 100,
  [ROLES.SHOP_OWNER]: 80,
  [ROLES.MANAGER]: 60,
  [ROLES.INVENTORY_STAFF]: 40,
  [ROLES.CASHIER]: 20,
};

export const ROLE_LABEL = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.SHOP_OWNER]: 'Shop Owner',
  [ROLES.MANAGER]: 'Manager',
  [ROLES.INVENTORY_STAFF]: 'Inventory Staff',
  [ROLES.CASHIER]: 'Cashier',
};

// Roles selectable when adding an employee (super_admin & shop_owner are not pickable here)
export const ASSIGNABLE_EMPLOYEE_ROLES = [
  ROLES.MANAGER,
  ROLES.INVENTORY_STAFF,
  ROLES.CASHIER,
];

export const isPlatformRole = (role) => role === ROLES.SUPER_ADMIN;
export const isTenantRole = (role) => !!role && role !== ROLES.SUPER_ADMIN;

// Map legacy v1 roles → v2 roles
export const normalizeLegacyRole = (role) => {
  if (role === 'admin') return ROLES.SHOP_OWNER;
  if (!role) return ROLES.CASHIER;
  return role;
};
