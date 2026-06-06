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
  type PropertySubtype,
  type PropertyType,
} from '../../store/api';

type NameForm = { nameEn: string; nameZh: string };

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

  const [typeForm, setTypeForm] = useState<NameForm & { slug: string }>({
    nameEn: '',
    nameZh: '',
    slug: '',
  });
  const [subtypeForm, setSubtypeForm] = useState<NameForm & { slug: string }>({
    nameEn: '',
    nameZh: '',
    slug: '',
  });

  const [editingTypeId, setEditingTypeId] = useState<number | null>(null);
  const [typeEditForm, setTypeEditForm] = useState<NameForm>({ nameEn: '', nameZh: '' });
  const [editingSubtypeId, setEditingSubtypeId] = useState<number | null>(null);
  const [subtypeEditForm, setSubtypeEditForm] = useState<NameForm>({ nameEn: '', nameZh: '' });

  const handleCreateType = async (e: React.FormEvent) => {
    e.preventDefault();
    await createType({
      nameEn: typeForm.nameEn,
      nameZh: typeForm.nameZh,
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
      nameZh: subtypeForm.nameZh,
      slug: subtypeForm.slug || undefined,
    }).unwrap();
    setSubtypeForm({ nameEn: '', nameZh: '', slug: '' });
  };

  const startEditType = (type: PropertyType) => {
    setEditingTypeId(type.id);
    setTypeEditForm({ nameEn: type.nameEn, nameZh: type.nameZh ?? '' });
  };

  const saveTypeEdit = async (id: number) => {
    await updateType({ id, data: typeEditForm }).unwrap();
    setEditingTypeId(null);
  };

  const startEditSubtype = (subtype: PropertySubtype) => {
    setEditingSubtypeId(subtype.id);
    setSubtypeEditForm({ nameEn: subtype.nameEn, nameZh: subtype.nameZh ?? '' });
  };

  const saveSubtypeEdit = async (id: number) => {
    await updateSubtype({ id, data: subtypeEditForm }).unwrap();
    setEditingSubtypeId(null);
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
            required
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

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="p-3">{t('admin.nameEn')}</th>
                <th className="p-3">{t('admin.nameZh')}</th>
                <th className="p-3">{t('admin.slug')}</th>
                <th className="p-3">{t('admin.active')}</th>
                <th className="p-3">{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {types.map((type) => {
                const isEditing = editingTypeId === type.id;
                return (
                  <tr key={type.id} className="border-b">
                    <td className="p-3">
                      {isEditing ? (
                        <input
                          value={typeEditForm.nameEn}
                          onChange={(e) =>
                            setTypeEditForm({ ...typeEditForm, nameEn: e.target.value })
                          }
                          className="w-full rounded border px-2 py-1"
                          required
                        />
                      ) : (
                        type.nameEn
                      )}
                    </td>
                    <td className="p-3">
                      {isEditing ? (
                        <input
                          value={typeEditForm.nameZh}
                          onChange={(e) =>
                            setTypeEditForm({ ...typeEditForm, nameZh: e.target.value })
                          }
                          className="w-full rounded border px-2 py-1"
                          required
                        />
                      ) : (
                        type.nameZh || '—'
                      )}
                    </td>
                    <td className="p-3 font-mono text-xs">{type.slug}</td>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={type.isActive}
                        disabled={isEditing}
                        onChange={(e) =>
                          updateType({ id: type.id, data: { isActive: e.target.checked } })
                        }
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-3">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => saveTypeEdit(type.id)}
                              className="text-brand hover:underline"
                            >
                              {t('admin.save')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingTypeId(null)}
                              className="text-gray-600 hover:underline"
                            >
                              {t('admin.cancel')}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEditType(type)}
                              className="text-brand hover:underline"
                            >
                              {t('admin.edit')}
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteType(type.id)}
                              className="text-red-600 hover:underline"
                            >
                              {t('admin.delete')}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">{t('admin.subtypes')}</h2>
          <select
            value={typeId ?? ''}
            onChange={(e) => {
              setSelectedTypeId(Number(e.target.value));
              setEditingSubtypeId(null);
            }}
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
              required
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

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="p-3">{t('admin.nameEn')}</th>
                <th className="p-3">{t('admin.nameZh')}</th>
                <th className="p-3">{t('admin.slug')}</th>
                <th className="p-3">{t('admin.active')}</th>
                <th className="p-3">{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubtypes.map((subtype) => {
                const isEditing = editingSubtypeId === subtype.id;
                return (
                  <tr key={subtype.id} className="border-b">
                    <td className="p-3">
                      {isEditing ? (
                        <input
                          value={subtypeEditForm.nameEn}
                          onChange={(e) =>
                            setSubtypeEditForm({ ...subtypeEditForm, nameEn: e.target.value })
                          }
                          className="w-full rounded border px-2 py-1"
                          required
                        />
                      ) : (
                        subtype.nameEn
                      )}
                    </td>
                    <td className="p-3">
                      {isEditing ? (
                        <input
                          value={subtypeEditForm.nameZh}
                          onChange={(e) =>
                            setSubtypeEditForm({ ...subtypeEditForm, nameZh: e.target.value })
                          }
                          className="w-full rounded border px-2 py-1"
                          required
                        />
                      ) : (
                        subtype.nameZh || '—'
                      )}
                    </td>
                    <td className="p-3 font-mono text-xs">{subtype.slug}</td>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={subtype.isActive}
                        disabled={isEditing}
                        onChange={(e) =>
                          updateSubtype({ id: subtype.id, data: { isActive: e.target.checked } })
                        }
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-3">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => saveSubtypeEdit(subtype.id)}
                              className="text-brand hover:underline"
                            >
                              {t('admin.save')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingSubtypeId(null)}
                              className="text-gray-600 hover:underline"
                            >
                              {t('admin.cancel')}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEditSubtype(subtype)}
                              className="text-brand hover:underline"
                            >
                              {t('admin.edit')}
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteSubtype(subtype.id)}
                              className="text-red-600 hover:underline"
                            >
                              {t('admin.delete')}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
