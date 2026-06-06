import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useGetAdminPropertyTypesQuery,
  useCreatePropertyTypeMutation,
  useUpdatePropertyTypeMutation,
  useDeletePropertyTypeMutation,
  useCreatePropertySubtypeMutation,
  useUpdatePropertySubtypeMutation,
  useDeletePropertySubtypeMutation,
} from '../../store/api';

export function AdminPropertyTypesPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useGetAdminPropertyTypesQuery();
  const types = data?.types ?? [];
  const subtypes = data?.subtypes ?? [];

  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const typeId = selectedTypeId ?? types[0]?.id ?? null;

  const filteredSubtypes = useMemo(
    () => subtypes.filter((s) => s.propertyTypeId === typeId),
    [subtypes, typeId],
  );

  const [createType] = useCreatePropertyTypeMutation();
  const [updateType] = useUpdatePropertyTypeMutation();
  const [deleteType] = useDeletePropertyTypeMutation();
  const [createSubtype] = useCreatePropertySubtypeMutation();
  const [updateSubtype] = useUpdatePropertySubtypeMutation();
  const [deleteSubtype] = useDeletePropertySubtypeMutation();

  const [typeForm, setTypeForm] = useState({ nameEn: '', nameZh: '', slug: '' });
  const [subtypeForm, setSubtypeForm] = useState({ nameEn: '', nameZh: '', slug: '' });

  const handleCreateType = async (e: React.FormEvent) => {
    e.preventDefault();
    await createType({
      nameEn: typeForm.nameEn,
      nameZh: typeForm.nameZh || undefined,
      slug: typeForm.slug || undefined,
    }).unwrap();
    setTypeForm({ nameEn: '', nameZh: '', slug: '' });
  };

  const handleCreateSubtype = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeId) return;
    await createSubtype({
      propertyTypeId: typeId,
      nameEn: subtypeForm.nameEn,
      nameZh: subtypeForm.nameZh || undefined,
      slug: subtypeForm.slug || undefined,
    }).unwrap();
    setSubtypeForm({ nameEn: '', nameZh: '', slug: '' });
  };

  if (isLoading) return <p>{t('common.loading')}</p>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{t('admin.propertyTypesTitle')}</h1>

      <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">{t('admin.types')}</h2>
        <form onSubmit={handleCreateType} className="grid gap-3 md:grid-cols-4">
          <input
            placeholder={t('admin.nameEn')}
            value={typeForm.nameEn}
            onChange={(e) => setTypeForm({ ...typeForm, nameEn: e.target.value })}
            className="rounded-lg border px-3 py-2"
            required
          />
          <input
            placeholder={t('admin.nameZh')}
            value={typeForm.nameZh}
            onChange={(e) => setTypeForm({ ...typeForm, nameZh: e.target.value })}
            className="rounded-lg border px-3 py-2"
          />
          <input
            placeholder={t('admin.slugOptional')}
            value={typeForm.slug}
            onChange={(e) => setTypeForm({ ...typeForm, slug: e.target.value })}
            className="rounded-lg border px-3 py-2"
          />
          <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-white">
            {t('admin.addType')}
          </button>
        </form>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="p-3">{t('admin.nameEn')}</th>
              <th className="p-3">{t('admin.slug')}</th>
              <th className="p-3">{t('admin.active')}</th>
              <th className="p-3">{t('admin.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {types.map((type) => (
              <tr key={type.id} className="border-b">
                <td className="p-3">
                  <input
                    defaultValue={type.nameEn}
                    onBlur={(e) => {
                      if (e.target.value !== type.nameEn) {
                        updateType({ id: type.id, data: { nameEn: e.target.value } });
                      }
                    }}
                    className="w-full rounded border px-2 py-1"
                  />
                </td>
                <td className="p-3 font-mono text-xs">{type.slug}</td>
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={type.isActive}
                    onChange={(e) =>
                      updateType({ id: type.id, data: { isActive: e.target.checked } })
                    }
                  />
                </td>
                <td className="p-3">
                  <button
                    type="button"
                    onClick={() => deleteType(type.id)}
                    className="text-red-600 hover:underline"
                  >
                    {t('admin.delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">{t('admin.subtypes')}</h2>
          <select
            value={typeId ?? ''}
            onChange={(e) => setSelectedTypeId(Number(e.target.value))}
            className="rounded-lg border px-3 py-2"
          >
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.nameEn}
              </option>
            ))}
          </select>
        </div>

        {typeId && (
          <form onSubmit={handleCreateSubtype} className="grid gap-3 md:grid-cols-4">
            <input
              placeholder={t('admin.nameEn')}
              value={subtypeForm.nameEn}
              onChange={(e) => setSubtypeForm({ ...subtypeForm, nameEn: e.target.value })}
              className="rounded-lg border px-3 py-2"
              required
            />
            <input
              placeholder={t('admin.nameZh')}
              value={subtypeForm.nameZh}
              onChange={(e) => setSubtypeForm({ ...subtypeForm, nameZh: e.target.value })}
              className="rounded-lg border px-3 py-2"
            />
            <input
              placeholder={t('admin.slugOptional')}
              value={subtypeForm.slug}
              onChange={(e) => setSubtypeForm({ ...subtypeForm, slug: e.target.value })}
              className="rounded-lg border px-3 py-2"
            />
            <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-white">
              {t('admin.addSubtype')}
            </button>
          </form>
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="p-3">{t('admin.nameEn')}</th>
              <th className="p-3">{t('admin.slug')}</th>
              <th className="p-3">{t('admin.active')}</th>
              <th className="p-3">{t('admin.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubtypes.map((subtype) => (
              <tr key={subtype.id} className="border-b">
                <td className="p-3">
                  <input
                    defaultValue={subtype.nameEn}
                    onBlur={(e) => {
                      if (e.target.value !== subtype.nameEn) {
                        updateSubtype({ id: subtype.id, data: { nameEn: e.target.value } });
                      }
                    }}
                    className="w-full rounded border px-2 py-1"
                  />
                </td>
                <td className="p-3 font-mono text-xs">{subtype.slug}</td>
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={subtype.isActive}
                    onChange={(e) =>
                      updateSubtype({ id: subtype.id, data: { isActive: e.target.checked } })
                    }
                  />
                </td>
                <td className="p-3">
                  <button
                    type="button"
                    onClick={() => deleteSubtype(subtype.id)}
                    className="text-red-600 hover:underline"
                  >
                    {t('admin.delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
