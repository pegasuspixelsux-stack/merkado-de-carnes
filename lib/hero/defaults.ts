import type { HeroConfig } from "@/types/hero";

// Most slides allowed in each of the desktop and mobile sets.
export const MAX_SLIDES = 3;
export const INTERVAL_OPTIONS_MS = [3000, 5000, 7000, 10000] as const;

// The default hero is three promo banners in public/hero_images. Their artwork already carries its
// own text, so the heading and supporting text overlay starts switched off (the heading below
// still serves as the page's hidden h1). The mobile set starts empty: phones borrow these same
// slides (cropped square) until square mobile versions are added. Turn the overlay on, or swap the
// images, from the admin Hero tab.
export const DEFAULT_HERO_CONFIG: HeroConfig = {
  showTextOverlay: true,
  heading: "Carnes frescas de Maldonado",
  subtext: "Cortes seleccionados, achuras y packs parrilleros. Elegí lo que necesitás y pedí por WhatsApp.",
  desktopSlides: [
    {
      id: "hero-asado",
      imageUrl: "/hero_images/hero_desktop_1.jpg",
      altText: "Super oferta de asado: asado de tira premium a $399 el kilo",
    },
    {
      id: "hero-cerdo",
      imageUrl: "/hero_images/hero_desktop_2.jpg",
      altText: "Pack Parri-Cerdo: chuletas, costillas, panceta y brochetas a $3199",
    },
    {
      id: "hero-pollo",
      imageUrl: "/hero_images/hero_desktop_3.jpg",
      altText: "Pack familiar de pollo: patas, pechugas y milanesas a $2499",
    },
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
