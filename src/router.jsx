import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import TenantGate from './components/guards/TenantGate';
import SuperAdminGate from './components/guards/SuperAdminGate';
import FeatureGuard from './components/guards/FeatureGuard';
import PermissionGuard from './components/guards/PermissionGuard';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Billing from './pages/Billing';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import Customers from './pages/Customers';
import Orders from './pages/Orders';
import OrderDetails from './pages/OrderDetails';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Employees from './pages/Employees';
import Onboarding from './pages/Onboarding';
import SubscriptionGate from './pages/SubscriptionGate';
import NotFound from './pages/NotFound';
import { FullScreenSpinner } from './components/ui/Spinner';
import { ROUTES } from './constants/routes';
import { FEATURES } from './permissions/features';
import { PERMS } from './permissions/permissions';

// Super Admin: lazy-loaded so tenant users never download the bundle.
const AdminLayout = lazy(() => import('./components/layout/AdminLayout'));
const PlatformDashboard = lazy(() => import('./pages/superadmin/PlatformDashboard'));
const Shops = lazy(() => import('./pages/superadmin/Shops'));
const ShopDetails = lazy(() => import('./pages/superadmin/ShopDetails'));
const Plans = lazy(() => import('./pages/superadmin/Plans'));
const Subscriptions = lazy(() => import('./pages/superadmin/Subscriptions'));
const FeatureFlags = lazy(() => import('./pages/superadmin/FeatureFlags'));
const ActivityLogs = lazy(() => import('./pages/superadmin/ActivityLogs'));
const PlatformAnalytics = lazy(() => import('./pages/superadmin/PlatformAnalytics'));

export default function AppRouter() {
  return (
    <Suspense fallback={<FullScreenSpinner />}>
      <Routes>
        {/* public */}
        <Route path={ROUTES.LOGIN} element={<Login />} />

        {/* lifecycle (auth required, but no tenant required) */}
        <Route
          path={ROUTES.ONBOARDING}
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.SUBSCRIPTION_GATE}
          element={
            <ProtectedRoute>
              <SubscriptionGate />
            </ProtectedRoute>
          }
        />

        {/* super-admin */}
        <Route
          path="/admin"
          element={
            <SuperAdminGate>
              <AdminLayout />
            </SuperAdminGate>
          }
        >
          <Route index element={<PlatformDashboard />} />
          <Route path="shops" element={<Shops />} />
          <Route path="shops/:id" element={<ShopDetails />} />
          <Route path="plans" element={<Plans />} />
          <Route path="subscriptions" element={<Subscriptions />} />
          <Route path="feature-flags" element={<FeatureFlags />} />
          <Route path="activity" element={<ActivityLogs />} />
          <Route path="analytics" element={<PlatformAnalytics />} />
        </Route>

        {/* tenant */}
        <Route
          element={
            <ProtectedRoute>
              <TenantGate>
                <AppLayout />
              </TenantGate>
            </ProtectedRoute>
          }
        >
          <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
          <Route
            path={ROUTES.BILLING}
            element={
              <FeatureGuard feature={FEATURES.BILLING}>
                <PermissionGuard perm={PERMS.BILLING_CREATE}>
                  <Billing />
                </PermissionGuard>
              </FeatureGuard>
            }
          />
          <Route
            path={ROUTES.PRODUCTS}
            element={
              <PermissionGuard perm={PERMS.PRODUCT_VIEW}>
                <Products />
              </PermissionGuard>
            }
          />
          <Route
            path={ROUTES.INVENTORY}
            element={
              <FeatureGuard feature={FEATURES.INVENTORY}>
                <PermissionGuard perm={PERMS.INVENTORY_VIEW}>
                  <Inventory />
                </PermissionGuard>
              </FeatureGuard>
            }
          />
          <Route
            path={ROUTES.CUSTOMERS}
            element={
              <PermissionGuard perm={PERMS.CUSTOMER_VIEW}>
                <Customers />
              </PermissionGuard>
            }
          />
          <Route
            path={ROUTES.ORDERS}
            element={
              <PermissionGuard perm={PERMS.ORDER_VIEW}>
                <Orders />
              </PermissionGuard>
            }
          />
          <Route
            path={ROUTES.ORDER_DETAILS}
            element={
              <PermissionGuard perm={PERMS.ORDER_VIEW}>
                <OrderDetails />
              </PermissionGuard>
            }
          />
          <Route
            path={ROUTES.REPORTS}
            element={
              <FeatureGuard feature={FEATURES.REPORTS}>
                <PermissionGuard perm={PERMS.REPORT_VIEW}>
                  <Reports />
                </PermissionGuard>
              </FeatureGuard>
            }
          />
          <Route
            path={ROUTES.EMPLOYEES}
            element={
              <FeatureGuard feature={FEATURES.EMPLOYEES}>
                <PermissionGuard perm={PERMS.EMPLOYEE_VIEW}>
                  <Employees />
                </PermissionGuard>
              </FeatureGuard>
            }
          />
          <Route
            path={ROUTES.SETTINGS}
            element={
              <PermissionGuard perm={PERMS.SETTINGS_VIEW}>
                <Settings />
              </PermissionGuard>
            }
          />
        </Route>

        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Suspense>
  );
}
