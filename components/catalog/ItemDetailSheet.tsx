"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import { MAX_QUANTITY, QUANTITY_STEP, useCart } from "@/store/useCart";
import type { PastaItem } from "@/types/pasta";
import { formatPrice, formatQuantity } from "@/lib/format";
import PastaImage from "./PastaImage";

const stepBtn =
  "grid h-10 w-10 place-items-center rounded-full text-foreground transition-colors hover:bg-foreground/5 disabled:pointer-events-none disabled:opacity-30";

// Slides up from the bottom over the catalog. It stays mounted so it can slide back down: the
// parent keeps the last item and only flips `open`. The body is keyed per opening, so the quantity
// and instructions start fresh each time.
export default function ItemDetailSheet({
  item,
  seq,
  open,
  onClose,
}: {
  item: PastaItem | null;
  seq: number;
  open: boolean;
  onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);

  // Escape closes, the page behind stops scrolling, and focus moves into the sheet.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 motion-reduce:transition-none ${open ? "opacity-100" : "opacity-0"}`}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-title"
        tabIndex={-1}
        inert={!open}
        className={`absolute inset-x-0 bottom-0 mx-auto flex h-full w-full max-w-xl flex-col bg-background shadow-2xl outline-none transition-transform duration-300 ease-out motion-reduce:transition-none md:h-auto md:max-h-[92dvh] md:rounded-t-[20px] ${open ? "translate-y-0" : "translate-y-full"}`}
      >
        {item && <SheetBody key={seq} item={item} onClose={onClose} />}
      </div>
    </div>
  );
}

function SheetBody({ item, onClose }: { item: PastaItem; onClose: () => void }) {
  const cart = useCart();
  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState("");
  const soldOut = !item.available;

  function add() {
    cart.addItem(item, quantity, instructions);
    onClose();
  }

  return (
    <>
      <header className="flex items-center justify-end px-4 pt-3">
        <button type="button" onClick={onClose} aria-label="Cerrar" className={stepBtn}>
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[14px]">
          <PastaImage
            key={item.imageUrl}
            url={item.imageUrl}
            alt={item.title}
            className={`absolute inset-0 h-full w-full ${soldOut ? "opacity-50 grayscale" : ""}`}
          />
        </div>

        <h2 id="item-title" className="mt-4 text-2xl font-semibold leading-tight text-foreground">
          {item.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>

        <div className="mt-4 flex items-end justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">Por {item.unit}</p>
          <p className="text-2xl font-semibold tracking-tight text-foreground">{formatPrice(item.price)}</p>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Cantidad</span>
          <div
            role="group"
            aria-label={`Cantidad de ${item.title}`}
            className="inline-flex items-center rounded-full border border-border p-0.5"
          >
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(QUANTITY_STEP, q - QUANTITY_STEP))}
              disabled={quantity <= QUANTITY_STEP}
              aria-label="Quitar media unidad"
              className={stepBtn}
            >
              <Minus className="h-4 w-4" aria-hidden="true" />
            </button>
            <output aria-live="polite" className="w-12 text-center text-base font-semibold tabular-nums">
              {formatQuantity(quantity)}
            </output>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(MAX_QUANTITY, q + QUANTITY_STEP))}
              disabled={quantity >= MAX_QUANTITY}
              aria-label="Agregar media unidad"
              className={stepBtn}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="mt-5">
          <label htmlFor="item-instructions" className="mb-1.5 block text-sm font-medium text-foreground">
            Instrucciones especiales <span className="font-normal text-muted-foreground">(opcional)</span>
          </label>
          <textarea
            id="item-instructions"
            rows={3}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Tipo de corte, espesor, punto de cocción…"
            className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring"
          />
        </div>
      </div>

      <footer className="border-t border-border px-5 py-4">
        <button
          type="button"
          onClick={add}
          disabled={soldOut}
          className="w-full rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
        >
          {soldOut ? "Agotado" : `Agregar al pedido · ${formatPrice(item.price * quantity)}`}
        </button>
      </footer>
    </>
  );
}
