/** Format rent like local portals (e.g. PKR 9.5 Lakh). */
export function formatRentPKR(amount: number, currency = 'PKR'): string {
  if (amount >= 10_000_000) {
    const crore = amount / 10_000_000;
    const value = crore >= 10 ? crore.toFixed(0) : crore.toFixed(1).replace(/\.0$/, '');
    return `${currency} ${value} Crore`;
  }
  if (amount >= 100_000) {
    const lakh = amount / 100_000;
    const value = lakh >= 10 ? lakh.toFixed(0) : lakh.toFixed(1).replace(/\.0$/, '');
    return `${currency} ${value} Lakh`;
  }
  return `${currency} ${amount.toLocaleString()}`;
}

export function whatsAppUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '');
  const normalized = digits.startsWith('92') ? digits : digits.replace(/^0/, '92');
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function slugLabel(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const ONE_MB = 1024 * 1024;

export function formatFileSize(bytes: number): string {
  if (bytes >= ONE_MB) {
    return `${(bytes / ONE_MB).toFixed(2)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
