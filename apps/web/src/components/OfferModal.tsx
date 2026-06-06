import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetMeQuery, useCreateOfferMutation } from '../store/api';
import { NumberInput } from './NumberInput';

interface OfferModalProps {
  listingId: number;
  onClose: () => void;
}

function formatOfferError(err: unknown, t: (key: string) => string): string {
  if (err && typeof err === 'object' && 'data' in err) {
    const data = (err as {
      data?: { error?: string; details?: Array<{ path: (string | number)[]; message: string }> };
    }).data;

    if (data?.details?.length) {
      return data.details
        .map((detail) => {
          const field = detail.path[0];
          if (field === 'phone' && detail.message.includes('5')) return t('offer.phoneInvalid');
          if (field === 'email') return t('offer.emailInvalid');
          if (field === 'offeredRent') return t('offer.rentInvalid');
          return detail.message;
        })
        .join(' ');
    }

    if (data?.error === 'Listing not found') return t('offer.listingUnavailable');
    return data?.error ?? t('common.error');
  }

  return t('common.error');
}

export function OfferModal({ listingId, onClose }: OfferModalProps) {
  const { t } = useTranslation();
  const { data: meData } = useGetMeQuery();
  const [createOffer, { isLoading, isSuccess }] = useCreateOfferMutation();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    offeredRent: '',
    message: '',
  });

  useEffect(() => {
    if (!meData?.user) return;
    setForm((prev) => ({
      ...prev,
      name: prev.name || meData.user.name,
      phone: prev.phone || meData.user.phone || '',
      email: prev.email || meData.user.email,
    }));
  }, [meData?.user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await createOffer({
        listingId,
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        offeredRent: form.offeredRent ? Number(form.offeredRent) : undefined,
        message: form.message.trim() || undefined,
      }).unwrap();
    } catch (err) {
      setError(formatOfferError(err, t));
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{t('offer.title')}</h3>
          <button type="button" onClick={onClose} className="text-gray-400">
            ✕
          </button>
        </div>

        {isSuccess ? (
          <p className="py-8 text-center text-brand">{t('offer.success')}</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {meData?.user ? (
              <p className="text-xs text-gray-500">
                {t('offer.signedInAs', { name: meData.user.name })}
              </p>
            ) : (
              <p className="text-xs text-gray-500">{t('offer.loginHint')}</p>
            )}
            <label className="block">
              <span className="text-sm font-medium">{t('offer.name')}</span>
              <input
                required
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">{t('offer.phone')}</span>
              <input
                required
                type="tel"
                minLength={5}
                maxLength={20}
                placeholder="03123456789"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">{t('offer.email')}</span>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">{t('offer.offeredRent')}</span>
              <NumberInput
                min={1}
                value={form.offeredRent ? Number(form.offeredRent) : null}
                onValueChange={(value) =>
                  setForm({ ...form, offeredRent: value != null ? String(value) : '' })
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">{t('offer.message')}</span>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                rows={3}
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-brand py-3 font-semibold text-white disabled:opacity-50"
            >
              {isLoading ? t('common.loading') : t('offer.submit')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
