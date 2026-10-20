"use client";

import { createContext, useCallback, useContext, useMemo, useReducer, useRef } from "react";
import type { PastaItem } from "@/types/pasta";

export const MAX_QUANTITY = 99;
export const QUANTITY_STEP = 0.5;

export type Fulfillment = "pickup" | "delivery";

// Only what the cart needs from a product, copied when it is added.
export type CartProduct = Pick<PastaItem, "id" | "title" | "price" | "unit">;

export interface CartItem {
  product: CartProduct;
  quantity: number;
  selectedCutNotes?: string;
}

export interface CustomerDetails {
  name: string;
  phone: string;
  address: string;
  notes: string;
}

interface CartState {
  items: CartItem[];
  fulfillmentType: Fulfillment;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryNotes: string;
  orderRef: string;
  toast: { id: number; message: string } | null;
}

type Action =
  | { type: "add"; product: CartProduct; quantity: number; notes: string; ref: string }
  | { type: "remove"; productId: string }
  | { type: "quantity"; productId: string; quantity: number }
  | { type: "fulfillment"; value: Fulfillment }
  | { type: "details"; details: Partial<CustomerDetails> }
  | { type: "toast"; id: number; message: string }
  | { type: "clear" };

const clampQty = (n: number) => Math.min(MAX_QUANTITY, Math.round(n * 2) / 2);

const initial: CartState = {
  items: [],
  fulfillmentType: "pickup",
  customerName: "",
  customerPhone: "",
  deliveryAddress: "",
  deliveryNotes: "",
  orderRef: "",
  toast: null,
};

function reducer(state: CartState, action: Action): CartState {
  switch (action.type) {
    case "add": {
      const found = state.items.find((i) => i.product.id === action.product.id);
      const notes = action.notes.trim();
      const items = found
        ? state.items.map((i) =>
            i.product.id === action.product.id
              ? { ...i, quantity: clampQty(i.quantity + action.quantity), selectedCutNotes: notes || i.selectedCutNotes }
              : i,
          )
        : [
            ...state.items,
            { product: action.product, quantity: clampQty(action.quantity), ...(notes ? { selectedCutNotes: notes } : {}) },
          ];
      return { ...state, items, orderRef: state.orderRef || action.ref };
    }
    case "remove": {
      const items = state.items.filter((i) => i.product.id !== action.productId);
      return { ...state, items, orderRef: items.length ? state.orderRef : "" };
    }
    case "quantity": {
      const q = clampQty(action.quantity);
      const items =
        q <= 0
          ? state.items.filter((i) => i.product.id !== action.productId)
          : state.items.map((i) => (i.product.id === action.productId ? { ...i, quantity: q } : i));
      return { ...state, items, orderRef: items.length ? state.orderRef : "" };
    }
    case "fulfillment":
      return { ...state, fulfillmentType: action.value };
    case "details": {
      const d = action.details;
      return {
        ...state,
        customerName: d.name ?? state.customerName,
        customerPhone: d.phone ?? state.customerPhone,
        deliveryAddress: d.address ?? state.deliveryAddress,
        deliveryNotes: d.notes ?? state.deliveryNotes,
      };
    }
    case "toast":
      return { ...state, toast: { id: action.id, message: action.message } };
    case "clear":
      // Keep who the customer is, so a repeat order does not need retyping.
      return {
        ...initial,
        customerName: state.customerName,
        customerPhone: state.customerPhone,
        deliveryAddress: state.deliveryAddress,
        fulfillmentType: state.fulfillmentType,
      };
  }
}

// A short reference like #MC-7K4Q2. No 0/O/1/I so it reads cleanly over chat.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export function newOrderRef(): string {
  let s = "";
  for (let i = 0; i < 5; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return `#MC-${s}`;
}

interface CartApi extends CartState {
  itemCount: number;
  quantityOf: (productId: string) => number;
  addItem: (product: CartProduct, quantity?: number, notes?: string) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setFulfillment: (type: Fulfillment) => void;
  setCustomerDetails: (details: Partial<CustomerDetails>) => void;
  clearCart: () => void;
  showToast: (message: string) => void;
}

const CartContext = createContext<CartApi | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const toastId = useRef(0);

  const showToast = useCallback((message: string) => {
    toastId.current += 1;
    dispatch({ type: "toast", id: toastId.current, message });
  }, []);

  const api = useMemo<CartApi>(
    () => ({
      ...state,
      itemCount: state.items.length,
      quantityOf: (id) => state.items.find((i) => i.product.id === id)?.quantity ?? 0,
      addItem: (p, quantity = 1, notes = "") => {
        dispatch({
          type: "add",
          product: { id: p.id, title: p.title, price: p.price, unit: p.unit },
          quantity,
          notes,
          ref: newOrderRef(),
        });
        showToast("Agregado al pedido");
      },
      removeItem: (productId) => dispatch({ type: "remove", productId }),
      updateQuantity: (productId, quantity) => dispatch({ type: "quantity", productId, quantity }),
      setFulfillment: (value) => dispatch({ type: "fulfillment", value }),
      setCustomerDetails: (details) => dispatch({ type: "details", details }),
      clearCart: () => dispatch({ type: "clear" }),
      showToast,
    }),
    [state, showToast],
  );

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
