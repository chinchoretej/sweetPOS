import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Candy, Store, ShieldCheck, Sparkles } from 'lucide-react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { createShop } from '../services/shopService';
import { ROUTES } from '../constants/routes';
import { BUILTIN_PLANS, PLAN_IDS } from '../constants/plans';
import { FEATURE_LABEL } from '../permissions/features';
import { isPlatformRole } from '../permissions/roles';

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [step, setStep] = useState(1);
  const [shop, setShop] = useState({
    name: '',
    address: '',
    gstNumber: '',
    phone: user?.phoneNumber || '',
  });
  const [planId, setPlanId] = useState(PLAN_IDS.TRIAL);
  const [submitting, setSubmitting] = useState(false);

  if (!user) return <Navigate to={ROUTES.LOGIN} replace />;
  if (isPlatformRole(user.role)) return <Navigate to={ROUTES.ADMIN_HOME} replace />;
  if (user.shopId) return <Navigate to={ROUTES.DASHBOARD} replace />;

  const set = (k) => (e) => setShop((s) => ({ ...s, [k]: e.target.value }));

  const submit = async () => {
    if (!shop.name.trim()) {
      toast.error('Shop name is required');
      setStep(1);
      return;
    }
    setSubmitting(true);
    try {
      await createShop({
        name: shop.name.trim(),
        address: shop.address,
        gstNumber: shop.gstNumber,
        ownerUid: user.uid,
        ownerEmail: user.email,
        ownerPhone: user.phoneNumber || shop.phone,
        planId,
        createdBy: user.uid,
      });
      toast.success(`Welcome to SweetPOS, ${shop.name}!`);
      navigate(ROUTES.DASHBOARD, { replace: true });
    } catch (err) {
      toast.error(err.message || 'Could not create your shop');
    } finally {
      setSubmitting(false);
    }
  };

  const visiblePlans = BUILTIN_PLANS;

  return (
    <div className="min-h-screen bg-sweet-cream dark:bg-slate-950 p-6 flex items-start justify-center">
      <div className="w-full max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-amber-400 grid place-items-center text-white">
            <Candy className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-display font-extrabold leading-none">SweetPOS</p>
            <p className="text-xs text-slate-500 mt-1">Let&apos;s get your shop ready</p>
          </div>
        </div>

        <div className="card p-2">
          <div className="grid grid-cols-2">
            {[
              { n: 1, label: 'Shop details' },
              { n: 2, label: 'Choose plan' },
            ].map((s) => (
              <div
                key={s.n}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg ${
                  step === s.n
                    ? 'bg-brand-500 text-white shadow-soft'
                    : 'text-slate-500'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full text-xs font-bold grid place-items-center ${
                    step === s.n ? 'bg-white text-brand-600' : 'bg-slate-100 dark:bg-slate-800'
                  }`}
                >
                  {s.n}
                </span>
                <span className="text-sm font-semibold">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {step === 1 && (
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-brand-500" />
              <h2 className="font-semibold">Tell us about your shop</h2>
            </div>
            <Input
              label="Shop name *"
              value={shop.name}
              onChange={set('name')}
              placeholder="e.g. Aai Mauli Mithai Bhandar"
              required
              autoFocus
            />
            <Input
              label="Address"
              value={shop.address}
              onChange={set('address')}
              placeholder="123 Mithai Bazaar, Pune"
            />
            <div className="grid sm:grid-cols-2 gap-3">
              <Input
                label="GST Number (optional)"
                value={shop.gstNumber}
                onChange={set('gstNumber')}
                placeholder="27ABCDE1234F1Z5"
              />
              <Input
                label="Phone"
                value={shop.phone}
                onChange={set('phone')}
                placeholder="+91 90000 00000"
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!shop.name.trim()}>
                Next: Choose plan
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h2 className="font-semibold">Pick a plan to start with</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {visiblePlans.map((p) => {
                const active = planId === p.id;
                const enabledFeatures = Object.entries(p.features || {})
                  .filter(([, v]) => v)
                  .map(([k]) => FEATURE_LABEL[k] || k);
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => setPlanId(p.id)}
                    className={`card p-4 text-left transition relative overflow-hidden ${
                      active ? 'ring-2 ring-brand-500 shadow-soft' : ''
                    }`}
                  >
                    {p.isPopular && (
                      <Badge tone="brand" className="absolute right-3 top-3">
                        Popular
                      </Badge>
                    )}
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-lg font-bold">{p.name}</h3>
                      {p.id === PLAN_IDS.TRIAL && (
                        <Badge tone="success">Free {p.trialDays}d</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{p.tagline}</p>
                    <p className="mt-3 font-bold text-2xl">
                      ₹{p.monthlyPrice.toLocaleString('en-IN')}
                      <span className="text-xs text-slate-500 font-normal">/mo</span>
                    </p>
                    <ul className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                      {enabledFeatures.slice(0, 6).map((f) => (
                        <li key={f}>• {f}</li>
                      ))}
                      {enabledFeatures.length > 6 && (
                        <li className="text-slate-400">+ {enabledFeatures.length - 6} more</li>
                      )}
                    </ul>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={submit} loading={submitting} icon={<ShieldCheck className="w-4 h-4" />}>
                Create my shop
              </Button>
            </div>
          </div>
        )}

        <p className="text-[11px] text-slate-500 text-center">
          You can change plans, upgrade and add employees later from Settings.
        </p>
      </div>
    </div>
  );
}
