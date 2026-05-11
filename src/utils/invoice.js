import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { formatCurrency, formatDate } from './format';

const buildUpiPayload = (settings, total, invoiceNumber) => {
  if (!settings?.upiId) return null;
  const params = new URLSearchParams({
    pa: settings.upiId,
    pn: settings.shopName || 'Shop',
    am: String(total),
    cu: settings.currencyCode || 'INR',
    tn: invoiceNumber,
  });
  return `upi://pay?${params.toString()}`;
};

const buildQrPayload = (order, settings) => {
  const upi = buildUpiPayload(settings, order.total, order.invoiceNumber);
  return upi || `Invoice ${order.invoiceNumber} | Total ${order.total}`;
};

export const generateInvoicePdf = async (order, settings) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const sym = settings.currency || '₹';

  doc.setFontSize(18);
  doc.text(settings.shopName || 'SweetPOS', 14, 18);
  doc.setFontSize(10);
  doc.text(settings.address || '', 14, 24);
  if (settings.gstNumber) doc.text(`GSTIN: ${settings.gstNumber}`, 14, 29);
  if (settings.phone) doc.text(`Phone: ${settings.phone}`, 14, 34);

  doc.setFontSize(12);
  doc.text('TAX INVOICE', 196, 18, { align: 'right' });
  doc.setFontSize(10);
  doc.text(`Invoice #: ${order.invoiceNumber}`, 196, 24, { align: 'right' });
  doc.text(`Date: ${formatDate(order.createdAt)}`, 196, 29, { align: 'right' });
  doc.text(`Payment: ${(order.paymentMode || '').toUpperCase()}`, 196, 34, {
    align: 'right',
  });

  if (order.customer?.name || order.customer?.mobile) {
    doc.setFontSize(11);
    doc.text('Bill To:', 14, 46);
    doc.setFontSize(10);
    doc.text(order.customer.name || '', 14, 52);
    doc.text(order.customer.mobile || '', 14, 57);
  }

  autoTable(doc, {
    startY: 65,
    head: [['#', 'Item', 'Qty', 'Unit', 'Rate', 'Amount']],
    body: order.items.map((it, idx) => [
      idx + 1,
      it.name,
      it.qty,
      it.unit,
      `${sym}${Number(it.price).toFixed(2)}`,
      `${sym}${Number(it.total).toFixed(2)}`,
    ]),
    headStyles: { fillColor: [236, 72, 153], textColor: 255 },
    styles: { fontSize: 9 },
  });

  let y = doc.lastAutoTable.finalY + 8;
  const right = 196;
  doc.setFontSize(10);
  doc.text(`Subtotal: ${formatCurrency(order.subtotal, sym)}`, right, y, { align: 'right' });
  if (order.discount) {
    y += 6;
    doc.text(`Discount: -${formatCurrency(order.discount, sym)}`, right, y, { align: 'right' });
  }
  if (order.gst) {
    y += 6;
    doc.text(`GST: ${formatCurrency(order.gst, sym)}`, right, y, { align: 'right' });
  }
  y += 8;
  doc.setFontSize(13);
  doc.text(`Grand Total: ${formatCurrency(order.total, sym)}`, right, y, { align: 'right' });

  // QR
  try {
    const qrText = buildQrPayload(order, settings);
    const dataUrl = await QRCode.toDataURL(qrText, { margin: 1, width: 200 });
    doc.addImage(dataUrl, 'PNG', 14, y - 22, 28, 28);
    doc.setFontSize(8);
    doc.text('Scan to pay / verify', 14, y + 10);
  } catch (_) {
    /* noop */
  }

  doc.setFontSize(9);
  doc.text(
    'Thank you for shopping with us!',
    105,
    doc.internal.pageSize.height - 10,
    { align: 'center' }
  );

  return doc;
};

export const downloadInvoicePdf = async (order, settings) => {
  const doc = await generateInvoicePdf(order, settings);
  doc.save(`${order.invoiceNumber}.pdf`);
};

export const printInvoiceWindow = () => {
  window.print();
};
