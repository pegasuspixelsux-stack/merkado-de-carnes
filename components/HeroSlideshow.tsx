"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import type { HeroConfig, Slide } from "@/types/hero";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const DESKTOP = "(min-width: 768px)"; // matches the nav's md breakpoint

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

function subscribeDesktop(onChange: () => void) {
  const mq = window.matchMedia(DESKTOP);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

// "desktop" or "mobile" on the client. On the server the width is unknown (null), so no photo is
// requested until the page hydrates. That way a phone never downloads the desktop image first.
function useDevice(): "desktop" | "mobile" | null {
  return useSyncExternalStore(
    subscribeDesktop,
    () => (window.matchMedia(DESKTOP).matches ? "desktop" : "mobile"),
    () => null,
  );
}

// One slide image. A broken link hides itself so the solid background shows instead of a broken icon.
function SlideImage({
  slide,
  active,
  index,
  count,
  first,
}: {
  slide: Slide;
  active: boolean;
  index: number;
  count: number;
  first: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <div
      role="group"
      aria-roledescription="diapositiva"
      aria-label={`${index + 1} de ${count}`}
      aria-hidden={!active}
      className={`absolute inset-0 transition-opacity duration-700 ease-in-out motion-reduce:transition-none ${
        active ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Admin-supplied images can come from anywhere (links or uploads), so a plain <img> is used. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={slide.imageUrl}
        alt={slide.altText ?? ""}
        loading={first ? "eager" : "lazy"}
        fetchPriority={first ? "high" : "auto"}
        decoding="async"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
    </div>
  );
}

// Breaks a heading into two rows at the space closest to its middle. One-word headings stay whole.
function splitInTwo(text: string): string[] {
  const t = text.trim();
  const mid = t.length / 2;
  let best = -1;
  for (let i = 0; i < t.length; i++) {
    if (
      t[i] === " " &&
      (best === -1 || Math.abs(i - mid) < Math.abs(best - mid))
    )
      best = i;
  }
  return best === -1 ? [t] : [t.slice(0, best), t.slice(best + 1)];
}

const arrowBtn =
  "absolute top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/30 text-white backdrop-blur-md transition-colors hover:bg-black/50 active:scale-95 md:grid";

// A full-width, square hero driven by HeroConfig. It crossfades between slides, optionally shows
// the heading and supporting text over them, and is a size container, so the type scales with the
// hero's own width (cqw units) and always fits. On wide screens the height is capped at one
// viewport minus the nav bar above it.
export default function HeroSlideshow({ config }: { config: HeroConfig }) {
  const {
    desktopSlides,
    mobileSlides,
    showTextOverlay,
    heading,
    subtext,
    enableAutoplay,
    autoplayIntervalMs,
    overlayDarkness,
    overlayColor,
    overlayColorOpacity,
  } = config;

  // Phones use the mobile set and wider screens the desktop set. A phone with fewer than two mobile
  // slides would show a still image, so it borrows the desktop set when that one can rotate. If a
  // set is empty, the other one fills in so the hero is never bare.
  const device = useDevice();
  const mobileSet =
    mobileSlides.length >= 2 ||
    (mobileSlides.length > 0 && desktopSlides.length < 2);
  const slides =
    device === null
      ? []
      : device === "mobile"
        ? mobileSet
          ? mobileSlides
          : desktopSlides.length
            ? desktopSlides
            : mobileSlides
        : desktopSlides.length
          ? desktopSlides
          : mobileSlides;
  const count = slides.length;

  const reducedMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [engaged, setEngaged] = useState(false); // pointer over or focus inside: don't move it

  // Slides can be removed in the admin while this is mounted, so keep the index in range.
  const current = count ? index % count : 0;
  const autoplaying =
    enableAutoplay && count > 1 && !reducedMotion && !userPaused && !engaged;

  // The timer restarts whenever `current` changes, so manual navigation resets the countdown.
  useEffect(() => {
    if (!autoplaying) return;
    const t = setTimeout(
      () => setIndex((current + 1) % count),
      autoplayIntervalMs,
    );
    return () => clearTimeout(t);
  }, [autoplaying, current, count, autoplayIntervalMs]);

  const go = (n: number) => setIndex(((n % count) + count) % count);

  return (
    <section
      aria-roledescription="carrusel"
      aria-labelledby="hero-title"
      onPointerEnter={(e) => e.pointerType === "mouse" && setEngaged(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setEngaged(false)}
      onFocusCapture={() => setEngaged(true)}
      onBlurCapture={() => setEngaged(false)}
      className="@container relative aspect-video md:aspect-square max-h-[calc(100dvh-4rem)] w-full md:max-h-[calc(100dvh-3.5rem)] overflow-hidden bg-zinc-900"
    >
      {/* With no slides this stays a quiet solid background. */}
      {count === 0 && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(70%_70%_at_50%_30%,rgb(255_255_255/0.10),transparent_70%)]"
        />
      )}

      <div
        className="absolute inset-0"
        aria-live={autoplaying ? "off" : "polite"}
      >
        {slides.map((slide, i) => (
          <SlideImage
            key={slide.id}
            slide={slide}
            active={i === current}
            index={i}
            count={count}
            first={i === 0}
          />
        ))}
      </div>

      {/* Colour and darkness overlays, set in the admin. Colour sits under the darkness layer. */}
      {overlayColorOpacity > 0 && (
        <div
          aria-hidden="true"
          className="absolute inset-0 transition-opacity duration-300 motion-reduce:transition-none"
          style={{
            backgroundColor: overlayColor,
            opacity: overlayColorOpacity / 100,
          }}
        />
      )}
      {overlayDarkness > 0 && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-black transition-opacity duration-300 motion-reduce:transition-none"
          style={{ opacity: overlayDarkness / 100 }}
        />
      )}

      {/* Scrim. Darker and even when text sits on top. Photo-only heroes get just a light touch for the dots, so artwork keeps its colours. */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 ${
          showTextOverlay
            ? "bg-gradient-to-r from-black/75 via-black/35 to-transparent"
            : "bg-gradient-to-b from-transparent via-transparent to-black/20"
        }`}
      />

      {showTextOverlay ? (
        // Left-aligned on phones; a left-hand column from md up.
        // The text block lines up with the 1440px page column on wide screens.
        <div className="relative mx-auto h-full w-full max-w-[1440px]">
          <div className="pointer-events-none relative flex h-full flex-col items-start justify-center p-[clamp(1rem,5cqw,3rem)] text-left md:w-[45%]">
            <h1
              id="hero-title"
              className="text-balance font-semibold leading-[1.02] tracking-tight text-white text-[clamp(1.5rem,6cqw,4rem)] [text-shadow:0_2px_24px_rgb(0_0_0/0.45)]"
            >
              {splitInTwo(heading).map((line, i) => (
                <span key={i} className="block">
                  {line.split(/(punto exacto)/i).map((part, j) =>
                    /^punto exacto$/i.test(part) ? (
                      <span key={j} className="text-amber-400">
                        {part}
                      </span>
                    ) : (
                      part
                    ),
                  )}
                </span>
              ))}
            </h1>
            {subtext && (
              <p className="mt-[clamp(0.375rem,1.5cqw,1rem)] max-w-[34ch] text-pretty leading-snug text-white/85 text-[clamp(0.8125rem,2.4cqw,1.25rem)] [text-shadow:0_1px_12px_rgb(0_0_0/0.4)]">
                {subtext}
              </p>
            )}
            <a
              href="#catalog"
              className="pointer-events-auto mt-[clamp(0.75rem,2.5cqw,1.5rem)] inline-flex items-center rounded-full bg-chestnut px-[clamp(1rem,3cqw,2rem)] py-[clamp(0.5rem,1.4cqw,0.875rem)] text-[clamp(0.8125rem,1.8cqw,1.0625rem)] font-medium text-white transition-colors hover:bg-chestnut-hover"
            >
              Ver catálogo
            </a>
          </div>
        </div>
      ) : (
        // Text is off, but the page still needs a heading for screen readers and search engines.
        <h1 id="hero-title" className="sr-only">
          {heading || "Catálogo de Merkado"}
        </h1>
      )}

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(current - 1)}
            aria-label="Diapositiva anterior"
            className={`${arrowBtn} left-3 sm:left-5`}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => go(current + 1)}
            aria-label="Diapositiva siguiente"
            className={`${arrowBtn} right-3 sm:right-5`}
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="absolute inset-x-0 bottom-3 flex items-center justify-center sm:bottom-5">
            <div className="flex items-center rounded-full bg-black/25 px-1.5 backdrop-blur-md">
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Ir a la diapositiva ${i + 1}`}
                  aria-current={i === current ? "true" : undefined}
                  className="grid h-7 w-6 place-items-center"
                >
                  <span
                    className={`block h-2 rounded-full bg-white transition-all duration-300 motion-reduce:transition-none ${
                      i === current ? "w-5 opacity-100" : "w-2 opacity-50"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {enableAutoplay && !reducedMotion && (
            <button
              type="button"
              onClick={() => setUserPaused((p) => !p)}
              aria-label={
                userPaused
                  ? "Reanudar la presentación"
                  : "Pausar la presentación"
              }
              className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-black/30 text-white backdrop-blur-md transition-colors hover:bg-black/50 sm:bottom-5 sm:right-5"
            >
              {userPaused ? (
                <Play className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Pause className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          )}
        </>
      )}
    </section>
  );
}
