import type { PastaItem } from "@/types/pasta";
import type { PastaBackend } from "./backend";
import { SEED_ITEMS } from "./seed";

const KEY = "merkado:pasta-inventory:v3";

const listeners = new Set<() => void>();
let cache: PastaItem[] | null = null;

function isItem(v: unknown): v is PastaItem {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.title === "string" &&
    typeof o.category === "string" &&
    typeof o.description === "string" &&
    typeof o.price === "number" &&
    typeof o.unit === "string" &&
    typeof o.imageUrl === "string" &&
    typeof o.available === "boolean"
  );
}

// Earlier versions had three pasta categories. Fold them into "pasta" so saved edits survive.
const LEGACY_PASTA = new Set(["long-pasta", "stuffed", "gnocchi"]);
function migrate(v: unknown): unknown {
  if (v && typeof v === "object" && LEGACY_PASTA.has((v as { category?: string }).category ?? "")) {
    return { ...(v as object), category: "pasta" };
  }
  return v;
}

// The snapshot must be referentially stable between changes, so it is cached.
function load(): PastaItem[] {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      const migrated = Array.isArray(parsed) ? parsed.map(migrate) : parsed;
      if (Array.isArray(migrated) && migrated.every(isItem)) {
        cache = migrated;
        return cache;
      }
    }
  } catch {
    // Blocked or corrupt storage: fall back to the seed.
  }
  cache = SEED_ITEMS;
  return cache;
}

function commit(next: PastaItem[]) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage can be full or blocked; edits still apply for this visit.
  }
  listeners.forEach((l) => l());
}

// Keeps other open tabs in sync.
function onStorage(e: StorageEvent) {
  if (e.key === KEY || e.key === null) {
    cache = null;
    listeners.forEach((l) => l());
  }
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const localBackend: PastaBackend = {
  subscribe(onChange) {
    listeners.add(onChange);
    if (listeners.size === 1) window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(onChange);
      if (listeners.size === 0) window.removeEventListener("storage", onStorage);
    };
  },
  getSnapshot: load,
  getServerSnapshot: () => SEED_ITEMS,

  async create(data) {
    const item: PastaItem = { ...data, id: newId() };
    commit([item, ...load()]);
    return item;
  },
  async createMany(data) {
    const created = data.map((d): PastaItem => ({ ...d, id: newId() }));
    commit([...created, ...load()]);
    return created;
  },
  async update(id, patch) {
    commit(load().map((i) => (i.id === id ? { ...i, ...patch } : i)));
  },
  async updateMany(patches) {
    const byId = new Map(patches.map((p) => [p.id, p.patch]));
    commit(load().map((i) => (byId.has(i.id) ? { ...i, ...byId.get(i.id) } : i)));
  },
  async remove(id) {
    commit(load().filter((i) => i.id !== id));
  },
  async clearCategory(categoryId) {
    const items = load();
    if (!items.some((i) => i.category === categoryId)) return;
    commit(items.map((i) => (i.category === categoryId ? { ...i, category: "" } : i)));
  },
};
