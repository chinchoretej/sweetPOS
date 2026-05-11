import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { formatCurrency, formatDate } from '../../utils/format';

export default function InvoiceView({ order, settings, mode = 'a4' }) {
  const [qr, setQr] = useState('');

  useEffect(() => {
    if (!order) return;
    const upi = settings.upiId
      ? `upi://pay?pa=${encodeURIComponent(settings.upiId)}&pn=${encodeURIComponent(
          settings.shopName || ''
        )}&am=${order.total}&cu=${settings.currencyCode || 'INR'}&tn=${order.invoiceNumber}`
      : `Invoice ${order.invoiceNumber} | Total ${order.total}`;
    QRCode.toDataURL(upi, { margin: 1, width: 160 }).then(setQr).catch(() => setQr(''));
  }, [order, settings]);

  if (!order) return null;
  const sym = settings.currency || '₹';
  const isThermal = mode === 'thermal';
  const widthMm = settings.thermalWidth || 80;

  return (
    <div
      id="print-area"
      className={`bg-white text-slate-900 mx-auto ${
        isThermal ? 'text-xs' : 'text-sm'
      }`}
      style={isThermal ? { width: `${widthMm}mm`, padding: '6mm 4mm' } : { padding: '24px' }}
    >
      <div className={`text-center ${isThermal ? '' : 'mb-2'}`}>
        <h2 className={`font-bold ${isThermal ? 'text-base' : 'text-xl'}`}>
          {settings.shopName}
        </h2>
        {settings.address && <p className="text-xs">{settings.address}</p>}
        {settings.phone && <p className="text-xs">Phone: {settings.phone}</p>}
        {settings.gstNumber && <p className="text-xs">GSTIN: {settings.gstNumber}</p>}
      </div>

      <div className="border-t border-dashed border-slate-400 my-2" />

      <div className={`grid ${isThermal ? '' : 'grid-cols-2 gap-3'} text-xs`}>
        <div>
          <p>
            <strong>Invoice:</strong> {order.invoiceNumber}
          </p>
          <p>
            <strong>Date:</strong> {formatDate(order.createdAt)}
          </p>
          <p>
            <strong>Payment:</strong> {(order.paymentMode || '').toUpperCase()}
          </p>
        </div>
        {(order.customer?.name || order.customer?.mobile) && (
          <div>
            <p>
              <strong>Customer:</strong> {order.customer.name || '-'}
            </p>
            <p>
              <strong>Mobile:</strong> {order.customer.mobile || '-'}
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-dashed border-slate-400 my-2" />

      <table className="w-full text-xs">
        <thead>
          <tr className="text-left">
            <th className="py-1">Item</th>
            <th className="py-1 text-right">Qty</th>
            <th className="py-1 text-right">Rate</th>
            <th className="py-1 text-right">Amt</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((it, idx) => (
            <tr key={idx} className="border-t border-slate-200">
              <td className="py-1 pr-2">{it.name}</td>
              <td className="py-1 text-right">
                {it.qty}
                {it.unit}
              </td>
              <td className="py-1 text-right">
                {sym}
                {Number(it.price).toFixed(2)}
              </td>
              <td className="py-1 text-right">
                {sym}
                {Number(it.total).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-dashed border-slate-400 my-2" />

      <div className="text-xs space-y-0.5">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatCurrency(order.subtotal, sym)}</span>
        </div>
        {order.discount ? (
          <div className="flex justify-between">
            <span>Discount</span>
            <span>-{formatCurrency(order.discount, sym)}</span>
          </div>
        ) : null}
        {order.gst ? (
          <div className="flex justify-between">
            <span>GST</span>
            <span>{formatCurrency(order.gst, sym)}</span>
          </div>
        ) : null}
        <div className="flex justify-between font-bold text-base pt-1 border-t border-slate-300 mt-1">
          <span>TOTAL</span>
          <span>{formatCurrency(order.total, sym)}</span>
        </div>
      </div>

      {qr && (
        <div className="flex flex-col items-center mt-3">
          <img src={qr} alt="QR" className={isThermal ? 'w-24 h-24' : 'w-28 h-28'} />
          <p className="text-[10px] mt-1">Scan to pay/verify</p>
        </div>
      )}

      <p className="text-center text-xs mt-3">Thank you, visit again!</p>
    </div>
  );
}
