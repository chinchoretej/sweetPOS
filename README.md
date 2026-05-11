# SweetPOS — Sweet Shop Billing & Inventory PWA

A production-ready Sweet Shop POS built with **React + Vite**, **Tailwind CSS**, **Firebase** (Auth, Firestore, Storage) and **Zustand**. Installs as a PWA, works offline, prints A4 + thermal invoices, supports Marathi + English, and deploys to GitHub Pages.

---

## ✨ Features

- 🔐 **Authentication** — Mobile OTP (Firebase Phone Auth) + Admin email/password
- 📊 **Dashboard** — Today + monthly sales, low-stock alerts, recent bills, top sweets
- 🛒 **Billing / POS** — Instant search, cart, kg/g/pcs, discount (flat/%), optional GST, cash/UPI/card, invoice number
- 📦 **Products** — CRUD with image upload (Firebase Storage), categories, low-stock thresholds, barcode field
- 📈 **Inventory** — Real-time stock, atomic deduction at billing, restock, adjustments, full inventory log + daily report
- 👥 **Customers** — Auto-created from billing mobile, full purchase history, total spent
- 🧾 **Orders** — Searchable list with date/payment filters; reprintable invoices, PDF export
- 📊 **Reports** — Sales over time (line), top products (bar), payment mix (doughnut), CSV export
- ⚙️ **Settings** — Shop info, currency, GST, language (EN/MR), thermal vs A4 printer, dark mode
- 📱 **PWA** — Installable, offline (Firestore persistent cache + Workbox), service worker, manifest, install prompt
- 🖨️ **Print-ready** — A4 invoice + 58/80mm thermal layout, QR (UPI) on receipt
- 💬 **WhatsApp share** — Send formatted bill to the customer's number in one tap
- ⌨️ **Keyboard shortcuts** — Alt+N (search), Alt+C (customer), Alt+P (pay), Alt+R (reset)
- 🌗 **Dark mode** + smooth animations + skeletons + toasts + error boundary

---

## 🧱 Tech Stack

| Layer | Tech |
| --- | --- |
| Framework | React 18 + Vite |
| Styling | Tailwind CSS, Lucide icons |
| State | Zustand (cart) + Context API (auth, theme, i18n, settings, toast) |
| Backend | Firebase Auth, Firestore, Storage |
| Charts | Chart.js + react-chartjs-2 |
| PDF / QR | jsPDF + jspdf-autotable + qrcode |
| PWA | vite-plugin-pwa (Workbox) |
| Deploy | GitHub Pages via `gh-pages` |

---

## 📁 Project Structure

```
sweetPOS/
├── public/                 # static assets, manifest icons, GH-Pages 404 fallback
├── src/
│   ├── components/         # ui/, layout/, billing/, products/, common/, pwa/
│   ├── context/            # AuthContext, ThemeContext, SettingsContext, ToastContext, I18nContext
│   ├── hooks/              # useDebounce, useKeyboardShortcuts, useLocalStorage, useOnlineStatus
│   ├── i18n/               # en.js, mr.js
│   ├── pages/              # Login, Dashboard, Billing, Products, Inventory, Customers, Orders, OrderDetails, Reports, Settings, NotFound
│   ├── services/           # firebase.js, authService, productService, inventoryService, orderService, customerService, settingsService
│   ├── store/              # cartStore.js (Zustand)
│   ├── utils/              # format.js, invoice.js, whatsapp.js, validators.js, seedData.js
│   ├── constants/          # routes.js, categories.js, shortcuts.js
│   ├── styles/index.css
│   ├── App.jsx, main.jsx, router.jsx
├── firebase/               # firestore.rules, storage.rules, firestore.indexes.json, firebase.json
├── .env.example
├── vite.config.js / tailwind.config.js / postcss.config.js
└── package.json
```

---

## 🚀 Quick Start (Local)

```bash
# 1. Install
npm install

# 2. Copy env template and fill in your Firebase keys
cp .env.example .env

# 3. Run dev server
npm run dev          # http://localhost:5173
```

If you don't configure Firebase yet, you can still log in via the **Admin** tab using the email from `VITE_ADMIN_EMAILS` and `VITE_DEV_ADMIN_PASSWORD` (offline dev mode — data won't persist across sessions).

---

## 🔥 Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com).
2. **Enable services**:
   - **Authentication** → Sign-in methods → enable **Phone** and **Email/Password**.
     - For Phone Auth on `localhost`, add `localhost` to **Authorized domains**.
     - Add your GitHub Pages URL (e.g. `your-username.github.io`) to authorized domains for production.
   - **Firestore Database** → create in production mode.
   - **Storage** → create with default bucket.
