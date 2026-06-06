import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLoginMutation, useRegisterMutation, useGetMeQuery, useGetMyOffersQuery, useLogoutMutation } from '../store/api';
import { initCsrf } from '../lib/api';
import { hasStaffAccess } from '../lib/staff';
import { useAppDispatch } from '../store/hooks';
import { resetSessionNotice } from '../store/authSlice';

export function LoginPage() {
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
      if (hasStaffAccess(result.user)) {
        await logout().unwrap();
        setError(t('auth.staffUseStaffPortal'));
        return;
      }
      navigate('/');
    } catch {
      setError(t('staff.invalidCredentials'));
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-2xl font-bold">{t('auth.loginTitle')}</h1>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
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
            {t('auth.sessionExpiredPublic')}
          </p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-xl bg-brand py-3 font-semibold text-white"
        >
          {t('auth.submitLogin')}
        </button>
        <p className="text-center text-sm">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="text-brand">
            {t('nav.register')}
          </Link>
        </p>
      </form>
    </div>
  );
}

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [register, { isLoading }] = useRegisterMutation();
  const [form, setForm] = useState({ email: '', password: '', name: '', phone: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await initCsrf();
    await register(form).unwrap();
    navigate('/');
  };

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-2xl font-bold">{t('auth.registerTitle')}</h1>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
        {(['name', 'email', 'phone', 'password'] as const).map((field) => (
          <label key={field} className="block">
            <span className="text-sm font-medium">{t(`auth.${field}`)}</span>
            <input
              type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
              required={field !== 'phone'}
              value={form[field]}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </label>
        ))}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-xl bg-brand py-3 font-semibold text-white"
        >
          {t('auth.submitRegister')}
        </button>
        <p className="text-center text-sm">
          {t('auth.hasAccount')}{' '}
          <Link to="/login" className="text-brand">
            {t('nav.login')}
          </Link>
        </p>
      </form>
    </div>
  );
}

export function AccountPage() {
  const { t } = useTranslation();
  const { data: meData } = useGetMeQuery();
  if (!meData?.user) return null;

  return (
    <div className="mx-auto max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-sm">
      <h1 className="text-xl font-bold">{meData.user.name}</h1>
      <p className="text-gray-600">{meData.user.email}</p>
      <Link to="/my-offers" className="block rounded-lg bg-gray-100 px-4 py-3">
        {t('nav.myOffers')}
      </Link>
    </div>
  );
}

export function MyOffersPage() {
  const { t } = useTranslation();
  const { data: offers, isLoading } = useGetMyOffersQuery();

  if (isLoading) return <p>{t('common.loading')}</p>;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t('nav.myOffers')}</h1>
      <div className="space-y-3">
        {(offers as Array<{ id: number; offeredRent: number | null; listing: { titleEn: string; slug: string } }>)?.map(
          (offer) => (
            <div key={offer.id} className="rounded-xl bg-white p-4 shadow-sm">
              <Link to={`/listings/${offer.listing.slug}`} className="font-medium text-brand">
                {offer.listing.titleEn}
              </Link>
              {offer.offeredRent && (
                <p className="text-sm text-gray-600">PKR {offer.offeredRent.toLocaleString()}</p>
              )}
            </div>
          ),
        )}
      </div>
    </div>
  );
}
