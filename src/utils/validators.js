export const isValidIndianMobile = (mobile) => /^[6-9]\d{9}$/.test((mobile || '').replace(/\D/g, '').slice(-10));

export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');

export const isPositiveNumber = (n) => Number.isFinite(Number(n)) && Number(n) > 0;

export const isNonNegativeNumber = (n) => Number.isFinite(Number(n)) && Number(n) >= 0;
