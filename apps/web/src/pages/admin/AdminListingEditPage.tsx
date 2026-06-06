import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  useGetAdminListingQuery,
  useCreateListingMutation,
  useCreateDraftListingMutation,
  useUpdateListingMutation,
  useUpdateListingStatusMutation,
  useGetCitiesQuery,
  useGetSectorsQuery,
  useGetPropertyTypesQuery,
  useGetAdminOffersQuery,
  useCreateRentalRecordMutation,
} from '../../store/api';
import { SearchableSelect } from '../../components/SearchableSelect';
import { NumberInput } from '../../components/NumberInput';
import { ListingPhotoUpload, type PhotoItem } from '../../components/ListingPhotoUpload';
import { AreaInput } from '../../components/AreaInput';
import { convertToSqFt, type AreaUnit } from '@property-rental/shared';
import { labelFor } from '../../lib/labels';

const FORM_STORAGE_KEY = 'listing-edit-form';

type ListingFormState = {
  cityId: number;
  sectorId: number;
  listingType: string;
  propertySubtype: string;
  rentAmount: number | null;
  areaSqft: number | null;
  beds: number | null;
  baths: number | null;
  isStudio: boolean;
  isPenthouse: boolean;
  titleEn: string;
  titleZh: string;
  descriptionEn: string;
  descriptionZh: string;
  contactPhone: string;
  contactEmail: string;
};

function buildListingSavePayload(form: ListingFormState) {
  const { areaSqft, ...rest } = form;
  const payload: Record<string, unknown> = {
    cityId: rest.cityId,
    sectorId: rest.sectorId,
    listingType: rest.listingType,
    propertySubtype: rest.propertySubtype,
    rentAmount: rest.rentAmount,
    areaUnit: 'sqft',
    beds: rest.beds,
    baths: rest.baths,
    isStudio: rest.isStudio,
    isPenthouse: rest.isPenthouse,
  };

  if (areaSqft != null) payload.areaValue = areaSqft;

  for (const key of [
    'titleEn',
    'titleZh',
    'descriptionEn',
    'descriptionZh',
    'contactPhone',
    'contactEmail',
  ] as const) {
    const value = rest[key].trim();
    if (value) payload[key] = value;
  }

  return payload;
}

function inferUploadModeFromPhotos(photos: PhotoItem[]): 'structured' | 'bulk' {
  if (photos.length === 0) return 'structured';
  const hasStructured = photos.some(
    (p) => p.uploadMode === 'structured' || (p.uploadMode !== 'bulk' && p.roomType),
  );
  const hasBulk = photos.some((p) => p.uploadMode === 'bulk');
  if (hasBulk && !hasStructured) return 'bulk';
  return 'structured';
}

