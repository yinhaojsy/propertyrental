import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useGetAdminDashboardQuery } from '../../store/api';

export function AdminDashboard() {
  const { t } = useTranslation();
  const { data, isLoading } = useGetAdminDashboardQuery();

  if (isLoading) return <p>{t('common.loading')}</p>;

  const stats = (data as { stats: Array<{ status: string; count: number }> })?.stats ?? [];
  const chartData = stats.map((s) => ({
    name: t(`admin.${s.status}`),
    count: Number(s.count),
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{t('admin.dashboard')}</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.status} className="rounded-xl bg-white p-4 shadow-sm">
            <div className="text-sm text-gray-500">{t(`admin.${s.status}`)}</div>
            <div className="text-3xl font-bold text-brand">{s.count}</div>
          </div>
        ))}
      </div>
      {chartData.length > 0 && (
        <div className="mt-8 h-64 rounded-xl bg-white p-4 shadow-sm">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#0f766e" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