3. **Add a Web App** (Project settings → Your apps → Web). Copy the config into your `.env`:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
VITE_ADMIN_EMAILS=admin@example.com
VITE_BASE_PATH=/sweetPOS/
```

4. **Deploy security rules + indexes** (optional but recommended):

```bash
npm install -g firebase-tools
firebase login
cd firebase
firebase use --add        # pick your project
firebase deploy --only firestore:rules,firestore:indexes,storage
```

5. **Bootstrap an admin** — log in once via the **Admin** tab using an email listed in `VITE_ADMIN_EMAILS`. Their `users/{uid}` document is auto-created with `role: "admin"`.

6. **Seed sample data** — Settings page → "Seed sample products" (or it auto-prompts on the empty Dashboard).

---

## 🌐 Deploying to GitHub Pages

1. Push the repo to GitHub. Update `homepage` in `package.json` to `https://<your-username>.github.io/<repo>/`.

2. Set `VITE_BASE_PATH` in `.env.production` (or in your CI env) to `/<repo>/` — must end with `/`.

3. Build & deploy:

```bash
npm run deploy        # runs vite build then publishes /dist via gh-pages
```

4. In your repo on GitHub: **Settings → Pages → Source = Deploy from a branch → `gh-pages` / root**.

5. **SPA routing** is handled by `public/404.html` + the redirect logic in `src/main.jsx` (preserves deep links).

6. Add your Pages URL to Firebase **Auth → Authorized domains** so Phone Auth works in production.

> ⚠️ Firebase **Phone Auth** requires HTTPS. GitHub Pages serves HTTPS by default — perfect.

---

## 🧪 Test Data Examples

After seeding, you'll have these sweets ready to bill:

| Sweet | Category | Price (₹/unit) | Stock |
| --- | --- | --- | --- |
| Kaju Katli | Dry Fruit Sweets | 950/kg | 5 kg |
| Motichoor Laddoo | Festival Specials | 480/kg | 8 kg |
| Rasgulla | Bengali Sweets | 420/pcs | 60 |
| Gulab Jamun | Bengali Sweets | 360/pcs | 80 |
| Soan Papdi | Festival Specials | 420/kg | 12 kg |
| Sugar-Free Anjeer Roll | Sugar-Free | 1200/kg | 3 kg |
| Besan Laddoo | Milk Sweets | 420/kg | 7 kg |
| Kaju Roll | Dry Fruit Sweets | 1100/kg | 4 kg |
| Mixture Namkeen | Namkeen | 320/kg | 15 kg |

**Sample admin login** (if env defaults are kept):
- Email: `admin@example.com`
- Password: `admin123`

**Sample test bill flow**:
1. Open **Billing** → search "kaju" → tap **Kaju Katli** twice (adds 0.5 kg)
2. Enter customer mobile `9876543210`, name `Test Customer`
3. Apply 5% discount (toggle the `₹/%` button)
4. Hit **Collect Payment (Alt+P)** → choose **UPI** → **Confirm**
5. Print, download PDF, or share on WhatsApp

---

## 📜 Available Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Lint with ESLint |
| `npm run deploy` | Build + publish `dist/` to `gh-pages` branch |

---

## ⌨️ Keyboard Shortcuts (Billing)

| Combo | Action |
| --- | --- |
| `Alt + N` | Focus product search |
| `Alt + C` | Focus customer mobile |
| `Alt + P` | Open payment dialog |
| `Alt + R` | Reset cart |
| `Esc` | Close any open dialog |

---

## 🗂️ Firestore Collections

| Collection | Doc ID | Purpose |
| --- | --- | --- |
| `users` | `uid` | Role (admin / cashier), profile |
| `products` | auto | Sweets catalog with stock & images |
| `customers` | mobile (10-digit) | Customer profile, totalSpent, orderCount |
| `orders` | auto | Invoice + items + totals + payment |
| `inventory_logs` | auto | Stock movements (sale/restock/adjustment) |
| `settings` | `shop` | Shop info, GST, currency, printer |

---

## 🛡️ Security Rules

See `firebase/firestore.rules` & `firebase/storage.rules`. Highlights:
- All reads require an authenticated user
- **Cashiers** can create orders, customers, inventory logs
- **Admins** can manage products, settings, edit/delete orders
- Storage product images are public-read (so receipts render), admin-write with 2 MB / image-only validation

Role is bootstrapped automatically when an email in `VITE_ADMIN_EMAILS` signs in.

---

## 🧭 Roadmap Ideas

- Cloud Functions for monthly summary reports
- Excel export
- Multi-shop support
- Loyalty / coupons module
- Hardware barcode scanner test bench
- Cypress e2e tests

---

## 📝 License

MIT — use freely for your shop, school project, or product.
