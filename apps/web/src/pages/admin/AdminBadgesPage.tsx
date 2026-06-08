import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useGetAdminBadgesQuery,
  useCreateListingBadgeMutation,
  useUpdateListingBadgeMutation,
  useDeleteListingBadgeMutation,
  type ListingBadge,
} from '../../store/api';
import { labelFor } from '../../lib/labels';

export function AdminBadgesPage() {
  const { t, i18n } = useTranslation();
  const { data: badges = [], isLoading } = useGetAdminBadgesQuery();
  const [createBadge] = useCreateListingBadgeMutation();
  const [updateBadge] = useUpdateListingBadgeMutation();
  const [deleteBadge] = useDeleteListingBadgeMutation();

  const [form, setForm] = useState({
    labelEn: '',
    labelZh: '',
    slug: '',
    backgroundColor: '#dc2626',
    textColor: '#ffffff',
    sortOrder: 0,
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createBadge({
      labelEn: form.labelEn,
      labelZh: form.labelZh || undefined,
      slug: form.slug || undefined,
      backgroundColor: form.backgroundColor,
      textColor: form.textColor,
      sortOrder: form.sortOrder,
    }).unwrap();
    setForm({
      labelEn: '',
      labelZh: '',
      slug: '',
      backgroundColor: '#dc2626',
      textColor: '#ffffff',
      sortOrder: 0,
    });
  };

  if (isLoading) return <p>{t('common.loading')}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('admin.badgesTitle')}</h1>
        <p className="mt-1 text-sm text-gray-600">{t('admin.badgesHelp')}</p>
      </div>

      <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">{t('admin.addBadge')}</h2>
        <form onSubmit={handleCreate} className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <input
            placeholder={t('admin.labelEn')}
            value={form.labelEn}
            onChange={(e) => setForm({ ...form, labelEn: e.target.value })}
            className="rounded-lg border px-3 py-2"
            required
          />
          <input
            placeholder={t('admin.labelZh')}
            value={form.labelZh}
            onChange={(e) => setForm({ ...form, labelZh: e.target.value })}
            className="rounded-lg border px-3 py-2"
          />
          <input
            placeholder={t('admin.slugOptional')}
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            className="rounded-lg border px-3 py-2"
          />
          <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
            <span className="text-gray-500">{t('admin.backgroundColor')}</span>
            <input
              type="color"
              value={form.backgroundColor}
              onChange={(e) => setForm({ ...form, backgroundColor: e.target.value })}
              className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent"
            />
          </label>
          <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
            <span className="text-gray-500">{t('admin.textColor')}</span>
            <input
              type="color"
              value={form.textColor}
              onChange={(e) => setForm({ ...form, textColor: e.target.value })}
              className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent"
            />
          </label>
          <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-white">
            {t('admin.addBadge')}
          </button>
        </form>
      </section>

      <section className="overflow-x-auto rounded-xl bg-white p-5 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="p-3">{t('admin.preview')}</th>
              <th className="p-3">{t('admin.labelEn')}</th>
              <th className="p-3">{t('admin.labelZh')}</th>
              <th className="p-3">{t('admin.slug')}</th>
              <th className="p-3">{t('admin.active')}</th>
              <th className="p-3">{t('admin.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {badges.map((badge: ListingBadge) => (
              <tr key={badge.id} className="border-b">
                <td className="p-3">
                  <BadgePreview badge={badge} locale={i18n.language} />
                </td>
                <td className="p-3">
                  <input
                    defaultValue={badge.labelEn}
                    onBlur={(e) => {
                      if (e.target.value !== badge.labelEn) {
                        updateBadge({ id: badge.id, data: { labelEn: e.target.value } });
                      }
                    }}
                    className="w-full rounded border px-2 py-1"
                  />
                </td>
                <td className="p-3">
                  <input
                    defaultValue={badge.labelZh ?? ''}
                    onBlur={(e) => {
                      if (e.target.value !== (badge.labelZh ?? '')) {
                        updateBadge({ id: badge.id, data: { labelZh: e.target.value || undefined } });
                      }
                    }}
                    className="w-full rounded border px-2 py-1"
                  />
                </td>
                <td className="p-3 font-mono text-xs">{badge.slug}</td>
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={badge.isActive ?? true}
                    onChange={(e) =>
                      updateBadge({ id: badge.id, data: { isActive: e.target.checked } })
                    }
                  />
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-1">
                      <input
                        type="color"
                        defaultValue={badge.backgroundColor}
                        onChange={(e) =>
                          updateBadge({ id: badge.id, data: { backgroundColor: e.target.value } })
                        }
                        className="h-7 w-8 cursor-pointer rounded border-0 bg-transparent"
                        title={t('admin.backgroundColor')}
                      />
                    </label>
                    <label className="flex items-center gap-1">
                      <input
                        type="color"
                        defaultValue={badge.textColor}
                        onChange={(e) =>
                          updateBadge({ id: badge.id, data: { textColor: e.target.value } })
                        }
                        className="h-7 w-8 cursor-pointer rounded border-0 bg-transparent"
                        title={t('admin.textColor')}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => deleteBadge(badge.id)}
                      className="text-red-600 hover:underline"
                    >
                      {t('admin.delete')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function BadgePreview({ badge, locale }: { badge: ListingBadge; locale: string }) {
  const label = labelFor(badge.labelEn, badge.labelZh, locale, badge.slug);
  return (
    <span
      className="inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{ backgroundColor: badge.backgroundColor, color: badge.textColor }}
    >
      {label}
    </span>
  );
}
