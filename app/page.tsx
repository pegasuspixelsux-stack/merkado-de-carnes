import { Suspense } from "react";
import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import AboutUsSection from "@/components/AboutUsSection";
import CatalogView from "@/components/catalog/CatalogView";
import Footer from "@/components/Footer";

// Both the nav and the catalog read ?q= from the URL, which needs a Suspense boundary.
// The nav is a sticky bar above the hero, so its fallback is an empty bar of the same height.
function NavFallback() {
  return (
    <div
      aria-hidden="true"
      className="sticky top-0 z-50 h-16 border-b border-transparent md:h-14"
    />
  );
}

export default function Home() {
  return (
    <>
      {/* Scrolled-state sentinel for the nav. Sits at the very top and scrolls away with the page. */}
      <div id="top-sentinel" aria-hidden="true" className="pointer-events-none absolute left-0 top-0 h-6 w-px" />
      <AnnouncementBar />
      <Suspense fallback={<NavFallback />}>
        <Navbar />
      </Suspense>
      <Suspense fallback={null}>
        <CatalogView />
      </Suspense>
      {/* Full width, resting directly on the footer's top line. */}
      <AboutUsSection />
      <Footer />
    </>
  );
}
