import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Candy, Smartphone, Lock, Mail, ShieldCheck } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ROUTES } from '../constants/routes';
import {
  setupRecaptcha,
  sendOtp,
  verifyOtp,
  adminLogin,
} from '../services/authService';
import { isFirebaseConfigured } from '../services/firebase';
import { isValidIndianMobile } from '../utils/validators';

export default function Login() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [tab, setTab] = useState('mobile');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured) setTab('admin');
  }, []);

  if (!loading && user) {
    const from = location.state?.from?.pathname || ROUTES.DASHBOARD;
    return <Navigate to={from} replace />;
  }

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!isValidIndianMobile(mobile)) {
      toast.error('Enter a valid 10-digit mobile number');
      return;
    }
    if (!isFirebaseConfigured) {
      toast.error('Firebase is not configured. Use Admin login or set env vars.');
      return;
    }
    setOtpLoading(true);
    try {
      const verifier = setupRecaptcha('recaptcha-container');
      const c = await sendOtp(mobile, verifier);
      setConfirmation(c);
      toast.success('OTP sent successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to send OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!confirmation) return;
    setVerifyLoading(true);
    try {
      await verifyOtp(confirmation, otp);
      toast.success('Login successful');
      navigate(ROUTES.DASHBOARD, { replace: true });
    } catch (err) {
      toast.error(err.message || 'Invalid OTP');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAdminLoading(true);
    try {
      await adminLogin(email, password);
      toast.success('Welcome back, admin!');
      navigate(ROUTES.DASHBOARD, { replace: true });
    } catch (err) {
      toast.error(err.message || 'Admin login failed');
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-sweet-cream dark:bg-slate-950">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-brand-500 via-brand-600 to-amber-500 text-white">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/20 grid place-items-center">
            <Candy className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-display font-extrabold leading-none">SweetPOS</p>
            <p className="text-sm text-white/80 mt-1">Sweet Shop POS & Inventory</p>
          </div>
        </div>
        <div className="space-y-5">
          <h2 className="text-4xl font-display font-extrabold leading-tight max-w-md">
            Bill faster.<br />Track every gram.<br />Grow your mithai shop.
          </h2>
          <ul className="space-y-3 text-white/90 text-sm">
            <li className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Secure Firebase backend
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Works offline as a PWA
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Mobile + thermal printer ready
            </li>
          </ul>
        </div>
        <p className="text-xs text-white/70">© {new Date().getFullYear()} SweetPOS</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-amber-400 grid place-items-center text-white">
              <Candy className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-display font-extrabold leading-none">SweetPOS</p>
              <p className="text-xs text-slate-500 mt-1">Sweet Shop POS & Inventory</p>
            </div>
          </div>

          <div className="card p-6 sm:p-8">
            <h1 className="text-2xl font-display font-bold">Sign in</h1>
            <p className="text-sm text-slate-500 mt-1">
              Welcome back. Choose how you want to sign in.
            </p>

            <div className="mt-5 grid grid-cols-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
              <button
                className={`py-2 text-sm font-semibold rounded-lg transition ${
                  tab === 'mobile'
                    ? 'bg-white dark:bg-slate-900 shadow-soft text-brand-600'
                    : 'text-slate-500'
                }`}
                onClick={() => setTab('mobile')}
              >
                Mobile OTP
              </button>
              <button
                className={`py-2 text-sm font-semibold rounded-lg transition ${
                  tab === 'admin'
                    ? 'bg-white dark:bg-slate-900 shadow-soft text-brand-600'
                    : 'text-slate-500'
                }`}
                onClick={() => setTab('admin')}
              >
                Admin
              </button>
            </div>

            {tab === 'mobile' ? (
              <div className="mt-6 space-y-4">
                {!confirmation ? (
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <Input
                      label="Mobile Number"
                      placeholder="9876543210"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      leftIcon={<Smartphone className="w-4 h-4" />}
                      maxLength={10}
                      inputMode="numeric"
                      required
                    />
                    <Button type="submit" className="w-full" loading={otpLoading}>
                      Send OTP
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <Input
                      label="Enter OTP"
                      placeholder="6-digit code"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      leftIcon={<Lock className="w-4 h-4" />}
                      maxLength={6}
                      inputMode="numeric"
                      required
                    />
                    <Button type="submit" className="w-full" loading={verifyLoading}>
                      Verify & Sign in
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmation(null);
                        setOtp('');
                      }}
                      className="text-xs text-brand-600 hover:underline w-full text-center"
                    >
                      Change number
                    </button>
                  </form>
                )}
                <div id="recaptcha-container" />
                <p className="text-[11px] text-slate-500 text-center">
                  By continuing you agree to receive SMS messages from Firebase.
                </p>
              </div>
            ) : (
              <form onSubmit={handleAdminLogin} className="mt-6 space-y-4">
                <Input
                  label="Admin Email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftIcon={<Mail className="w-4 h-4" />}
                  required
                />
                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<Lock className="w-4 h-4" />}
                  required
                  minLength={6}
                />
                <Button type="submit" className="w-full" loading={adminLoading}>
                  Sign in as Admin
                </Button>
                {!isFirebaseConfigured && (
                  <p className="text-[11px] text-amber-600 text-center">
                    Dev mode: use the email from VITE_ADMIN_EMAILS and password from
                    VITE_DEV_ADMIN_PASSWORD.
                  </p>
                )}
              </form>
            )}
          </div>

          <p className="text-xs text-slate-500 text-center mt-4">
            Need help? Configure Firebase in your <code>.env</code> file.
          </p>
        </div>
      </div>
    </div>
  );
}
