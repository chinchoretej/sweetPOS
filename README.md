# SweetPOS — Multi-Tenant Sweet Shop SaaS

A production-grade **multi-tenant SaaS PWA** for sweet / mithai shops, built on
React + Vite + Tailwind + Firebase, deployable to GitHub Pages.

> v2.0 upgrades the original single-tenant POS into a full SaaS platform with a
> Super Admin panel, per-shop subscriptions, plan-based feature flags and
> tenant-isolated Firestore rules — without breaking any existing flows.

---

## ✨ Core capabilities

### Platform Owner (Super Admin)
- Platform Dashboard (total shops, active subs, MRR estimate, recent activity)
- Shops CRUD (create, suspend, activate, archive, delete)
- Subscriptions table with status, plan, days remaining
- Plans editor (Free Trial / Basic / Premium / Enterprise) — features, limits, pricing
- Per-shop Feature Flag overrides (force ON / OFF / inherit plan)
- Activity Logs (audit trail across all tenants)
- Platform Analytics (signups over time, plan mix)
- One-click migration of legacy v1 flat collections into a shop subcollection

### Shop Owner
- Existing **Billing, Inventory, Customers, Orders, Reports, Settings** all
  preserved and now isolated to their tenant.
- Onboarding wizard to create their shop and pick a starter plan.
- **Employees** page — invite cashiers, managers, inventory staff with role-based access.
- Plan badge + days remaining banner in the sidebar.

### Employees
- Permission-aware UI (cashier sees only Billing, etc.)
- Invited by mobile; bound to a shop on first OTP login.

### PWA / UX
- Installable, offline-capable (Workbox + Firestore persistent cache)
- Dark mode, English + Marathi
- Skeletons, toasts, error boundary, optimistic updates
- Thermal & A4 PDF invoices, QR (UPI), WhatsApp share
- Keyboard shortcuts (Alt+1..9 nav, Alt+P for billing print, etc.)

---

## 🧱 Architecture

### Tenant model: subcollections under `shops/{shopId}/`

```
shops/{shopId}                 ← tenant root (status, ownerUid, ...)
shops/{shopId}/products/...
shops/{shopId}/customers/...
shops/{shopId}/orders/...
shops/{shopId}/inventory_logs/...
shops/{shopId}/employees/...
shops/{shopId}/settings/shop

users/{uid}                    ← role, shopId, status (global)
plans/{planId}                 ← built-in catalog (publicly readable)
subscriptions/{shopId}         ← status, planId, currentPeriodEnd
feature_flags/{shopId}         ← per-shop overrides
activity_logs/{logId}          ← audit trail
```

Subcollections give **strong implicit tenant isolation** in security rules
(no risk of forgetting a `where shopId == X` filter).

### Roles & permissions

```
super_admin > shop_owner > manager > inventory_staff > cashier
```

Defined in `src/permissions/roles.js` and `src/permissions/permissions.js` as a
declarative capability matrix. The `useTenant()` hook exposes
`can(perm)` and `hasFeature(key)`.

### Feature flags

Effective features for a shop:

```
features = DEFAULT_FEATURES ∪ plan.features ∪ feature_flags/{shopId}.features
```

Frontend hides menu items / pages, and the `<FeatureGuard>` component renders an
upgrade-prompt empty state for users who hit a disabled feature directly.

### Subscription gating

`<TenantGate>` wraps all tenant routes. It redirects to:
- `/onboarding` if a tenant user has no `shopId`
- `/subscription` if shop is suspended or the subscription is expired/cancelled
- `/admin` if a super-admin lands on a tenant URL

---

## 🚀 Quick start

```bash
npm install
cp .env.example .env             # then fill in Firebase keys + SUPER_ADMIN_EMAILS
npm run dev
```

Open <http://localhost:5173>.

### Required env vars

| Var | Purpose |
| --- | --- |
| `VITE_FIREBASE_*` | Firebase web app config |
| `VITE_SUPER_ADMIN_EMAILS` | Comma-separated emails auto-promoted to super admin |
| `VITE_ADMIN_EMAILS` | Legacy v1 admin emails → bootstrapped as `shop_owner` |
| `VITE_BASE_PATH` | Vite/Router base, e.g. `/sweetPOS/` for GH Pages |
| `VITE_DEV_ADMIN_PASSWORD` | DEV-only fallback for offline auth |

---

## 🔒 Firebase setup

1. Create a Firebase project (or reuse existing).
2. **Authentication** → enable **Phone** + **Email/Password**.
3. **Firestore** → create database (production mode).
4. **Storage** → enable.
5. Authorise your domain in Auth → Settings → Authorized domains.

Deploy rules + indexes:

```bash
firebase login
firebase use <your-project-id>
firebase deploy --only firestore:rules,firestore:indexes,storage
```

The included rules (`firebase/firestore.rules`, `firebase/storage.rules`) enforce:
- A user can only read/write under `shops/{shopId}` where their `users/{uid}.shopId` matches.
- Cashiers cannot delete products / orders / customers.
- Only super admins can write `plans` and `feature_flags`.
- Plans are publicly readable so onboarding works pre-auth.

### Bootstrapping the first super admin

1. Add your email to `VITE_SUPER_ADMIN_EMAILS` and redeploy (or run locally).
2. Visit `/login` → admin login form → enter your email + a password.
3. The auth service auto-creates the Firebase user **and** writes
   `users/{uid}` with `role: super_admin`.
