export function labelFor(
  nameEn: string,
  nameZh: string | null | undefined,
  locale: string,
  fallback?: string,
): string {
  if (locale.startsWith('zh') && nameZh) return nameZh;
  return nameEn || fallback || '';
}
