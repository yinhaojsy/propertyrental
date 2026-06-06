import { useTranslation } from 'react-i18next';

interface LanguageToggleProps {
  className?: string;
  variant?: 'light' | 'dark';
}

export function LanguageToggle({ className = '', variant = 'light' }: LanguageToggleProps) {
  const { i18n } = useTranslation();
  const isZh = i18n.language.startsWith('zh');

  const base =
    variant === 'dark'
      ? 'rounded-lg border border-slate-600 text-xs font-medium text-slate-200'
      : 'rounded-lg border border-gray-200 text-xs font-medium text-gray-600';

  const active =
    variant === 'dark' ? 'text-white font-semibold' : 'text-brand font-semibold';

  const inactive =
    variant === 'dark'
      ? 'text-slate-400 hover:text-slate-200'
      : 'text-gray-500 hover:text-gray-800';

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-1 ${base} ${className}`}
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        onClick={() => i18n.changeLanguage('en')}
        className={isZh ? inactive : active}
        aria-pressed={!isZh}
      >
        EN
      </button>
      <span className={variant === 'dark' ? 'text-slate-600' : 'text-gray-300'}>|</span>
      <button
        type="button"
        onClick={() => i18n.changeLanguage('zh')}
        className={isZh ? active : inactive}
        aria-pressed={isZh}
      >
        中文
      </button>
    </div>
  );
}
