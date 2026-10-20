"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Beef, Drumstick, Flame, Ham, Package, Search, SearchX, SlidersHorizontal, Store, Utensils } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import CategoryIcon from "@/components/CategoryIcon";
import { useCategories } from "@/hooks/useCategories";
import { normalize } from "@/lib/format";
import { usePastaInventory } from "@/hooks/usePastaInventory";
import HeroSlideshow from "@/components/HeroSlideshow";
import { useHeroConfig } from "@/hooks/useHeroConfig";
import CartBar from "./CartBar";
import ItemDetailSheet from "./ItemDetailSheet";
import PastaCard from "./PastaCard";
import type { PastaItem } from "@/types/pasta";

type Filter = string; // a category id, or "all"
type Sort = "default" | "price-asc" | "price-desc" | "name";

// Fallback glyphs for the seeded categories; an admin-supplied icon image takes priority.
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  vaca: Beef,
  cerdo: Ham,
  pollo: Drumstick,
  achuras: Flame,
  paquetes: Package,
};

const pillOff =
  "border-walnut/15 text-muted hover:border-walnut/30 hover:text-walnut dark:border-white/10 dark:text-zinc-400 dark:hover:border-white/25 dark:hover:text-white";
const pillOn =
  "border-chestnut bg-chestnut text-white";

