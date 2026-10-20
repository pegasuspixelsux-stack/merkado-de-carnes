"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LogOut, Pencil, Plus, Trash2, Upload } from "lucide-react";
import type { NewPastaItem, PastaItem } from "@/types/pasta";
import { signOut, useSession } from "@/lib/auth";
import { useCategories } from "@/hooks/useCategories";
import { usePastaInventory } from "@/hooks/usePastaInventory";
import PastaImage from "@/components/catalog/PastaImage";
import ThemeToggle from "@/components/ThemeToggle";
import CategoryManager from "./CategoryManager";
import HeroSettings from "./HeroSettings";
import ImportForm from "./ImportForm";
import ItemForm from "./ItemForm";
import OrderSettings from "./OrderSettings";
import Modal from "./Modal";
import Switch from "./Switch";

// "new" opens the add form, an item opens the edit form, null keeps the dialog closed.
type Editing = PastaItem | "new" | null;
type Tab = "inventory" | "categories" | "hero" | "orders";
const TABS: { id: Tab; label: string }[] = [
  { id: "inventory", label: "Inventario" },
  { id: "categories", label: "Categorías" },
  { id: "hero", label: "Portada" },
  { id: "orders", label: "Pedidos" },
];

const ghostBtn =
  "inline-flex items-center gap-1.5 rounded-full border border-walnut/15 px-4 py-2 text-sm font-medium text-walnut transition-colors hover:border-walnut/30 hover:text-walnut dark:border-white/10 dark:text-zinc-300 dark:hover:border-white/25 dark:hover:text-white";
const iconBtn =
  "grid h-9 w-9 place-items-center rounded-full text-muted transition-colors hover:bg-walnut/5 hover:text-walnut dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white";

