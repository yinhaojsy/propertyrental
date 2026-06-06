import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ROLES } from '@property-rental/shared';
import { useGetAdminUsersQuery, useCreateUserMutation } from '../../store/api';

export function AdminUsersPage() {
  const { t } = useTranslation();
  const { data: users, isLoading } = useGetAdminUsersQuery();
  const [createUser] = useCreateUserMutation();
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    role: 'lister' as (typeof ROLES)[number],
    phone: '',
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createUser(form).unwrap();
    setForm({ email: '', password: '', name: '', role: 'lister', phone: '' });
  };

  if (isLoading) return <p>{t('common.loading')}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('admin.staffUsers')}</h1>
        <p className="mt-1 text-sm text-gray-600">{t('admin.staffUsersHelp')}</p>
      </div>

      <form onSubmit={handleCreate} className="grid gap-3 rounded-xl bg-white p-5 shadow-sm md:grid-cols-2">
        <h2 className="md:col-span-2 font-semibold">{t('admin.createUser')}</h2>
        <input
          placeholder={t('auth.email')}
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="rounded-lg border px-3 py-2"
          required
        />
        <input
          placeholder={t('auth.password')}
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="rounded-lg border px-3 py-2"
          required
        />
        <input
          placeholder={t('auth.name')}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="rounded-lg border px-3 py-2"
          required
        />
        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value as typeof form.role })}
          className="rounded-lg border px-3 py-2"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-white md:col-span-2">
          {t('admin.createUser')}
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="p-3">{t('auth.name')}</th>
              <th className="p-3">{t('auth.email')}</th>
              <th className="p-3">{t('admin.role')}</th>
            </tr>
          </thead>
          <tbody>
            {(users as Array<{ id: number; name: string; email: string; roles: string[] }>)?.map(
              (user) => (
                <tr key={user.id} className="border-b">
                  <td className="p-3">{user.name}</td>
                  <td className="p-3">{user.email}</td>
                  <td className="p-3">{user.roles.join(', ') || '—'}</td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
