import type { HeroConfig } from "@/types/hero";

// Most slides allowed in each of the desktop and mobile sets.
export const MAX_SLIDES = 3;
export const INTERVAL_OPTIONS_MS = [3000, 5000, 7000, 10000] as const;

// The default hero is three photos in public/hero_images, with the heading, supporting text and
// button over them. The mobile set starts empty: phones borrow these same slides (cropped to 16:9)
// until mobile versions are added. Swap the images, or turn the text off, from the admin Hero tab.
export const DEFAULT_HERO_CONFIG: HeroConfig = {
  showTextOverlay: true,
  heading: "Carnes frescas de Maldonado",
  subtext: "Cortes seleccionados, achuras y packs parrilleros. Elegí lo que necesitás y pedí por WhatsApp.",
  desktopSlides: [
    { id: "hero-steak", imageUrl: "/hero_images/steak.jfif", altText: "Bife de carne vacuna" },
    { id: "hero-chorizos", imageUrl: "/hero_images/chorizos.jfif", altText: "Chorizos frescos" },
    { id: "hero-chicken", imageUrl: "/hero_images/chicken.jfif", altText: "Pollo fresco" },
  ],
  mobileSlides: [],
  autoplayIntervalMs: 3000,
  enableAutoplay: true,
  showNavTitle: true,
  overlayDarkness: 0,
  overlayColor: "#6b3e22",
  overlayColorOpacity: 0,
};

export const MAX_DARKNESS = 90;
export const MAX_COLOR_OPACITY = 80;