export default function Dashboard() {
  const router = useRouter();
  const session = useSession();
  const { items, hydrated, create, createMany, update, updateMany, remove } = usePastaInventory();
  const { nameOf } = useCategories();
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<PastaItem | null>(null);
  const [importing, setImporting] = useState(false);
  const [tab, setTab] = useState<Tab>("inventory");
  // Price edits typed into the list, by product id. Nothing is saved until "Guardar cambios".
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingPrices, setSavingPrices] = useState(false);

  useEffect(() => {
    if (session.status === "signed-out") router.replace("/admin/login");
  }, [session.status, router]);

  if (session.status !== "signed-in" || !hydrated) {
    return (
      <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-16" aria-busy="true">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-cream/50 dark:bg-zinc-900" />
        <div className="mt-8 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-cream/50 dark:bg-zinc-900" />
          ))}
        </div>
      </div>
    );
  }

  async function save(data: NewPastaItem) {
    if (editing && editing !== "new") await update(editing.id, data);
    else await create(data);
    setEditing(null);
  }

  async function confirmDelete() {
    if (deleting) await remove(deleting.id);
    setDeleting(null);
  }

  async function logout() {
    await signOut();
    router.replace("/admin/login");
  }

  const soldOut = items.filter((i) => !i.available).length;

  // A draft only counts while it differs from the saved price.
  const parsePrice = (text: string) => Number(text.replace(",", ".").trim());
  const changes = items.flatMap((i) => {
    const text = drafts[i.id];
    if (text === undefined) return [];
    const price = parsePrice(text);
    const valid = text.trim() !== "" && Number.isFinite(price) && price >= 0;
    return !valid || price !== i.price ? [{ id: i.id, price, valid }] : [];
  });
  const hasInvalid = changes.some((c) => !c.valid);

  async function savePrices() {
    if (hasInvalid || changes.length === 0) return;
    setSavingPrices(true);
    await updateMany(changes.map((c) => ({ id: c.id, patch: { price: c.price } })));
    setDrafts({});
    setSavingPrices(false);
  }

  return (
    <>
      <header className="glass sticky top-0 z-40 border-b border-walnut/15 bg-background/70 backdrop-blur-xl dark:border-white/10 dark:bg-background/70">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-6">
          <p className="text-lg font-bold tracking-tight text-walnut dark:text-white">
            Merkado <span className="font-normal text-muted dark:text-zinc-500">Panel</span>
          </p>
          <div className="flex items-center gap-1">
            <Link href="/" className={`${iconBtn} w-auto gap-1.5 px-3 text-sm`}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Ver el catálogo</span>
              <span className="sr-only sm:hidden">Ver el catálogo</span>
            </Link>
            <button type="button" onClick={logout} className={`${iconBtn} w-auto gap-1.5 px-3 text-sm`}>
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Salir</span>
              <span className="sr-only sm:hidden">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <div
          role="tablist"
          aria-label="Secciones del panel"
          className="mb-8 inline-flex rounded-full border border-walnut/15 bg-walnut/[0.05] p-0.5 dark:border-white/10 dark:bg-white/5"
        >
          {TABS.map(({ id: t, label }) => (
            <button
              key={t}
              type="button"
              role="tab"
              id={`tab-${t}`}
              aria-selected={tab === t}
              aria-controls="dashboard-panel"
              onClick={() => setTab(t)}
              className={`rounded-full px-5 py-1.5 text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-cream text-walnut shadow-sm dark:bg-white/10 dark:text-white dark:shadow-none"
                  : "text-muted hover:text-walnut dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div id="dashboard-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === "orders" ? (
          <OrderSettings />
        ) : tab === "hero" ? (
          <HeroSettings />
        ) : tab === "categories" ? (
          <CategoryManager />
        ) : (
        <>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-walnut dark:text-white">
              Inventario
            </h1>
            <p className="mt-2 text-sm text-muted dark:text-zinc-400">
              {items.length} {items.length === 1 ? "producto" : "productos"}, {soldOut} {soldOut === 1 ? "agotado" : "agotados"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setImporting(true)} className={ghostBtn}>
              <Upload className="h-4 w-4" aria-hidden="true" />
              Importar CSV / Excel
            </button>
            <button
              type="button"
              onClick={() => setEditing("new")}
              className="inline-flex items-center gap-1.5 rounded-full bg-chestnut px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-chestnut-hover active:scale-[0.97]"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Agregar producto
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-walnut/15 px-6 py-20 text-center dark:border-white/15">
            <h2 className="text-lg font-semibold text-walnut dark:text-white">Todavía no hay productos</h2>
            <p className="mt-2 text-sm text-muted dark:text-zinc-400">
              Agregá tu primer producto y aparece al instante en el catálogo.
            </p>
            <button type="button" onClick={() => setEditing("new")} className={`${ghostBtn} mt-6`}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Agregar producto
            </button>
          </div>
        ) : (
          <ul className="mt-8 divide-y divide-walnut/15 overflow-hidden rounded-3xl border border-walnut/15 dark:divide-white/10 dark:border-white/10">
            {items.map((item) => {
              const draft = drafts[item.id];
              const change = changes.find((c) => c.id === item.id);
              return (
                <li key={item.id} className="flex flex-col gap-3 bg-cream/70 p-4 dark:bg-card">
                  <div className="flex items-center gap-3">
                    <PastaImage
                      key={item.imageUrl}
                      url={item.imageUrl}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-xl"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-walnut dark:text-white">{item.title}</p>
                      <p className="mt-0.5 text-sm text-muted dark:text-zinc-400">{nameOf(item.category)}</p>
                    </div>
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => setEditing(item)}
                        className={iconBtn}
                        aria-label={`Editar ${item.title}`}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(item)}
                        className={iconBtn}
                        aria-label={`Eliminar ${item.title}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-sm text-muted dark:text-zinc-400">
                      <span className="sr-only">Precio de {item.title}</span>
                      <span aria-hidden="true">$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={draft ?? String(item.price)}
                        onChange={(e) => setDrafts((d) => ({ ...d, [item.id]: e.target.value }))}
                        aria-invalid={change ? !change.valid : undefined}
                        className={`w-28 rounded-xl border bg-background px-3 py-2 text-right text-sm font-medium tabular-nums text-walnut focus:border-chestnut focus:outline-none dark:bg-transparent dark:text-white ${
                          change && !change.valid
                            ? "border-red-500"
                            : change
                              ? "border-chestnut"
                              : "border-walnut/15 dark:border-white/10"
                        }`}
                      />
                      <span>/ {item.unit}</span>
                    </label>

                    <div className="flex items-center gap-3">
                      <span
                        className={`text-right text-xs font-medium ${
                          item.available ? "text-muted dark:text-zinc-400" : "text-walnut dark:text-white"
                        }`}
                      >
                        {item.available ? "En stock" : "Agotado"}
                      </span>
                      <Switch
                        checked={item.available}
                        onChange={(next) => update(item.id, { available: next })}
                        label={`${item.title} disponible para pedir`}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {changes.length > 0 && (
          <div className="sticky bottom-4 z-30 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-walnut/15 bg-background/95 p-3 pl-5 shadow-lg backdrop-blur dark:border-white/10">
            <p className="text-sm text-walnut dark:text-white" role="status">
              {changes.length} {changes.length === 1 ? "precio modificado" : "precios modificados"}
              {hasInvalid && <span className="text-red-600"> · Revisá los precios marcados</span>}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setDrafts({})} disabled={savingPrices} className={ghostBtn}>
                Descartar
              </button>
              <button
                type="button"
                onClick={savePrices}
                disabled={hasInvalid || savingPrices}
                className="rounded-full bg-chestnut px-5 py-2 text-sm font-medium text-white transition-all hover:bg-chestnut-hover active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50"
              >
                Guardar cambios
              </button>
            </div>
          </div>
        )}
        </>
        )}
        </div>
      </main>

      <footer className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-8">
        <p className="text-xs text-muted dark:text-zinc-500">
          Se guarda en este navegador. Conectá Firebase para compartirlo entre dispositivos.
        </p>
        <ThemeToggle />
      </footer>

      <Modal open={editing !== null} onClose={() => setEditing(null)} labelledBy="item-dialog-title">
        <ItemForm
          key={editing === "new" ? "new" : (editing?.id ?? "closed")}
          item={editing === "new" ? null : editing}
          onSave={save}
          onCancel={() => setEditing(null)}
        />
      </Modal>

      <Modal open={importing} onClose={() => setImporting(false)} labelledBy="import-dialog-title">
        <ImportForm
          onImport={async (data) => {
            await createMany(data);
            setImporting(false);
          }}
          onCancel={() => setImporting(false)}
        />
      </Modal>

      <Modal open={deleting !== null} onClose={() => setDeleting(null)} labelledBy="delete-dialog-title">
        <div className="p-6 sm:p-8">
          <h2 id="delete-dialog-title" className="text-xl font-semibold tracking-tight">
            ¿Eliminar {deleting?.title}?
          </h2>
          <p className="mt-2 text-sm text-muted dark:text-zinc-400">
            Desaparece del catálogo al instante. No se puede deshacer.
          </p>
          <div className="mt-8 flex justify-end gap-3">
            <button type="button" onClick={() => setDeleting(null)} className={ghostBtn}>
              Conservar producto
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-red-700 active:scale-[0.97]"
            >
              Eliminar producto
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
