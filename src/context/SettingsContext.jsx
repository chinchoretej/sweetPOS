import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_SETTINGS, saveSettings, subscribeSettings } from '../services/settingsService';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = subscribeSettings((s) => {
      setSettings(s);
      setReady(true);
    });
    return () => unsub && unsub();
  }, []);

  const value = useMemo(
    () => ({
      settings,
      ready,
      update: async (patch) => {
        const next = { ...settings, ...patch };
        setSettings(next);
        await saveSettings(next);
      },
    }),
    [settings, ready]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
};
