import type { CartItem, Fulfillment } from "@/store/useCart";
import type { OrderTotals } from "@/lib/order";
import type { StoreSettings } from "@/lib/settings";
import { formatQuantity } from "@/lib/format";

export interface OrderForm {
  name: string;
  phone: string;
  address: string;
  notes: string;
}

export type OrderErrors = Partial<Record<"name" | "phone" | "address", string>>;

export function validateOrder(form: OrderForm, fulfillment: Fulfillment): OrderErrors {
  const errors: OrderErrors = {};
  if (!form.name.trim()) errors.name = "Ingresá tu nombre.";
  const digits = form.phone.replace(/\D/g, "");
  if (!form.phone.trim()) errors.phone = "Ingresá tu teléfono.";
  else if (digits.length < 8) errors.phone = "Revisá el teléfono: parece incompleto.";
  if (fulfillment === "delivery" && !form.address.trim()) errors.address = "Ingresá la dirección de entrega.";
  return errors;
}

const number = new Intl.NumberFormat("es-UY", { maximumFractionDigits: 0 });
const money = (n: number) => `$UYU ${number.format(n)}`;

export function buildOrderMessage(args: {
  ref: string;
  form: OrderForm;
  fulfillment: Fulfillment;
  items: CartItem[];
  totals: OrderTotals;
  settings: StoreSettings;
}): string {
  const { ref, form, fulfillment, items, totals, settings } = args;
  const delivery = fulfillment === "delivery";
  const lines = [
    "🛒 *NUEVO PEDIDO - MERKADO CARNES*",
    `🔖 *Ref:* ${ref}`,
    `👤 *Cliente:* ${form.name.trim()}`,
    `📞 *Teléfono:* ${form.phone.trim()}`,
    `📍 *Método:* ${delivery ? "Envío a Domicilio" : "Retiro en Local"}`,
  ];
  if (delivery) lines.push(`🏠 *Dirección:* ${form.address.trim()}`);
  if (form.notes.trim()) lines.push(`📝 *Notas:* ${form.notes.trim()}`);
  lines.push("", "---", "*DETALLE DEL PEDIDO:*");
  for (const i of items) {
    lines.push(
      `• ${formatQuantity(i.quantity)}x ${i.product.title} (${money(i.product.price)}/${i.product.unit}) - ${money(i.product.price * i.quantity)}`,
    );
    if (i.selectedCutNotes) lines.push(`   ↳ ${i.selectedCutNotes}`);
  }
  lines.push("", "---", `📦 *Subtotal:* ${money(totals.subtotal)}`);
  if (settings.taxRate > 0) {
    lines.push(`🧾 *Impuestos (IVA ${formatQuantity(settings.taxRate)}%):* ${money(totals.tax)}`);
  }
  if (delivery) lines.push(`🚚 *Envío:* ${totals.freeDelivery ? "Gratis" : money(totals.delivery)}`);
  lines.push(`💰 *TOTAL A PAGAR:* ${money(totals.total)}`, "---", "*Enviado desde la web de Merkado Carnes*");
  return lines.join("\n");
}

// Opens WhatsApp with the message prefilled. wa.me hands off to WhatsApp Web / Desktop on a
// computer and to the app on a phone. Returns false when there is no business number to send to.
export function openWhatsApp(phoneNumber: string, message: string): boolean {
  const digits = phoneNumber.replace(/\D/g, "");
  if (!digits) return false;
  const url = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win) window.location.href = url; // popup blocked: navigate instead
  return true;
}
