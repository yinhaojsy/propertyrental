import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const SWIPE_THRESHOLD_PX = 50;
const SNAP_MS = 280;

/** Shared across carousel instances so lightbox reuses images loaded in the gallery. */
const globalLoadedUrls = new Set<string>();

interface PhotoSwipeCarouselProps {
  urls: string[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
  alt: string;
  className?: string;
  /** When false, skips preloading (e.g. thumbnails only). */
  preload?: boolean;
  showNavButtons?: 'always' | 'desktop' | 'never';
  prevLabel?: string;
  nextLabel?: string;
  /** Fired on tap (little or no horizontal movement). */
  onTap?: () => void;
}

function useImageLoadCache(urls: string[], enabled: boolean) {
  const [version, setVersion] = useState(0);

  const markLoaded = useCallback((url: string) => {
    if (!url || globalLoadedUrls.has(url)) return;
    globalLoadedUrls.add(url);
    setVersion((v) => v + 1);
  }, []);

  const isLoaded = useCallback(
    (url: string) => !!url && globalLoadedUrls.has(url),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- version busts cache reads
    [version],
  );

  useEffect(() => {
    if (!enabled) return;
    for (const url of urls) {
      if (!url || globalLoadedUrls.has(url)) continue;
      const img = new Image();
      img.onload = () => markLoaded(url);
      img.onerror = () => markLoaded(url);
      img.src = url;
    }
  }, [enabled, urls, markLoaded]);

  return { isLoaded, markLoaded };
}

function CarouselSlide({
  url,
  alt,
  loaded,
  onLoaded,
}: {
  url: string;
  alt: string;
  loaded: boolean;
  onLoaded: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="relative flex h-full w-full shrink-0 items-center justify-center">
      {!loaded && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40"
          aria-hidden={loaded}
        >
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/25 border-t-white" />
          <span className="text-xs text-white/70">{t('common.loading')}</span>
        </div>
      )}
      <img
        src={url}
        alt={alt}
        className={`max-h-full max-w-full select-none object-contain transition-opacity duration-200 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
        draggable={false}
        onLoad={onLoaded}
      />
    </div>
  );
}

export function PhotoSwipeCarousel({
  urls,
  activeIndex,
  onIndexChange,
  alt,
  className = '',
  preload = true,
  showNavButtons = 'desktop',
  prevLabel = 'Previous',
  nextLabel = 'Next',
  onTap,
}: PhotoSwipeCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const lastTouchEndRef = useRef(0);
  const dragXRef = useRef(0);
  const [dragX, setDragX] = useState(0);
  const [isSnapping, setIsSnapping] = useState(false);
  const snapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { isLoaded, markLoaded } = useImageLoadCache(urls, preload);

  const containerWidth = () => containerRef.current?.clientWidth ?? 0;

  const clearSnapTimer = () => {
    if (snapTimerRef.current) {
      clearTimeout(snapTimerRef.current);
      snapTimerRef.current = null;
    }
  };

  useEffect(() => clearSnapTimer, []);

  const finishSnap = useCallback(
    (nextIndex: number | null) => {
      setIsSnapping(true);
      setDragX(0);
      snapTimerRef.current = setTimeout(() => {
        if (nextIndex != null) onIndexChange(nextIndex);
        setIsSnapping(false);
        dragXRef.current = 0;
      }, SNAP_MS);
    },
    [onIndexChange],
  );

  const animateSlide = useCallback(
    (direction: 1 | -1, nextIndex: number, fromDrag = 0) => {
      const w = containerWidth();
      if (w <= 0) {
        onIndexChange(nextIndex);
        return;
      }
      clearSnapTimer();
      setIsSnapping(false);
      setDragX(fromDrag);
      dragXRef.current = fromDrag;
      requestAnimationFrame(() => {
        setIsSnapping(true);
        const target = direction * -w;
        setDragX(target);
        dragXRef.current = target;
      });
      snapTimerRef.current = setTimeout(() => {
        onIndexChange(nextIndex);
        setIsSnapping(false);
        setDragX(0);
        dragXRef.current = 0;
      }, SNAP_MS);
    },
    [onIndexChange],
  );

  const goNext = useCallback(() => {
    if (urls.length <= 1) return;
    const next = activeIndex === urls.length - 1 ? 0 : activeIndex + 1;
    animateSlide(1, next, 0);
  }, [activeIndex, animateSlide, urls.length]);

  const goPrev = useCallback(() => {
    if (urls.length <= 1) return;
    const next = activeIndex === 0 ? urls.length - 1 : activeIndex - 1;
    animateSlide(-1, next, 0);
  }, [activeIndex, animateSlide, urls.length]);

  const onTouchStart = (e: React.TouchEvent) => {
    if (isSnapping) return;
    clearSnapTimer();
    touchStartX.current = e.touches[0]?.clientX ?? null;
    dragXRef.current = 0;
    setDragX(0);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current == null || isSnapping) return;
    const delta = (e.touches[0]?.clientX ?? 0) - touchStartX.current;
    const w = containerWidth();
    const maxDrag = w * 0.45;
    const clamped =
      urls.length <= 1
        ? 0
        : Math.max(-maxDrag, Math.min(maxDrag, delta));
    dragXRef.current = clamped;
    setDragX(clamped);
  };

  const onTouchEnd = () => {
    if (touchStartX.current == null || isSnapping) return;
    const delta = dragXRef.current;
    touchStartX.current = null;
    lastTouchEndRef.current = Date.now();

    if (Math.abs(delta) <= 10) {
      onTap?.();
    }

    if (urls.length <= 1 || Math.abs(delta) <= SWIPE_THRESHOLD_PX) {
      finishSnap(null);
      return;
    }

    if (delta < 0) {
      const next = activeIndex === urls.length - 1 ? 0 : activeIndex + 1;
      animateSlide(1, next, delta);
    } else {
      const next = activeIndex === 0 ? urls.length - 1 : activeIndex - 1;
      animateSlide(-1, next, delta);
    }
  };

  if (urls.length === 0) return null;

  const trackStyle: React.CSSProperties = {
    transform: `translateX(calc(-${activeIndex * 100}% + ${dragX}px))`,
    transition: isSnapping ? `transform ${SNAP_MS}ms ease-out` : 'none',
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}${onTap ? ' cursor-zoom-in' : ''}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onClick={(e) => {
        if (!onTap) return;
        if (Date.now() - lastTouchEndRef.current < 400) return;
        if ((e.target as HTMLElement).closest('button')) return;
        onTap();
      }}
    >
      <div className="flex h-full" style={trackStyle}>
        {urls.map((url, index) => (
          <div key={`${index}-${url}`} className="h-full w-full shrink-0">
            <CarouselSlide
              url={url}
              alt={alt}
              loaded={isLoaded(url)}
              onLoaded={() => markLoaded(url)}
            />
          </div>
        ))}
      </div>

      {urls.length > 1 && showNavButtons !== 'never' && (
        <>
          <button
            type="button"
            onClick={goPrev}
            className={`absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-xl text-white hover:bg-black/70 sm:h-12 sm:w-12 sm:text-2xl ${
              showNavButtons === 'desktop' ? 'hidden sm:flex' : ''
            }`}
            aria-label={prevLabel}
          >
            ‹
          </button>
          <button
            type="button"
            onClick={goNext}
            className={`absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-xl text-white hover:bg-black/70 sm:h-12 sm:w-12 sm:text-2xl ${
              showNavButtons === 'desktop' ? 'hidden sm:flex' : ''
            }`}
            aria-label={nextLabel}
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}
