import { ChevronRight } from "lucide-react";
import type { PastaItem } from "@/types/pasta";
import { formatPrice } from "@/lib/format";
import FillText from "./FillText";
import PastaImage from "./PastaImage";


// Two columns at every width. The image is a flush 1:1 square on the left and sets the card's
// height. The text column is sized to fit inside that square, so the description is clamped to
// fewer lines on small screens instead of making the card taller.
export default function PastaCard({ item, onSelect }: { item: PastaItem; onSelect: (item: PastaItem) => void }) {
  const soldOut = !item.available;

  return (
    <li className="group relative grid cursor-pointer grid-cols-[5fr_6fr] overflow-hidden rounded-[14px] border border-walnut/15 bg-cream/70 transition-all duration-300 hover:-translate-y-0.5 hover:border-walnut/30 sm:grid-cols-[2fr_3fr] lg:grid-cols-1 dark:border-white/10 dark:bg-card dark:hover:border-white/25">
      {/* The whole card opens the item's detail sheet. */}
      <button
        type="button"
        onClick={() => onSelect(item)}
        aria-label={`Ver ${item.title}`}
        className="absolute inset-0 z-10 rounded-[14px]"
      />

      {/* Left: image, no padding, always square */}
      <div className="relative aspect-square w-full">
        <PastaImage
          key={item.imageUrl}
          url={item.imageUrl}
          alt={item.title}
          className={`absolute inset-0 h-full w-full ${soldOut ? "opacity-50 grayscale" : ""}`}
        />
        {soldOut && (
          <span className="absolute left-2 top-2 rounded-full bg-chestnut px-2.5 py-1 text-xs font-medium text-white sm:left-3 sm:top-3">
            Agotado
          </span>
        )}
      </div>

      {/* Right: title, description, then price and a chevron on one row.
          Absolutely filled so the square image alone decides the card height. */}
      <div className="relative min-w-0">
        <div className="absolute inset-0 flex flex-col overflow-hidden p-3.5 sm:p-6 md:p-8 lg:static lg:p-5">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-walnut max-[360px]:line-clamp-1 sm:text-lg md:text-xl dark:text-white">
            {item.title}
          </h3>
          <div className="flex min-h-0 flex-1 flex-col max-[360px]:hidden lg:h-24 lg:flex-none">
            <FillText
              text={item.description}
              className="text-sm leading-relaxed text-muted md:text-base md:leading-relaxed dark:text-zinc-400"
            />
          </div>

          <div className="mt-auto flex items-end justify-between gap-2 sm:gap-3 lg:pt-4">
            <div className="min-w-0">
              <p className="text-base font-semibold leading-tight tracking-tight text-walnut sm:text-lg dark:text-white">
                {formatPrice(item.price)}
              </p>
              <p className="truncate text-xs leading-tight text-muted dark:text-zinc-400">/ {item.unit}</p>
            </div>
            {/* Looks like a button; the card-wide overlay above is what actually takes the click. */}
            <span
              aria-hidden="true"
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary py-2 pl-3.5 pr-2.5 text-sm font-medium text-primary-foreground transition-all group-hover:bg-primary/90 group-active:scale-[0.97] sm:pl-4"
            >
              {soldOut ? "Ver" : "Comprar"}
              <ChevronRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </div>
    </li>
  );
}
