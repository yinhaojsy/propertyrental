import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DEFAULT_PHOTO_COMPRESSION_SETTINGS,
  type PhotoCompressionSettings,
} from '@property-rental/shared';
import {
  useGetPhotoCompressionSettingsQuery,
  useUpdatePhotoCompressionSettingsMutation,
} from '../../store/api';

const BYTES_PER_MB = 1024 * 1024;
const DEFAULT_QUALITY = DEFAULT_PHOTO_COMPRESSION_SETTINGS.quality;

function bytesToMb(bytes: number): number {
  return Math.round((bytes / BYTES_PER_MB) * 10) / 10;
}

function mbToBytes(mb: number): number {
  return Math.round(mb * BYTES_PER_MB);
}

type TabId = 'photo-compression';

export function AdminSettingsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>('photo-compression');
  const { data, isLoading } = useGetPhotoCompressionSettingsQuery();
  const [updateSettings, { isLoading: isSaving }] = useUpdatePhotoCompressionSettingsMutation();

  const [form, setForm] = useState({
    enabled: true,
    minMb: 1.5,
    quality: DEFAULT_QUALITY,
    maxOutputMb: '' as string,
  });
  const [saved, setSaved] = useState(false);

  const maxOutputActive = form.maxOutputMb.trim() !== '';
  const qualityDisabled = !form.enabled || maxOutputActive;

  useEffect(() => {
    if (!data) return;
    setForm({
      enabled: data.enabled,
      minMb: bytesToMb(data.minBytes),
      quality: data.quality,
      maxOutputMb: data.maxOutputBytes != null ? String(bytesToMb(data.maxOutputBytes)) : '',
    });
  }, [data]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);

    const maxOutputMb = form.maxOutputMb.trim();
    const payload: PhotoCompressionSettings = {
      enabled: form.enabled,
      minBytes: mbToBytes(form.minMb),
      quality: form.quality,
      maxOutputBytes:
        maxOutputMb === '' ? null : mbToBytes(Number.parseFloat(maxOutputMb)),
    };

    await updateSettings(payload).unwrap();
    setSaved(true);
  };

  if (isLoading) return <p>{t('common.loading')}</p>;

  const tabs: { id: TabId; label: string }[] = [
    { id: 'photo-compression', label: t('admin.photoCompressionTab') },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('admin.settingsTitle')}</h1>
        <p className="mt-1 text-sm text-gray-600">{t('admin.settingsHelp')}</p>
      </div>

      <div className="rounded-xl bg-white shadow-sm">
        <div className="flex gap-1 border-b border-slate-200 p-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                activeTab === tab.id
                  ? 'bg-brand text-white'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'photo-compression' && (
          <form onSubmit={handleSave} className="space-y-5 p-5">
            <p className="text-sm text-gray-600">{t('admin.photoCompressionHelp')}</p>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm font-medium">{t('admin.photoCompressionEnabled')}</span>
            </label>
            <p className="-mt-2 text-xs text-gray-500">{t('admin.photoCompressionEnabledHelp')}</p>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium">{t('admin.photoCompressionMinSize')}</span>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={form.minMb}
                    onChange={(e) =>
                      setForm({ ...form, minMb: Number.parseFloat(e.target.value) || 0 })
                    }
                    disabled={!form.enabled}
                    className="w-full rounded-lg border px-3 py-2 disabled:bg-slate-50"
                  />
                  <span className="text-gray-500">MB</span>
                </div>
                <span className="mt-1 block text-xs text-gray-500">
                  {t('admin.photoCompressionMinSizeHelp')}
                </span>
              </label>

              <label className="block text-sm">
                <span className="font-medium">{t('admin.photoCompressionQuality')}</span>
                <div className="mt-1 flex items-center gap-3">
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={form.quality}
                    onChange={(e) =>
                      setForm({ ...form, quality: Number.parseInt(e.target.value, 10) })
                    }
                    disabled={qualityDisabled}
                    className="flex-1 disabled:opacity-40"
                  />
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={form.quality}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        quality: Math.min(
                          100,
                          Math.max(10, Number.parseInt(e.target.value, 10) || DEFAULT_QUALITY),
                        ),
                      })
                    }
                    disabled={qualityDisabled}
                    className="w-16 rounded-lg border px-2 py-2 text-center disabled:bg-slate-100 disabled:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, quality: DEFAULT_QUALITY })}
                    disabled={qualityDisabled}
                    className="shrink-0 rounded-lg border px-2 py-2 text-xs font-medium text-gray-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-slate-100 disabled:text-gray-400"
                    title={t('admin.photoCompressionQualityReset')}
                  >
                    {DEFAULT_QUALITY}
                  </button>
                </div>
                <span className="mt-1 block text-xs text-gray-500">
                  {maxOutputActive
                    ? t('admin.photoCompressionQualityAutoHelp')
                    : t('admin.photoCompressionQualityHelp')}
                </span>
              </label>

              <label className="block text-sm md:col-span-2">
                <span className="font-medium">{t('admin.photoCompressionMaxOutput')}</span>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    placeholder={t('admin.photoCompressionMaxOutputPlaceholder')}
                    value={form.maxOutputMb}
                    onChange={(e) => setForm({ ...form, maxOutputMb: e.target.value })}
                    disabled={!form.enabled}
                    className="w-full max-w-xs rounded-lg border px-3 py-2 disabled:bg-slate-50"
                  />
                  <span className="text-gray-500">MB</span>
                </div>
                <span className="mt-1 block text-xs text-gray-500">
                  {t('admin.photoCompressionMaxOutputHelp')}
                </span>
              </label>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {isSaving ? t('common.loading') : t('admin.save')}
              </button>
              {saved && (
                <span className="text-sm text-green-600">{t('admin.settingsSaved')}</span>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
