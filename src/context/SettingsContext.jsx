import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_SETTINGS, saveSettings, subscribeSettings } from '../services/settingsService';
import { useTenant } from './TenantContext';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const { shopId } = useTenant();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!shopId) {
      setSettings(DEFAULT_SETTINGS);
      setReady(true);
      return;
    }
    const unsub = subscribeSettings(shopId, (s) => {
      setSettings(s);
      setReady(true);
    });
    return () => unsub && unsub();
  }, [shopId]);

  const value = useMemo(
    () => ({
      settings,
      ready,
      update: async (patch) => {
        const next = { ...settings, ...patch };
        setSettings(next);
        await saveSettings(shopId, next);
      },
    }),
    [settings, ready, shopId]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
};
