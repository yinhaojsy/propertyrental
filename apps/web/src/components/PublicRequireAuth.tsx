import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetMeQuery } from '../store/api';
import { useAppSelector } from '../store/hooks';

export function PublicRequireAuth({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { data: meData, isLoading } = useGetMeQuery(undefined, { refetchOnMountOrArgChange: true });
  const { sessionExpired, expiredPortal } = useAppSelector((s) => s.auth);

  if (isLoading) {
    return <p className="text-center text-gray-600">{t('common.loading')}</p>;
  }

  if (!meData?.user) {
    const to =
      sessionExpired && expiredPortal === 'public' ? '/login?session=expired' : '/login';
    return <Navigate to={to} replace />;
  }

  return <>{children}</>;
}
