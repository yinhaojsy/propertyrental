import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Permission } from '@property-rental/shared';
import { useGetMeQuery } from '../store/api';
import { userHasPermission } from '../lib/permissions';

interface PermissionGateProps {
  permission: Permission | Permission[];
  children: React.ReactNode;
  redirectTo?: string;
}

export function PermissionGate({
  permission,
  children,
  redirectTo = '/staff',
}: PermissionGateProps) {
  const { t } = useTranslation();
  const { data: meData, isLoading } = useGetMeQuery();
  const needed = Array.isArray(permission) ? permission : [permission];

  if (isLoading) {
    return <p>{t('common.loading')}</p>;
  }

  if (!userHasPermission(meData?.user?.permissions, ...needed)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