4. You'll land on `/admin` (Super Admin panel).

---

## 🪪 Roles in detail

| Role | Permissions |
| --- | --- |
| `super_admin` | Everything platform-wide |
| `shop_owner` | All tenant data + employee management + settings |
| `manager` | All tenant data + inventory + reports + view settings (no employee mgmt) |
| `inventory_staff` | View products, manage inventory only |
| `cashier` | Billing + view products + view/manage customers |

---

## 🧬 Migrating from v1 (single-tenant)

If you have existing data under top-level `products`, `orders`, `customers`,
`inventory_logs`, `settings`:

1. Log in as **super admin**.
2. Open **Super Admin → Shops → (your shop) → Migration** card.
3. Click **Migrate v1 → this shop**.
4. The tool batches everything into `shops/{shopId}/...` and stamps `migratedAt`.
   It is idempotent — safe to re-run.

After verifying, you can delete the legacy top-level collections from the
Firebase console.

---

## 🧪 Test data

After onboarding your first shop, sample products can be seeded by calling
`seedSampleProducts(shopId)` from `src/utils/seedData.js` — you can wire a
button in Settings if useful.

---

## 📦 Project structure (v2)

```
src/
  app/                    # (reserved) future app-level providers
  components/
    common/ ErrorBoundary
    guards/ RoleGuard, PermissionGuard, FeatureGuard, TenantGate, SuperAdminGate
    layout/ AppLayout, AdminLayout, Sidebar, Topbar, ProtectedRoute
    pwa/    OfflineBanner, InstallPrompt
    ui/     Button, Input, Select, Modal, Card, Badge, Skeleton, Spinner, …
  constants/   routes, categories, plans, shortcuts
  context/     AuthContext, TenantContext, SettingsContext, ThemeContext, ToastContext, I18nContext
  hooks/       useDebounce, useLocalStorage, useKeyboardShortcuts, useOnlineStatus
  i18n/        en, mr
  pages/
    superadmin/ PlatformDashboard, Shops, ShopDetails, Plans,
                Subscriptions, FeatureFlags, ActivityLogs, PlatformAnalytics
    Login, Dashboard, Billing, Products, Inventory, Customers, Orders,
    OrderDetails, Reports, Settings, Employees, Onboarding, SubscriptionGate, NotFound
  permissions/ roles, permissions, features
  services/    firebase, paths, authService,
               productService, orderService, customerService, inventoryService, settingsService,
               shopService, planService, subscriptionService, featureFlagService,
               employeeService, activityLogService, migrationService
  store/       cartStore (Zustand)
  utils/       format, invoice, whatsapp, validators, seedData
  router.jsx
  App.jsx, main.jsx
firebase/
  firestore.rules
  storage.rules
  firestore.indexes.json
.github/workflows/deploy.yml
```

---

## 🚢 Deployment to GitHub Pages

A GitHub Actions workflow (`.github/workflows/deploy.yml`) auto-deploys on
every push to `main`. It injects Firebase + super-admin secrets at build time:

| Secret | Notes |
| --- | --- |
| `FIREBASE_API_KEY` | required |
| `FIREBASE_AUTH_DOMAIN` | required |
| `FIREBASE_PROJECT_ID` | required |
| `FIREBASE_STORAGE_BUCKET` | required |
| `FIREBASE_MESSAGING_SENDER_ID` | required |
| `FIREBASE_APP_ID` | required |
| `FIREBASE_MEASUREMENT_ID` | optional |
| `SUPER_ADMIN_EMAILS` | required for SaaS |
| `ADMIN_EMAILS` | optional legacy |

Set them in **Repo → Settings → Secrets and variables → Actions**.

Manual one-off:

```bash
npm run build
npm run deploy   # uses gh-pages package
```

---

## ✅ Production hardening checklist

- [ ] Set strict allow-list in `VITE_SUPER_ADMIN_EMAILS`.
- [ ] Deploy `firestore.rules` and `storage.rules` (do NOT use test mode).
- [ ] Enable App Check (reCAPTCHA Enterprise) for Auth + Firestore in prod.
- [ ] Add Cloud Functions to:
  - cascade-delete `shops/{id}/**` on shop archive
  - send invite SMS / email when a shop owner adds an employee
  - run nightly job to expire trials and flip subscription status
- [ ] Configure Firestore backups (daily export to GCS).
- [ ] Add Stripe / Razorpay webhooks → update `subscriptions/{shopId}`.
- [ ] Add monitoring: Sentry for client errors, Firebase Performance.
- [ ] Custom domain via Firebase Hosting or GitHub Pages CNAME.
- [ ] Configure CORS on Storage if you embed images on a third-party site.

---

## 📈 SaaS scaling recommendations

- **Indexing**: as orders grow, switch reports to per-month rollup docs in
  `shops/{id}/stats/{YYYY-MM}` written by Cloud Functions.
- **Reads**: paginate the Orders / Customers tables (Firestore `startAfter`).
- **Bundling**: Super Admin pages are lazy-loaded; consider lazy-loading the
  Reports page (which pulls in chart.js) for cashier-only roles.
- **Cold-start auth**: cache `users/{uid}` in localStorage and hydrate before
  Firebase Auth resolves to avoid the spinner flash.
- **Multi-region**: switch Firestore to multi-region if going beyond 10k shops.

---

## 📜 License

MIT © Tej Chinchore
