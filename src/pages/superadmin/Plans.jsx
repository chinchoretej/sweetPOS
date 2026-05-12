import { useEffect, useState } from 'react';
import { Sparkles, Edit, RefreshCw } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { CardSkeleton } from '../../components/ui/Skeleton';
import {
  subscribePlans,
  upsertPlan,
  seedBuiltinPlans,
} from '../../services/planService';
import { useToast } from '../../context/ToastContext';
import { FEATURE_LABEL } from '../../permissions/features';

export default function Plans() {
  const toast = useToast();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const u = subscribePlans((p) => {
      setPlans(p);
      setLoading(false);
    });
    return () => u && u();
  }, []);

  const startEdit = (p) => {
    setEditing(p);
    setForm({
      ...p,
      monthlyPrice: p.monthlyPrice || 0,
      yearlyPrice: p.yearlyPrice || 0,
      features: { ...(p.features || {}) },
      limits: { ...(p.limits || {}) },
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await upsertPlan(form.id, {
        name: form.name,
        tagline: form.tagline,
        monthlyPrice: Number(form.monthlyPrice) || 0,
        yearlyPrice: Number(form.yearlyPrice) || 0,
        isActive: !!form.isActive,
        features: form.features,
        limits: {
          maxEmployees: Number(form.limits?.maxEmployees ?? -1),
          maxProducts: Number(form.limits?.maxProducts ?? -1),
          maxOrdersPerMonth: Number(form.limits?.maxOrdersPerMonth ?? -1),
        },
      });
      toast.success('Plan saved');
      setEditing(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const reseed = async () => {
    try {
      const r = await seedBuiltinPlans();
      if (r.skipped) toast.info('Built-in plans already exist');
      else toast.success(`Seeded ${r.count} built-in plans`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-2xl font-display font-bold">Plans</h2>
          <p className="text-sm text-slate-500">Pricing tiers and feature inclusions.</p>
        </div>
        <Button variant="secondary" onClick={reseed} icon={<RefreshCw className="w-4 h-4" />}>
          Reseed Built-ins
        </Button>
      </div>

      {loading ? (
        <CardSkeleton />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {plans.map((p) => {
            const enabled = Object.entries(p.features || {})
              .filter(([, v]) => v)
              .map(([k]) => FEATURE_LABEL[k] || k);
            return (
              <div key={p.id} className="card p-4 relative">
                {p.isPopular && (
                  <Badge tone="brand" className="absolute right-3 top-3">
                    Popular
                  </Badge>
                )}
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <h3 className="font-bold">{p.name}</h3>
                  {p.isActive === false && <Badge tone="default">inactive</Badge>}
                </div>
                <p className="text-xs text-slate-500 mt-1">{p.tagline}</p>
                <p className="mt-3 text-2xl font-bold">
                  ₹{(p.monthlyPrice || 0).toLocaleString('en-IN')}
                  <span className="text-xs text-slate-500 font-normal">/mo</span>
                </p>
                <p className="text-[11px] text-slate-500">
                  ₹{(p.yearlyPrice || 0).toLocaleString('en-IN')}/yr
                </p>
                <div className="mt-3 text-xs text-slate-600 dark:text-slate-300 space-y-1 max-h-32 overflow-y-auto">
                  {enabled.slice(0, 8).map((f) => (
                    <div key={f}>• {f}</div>
                  ))}
                </div>
                <div className="mt-3 text-[11px] text-slate-500">
                  Max emp: {p.limits?.maxEmployees === -1 ? '∞' : p.limits?.maxEmployees ?? '—'} ·
                  Products: {p.limits?.maxProducts === -1 ? '∞' : p.limits?.maxProducts ?? '—'}
                </div>
                <Button variant="secondary" className="w-full mt-3" onClick={() => startEdit(p)} icon={<Edit className="w-3 h-3" />}>
                  Edit
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit Plan: ${editing?.name}`} size="lg">
        {form && (
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <Input label="Name" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input label="Tagline" value={form.tagline || ''} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
              <Input label="Monthly Price (₹)" type="number" value={form.monthlyPrice} onChange={(e) => setForm({ ...form, monthlyPrice: e.target.value })} />
              <Input label="Yearly Price (₹)" type="number" value={form.yearlyPrice} onChange={(e) => setForm({ ...form, yearlyPrice: e.target.value })} />
              <Input label="Max Employees (-1 = ∞)" type="number" value={form.limits?.maxEmployees ?? -1} onChange={(e) => setForm({ ...form, limits: { ...form.limits, maxEmployees: e.target.value } })} />
              <Input label="Max Products (-1 = ∞)" type="number" value={form.limits?.maxProducts ?? -1} onChange={(e) => setForm({ ...form, limits: { ...form.limits, maxProducts: e.target.value } })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="accent-brand-500"
                checked={!!form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              Plan is active (visible to onboarding)
            </label>
            <div>
              <label className="label mb-1 block">Features included</label>
              <div className="grid sm:grid-cols-2 gap-1 max-h-64 overflow-y-auto p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                {Object.entries(FEATURE_LABEL).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      className="accent-brand-500"
                      checked={!!form.features?.[key]}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          features: { ...form.features, [key]: e.target.checked },
                        })
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button onClick={save} loading={saving}>
                Save
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
