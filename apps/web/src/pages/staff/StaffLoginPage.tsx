import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLoginMutation, useLogoutMutation } from '../../store/api';
import { initCsrf } from '../../lib/api';
import { hasStaffAccess } from '../../lib/staff';
import { LanguageToggle } from '../../components/LanguageToggle';
import { useAppDispatch } from '../../store/hooks';
import { resetSessionNotice } from '../../store/authSlice';

export function StaffLoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const sessionExpired = searchParams.get('session') === 'expired';
  const [login, { isLoading }] = useLoginMutation();
  const [logout] = useLogoutMutation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionExpired) {
      dispatch(resetSessionNotice());
    }
  }, [sessionExpired, dispatch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await initCsrf();
      const result = await login(form).unwrap();
      if (!hasStaffAccess(result.user)) {
        await logout().unwrap();
        setError(t('staff.accessDenied'));
        return;
      }
      navigate('/staff', { replace: true });
    } catch {
      setError(t('staff.invalidCredentials'));
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <div className="absolute right-4 top-4">
        <LanguageToggle variant="dark" />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center text-white">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {t('staff.portalLabel')}
          </div>
          <h1 className="mt-2 text-2xl font-bold">{t('staff.loginTitle')}</h1>
          <p className="mt-2 text-sm text-slate-400">{t('staff.loginSubtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-6 shadow-xl">
          <label className="block">
            <span className="text-sm font-medium">{t('auth.email')}</span>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">{t('auth.password')}</span>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </label>
          {sessionExpired && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {t('auth.sessionExpiredStaff')}
            </p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-brand py-3 font-semibold text-white disabled:opacity-50"
          >
            {t('staff.submitLogin')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          <Link to="/search" className="text-slate-300 underline hover:text-white">
            {t('staff.backToPublicSite')}
          </Link>
        </p>
      </div>
    </div>
  );
}
