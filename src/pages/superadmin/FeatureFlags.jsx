import { useEffect, useMemo, useState } from 'react';
import { Save, Search, ToggleRight } from 'lucide-react';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { CardSkeleton } from '../../components/ui/Skeleton';
import { subscribeAllShops } from '../../services/shopService';
import {
  fetchFeatureFlags,
  setFeatureFlags,
} from '../../services/featureFlagService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { FEATURE_LABEL } from '../../permissions/features';
import useDebounce from '../../hooks/useDebounce';

export default function FeatureFlags() {
  const { user } = useAuth();
  const toast = useToast();

  const [shops, setShops] = useState([]);
  const [activeShop, setActiveShop] = useState(null);
  const [overrides, setOverrides] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 200);

  useEffect(() => {
    const u = subscribeAllShops((s) => {
      setShops(s);
      setLoading(false);
    });
    return () => u && u();
  }, []);

  useEffect(() => {
    if (!activeShop) {
      setOverrides({});
      return;
    }
    fetchFeatureFlags(activeShop.id).then((d) => setOverrides(d?.features || {}));
  }, [activeShop]);

  const filtered = useMemo(() => {
    const term = debounced.trim().toLowerCase();
    if (!term) return shops;
    return shops.filter((s) => s.name?.toLowerCase().includes(term));
  }, [shops, debounced]);

  const save = async () => {
    if (!activeShop) return;
    setSaving(true);
    try {
      await setFeatureFlags(activeShop.id, overrides, user?.uid);
      toast.success(`Flags saved for ${activeShop.name}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-display font-bold">Feature Flags</h2>
        <p className="text-sm text-slate-500">
          Per-shop overrides. These take precedence over the shop&apos;s plan features.
        </p>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-4">
        <div className="card p-3 space-y-2">
          <Input
            leftIcon={<Search className="w-4 h-4" />}
            placeholder="Search shops…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="max-h-[480px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <CardSkeleton />
            ) : filtered.length === 0 ? (
              <EmptyState title="No shops" />
            ) : (
              filtered.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveShop(s)}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between text-sm ${
                    activeShop?.id === s.id ? 'bg-brand-50 dark:bg-brand-500/10 font-semibold' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="truncate">{s.name}</span>
                  <Badge tone="default">{s.status}</Badge>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="card p-4 space-y-3">
          {!activeShop ? (
            <EmptyState
              icon={<ToggleRight className="w-10 h-10" />}
              title="Pick a shop to manage its feature flags"
            />
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{activeShop.name}</h3>
                  <p className="text-xs text-slate-500">
                    Plan baseline applies; toggles below override for this shop only.
                  </p>
                </div>
                <Button onClick={save} loading={saving} icon={<Save className="w-4 h-4" />}>
                  Save Overrides
                </Button>
              </div>

              <div className="grid sm:grid-cols-2 gap-2">
                {Object.entries(FEATURE_LABEL).map(([key, label]) => {
                  const isOverridden = overrides[key] !== undefined;
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium">{label}</p>
                        <p className="text-[11px] text-slate-500">{key}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isOverridden && <Badge tone="warning">override</Badge>}
                        <select
                          className="text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-transparent"
                          value={overrides[key] === undefined ? 'inherit' : overrides[key] ? 'on' : 'off'}
                          onChange={(e) => {
                            const v = e.target.value;
                            const next = { ...overrides };
                            if (v === 'inherit') delete next[key];
                            else next[key] = v === 'on';
                            setOverrides(next);
                          }}
                        >
                          <option value="inherit">Inherit plan</option>
                          <option value="on">Force ON</option>
                          <option value="off">Force OFF</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