// The search text lives in the URL (?q=), written by the top nav search. This view only reads it.
export default function CatalogView() {
  const { items, hydrated } = usePastaInventory();
  const { config: heroConfig } = useHeroConfig();
  const query = useSearchParams().get("q") ?? "";
  const { categories } = useCategories();
  // ?cat=<slug> (the footer's section links) preselects a category. A pill click wins until the
  // link changes again.
  const catParam = useSearchParams().get("cat");
  const paramId = categories.find((c) => c.slug === catParam)?.id ?? "all";
  const [picked, setPicked] = useState<{ from: string | null; id: Filter } | null>(null);
  const chosen = picked && picked.from === catParam ? picked.id : paramId;
  const setCategory = (id: Filter) => setPicked({ from: catParam, id });
  // If the chosen category was deleted in the meantime, fall back to All instead of an empty grid.
  const category = chosen === "all" || categories.some((c) => c.id === chosen) ? chosen : "all";

  // The sheet keeps the last item while it slides away, so `open` is separate from the item.
  const [detail, setDetail] = useState<{ item: PastaItem; seq: number } | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const openDetail = (item: PastaItem) => {
    setDetail((d) => ({ item, seq: (d?.seq ?? 0) + 1 }));
    setDetailOpen(true);
  };
  const closeDetail = useCallback(() => setDetailOpen(false), []);

  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState<Sort>("default");
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const visible = useMemo(() => {
    const q = normalize(query.trim());
    const list = items.filter((i) => {
      if (category !== "all" && i.category !== category) return false;
      if (onlyAvailable && !i.available) return false;
      if (!q) return true;
      return normalize(i.title).includes(q) || normalize(i.description).includes(q);
    });
    if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    else if (sort === "name") list.sort((a, b) => a.title.localeCompare(b.title, "es"));
    return list;
  }, [items, query, category, onlyAvailable, sort]);

  const activeFilters = (onlyAvailable ? 1 : 0) + (sort !== "default" ? 1 : 0);
  const filtering = query.trim() !== "" || category !== "all" || onlyAvailable;

  // The query lives in the URL (the nav search reads it too), so both bars stay in sync.
  function onType(value: string) {
    const url = new URL(window.location.href);
    if (value.trim()) url.searchParams.set("q", value);
    else url.searchParams.delete("q");
    window.history.replaceState(null, "", url);
  }

  function clearFilters() {
    setCategory("all");
    setOnlyAvailable(false);
    setSort("default");
    // The nav search follows the URL, so clearing ?q= clears it too.
    window.history.replaceState(null, "", window.location.pathname);
  }

  return (
    <>
      {/* Full-bleed: sits outside the narrow content column, flush under the nav. */}
      <HeroSlideshow config={heroConfig} />

      <main id="catalog" className="mx-auto w-full max-w-[1440px] flex-1 px-6 pb-10 pt-8">
        {/* Visually hidden: announces result counts to screen readers. */}
        <p aria-live="polite" className="sr-only">
          {hydrated
            ? `${visible.length} ${visible.length === 1 ? "producto" : "productos"}${
                query.trim() ? ` para "${query.trim()}"` : ""
              }`
            : "Cargando el catálogo"}
        </p>

        {/* Full-width search with a collapsible filter panel. */}
        <div className="mb-5 w-full">
          <div className="flex w-full gap-2">
            <form role="search" onSubmit={(e) => e.preventDefault()} className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => onType(e.target.value)}
                placeholder="Buscá cortes, pollo, achuras"
                aria-label="Buscar en el catálogo"
                className="w-full rounded-full border border-walnut/15 bg-cream/70 py-3 pl-10 pr-4 text-sm text-walnut placeholder:text-zinc-500 focus:border-chestnut focus:outline-none dark:border-white/10 dark:bg-card dark:text-white [&::-webkit-search-cancel-button]:appearance-none"
              />
            </form>
            <button
              type="button"
              aria-expanded={showFilters}
              aria-controls="catalog-filters"
              onClick={() => setShowFilters((v) => !v)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${
                showFilters || activeFilters ? pillOn : pillOff
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Filtros</span>
              {activeFilters > 0 && <span aria-label={`${activeFilters} activos`}>({activeFilters})</span>}
            </button>
          </div>

          {showFilters && (
            <div
              id="catalog-filters"
              className="mt-3 flex w-full flex-wrap items-center gap-x-6 gap-y-3 rounded-[14px] border border-walnut/15 bg-cream/70 p-4 text-sm text-walnut dark:border-white/10 dark:bg-card dark:text-white"
            >
              <label className="flex items-center gap-2">
                <span className="font-medium">Ordenar por</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as Sort)}
                  className="rounded-full border border-walnut/15 bg-background px-3 py-1.5 dark:border-white/10"
                >
                  <option value="default">Destacados</option>
                  <option value="price-asc">Precio: menor a mayor</option>
                  <option value="price-desc">Precio: mayor a menor</option>
                  <option value="name">Nombre (A-Z)</option>
                </select>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={onlyAvailable}
                  onChange={(e) => setOnlyAvailable(e.target.checked)}
                  className="h-4 w-4 accent-chestnut"
                />
                <span className="font-medium">Solo disponibles</span>
              </label>
              {(activeFilters > 0 || category !== "all") && (
                <button type="button" onClick={clearFilters} className="ml-auto text-chestnut underline">
                  Limpiar
                </button>
              )}
            </div>
          )}
        </div>

        {/* Category filters, above the grid. */}
        <div
          role="group"
          aria-label="Filtrar por categoría"
          className="mb-8 flex gap-4 overflow-x-auto pb-2 md:flex-wrap md:gap-6"
        >
          {[{ id: "all", name: "Todos", icon: undefined }, ...categories].map((c) => {
            const on = category === c.id;
            const Fallback = c.id === "all" ? Store : (CATEGORY_ICONS[c.id] ?? Utensils);
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() => setCategory(c.id)}
                className="group flex w-20 shrink-0 flex-col items-center gap-2 md:w-24"
              >
                <span
                  className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border transition-colors md:h-20 md:w-20 ${
                    on ? pillOn : pillOff
                  }`}
                >
                  {c.icon ? (
                    <CategoryIcon key={c.icon} icon={c.icon} className="h-full w-full" />
                  ) : (
                    <Fallback className="h-7 w-7 md:h-8 md:w-8" strokeWidth={1.5} aria-hidden="true" />
                  )}
                </span>
                <span
                  className={`text-center text-xs font-medium leading-tight md:text-sm ${
                    on ? "text-chestnut" : "text-muted dark:text-zinc-400"
                  }`}
                >
                  {c.name}
                </span>
              </button>
            );
          })}
        </div>

        {!hydrated ? (
          // Skeleton shaped like the final grid, shown until the saved inventory is read.
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <li
                key={i}
                className="h-48 animate-pulse rounded-[14px] border border-walnut/15 bg-cream/70 dark:border-white/10 dark:bg-card"
              />
            ))}
          </ul>
        ) : visible.length === 0 ? (
          <div className="mx-auto flex max-w-sm flex-col items-center py-24 text-center">
            <SearchX className="h-8 w-8 text-zinc-400" strokeWidth={1.5} aria-hidden="true" />
            <h2 className="mt-4 text-lg font-semibold text-walnut dark:text-white">
              {filtering ? "No hay resultados para esa búsqueda" : "El catálogo está vacío"}
            </h2>
            <p className="mt-2 text-sm text-muted dark:text-zinc-400">
              {filtering
                ? "Probá con otra palabra o quitá los filtros."
                : "Los productos que agregues en el panel van a aparecer acá."}
            </p>
            {filtering && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-6 rounded-full bg-chestnut px-5 py-2 text-sm font-medium text-white hover:bg-chestnut-hover"
              >
                Quitar filtros
              </button>
            )}
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((item) => (
              <PastaCard key={item.id} item={item} onSelect={openDetail} />
            ))}
          </ul>
        )}
      </main>

      <ItemDetailSheet seq={detail?.seq ?? 0} item={detail?.item ?? null} open={detailOpen} onClose={closeDetail} />
      <CartBar />
    </>
  );
}
