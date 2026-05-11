import { formatCurrency, formatDate } from './format';

export const buildBillMessage = (order, settings) => {
  const lines = [];
  lines.push(`*${settings.shopName}*`);
  if (settings.address) lines.push(settings.address);
  lines.push('--------------------------------');
  lines.push(`Invoice: ${order.invoiceNumber}`);
  lines.push(`Date: ${formatDate(order.createdAt)}`);
  if (order.customer?.name) lines.push(`Customer: ${order.customer.name}`);
  lines.push('--------------------------------');
  order.items.forEach((it) => {
    lines.push(`${it.name} x ${it.qty}${it.unit} = ${formatCurrency(it.total, settings.currency)}`);
  });
  lines.push('--------------------------------');
  lines.push(`Subtotal: ${formatCurrency(order.subtotal, settings.currency)}`);
  if (order.discount) lines.push(`Discount: -${formatCurrency(order.discount, settings.currency)}`);
  if (order.gst) lines.push(`GST: ${formatCurrency(order.gst, settings.currency)}`);
  lines.push(`*Total: ${formatCurrency(order.total, settings.currency)}*`);
  lines.push(`Paid via: ${order.paymentMode?.toUpperCase()}`);
  lines.push('');
  lines.push('Thank you for your purchase!');
  return lines.join('\n');
};

export const shareOnWhatsApp = (order, settings) => {
  const text = buildBillMessage(order, settings);
  const phone = (order.customer?.mobile || '').replace(/\D/g, '');
  const url = phone
    ? `https://wa.me/${phone.length === 10 ? '91' + phone : phone}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener');
};