export function AdminListingEditPage() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const listingId = isNew ? null : parseInt(id!, 10);
  const [draftId, setDraftId] = useState<number | null>(listingId);
  const effectiveListingId = draftId ?? listingId;

  const { data: listing, refetch } = useGetAdminListingQuery(effectiveListingId!, {
    skip: !effectiveListingId,
  });
  const { data: cities = [] } = useGetCitiesQuery();
  const { data: propertyTypeData } = useGetPropertyTypesQuery();
  const propertyTypes = propertyTypeData?.types ?? [];
  const propertySubtypes = propertyTypeData?.subtypes ?? [];
  const [createListing] = useCreateListingMutation();
  const [createDraftListing] = useCreateDraftListingMutation();
  const [updateListing] = useUpdateListingMutation();
  const [updateStatus] = useUpdateListingStatusMutation();
  const { data: offers = [] } = useGetAdminOffersQuery(effectiveListingId ?? undefined, {
    skip: !effectiveListingId,
  });
  const [createRentalRecord] = useCreateRentalRecordMutation();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    if (listingId) setDraftId(listingId);
  }, [listingId]);

  const [form, setForm] = useState({
    cityId: 0,
    sectorId: 0,
    listingType: 'residential',
    propertySubtype: 'house',
    rentAmount: null as number | null,
    areaSqft: null as number | null,
    beds: null as number | null,
    baths: null as number | null,
    isStudio: false,
    isPenthouse: false,
    titleEn: '',
    titleZh: '',
    descriptionEn: '',
    descriptionZh: '',
    contactPhone: '',
    contactEmail: '',
  });

  const [uploadMode, setUploadMode] = useState<'structured' | 'bulk'>('structured');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [listingStatus, setListingStatus] = useState<string>('draft');
  const [rentedForm, setRentedForm] = useState({
    offerId: '',
    tenantName: '',
    tenantPhone: '',
    rentAmount: null as number | null,
    source: 'offline' as 'app_offer' | 'offline',
  });

  const citySlug = cities.find((c) => c.id === form.cityId)?.slug;
  const { data: sectors = [] } = useGetSectorsQuery(citySlug!, { skip: !citySlug });

  const subtypesForType = propertySubtypes.filter(
    (s) => propertyTypes.find((pt) => pt.id === s.propertyTypeId)?.slug === form.listingType,
  );

  const sectorOptions = sectors.map((s) => ({
    value: s.id,
    label: labelFor(s.nameEn, s.nameZh, i18n.language, s.slug),
  }));
  const isListingLocked = effectiveListingId != null && listingStatus !== 'draft';
  const isStructuredResidential =
    uploadMode === 'structured' && form.listingType === 'residential';

  useEffect(() => {
    const saved = sessionStorage.getItem(FORM_STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Record<string, unknown>;
      const { areaValue, areaUnit, areaSqft, ...rest } = parsed;
      setForm((prev) => ({
        ...prev,
        ...rest,
        areaSqft:
          areaSqft != null
            ? Number(areaSqft)
            : areaValue != null
              ? convertToSqFt(Number(areaValue), (areaUnit as AreaUnit) ?? 'sqft')
              : prev.areaSqft,
      }));
    } finally {
      sessionStorage.removeItem(FORM_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (listing) {
      const l = listing as Record<string, unknown>;
      setForm({
        cityId: l.cityId as number,
        sectorId: l.sectorId as number,
        listingType: l.listingType as string,
        propertySubtype: l.propertySubtype as string,
        rentAmount: Number(l.rentAmount),
        areaSqft:
          l.areaSqftNormalized != null
            ? Number(l.areaSqftNormalized)
            : l.areaValue != null
              ? convertToSqFt(Number(l.areaValue), ((l.areaUnit as AreaUnit) ?? 'sqft'))
              : null,
        beds: l.beds != null ? Number(l.beds) : null,
        baths: l.baths != null ? Number(l.baths) : null,
        isStudio: Boolean(l.isStudio),
        isPenthouse: Boolean(l.isPenthouse),
        titleEn: l.titleEn as string,
        titleZh: (l.titleZh as string) ?? '',
        descriptionEn: (l.descriptionEn as string) ?? '',
        descriptionZh: (l.descriptionZh as string) ?? '',
        contactPhone: (l.contactPhone as string) ?? '',
        contactEmail: (l.contactEmail as string) ?? '',
      });
      setPhotos((l.photos as PhotoItem[]) ?? []);
      setListingStatus((l.status as string) ?? 'draft');
      setUploadMode(inferUploadModeFromPhotos((l.photos as PhotoItem[]) ?? []));
    }
  }, [listing]);

  useEffect(() => {
    if (subtypesForType.length === 0) return;
    if (!subtypesForType.some((s) => s.slug === form.propertySubtype)) {
      setForm((prev) => ({ ...prev, propertySubtype: subtypesForType[0]!.slug }));
    }
  }, [form.listingType, subtypesForType, form.propertySubtype]);

  const ensureListing = useCallback(async (): Promise<number> => {
    if (effectiveListingId) return effectiveListingId;
    if (!form.cityId || !form.sectorId) {
      throw new Error(t('admin.selectLocationFirst'));
    }

    sessionStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(form));
    const draft = await createDraftListing({
      cityId: form.cityId,
      sectorId: form.sectorId,
      listingType: form.listingType,
      propertySubtype: form.propertySubtype,
      titleEn: form.titleEn || undefined,
      rentAmount: form.rentAmount ?? undefined,
      areaValue: form.areaSqft ?? undefined,
      areaUnit: 'sqft',
      beds: form.beds,
      baths: form.baths,
      isStudio: form.isStudio,
      isPenthouse: form.isPenthouse,
      titleZh: form.titleZh || undefined,
      descriptionEn: form.descriptionEn || undefined,
      descriptionZh: form.descriptionZh || undefined,
      contactPhone: form.contactPhone || undefined,
      contactEmail: form.contactEmail || undefined,
    }).unwrap();

    setDraftId(draft.id);
    navigate(`/staff/listings/${draft.id}/edit`, { replace: true });
    return draft.id;
  }, [effectiveListingId, form, createDraftListing, navigate, t]);

  const handleDerivedBedsBaths = useCallback((beds: number | null, baths: number | null) => {
    setForm((prev) => ({ ...prev, beds, baths }));
  }, []);

  const handleSave = async () => {
    setSaveError(null);
    setSaveSuccess(false);

    if (!form.rentAmount) {
      setSaveError(t('admin.rentRequired'));
      return;
    }
    if (!form.cityId || !form.sectorId) {
      setSaveError(t('admin.selectLocationFirst'));
      return;
    }

    const payload = buildListingSavePayload(form);

    if (!effectiveListingId && !payload.titleEn) {
      setSaveError(t('admin.titleRequired'));
      return;
    }

    setIsSaving(true);
    try {
      if (effectiveListingId) {
        await updateListing({ id: effectiveListingId, data: payload }).unwrap();
        await refetch();
      } else {
        const created = await createListing(payload).unwrap();
        navigate(`/staff/listings/${(created as { id: number }).id}/edit`);
      }
      setSaveSuccess(true);
    } catch (err) {
      const apiError =
        err &&
        typeof err === 'object' &&
        'data' in err &&
        (err as { data?: { error?: string } }).data?.error;
      setSaveError(apiError ?? (err instanceof Error ? err.message : t('common.error')));
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (status: 'draft' | 'published' | 'inactive') => {
    if (!effectiveListingId || listingStatus === status) return;
    const label = t(`admin.${status}`);
    if (!window.confirm(t('admin.confirmStatusChange', { status: label }))) return;

    try {
      await updateStatus({ id: effectiveListingId, status }).unwrap();
      setListingStatus(status);
      await refetch();
    } catch (err) {
      const apiError =
        err &&
        typeof err === 'object' &&
        'data' in err &&
        (err as { data?: { error?: string } }).data?.error;
      setSaveError(apiError ?? (err instanceof Error ? err.message : t('common.error')));
    }
  };

  const handleMarkRented = async () => {
    if (!effectiveListingId || !rentedForm.rentAmount) return;
    await createRentalRecord({
      listingId: effectiveListingId,
      offerId: rentedForm.offerId ? Number(rentedForm.offerId) : undefined,
      tenantName: rentedForm.tenantName,
      tenantPhone: rentedForm.tenantPhone,
      rentAmount: rentedForm.rentAmount,
      source: rentedForm.source,
    }).unwrap();
    setListingStatus('rented_out');
    refetch();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        {isNew && !effectiveListingId ? t('admin.newListing') : t('admin.editListing')}
      </h1>

      {isListingLocked && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t('admin.listingLockedHelp')}
        </p>
      )}

      <div className="grid gap-4 rounded-xl bg-white p-5 shadow-sm md:grid-cols-2">
        <label>
          <span className="text-sm">{t('admin.selectCity')}</span>
          <select
            value={form.cityId || ''}
            onChange={(e) =>
              setForm({ ...form, cityId: Number(e.target.value), sectorId: 0 })
            }
            disabled={isListingLocked}
            className="mt-1 w-full rounded-lg border px-3 py-2 disabled:bg-gray-100"
          >
            <option value="">Select</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {labelFor(c.nameEn, c.nameZh, i18n.language, c.slug)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-sm">{t('admin.sector')}</span>
          <SearchableSelect
            options={sectorOptions}
            value={form.sectorId || null}
            onChange={(next) => setForm({ ...form, sectorId: Number(next) })}
            disabled={!form.cityId || isListingLocked}
            placeholder={t('admin.selectSector')}
            searchPlaceholder={t('search.searchSectors')}
            emptyMessage={t('search.noSectors')}
            className="mt-1"
          />
        </label>
        <label>
          <span className="text-sm">Type</span>
          <select
            value={form.listingType}
            onChange={(e) => {
              const typeSlug = e.target.value;
              const firstSubtype = propertySubtypes.find(
                (s) => propertyTypes.find((pt) => pt.id === s.propertyTypeId)?.slug === typeSlug,
              );
              setForm({
                ...form,
                listingType: typeSlug,
                propertySubtype: firstSubtype?.slug ?? form.propertySubtype,
              });
            }}
            disabled={isListingLocked}
            className="mt-1 w-full rounded-lg border px-3 py-2 disabled:bg-gray-100"
          >
            {propertyTypes.map((type) => (
              <option key={type.id} value={type.slug}>
                {labelFor(type.nameEn, type.nameZh, i18n.language, type.slug)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-sm">Subtype</span>
          <select
            value={form.propertySubtype}
            onChange={(e) => setForm({ ...form, propertySubtype: e.target.value })}
            disabled={isListingLocked}
            className="mt-1 w-full rounded-lg border px-3 py-2 disabled:bg-gray-100"
          >
            {subtypesForType.map((subtype) => (
              <option key={subtype.id} value={subtype.slug}>
                {labelFor(subtype.nameEn, subtype.nameZh, i18n.language, subtype.slug)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 rounded-xl bg-white p-5 shadow-sm md:grid-cols-2">
        <label>
          <span className="text-sm">{t('admin.rentAmount')}</span>
          <NumberInput
            min={0}
            value={form.rentAmount}
            onValueChange={(rentAmount) => setForm({ ...form, rentAmount })}
            disabled={isListingLocked}
            className="mt-1 w-full rounded-lg border px-3 py-2 disabled:bg-gray-100"
            required
          />
        </label>
        <div>
          <AreaInput
            areaSqft={form.areaSqft}
            onAreaSqftChange={(areaSqft) => setForm({ ...form, areaSqft })}
            disabled={isListingLocked}
          />
        </div>
        <label>
          <span className="text-sm">{t('admin.titleEn')}</span>
          <input
            value={form.titleEn}
            onChange={(e) => setForm({ ...form, titleEn: e.target.value })}
            disabled={isListingLocked}
            className="mt-1 w-full rounded-lg border px-3 py-2 disabled:bg-gray-100"
          />
        </label>
        <label>
          <span className="text-sm">{t('admin.titleZh')}</span>
          <input
            value={form.titleZh}
            onChange={(e) => setForm({ ...form, titleZh: e.target.value })}
            disabled={isListingLocked}
            className="mt-1 w-full rounded-lg border px-3 py-2 disabled:bg-gray-100"
          />
        </label>
        <label className="md:col-span-2">
          <span className="text-sm">{t('admin.descriptionEn')}</span>
          <textarea
            value={form.descriptionEn}
            onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })}
            disabled={isListingLocked}
            className="mt-1 w-full rounded-lg border px-3 py-2 disabled:bg-gray-100"
            rows={3}
          />
        </label>
      </div>

      <ListingPhotoUpload
        listingId={effectiveListingId}
        listingType={form.listingType}
        propertySubtype={form.propertySubtype}
        photos={photos}
        uploadMode={uploadMode}
        onUploadModeChange={setUploadMode}
        onEnsureListing={ensureListing}
        onDerivedBedsBaths={handleDerivedBedsBaths}
        onRefetch={refetch}
        readOnly={isListingLocked}
      />

      <div className="grid gap-4 rounded-xl bg-white p-5 shadow-sm md:grid-cols-2">
        {!isStructuredResidential && (
          <>
            <label>
              <span className="text-sm">Beds</span>
              <NumberInput
                min={0}
                value={form.beds}
                onValueChange={(beds) => setForm({ ...form, beds })}
                disabled={isListingLocked}
                className="mt-1 w-full rounded-lg border px-3 py-2 disabled:bg-gray-100"
              />
            </label>
            <label>
              <span className="text-sm">Baths</span>
              <NumberInput
                min={0}
                value={form.baths}
                onValueChange={(baths) => setForm({ ...form, baths })}
                disabled={isListingLocked}
                className="mt-1 w-full rounded-lg border px-3 py-2 disabled:bg-gray-100"
              />
            </label>
            {uploadMode === 'bulk' && form.listingType === 'residential' && !isListingLocked && (
              <p className="md:col-span-2 text-xs text-gray-500">{t('admin.bulkBedsHint')}</p>
            )}
          </>
        )}
        <label>
          <span className="text-sm">Contact Phone</span>
          <input
            value={form.contactPhone}
            onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
            disabled={isListingLocked}
            className="mt-1 w-full rounded-lg border px-3 py-2 disabled:bg-gray-100"
          />
        </label>
        <label>
          <span className="text-sm">Contact Email</span>
          <input
            value={form.contactEmail}
            onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
            disabled={isListingLocked}
            className="mt-1 w-full rounded-lg border px-3 py-2 disabled:bg-gray-100"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving || isListingLocked}
        className="rounded-xl bg-brand px-6 py-3 font-semibold text-white disabled:opacity-50"
      >
        {isSaving ? t('common.loading') : t('admin.save')}
      </button>
      {saveError && <p className="text-sm text-red-600">{saveError}</p>}
      {saveSuccess && <p className="text-sm text-green-600">{t('admin.saveSuccess')}</p>}

      {effectiveListingId && (
        <>
          <section className="rounded-xl bg-white p-5 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h2 className="font-semibold">{t('admin.status')}</h2>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium">
                {t(`admin.${listingStatus}`)}
              </span>
            </div>
            <p className="mb-3 text-sm text-gray-600">{t('admin.statusHelp')}</p>
            <div className="flex flex-wrap gap-2">
              {(['draft', 'published', 'inactive'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => void handleStatusChange(status)}
                  disabled={listingStatus === status}
                  className={`rounded-lg border px-3 py-1 text-sm ${
                    listingStatus === status
                      ? 'border-brand bg-brand text-white'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {t(`admin.${status}`)}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold">{t('admin.markRented')}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <select
                value={rentedForm.offerId}
                onChange={(e) => {
                  const offer = (offers as Array<{ id: number; name: string; offeredRent: number | null }>).find(
                    (o) => o.id === Number(e.target.value),
                  );
                  setRentedForm({
                    ...rentedForm,
                    offerId: e.target.value,
                    source: 'app_offer',
                    tenantName: offer?.name ?? rentedForm.tenantName,
                    rentAmount: offer?.offeredRent ?? rentedForm.rentAmount,
                  });
                }}
                className="rounded-lg border px-3 py-2"
              >
                <option value="">Select offer (optional)</option>
                {(offers as Array<{ id: number; name: string }>).map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
              <input
                placeholder="Tenant name"
                value={rentedForm.tenantName}
                onChange={(e) => setRentedForm({ ...rentedForm, tenantName: e.target.value, source: 'offline' })}
                className="rounded-lg border px-3 py-2"
              />
              <NumberInput
                min={0}
                placeholder="Rent amount"
                value={rentedForm.rentAmount}
                onValueChange={(rentAmount) =>
                  setRentedForm({ ...rentedForm, rentAmount: rentAmount ?? null })
                }
                className="rounded-lg border px-3 py-2"
              />
              <button
                type="button"
                onClick={handleMarkRented}
                className="rounded-lg bg-brand px-4 py-2 text-white"
              >
                {t('admin.markRented')}
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
