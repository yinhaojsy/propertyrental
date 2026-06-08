import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useGetAdminPhotoConfigQuery,
  useGetPropertyTypesQuery,
  useCreatePhotoFloorMutation,
  useUpdatePhotoFloorMutation,
  useDeletePhotoFloorMutation,
  useCreatePhotoRoomTypeMutation,
  useUpdatePhotoRoomTypeMutation,
  useDeletePhotoRoomTypeMutation,
  useSetPhotoFloorRoomTypesMutation,
  useSetPhotoSubtypeFloorsMutation,
} from '../../store/api';
import { labelFor } from '../../lib/labels';

export function AdminPhotoConfigPage() {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useGetAdminPhotoConfigQuery();
  const floors = data?.floors ?? [];
  const roomTypes = data?.roomTypes ?? [];
  const floorRoomTypes = data?.floorRoomTypes ?? [];
  const subtypeFloors = data?.subtypeFloors ?? [];

  const { data: propertyTypeData } = useGetPropertyTypesQuery();
  const propertyTypes = propertyTypeData?.types ?? [];
  const propertySubtypes = propertyTypeData?.subtypes ?? [];

  const [selectedFloorId, setSelectedFloorId] = useState<number | null>(null);
  const floorId = selectedFloorId ?? floors[0]?.id ?? null;
  const [selectedTypeSlug, setSelectedTypeSlug] = useState<string | null>('residential');
  const typeSlug =
    selectedTypeSlug ??
    propertyTypes.find((t) => t.slug === 'residential')?.slug ??
    propertyTypes[0]?.slug ??
    null;
  const subtypesForType = useMemo(
    () =>
      propertySubtypes.filter(
        (s) => propertyTypes.find((t) => t.id === s.propertyTypeId)?.slug === typeSlug,
      ),
    [propertySubtypes, propertyTypes, typeSlug],
  );
  const [selectedSubtypeSlug, setSelectedSubtypeSlug] = useState<string | null>(null);
  const subtypeSlug = selectedSubtypeSlug ?? subtypesForType[0]?.slug ?? null;

  useEffect(() => {
    if (subtypesForType.length === 0) {
      setSelectedSubtypeSlug(null);
      return;
    }
    if (!subtypesForType.some((s) => s.slug === selectedSubtypeSlug)) {
      setSelectedSubtypeSlug(subtypesForType[0]!.slug);
    }
  }, [subtypesForType, selectedSubtypeSlug]);

  const [createFloor] = useCreatePhotoFloorMutation();
  const [updateFloor] = useUpdatePhotoFloorMutation();
  const [deleteFloor] = useDeletePhotoFloorMutation();
  const [createRoomType] = useCreatePhotoRoomTypeMutation();
  const [updateRoomType] = useUpdatePhotoRoomTypeMutation();
  const [deleteRoomType] = useDeletePhotoRoomTypeMutation();
  const [setFloorRoomTypes] = useSetPhotoFloorRoomTypesMutation();
  const [setSubtypeFloors] = useSetPhotoSubtypeFloorsMutation();

  const [floorForm, setFloorForm] = useState({ nameEn: '', nameZh: '', slug: '' });
  const [roomTypeForm, setRoomTypeForm] = useState({
    nameEn: '',
    nameZh: '',
    labelEn: '',
    labelZh: '',
    slug: '',
    autoNumber: false,
  });

  const linkedRoomTypeIds = useMemo(() => {
    if (!floorId) return new Set<number>();
    return new Set(
      floorRoomTypes.filter((link) => link.floorId === floorId).map((link) => link.roomTypeId),
    );
  }, [floorRoomTypes, floorId]);

  const linkedFloorIds = useMemo(() => {
    if (!subtypeSlug) return new Set<number>();
    return new Set(
      subtypeFloors
        .filter((link) => link.propertySubtype === subtypeSlug)
        .map((link) => link.floorId),
    );
  }, [subtypeFloors, subtypeSlug]);

  const handleCreateFloor = async (e: React.FormEvent) => {
    e.preventDefault();
    await createFloor({
      nameEn: floorForm.nameEn,
      nameZh: floorForm.nameZh,
      slug: floorForm.slug || undefined,
    }).unwrap();
    setFloorForm({ nameEn: '', nameZh: '', slug: '' });
  };

  const handleCreateRoomType = async (e: React.FormEvent) => {
    e.preventDefault();
    await createRoomType({
      nameEn: roomTypeForm.nameEn,
      nameZh: roomTypeForm.nameZh,
      labelEn: roomTypeForm.labelEn,
      labelZh: roomTypeForm.labelZh,
      autoNumber: roomTypeForm.autoNumber,
      slug: roomTypeForm.slug || undefined,
    }).unwrap();
    setRoomTypeForm({
      nameEn: '',
      nameZh: '',
      labelEn: '',
      labelZh: '',
      slug: '',
      autoNumber: false,
    });
  };

  const toggleFloorRoomType = async (roomTypeId: number) => {
    if (!floorId) return;
    const next = new Set(linkedRoomTypeIds);
    if (next.has(roomTypeId)) next.delete(roomTypeId);
    else next.add(roomTypeId);
    await setFloorRoomTypes({
      floorId,
      roomTypeIds: [...next],
    }).unwrap();
  };

  const toggleSubtypeFloor = async (linkedFloorId: number) => {
    if (!subtypeSlug) return;
    const next = new Set(linkedFloorIds);
    if (next.has(linkedFloorId)) next.delete(linkedFloorId);
    else next.add(linkedFloorId);
    await setSubtypeFloors({
      propertySubtype: subtypeSlug,
      floorIds: [...next],
    }).unwrap();
  };

  if (isLoading) return <p>{t('common.loading')}</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{t('admin.photoConfigTitle')}</h1>
        <p className="mt-1 text-sm text-gray-600">{t('admin.photoConfigHelp')}</p>
      </div>

      <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">{t('admin.floors')}</h2>
        <form onSubmit={handleCreateFloor} className="grid gap-3 md:grid-cols-4">
          <input
            placeholder={t('admin.nameEn')}
            value={floorForm.nameEn}
            onChange={(e) => setFloorForm({ ...floorForm, nameEn: e.target.value })}
            className="rounded-lg border px-3 py-2"
            required
          />
          <input
            placeholder={t('admin.nameZh')}
            value={floorForm.nameZh}
            onChange={(e) => setFloorForm({ ...floorForm, nameZh: e.target.value })}
            className="rounded-lg border px-3 py-2"
            required
          />
          <input
            placeholder={t('admin.slugOptional')}
            value={floorForm.slug}
            onChange={(e) => setFloorForm({ ...floorForm, slug: e.target.value })}
            className="rounded-lg border px-3 py-2"
          />
          <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-white">
            {t('admin.addFloor')}
          </button>
        </form>

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
            {floors.map((floor) => (
              <tr key={floor.id} className="border-b">
                <td className="p-3">
                  <input
                    defaultValue={floor.nameEn}
                    onBlur={(e) => {
                      if (e.target.value !== floor.nameEn) {
                        updateFloor({ id: floor.id, data: { nameEn: e.target.value } });
                      }
                    }}
                    className="w-full rounded border px-2 py-1"
                  />
                </td>
                <td className="p-3">
                  <input
                    defaultValue={floor.nameZh}
                    onBlur={(e) => {
                      if (e.target.value !== floor.nameZh) {
                        updateFloor({ id: floor.id, data: { nameZh: e.target.value } });
                      }
                    }}
                    className="w-full rounded border px-2 py-1"
                  />
                </td>
                <td className="p-3 font-mono text-xs">{floor.slug}</td>
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={floor.isActive}
                    onChange={(e) =>
                      updateFloor({ id: floor.id, data: { isActive: e.target.checked } })
                    }
                  />
                </td>
                <td className="p-3">
                  <button
                    type="button"
                    onClick={() => deleteFloor(floor.id)}
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
        <h2 className="font-semibold">{t('admin.roomTypes')}</h2>
        <p className="text-sm text-gray-600">{t('admin.roomTypeLabelHelp')}</p>
        <form onSubmit={handleCreateRoomType} className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <input
            placeholder={t('admin.nameEn')}
            value={roomTypeForm.nameEn}
            onChange={(e) => setRoomTypeForm({ ...roomTypeForm, nameEn: e.target.value })}
            className="rounded-lg border px-3 py-2"
            required
          />
          <input
            placeholder={t('admin.nameZh')}
            value={roomTypeForm.nameZh}
            onChange={(e) => setRoomTypeForm({ ...roomTypeForm, nameZh: e.target.value })}
            className="rounded-lg border px-3 py-2"
            required
          />
          <input
            placeholder={t('admin.labelEn')}
            value={roomTypeForm.labelEn}
            onChange={(e) => setRoomTypeForm({ ...roomTypeForm, labelEn: e.target.value })}
            className="rounded-lg border px-3 py-2"
            required
          />
          <input
            placeholder={t('admin.labelZh')}
            value={roomTypeForm.labelZh}
            onChange={(e) => setRoomTypeForm({ ...roomTypeForm, labelZh: e.target.value })}
            className="rounded-lg border px-3 py-2"
            required
          />
          <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={roomTypeForm.autoNumber}
              onChange={(e) =>
                setRoomTypeForm({ ...roomTypeForm, autoNumber: e.target.checked })
              }
            />
            {t('admin.autoNumber')}
          </label>
          <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-white">
            {t('admin.addRoomType')}
          </button>
        </form>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="p-3">{t('admin.nameEn')}</th>
              <th className="p-3">{t('admin.nameZh')}</th>
              <th className="p-3">{t('admin.labelEn')}</th>
              <th className="p-3">{t('admin.labelZh')}</th>
              <th className="p-3">{t('admin.autoNumber')}</th>
              <th className="p-3">{t('admin.active')}</th>
              <th className="p-3">{t('admin.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {roomTypes.map((roomType) => (
              <tr key={roomType.id} className="border-b">
                <td className="p-3">
                  <input
                    defaultValue={roomType.nameEn}
                    onBlur={(e) => {
                      if (e.target.value !== roomType.nameEn) {
                        updateRoomType({ id: roomType.id, data: { nameEn: e.target.value } });
                      }
                    }}
                    className="w-full rounded border px-2 py-1"
                  />
                </td>
                <td className="p-3">
                  <input
                    defaultValue={roomType.nameZh}
                    onBlur={(e) => {
                      if (e.target.value !== roomType.nameZh) {
                        updateRoomType({ id: roomType.id, data: { nameZh: e.target.value } });
                      }
                    }}
                    className="w-full rounded border px-2 py-1"
                  />
                </td>
                <td className="p-3">
                  <input
                    defaultValue={roomType.labelEn}
                    onBlur={(e) => {
                      if (e.target.value !== roomType.labelEn) {
                        updateRoomType({ id: roomType.id, data: { labelEn: e.target.value } });
                      }
                    }}
                    className="w-full rounded border px-2 py-1"
                  />
                </td>
                <td className="p-3">
                  <input
                    defaultValue={roomType.labelZh}
                    onBlur={(e) => {
                      if (e.target.value !== roomType.labelZh) {
                        updateRoomType({ id: roomType.id, data: { labelZh: e.target.value } });
                      }
                    }}
                    className="w-full rounded border px-2 py-1"
                  />
                </td>
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={roomType.autoNumber}
                    onChange={(e) =>
                      updateRoomType({
                        id: roomType.id,
                        data: { autoNumber: e.target.checked },
                      })
                    }
                  />
                </td>
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={roomType.isActive}
                    onChange={(e) =>
                      updateRoomType({ id: roomType.id, data: { isActive: e.target.checked } })
                    }
                  />
                </td>
                <td className="p-3">
                  <button
                    type="button"
                    onClick={() => deleteRoomType(roomType.id)}
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
          <div>
            <h2 className="font-semibold">{t('admin.floorRoomTypes')}</h2>
            <p className="text-sm text-gray-600">{t('admin.floorRoomTypesHelp')}</p>
          </div>
          <select
            value={floorId ?? ''}
            onChange={(e) => setSelectedFloorId(Number(e.target.value))}
            className="rounded-lg border px-3 py-2"
          >
            {floors.map((floor) => (
              <option key={floor.id} value={floor.id}>
                {labelFor(floor.nameEn, floor.nameZh, i18n.language, floor.slug)}
              </option>
            ))}
          </select>
        </div>

        {floorId && (
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {roomTypes.map((roomType) => (
              <label
                key={roomType.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={linkedRoomTypeIds.has(roomType.id)}
                  onChange={() => void toggleFloorRoomType(roomType.id)}
                />
                <span>
                  {labelFor(roomType.nameEn, roomType.nameZh, i18n.language, roomType.slug)}
                  <span className="ml-1 text-gray-500">
                    ({roomType.labelEn} / {roomType.labelZh})
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">{t('admin.subtypeFloors')}</h2>
            <p className="text-sm text-gray-600">{t('admin.subtypeFloorsHelp')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={typeSlug ?? ''}
              onChange={(e) => {
                setSelectedTypeSlug(e.target.value);
                setSelectedSubtypeSlug(null);
              }}
              className="rounded-lg border px-3 py-2"
            >
              {propertyTypes.map((type) => (
                <option key={type.id} value={type.slug}>
                  {labelFor(type.nameEn, type.nameZh, i18n.language, type.slug)}
                </option>
              ))}
            </select>
            <select
              value={subtypeSlug ?? ''}
              onChange={(e) => setSelectedSubtypeSlug(e.target.value)}
              disabled={subtypesForType.length === 0}
              className="rounded-lg border px-3 py-2 disabled:bg-gray-100"
            >
              {subtypesForType.map((subtype) => (
                <option key={subtype.id} value={subtype.slug}>
                  {labelFor(subtype.nameEn, subtype.nameZh, i18n.language, subtype.slug)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {floors.length === 0 ? (
          <p className="text-sm text-amber-700">{t('admin.photoConfigMissingSeed')}</p>
        ) : (
          subtypeSlug && (
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {floors.map((floor) => (
                <label
                  key={floor.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={linkedFloorIds.has(floor.id)}
                    onChange={() => void toggleSubtypeFloor(floor.id)}
                  />
                  <span>{labelFor(floor.nameEn, floor.nameZh, i18n.language, floor.slug)}</span>
                </label>
              ))}
            </div>
          )
        )}
      </section>
    </div>
  );
}
