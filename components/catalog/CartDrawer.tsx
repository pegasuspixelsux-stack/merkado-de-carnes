"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus, Trash2, X } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { formatPrice, formatQuantity } from "@/lib/format";
import { computeTotals } from "@/lib/order";
import { buildOrderMessage, openWhatsApp, validateOrder, type OrderErrors } from "@/lib/whatsapp";
import { MAX_QUANTITY, QUANTITY_STEP, useCart, type Fulfillment } from "@/store/useCart";

const field =
  "w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring";
const fieldLabel = "mb-1.5 block text-sm font-medium text-foreground";
const stepBtn =
  "grid h-8 w-8 place-items-center rounded-full text-foreground transition-colors hover:bg-foreground/5 disabled:pointer-events-none disabled:opacity-30";

const FULFILLMENT: { id: Fulfillment; label: string }[] = [
  { id: "pickup", label: "Retiro en Local" },
  { id: "delivery", label: "Envío a Domicilio" },
];

export default function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const cart = useCart();
  const { settings } = useSettings();
  const [errors, setErrors] = useState<OrderErrors>({});
  const [sendError, setSendError] = useState("");
  const panel = useRef<HTMLDivElement>(null);
  const delivery = cart.fulfillmentType === "delivery";
  const totals = computeTotals(cart.items, settings, cart.fulfillmentType);

  // Escape closes, the page behind stops scrolling, and focus moves into the drawer.
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

  // An emptied cart has nothing to show.
  useEffect(() => {
    if (open && cart.items.length === 0) onClose();
  }, [open, cart.items.length, onClose]);

  function send() {
    const form = {
      name: cart.customerName,
      phone: cart.customerPhone,
      address: cart.deliveryAddress,
      notes: cart.deliveryNotes,
    };
    const found = validateOrder(form, cart.fulfillmentType);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const message = buildOrderMessage({
      ref: cart.orderRef,
      form,
      fulfillment: cart.fulfillmentType,
      items: cart.items,
      totals,
      settings,
    });
    if (!openWhatsApp(settings.whatsappNumber, message)) {
      setSendError("Todavía no hay un número de WhatsApp configurado. Escribinos por otro medio.");
      return;
    }
    setSendError("");
    cart.clearCart();
    cart.showToast("Pedido listo: confirmalo en WhatsApp");
    onClose();
  }

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
        aria-labelledby="cart-title"
        tabIndex={-1}
        inert={!open}
        className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-background shadow-2xl outline-none transition-transform duration-300 ease-out motion-reduce:transition-none ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 id="cart-title" className="text-lg font-semibold text-foreground">Tu pedido</h2>
            {cart.orderRef && <p className="text-xs text-muted-foreground">Ref. {cart.orderRef}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar el pedido" className={stepBtn}>
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <ul className="divide-y divide-border">
            {cart.items.map(({ product, quantity, selectedCutNotes }) => (
              <li key={product.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{product.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatPrice(product.price)} / {product.unit}
                    </p>
                    {selectedCutNotes && <p className="mt-0.5 text-xs italic text-muted-foreground">{selectedCutNotes}</p>}
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                    {formatPrice(product.price * quantity)}
                  </p>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div role="group" aria-label={`Cantidad de ${product.title}`} className="inline-flex items-center rounded-full border border-border p-0.5">
                    <button
                      type="button"
                      onClick={() => cart.updateQuantity(product.id, quantity - QUANTITY_STEP)}
                      aria-label={`Quitar media unidad de ${product.title}`}
                      className={stepBtn}
                    >
                      <Minus className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <output aria-live="polite" className="w-10 text-center text-sm font-semibold tabular-nums">
                      {formatQuantity(quantity)}
                    </output>
                    <button
                      type="button"
                      onClick={() => cart.updateQuantity(product.id, quantity + QUANTITY_STEP)}
                      disabled={quantity >= MAX_QUANTITY}
                      aria-label={`Agregar media unidad de ${product.title}`}
                      className={stepBtn}
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => cart.removeItem(product.id)}
                    aria-label={`Quitar ${product.title} del pedido`}
                    className={`${stepBtn} text-muted-foreground`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <fieldset className="mt-5">
            <legend className={fieldLabel}>¿Cómo lo recibís?</legend>
            <div className="grid grid-cols-2 gap-2">
              {FULFILLMENT.map((f) => (
                <label
                  key={f.id}
                  className={`cursor-pointer rounded-xl border px-3 py-2.5 text-center text-sm font-medium transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring ${
                    cart.fulfillmentType === f.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-foreground hover:border-foreground/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="fulfillment"
                    value={f.id}
                    checked={cart.fulfillmentType === f.id}
                    onChange={() => cart.setFulfillment(f.id)}
                    className="sr-only"
                  />
                  {f.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-5 space-y-4">
            <div>
              <label htmlFor="c-name" className={fieldLabel}>Nombre completo</label>
              <input
                id="c-name"
                autoComplete="name"
                value={cart.customerName}
                onChange={(e) => cart.setCustomerDetails({ name: e.target.value })}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "c-name-err" : undefined}
                className={field}
              />
              {errors.name && <p id="c-name-err" className="mt-1 text-xs text-primary">{errors.name}</p>}
            </div>
            <div>
              <label htmlFor="c-phone" className={fieldLabel}>Teléfono</label>
              <input
                id="c-phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                value={cart.customerPhone}
                onChange={(e) => cart.setCustomerDetails({ phone: e.target.value })}
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? "c-phone-err" : undefined}
                className={field}
              />
              {errors.phone && <p id="c-phone-err" className="mt-1 text-xs text-primary">{errors.phone}</p>}
            </div>
            {delivery && (
              <div>
                <label htmlFor="c-address" className={fieldLabel}>Dirección de entrega</label>
                <input
                  id="c-address"
                  autoComplete="street-address"
                  value={cart.deliveryAddress}
                  onChange={(e) => cart.setCustomerDetails({ address: e.target.value })}
                  aria-invalid={!!errors.address}
                  aria-describedby={errors.address ? "c-address-err" : undefined}
                  className={field}
                />
                {errors.address && <p id="c-address-err" className="mt-1 text-xs text-primary">{errors.address}</p>}
              </div>
            )}
            <div>
              <label htmlFor="c-notes" className={fieldLabel}>
                Notas <span className="font-normal text-muted-foreground">(opcional)</span>
              </label>
              <textarea
                id="c-notes"
                rows={2}
                value={cart.deliveryNotes}
                onChange={(e) => cart.setCustomerDetails({ notes: e.target.value })}
                placeholder="Punto de cocción, tipo de corte, horario…"
                className={field}
              />
            </div>
          </div>
        </div>

        <footer className="border-t border-border px-5 py-4">
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">{formatPrice(totals.subtotal)}</dd>
            </div>
            {settings.taxRate > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <dt>Impuestos (IVA {formatQuantity(settings.taxRate)}%)</dt>
                <dd className="tabular-nums">{formatPrice(totals.tax)}</dd>
              </div>
            )}
            {delivery && (
              <div className="flex justify-between text-muted-foreground">
                <dt>Envío</dt>
                <dd className="tabular-nums">{totals.freeDelivery ? "Gratis" : formatPrice(totals.delivery)}</dd>
              </div>
            )}
            {delivery && !totals.freeDelivery && settings.freeDeliveryMin > 0 && (
              <p className="text-xs text-muted-foreground">
                Envío gratis desde {formatPrice(settings.freeDeliveryMin)}.
              </p>
            )}
            <div className="flex justify-between pt-2 text-base font-semibold text-foreground">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatPrice(totals.total)}</dd>
            </div>
          </dl>
          {sendError && <p role="alert" className="mt-3 text-xs text-primary">{sendError}</p>}
          <button
            type="button"
            onClick={send}
            className="mt-4 w-full rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
          >
            Enviar Pedido por WhatsApp
          </button>
        </footer>
      </div>
    </div>
  );
}
