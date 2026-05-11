import { format, isToday, isYesterday } from 'date-fns';

export const formatCurrency = (value, symbol = '₹') => {
  const n = Number(value) || 0;
  return `${symbol}${n.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') return new Date(value);
  return null;
};

export const formatDate = (value, fmt = 'dd MMM yyyy, hh:mm a') => {
  const d = toDate(value);
  if (!d) return '—';
  return format(d, fmt);
};

export const friendlyDate = (value) => {
  const d = toDate(value);
  if (!d) return '—';
  if (isToday(d)) return `Today, ${format(d, 'hh:mm a')}`;
  if (isYesterday(d)) return `Yesterday, ${format(d, 'hh:mm a')}`;
  return format(d, 'dd MMM, hh:mm a');
};

export const dateKey = (date = new Date()) => date.toISOString().slice(0, 10);

export const startOfTodayDate = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export const endOfTodayDate = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};
