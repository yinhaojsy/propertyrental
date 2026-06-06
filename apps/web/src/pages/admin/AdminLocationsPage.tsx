import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useGetAdminCitiesQuery,
  useCreateCityMutation,
  useUpdateCityMutation,
  useDeleteCityMutation,
  useGetAdminSectorsQuery,
  useCreateSectorMutation,
  useUpdateSectorMutation,
  useDeleteSectorMutation,
  type City,
  type Sector,
} from '../../store/api';

type NameForm = { nameEn: string; nameZh: string };

export function AdminLocationsPage() {
  const { t } = useTranslation();
  const { data: cities = [], isLoading: citiesLoading } = useGetAdminCitiesQuery();
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const cityId = selectedCityId ?? cities[0]?.id ?? null;
  const { data: sectors = [], isLoading: sectorsLoading } = useGetAdminSectorsQuery(cityId ?? undefined, {
    skip: !cityId,
  });

  const [createCity] = useCreateCityMutation();
  const [updateCity] = useUpdateCityMutation();
  const [deleteCity] = useDeleteCityMutation();
  const [createSector] = useCreateSectorMutation();
  const [updateSector] = useUpdateSectorMutation();
  const [deleteSector] = useDeleteSectorMutation();

  const [cityForm, setCityForm] = useState<NameForm & { slug: string }>({
    nameEn: '',
    nameZh: '',
    slug: '',
  });
  const [sectorForm, setSectorForm] = useState<NameForm & { slug: string }>({
    nameEn: '',
    nameZh: '',
    slug: '',
  });

  const [editingCityId, setEditingCityId] = useState<number | null>(null);
  const [cityEditForm, setCityEditForm] = useState<NameForm>({ nameEn: '', nameZh: '' });
  const [editingSectorId, setEditingSectorId] = useState<number | null>(null);
  const [sectorEditForm, setSectorEditForm] = useState<NameForm>({ nameEn: '', nameZh: '' });

  const handleCreateCity = async (e: React.FormEvent) => {
    e.preventDefault();
    await createCity({
      nameEn: cityForm.nameEn,
      nameZh: cityForm.nameZh,
      slug: cityForm.slug || undefined,
    }).unwrap();
    setCityForm({ nameEn: '', nameZh: '', slug: '' });
  };

  const handleCreateSector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityId) return;
    await createSector({
      cityId,
      nameEn: sectorForm.nameEn,
      nameZh: sectorForm.nameZh || undefined,
      slug: sectorForm.slug || undefined,
    }).unwrap();
    setSectorForm({ nameEn: '', nameZh: '', slug: '' });
  };

  const startEditCity = (city: City) => {
    setEditingCityId(city.id);
    setCityEditForm({ nameEn: city.nameEn, nameZh: city.nameZh });
  };

  const saveCityEdit = async (id: number) => {
    await updateCity({ id, data: cityEditForm }).unwrap();
    setEditingCityId(null);
  };

  const startEditSector = (sector: Sector) => {
    setEditingSectorId(sector.id);
    setSectorEditForm({ nameEn: sector.nameEn, nameZh: sector.nameZh ?? '' });
  };

  const saveSectorEdit = async (id: number) => {
    await updateSector({ id, data: sectorEditForm }).unwrap();
    setEditingSectorId(null);
  };

  if (citiesLoading) return <p>{t('common.loading')}</p>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{t('admin.locations')}</h1>

      <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">{t('admin.cities')}</h2>
        <form onSubmit={handleCreateCity} className="grid gap-3 md:grid-cols-4">
          <input
            placeholder={t('admin.nameEn')}
            value={cityForm.nameEn}
            onChange={(e) => setCityForm({ ...cityForm, nameEn: e.target.value })}
            className="rounded-lg border px-3 py-2"
            required
          />
          <input
            placeholder={t('admin.nameZh')}
            value={cityForm.nameZh}
            onChange={(e) => setCityForm({ ...cityForm, nameZh: e.target.value })}
            className="rounded-lg border px-3 py-2"
            required
          />
          <input
            placeholder={t('admin.slugOptional')}
            value={cityForm.slug}
            onChange={(e) => setCityForm({ ...cityForm, slug: e.target.value })}
            className="rounded-lg border px-3 py-2"
          />
          <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-white">
            {t('admin.addCity')}
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
              {cities.map((city) => {
                const isEditing = editingCityId === city.id;
                return (
                  <tr key={city.id} className="border-b">
                    <td className="p-3">
                      {isEditing ? (
                        <input
                          value={cityEditForm.nameEn}
                          onChange={(e) =>
                            setCityEditForm({ ...cityEditForm, nameEn: e.target.value })
                          }
                          className="w-full rounded border px-2 py-1"
                          required
                        />
                      ) : (
                        city.nameEn
                      )}
                    </td>
                    <td className="p-3">
                      {isEditing ? (
                        <input
                          value={cityEditForm.nameZh}
                          onChange={(e) =>
                            setCityEditForm({ ...cityEditForm, nameZh: e.target.value })
                          }
                          className="w-full rounded border px-2 py-1"
                          required
                        />
                      ) : (
                        city.nameZh || '—'
                      )}
                    </td>
                    <td className="p-3 font-mono text-xs">{city.slug}</td>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={city.isActive !== false}
                        disabled={isEditing}
                        onChange={(e) =>
                          updateCity({ id: city.id, data: { isActive: e.target.checked } })
                        }
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-3">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => saveCityEdit(city.id)}
                              className="text-brand hover:underline"
                            >
                              {t('admin.save')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCityId(null)}
                              className="text-gray-600 hover:underline"
                            >
                              {t('admin.cancel')}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEditCity(city)}
                              className="text-brand hover:underline"
                            >
                              {t('admin.edit')}
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteCity(city.id)}
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
          <h2 className="font-semibold">{t('admin.sectors')}</h2>
          <select
            value={cityId ?? ''}
            onChange={(e) => {
              setSelectedCityId(Number(e.target.value));
              setEditingSectorId(null);
            }}
            className="rounded-lg border px-3 py-2"
          >
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameEn}
              </option>
            ))}
          </select>
        </div>

        {cityId && (
          <form onSubmit={handleCreateSector} className="grid gap-3 md:grid-cols-4">
            <input
              placeholder={t('admin.sectorNameEn')}
              value={sectorForm.nameEn}
              onChange={(e) => setSectorForm({ ...sectorForm, nameEn: e.target.value })}
              className="rounded-lg border px-3 py-2"
              required
            />
            <input
              placeholder={t('admin.nameZh')}
              value={sectorForm.nameZh}
              onChange={(e) => setSectorForm({ ...sectorForm, nameZh: e.target.value })}
              className="rounded-lg border px-3 py-2"
            />
            <input
              placeholder={t('admin.slugOptional')}
              value={sectorForm.slug}
              onChange={(e) => setSectorForm({ ...sectorForm, slug: e.target.value })}
              className="rounded-lg border px-3 py-2"
            />
            <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-white">
              {t('admin.addSector')}
            </button>
          </form>
        )}

        {sectorsLoading ? (
          <p>{t('common.loading')}</p>
        ) : (
          <div className="max-h-96 overflow-y-auto overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b text-left text-gray-500">
                  <th className="p-3">{t('admin.nameEn')}</th>
                  <th className="p-3">{t('admin.nameZh')}</th>
                  <th className="p-3">{t('admin.slug')}</th>
                  <th className="p-3">{t('admin.active')}</th>
                  <th className="p-3">{t('admin.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {sectors.map((sector) => {
                  const isEditing = editingSectorId === sector.id;
                  return (
                    <tr key={sector.id} className="border-b">
                      <td className="p-3">
                        {isEditing ? (
                          <input
                            value={sectorEditForm.nameEn}
                            onChange={(e) =>
                              setSectorEditForm({ ...sectorEditForm, nameEn: e.target.value })
                            }
                            className="w-full rounded border px-2 py-1"
                            required
                          />
                        ) : (
                          sector.nameEn
                        )}
                      </td>
                      <td className="p-3">
                        {isEditing ? (
                          <input
                            value={sectorEditForm.nameZh}
                            onChange={(e) =>
                              setSectorEditForm({ ...sectorEditForm, nameZh: e.target.value })
                            }
                            className="w-full rounded border px-2 py-1"
                          />
                        ) : (
                          sector.nameZh || '—'
                        )}
                      </td>
                      <td className="p-3 font-mono text-xs">{sector.slug}</td>
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={sector.isActive !== false}
                          disabled={isEditing}
                          onChange={(e) =>
                            updateSector({ id: sector.id, data: { isActive: e.target.checked } })
                          }
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-3">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => saveSectorEdit(sector.id)}
                                className="text-brand hover:underline"
                              >
                                {t('admin.save')}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingSectorId(null)}
                                className="text-gray-600 hover:underline"
                              >
                                {t('admin.cancel')}
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => startEditSector(sector)}
                                className="text-brand hover:underline"
                              >
                                {t('admin.edit')}
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteSector(sector.id)}
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
        )}
      </section>
    </div>
  );
}
