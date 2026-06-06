import { useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet, Navigate } from 'react-router-dom';
import { useGetMeQuery, useLogoutMutation } from '../store/api';
import { useAppSelector } from '../store/hooks';
import { hasStaffAccess } from '../lib/staff';
import { LanguageToggle } from './LanguageToggle';

export function StaffPortalLayout() {
  const { t } = useTranslation();
  const { data: meData, isLoading } = useGetMeQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const { sessionExpired, expiredPortal } = useAppSelector((s) => s.auth);
  const [logout] = useLogoutMutation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        {t('common.loading')}
      </div>
    );
  }

  if (!meData?.user || !hasStaffAccess(meData.user)) {
    const loginPath =
      sessionExpired && expiredPortal === 'staff'
        ? '/staff/login?session=expired'
        : '/staff/login';
    return <Navigate to={loginPath} replace />;
  }

  const user = meData.user;
  const canManageUsers = user.permissions?.includes('users:read');
  const canViewClients = user.permissions?.includes('offers:read');
  const canManageLocations =
    user.permissions?.includes('locations:read') || user.permissions?.includes('listings:write');

  const nav = [
    { to: '/staff', label: t('admin.dashboard'), end: true },
    { to: '/staff/listings', label: t('admin.listings') },
    { to: '/staff/offers', label: t('admin.offers') },
    ...(canViewClients ? [{ to: '/staff/clients', label: t('admin.clients'), end: false }] : []),
    ...(canManageLocations
      ? [
          { to: '/staff/locations', label: t('admin.locations'), end: false },
          { to: '/staff/property-types', label: t('admin.propertyTypesNav'), end: false },
        ]
      : []),
    ...(canManageUsers ? [{ to: '/staff/users', label: t('admin.users'), end: false }] : []),
  ];

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-slate-900 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {t('staff.portalLabel')}
            </div>
            <div className="text-lg font-semibold">{t('staff.portalTitle')}</div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <LanguageToggle variant="dark" />
            <span className="hidden text-slate-300 sm:inline">{user.name}</span>
            <Link to="/search" className="rounded-lg bg-slate-800 px-3 py-1.5 hover:bg-slate-700">
              {t('staff.viewPublicSite')}
            </Link>
            <button
              type="button"
              onClick={() => logout()}
              className="rounded-lg bg-slate-800 px-3 py-1.5 hover:bg-slate-700"
            >
              {t('nav.logout')}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:flex-row">
        <aside className="w-full shrink-0 md:w-56">
          <nav className="flex gap-2 overflow-x-auto rounded-xl bg-white p-2 shadow-sm md:flex-col">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-lg px-4 py-2 text-sm ${
                    isActive ? 'bg-brand text-white' : 'text-slate-700 hover:bg-slate-50'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
