import { useTranslation } from 'react-i18next';
import { useGetAdminClientsQuery } from '../../store/api';

export function AdminClientsPage() {
  const { t } = useTranslation();
  const { data: clients = [], isLoading } = useGetAdminClientsQuery();

  if (isLoading) return <p>{t('common.loading')}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('admin.clients')}</h1>
        <p className="mt-1 text-sm text-gray-600">{t('admin.clientsHelp')}</p>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="p-3">{t('auth.name')}</th>
              <th className="p-3">{t('auth.email')}</th>
              <th className="p-3">{t('auth.phone')}</th>
              <th className="p-3">{t('admin.registeredAt')}</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-gray-500">
                  {t('admin.noClients')}
                </td>
              </tr>
            ) : (
              clients.map((client) => (
                <tr key={client.id} className="border-b">
                  <td className="p-3">{client.name}</td>
                  <td className="p-3">{client.email}</td>
                  <td className="p-3">{client.phone ?? '—'}</td>
                  <td className="p-3">
                    {new Date(client.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
