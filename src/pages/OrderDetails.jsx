import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer, Download, Share2 } from 'lucide-react';
import Button from '../components/ui/Button';
import { CardSkeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import InvoiceView from '../components/billing/InvoiceView';
import { fetchOrder } from '../services/orderService';
import { useSettings } from '../context/SettingsContext';
import { useTenant } from '../context/TenantContext';
import { downloadInvoicePdf, printInvoiceWindow } from '../utils/invoice';
import { shareOnWhatsApp } from '../utils/whatsapp';

export default function OrderDetails() {
  const { id } = useParams();
  const { shopId } = useTenant();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { settings } = useSettings();

  useEffect(() => {
    if (!shopId) return;
    let active = true;
    fetchOrder(shopId, id).then((o) => {
      if (active) {
        setOrder(o);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [id, shopId]);

  if (loading) return <CardSkeleton />;
  if (!order) return <EmptyState title="Order not found" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between no-print">
        <Button variant="ghost" onClick={() => navigate(-1)} icon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => shareOnWhatsApp(order, settings)} icon={<Share2 className="w-4 h-4" />}>
            WhatsApp
          </Button>
          <Button variant="secondary" onClick={() => downloadInvoicePdf(order, settings)} icon={<Download className="w-4 h-4" />}>
            PDF
          </Button>
          <Button onClick={printInvoiceWindow} icon={<Printer className="w-4 h-4" />}>
            Print
          </Button>
        </div>
      </div>
      <div className="card p-2 sm:p-4">
        <InvoiceView order={order} settings={settings} mode={settings.printerMode} />
      </div>
    </div>
  );
}
