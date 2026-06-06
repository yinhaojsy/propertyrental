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
} from '../../store/api';

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

  const [cityForm, setCityForm] = useState({ nameEn: '', nameZh: '', slug: '' });
  const [sectorForm, setSectorForm] = useState({ nameEn: '', nameZh: '', slug: '' });

  const handleCreateCity = async (e: React.FormEvent) => {
    e.preventDefault();
    await createCity({
      nameEn: cityForm.nameEn,
      nameZh: cityForm.nameZh || cityForm.nameEn,
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
      nameZh: sectorForm.nameZh || sectorForm.nameEn,
      slug: sectorForm.slug || undefined,
    }).unwrap();
    setSectorForm({ nameEn: '', nameZh: '', slug: '' });
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
                <th className="p-3">{t('admin.slug')}</th>
                <th className="p-3">{t('admin.active')}</th>
                <th className="p-3">{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {cities.map((city) => (
                <tr key={city.id} className="border-b">
                  <td className="p-3">
                    <input
                      defaultValue={city.nameEn}
                      onBlur={(e) => {
                        if (e.target.value !== city.nameEn) {
                          updateCity({ id: city.id, data: { nameEn: e.target.value } });
                        }
                      }}
                      className="w-full rounded border px-2 py-1"
                    />
                  </td>
                  <td className="p-3 font-mono text-xs">{city.slug}</td>
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={city.isActive !== false}
                      onChange={(e) =>
                        updateCity({ id: city.id, data: { isActive: e.target.checked } })
                      }
                    />
                  </td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => deleteCity(city.id)}
                      className="text-red-600 hover:underline"
                    >
                      {t('admin.delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">{t('admin.sectors')}</h2>
          <select
            value={cityId ?? ''}
            onChange={(e) => setSelectedCityId(Number(e.target.value))}
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
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b text-left text-gray-500">
                  <th className="p-3">{t('admin.nameEn')}</th>
                  <th className="p-3">{t('admin.slug')}</th>
                  <th className="p-3">{t('admin.active')}</th>
                  <th className="p-3">{t('admin.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {sectors.map((sector) => (
                  <tr key={sector.id} className="border-b">
                    <td className="p-3">
                      <input
                        defaultValue={sector.nameEn}
                        onBlur={(e) => {
                          if (e.target.value !== sector.nameEn) {
                            updateSector({ id: sector.id, data: { nameEn: e.target.value } });
                          }
                        }}
                        className="w-full rounded border px-2 py-1"
                      />
                    </td>
                    <td className="p-3 font-mono text-xs">{sector.slug}</td>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={sector.isActive !== false}
                        onChange={(e) =>
                          updateSector({ id: sector.id, data: { isActive: e.target.checked } })
                        }
                      />
                    </td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => deleteSector(sector.id)}
                        className="text-red-600 hover:underline"
                      >
                        {t('admin.delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
