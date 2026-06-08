import { useTranslation } from 'react-i18next';
import type { ListingBadge } from '../store/api';

interface ListingBadgesOverlayProps {
  badges?: ListingBadge[];
  className?: string;
}

export function ListingBadgesOverlay({ badges, className = '' }: ListingBadgesOverlayProps) {
  const { i18n } = useTranslation();

  if (!badges?.length) return null;

  return (
    <div className={`absolute left-2 top-2 z-10 flex max-w-[calc(100%-1rem)] flex-col gap-1 ${className}`}>
      {badges.map((badge) => {
        const label =
          i18n.language.startsWith('zh') && badge.labelZh ? badge.labelZh : badge.labelEn;
        return (
          <span
            key={badge.id}
            className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide shadow-sm sm:text-xs"
            style={{
              backgroundColor: badge.backgroundColor,
              color: badge.textColor,
            }}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}
