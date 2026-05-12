import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { subscribeAuth, logoutUser } from '../services/authService';
import { ROLES, isPlatformRole } from '../permissions/roles';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeAuth((u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub && unsub();
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      isSuperAdmin: user?.role === ROLES.SUPER_ADMIN,
      isShopOwner: user?.role === ROLES.SHOP_OWNER,
      isPlatformUser: isPlatformRole(user?.role),
      logout: async () => {
        await logoutUser();
        setUser(null);
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
