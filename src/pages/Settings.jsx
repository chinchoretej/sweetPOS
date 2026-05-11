import { useEffect, useState } from 'react';
import { Save, Sun, Moon, Sparkles } from 'lucide-react';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../context/I18nContext';
import { useToast } from '../context/ToastContext';
import { seedSampleProducts } from '../utils/seedData';
import { isFirebaseConfigured } from '../services/firebase';

export default function Settings() {
  const { settings, update } = useSettings();
  const { theme, toggle } = useTheme();
  const { lang, setLang, languages } = useI18n();
  const toast = useToast();
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const set = (k) => (e) =>
    setForm((f) => ({
      ...f,
      [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await update({
        ...form,
        gstPercent: Number(form.gstPercent) || 0,
        thermalWidth: Number(form.thermalWidth) || 80,
        lowStockThreshold: Number(form.lowStockThreshold) || 1,
      });
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const seed = async () => {
    setSeeding(true);
    try {
      const r = await seedSampleProducts();
      if (r.skipped) toast.info(r.message);
      else toast.success(`Seeded ${r.count} products`);
    } catch (err) {
      toast.error(err.message || 'Seed failed');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-4 max-w-3xl">
      <div>
        <h2 className="text-2xl font-display font-bold">Settings</h2>
        <p className="text-sm text-slate-500">
          Configure your shop details, currency, taxes and printer.
        </p>
      </div>

      <div className="card p-4 space-y-4">
        <h3 className="font-semibold">Shop Information</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Shop Name" value={form.shopName || ''} onChange={set('shopName')} />
          <Input label="Phone" value={form.phone || ''} onChange={set('phone')} />
          <Input
            label="Address"
            value={form.address || ''}
            onChange={set('address')}
            className="sm:col-span-2"
          />
          <Input label="GST Number" value={form.gstNumber || ''} onChange={set('gstNumber')} />
          <Input label="UPI ID (for invoice QR)" value={form.upiId || ''} onChange={set('upiId')} />
        </div>
      </div>

      <div className="card p-4 space-y-4">
        <h3 className="font-semibold">Billing</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          <Input
            label="Currency Symbol"
            value={form.currency || ''}
            onChange={set('currency')}
          />
          <Input label="Currency Code" value={form.currencyCode || ''} onChange={set('currencyCode')} />
          <Input
            label="Low Stock Threshold"
            type="number"
            min="0"
            value={form.lowStockThreshold || 0}
            onChange={set('lowStockThreshold')}
          />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="accent-brand-500"
              checked={!!form.enableGst}
              onChange={set('enableGst')}
            />
            Enable GST on bills
          </label>
          <Input
            label="GST %"
            type="number"
            step="0.01"
            min="0"
            value={form.gstPercent || 0}
            onChange={set('gstPercent')}
            className="w-32"
            disabled={!form.enableGst}
          />
        </div>
      </div>

      <div className="card p-4 space-y-4">
        <h3 className="font-semibold">Printer</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <Select
            label="Printer Mode"
            value={form.printerMode || 'a4'}
            onChange={set('printerMode')}
            options={[
              { value: 'a4', label: 'A4 / Inkjet' },
              { value: 'thermal', label: 'Thermal (58/80mm)' },
            ]}
          />
          <Input
            label="Thermal Paper Width (mm)"
            type="number"
            value={form.thermalWidth || 80}
            onChange={set('thermalWidth')}
            disabled={form.printerMode !== 'thermal'}
          />
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <h3 className="font-semibold">Appearance & Language</h3>
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={toggle}
            className="btn-secondary"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4" /> Switch to Light
              </>
            ) : (
              <>
                <Moon className="w-4 h-4" /> Switch to Dark
              </>
            )}
          </button>
          <Select
            label="Language"
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            options={languages}
            className="w-48"
          />
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <h3 className="font-semibold">Demo Data</h3>
        <p className="text-sm text-slate-500">
          Seed your shop with 9 popular Indian sweets to explore the app instantly.
        </p>
        <Button
          type="button"
          variant="secondary"
          onClick={seed}
          loading={seeding}
          icon={<Sparkles className="w-4 h-4" />}
          disabled={!isFirebaseConfigured}
        >
          Seed sample products
        </Button>
        {!isFirebaseConfigured && (
          <p className="text-xs text-amber-600">Configure Firebase in .env to enable seeding.</p>
        )}
      </div>

      <div className="flex justify-end">
        <Button type="submit" loading={saving} icon={<Save className="w-4 h-4" />}>
          Save Settings
        </Button>
      </div>
    </form>
  );
}
