import { useTranslation } from 'react-i18next';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useGetMeQuery, useLogoutMutation } from '../store/api';
import { LanguageToggle } from './LanguageToggle';

export function PublicLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const { data: meData } = useGetMeQuery(undefined, { refetchOnMountOrArgChange: true });
  const [logout] = useLogoutMutation();

  const tabs = [
    { to: '/search', label: t('nav.search'), match: (p: string) => p === '/search' || p.startsWith('/listings') },
    { to: '/account', label: t('nav.account'), match: (p: string) => p.startsWith('/account') || p.startsWith('/login') || p.startsWith('/my-offers') || p.startsWith('/register') },
  ];

  return (
    <div className="min-h-screen safe-bottom md:pb-0">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link to="/search" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
              PR
            </div>
            <div className="hidden sm:block">
              <div className="font-semibold text-brand">{t('appName')}</div>
              <div className="text-xs text-gray-500">{t('tagline')}</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-4 md:flex">
            <Link
              to="/search"
              className={`text-sm ${location.pathname.startsWith('/search') || location.pathname.startsWith('/listings') ? 'font-semibold text-brand' : 'text-gray-600'}`}
            >
              {t('nav.search')}
            </Link>
            {meData?.user && (
              <Link to="/my-offers" className="text-sm text-gray-600">
                {t('nav.myOffers')}
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageToggle />
            {meData?.user ? (
              <button
                type="button"
                onClick={() => logout()}
                className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm"
              >
                {t('nav.logout')}
              </button>
            ) : (
              <Link to="/login" className="rounded-lg bg-brand px-3 py-1.5 text-sm text-white">
                {t('nav.login')}
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-4">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white md:hidden">
        <div className="flex pb-[env(safe-area-inset-bottom)]">
          {tabs.map((tab) => {
            const active = tab.match(location.pathname);
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={`flex flex-1 flex-col items-center py-2 text-xs ${
                  active ? 'font-semibold text-brand' : 'text-gray-500'
                }`}
              >
                <span className="mb-0.5 text-lg">{tab.to === '/search' ? '🔍' : '👤'}</span>
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
