"use client";

import { useState } from "react";
import { AlertTriangle, Download, FileSpreadsheet } from "lucide-react";
import type { NewPastaItem } from "@/types/pasta";
import { useCategories } from "@/hooks/useCategories";
import { readSpreadsheet, rowsToItems, type ImportRow } from "@/lib/pasta/import";
import { formatPrice } from "@/lib/format";

const ghostBtn =
  "inline-flex items-center gap-1.5 rounded-full border border-walnut/15 px-4 py-2 text-sm font-medium text-walnut transition-colors hover:border-walnut/30 dark:border-white/10 dark:text-zinc-300 dark:hover:border-white/25";

// Pick a .csv or .xlsx, review what will be created, then import it all in one step.
// Photos are not part of the file: add them afterwards from each product's edit form.
export default function ImportForm({
  onImport,
  onCancel,
}: {
  onImport: (items: NewPastaItem[]) => Promise<void>;
  onCancel: () => void;
}) {
  const { categories } = useCategories();
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [fatal, setFatal] = useState("");
  const [busy, setBusy] = useState(false);

  const valid = (rows ?? []).filter((r) => r.item);
  const invalid = (rows ?? []).length - valid.length;

  async function pick(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    setFatal("");
    setRows(null);
    try {
      const result = rowsToItems(await readSpreadsheet(file), categories);
      if (result.fatal) setFatal(result.fatal);
      else setRows(result.rows);
    } catch {
      setFatal("No se pudo leer el archivo. Usá un .csv o un .xlsx (no .xls).");
    }
  }

  async function submit() {
    setBusy(true);
    await onImport(valid.map((r) => r.item as NewPastaItem));
  }

  return (
    <div className="p-6 sm:p-8">
      <h2 id="import-dialog-title" className="text-xl font-semibold tracking-tight">
        Importar productos
      </h2>
      <p className="mt-2 text-sm text-muted dark:text-zinc-400">
        Subí un archivo .csv o .xlsx con una fila por producto. Las fotos se suben aparte, editando cada producto.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <a href="/templates/plantilla-productos.xlsx" download className={ghostBtn}>
          <Download className="h-4 w-4" aria-hidden="true" />
          Plantilla Excel
        </a>
        <a href="/templates/plantilla-productos.csv" download className={ghostBtn}>
          <Download className="h-4 w-4" aria-hidden="true" />
          Plantilla CSV
        </a>
      </div>
      <p className="mt-3 text-xs text-muted dark:text-zinc-500">
        Columnas: <b>titulo</b> y <b>precio</b> (obligatorias), categoria, descripcion, unidad (kg por defecto) y
        disponible (si / no).
      </p>

      <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-walnut/25 px-4 py-5 text-sm hover:border-walnut/50 dark:border-white/20">
        <FileSpreadsheet className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 truncate">{fileName || "Elegir archivo .csv o .xlsx"}</span>
        <input
          type="file"
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => pick(e.target.files?.[0])}
          className="sr-only"
        />
      </label>

      {fatal && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {fatal}
        </p>
      )}

      {rows && (
        <div className="mt-5">
          <p className="text-sm font-medium" role="status">
            {valid.length} {valid.length === 1 ? "producto listo" : "productos listos"}
            {invalid > 0 && <span className="text-red-600"> · {invalid} con errores (se omiten)</span>}
          </p>
          <ul className="mt-3 max-h-64 divide-y divide-walnut/10 overflow-y-auto rounded-2xl border border-walnut/15 text-sm dark:divide-white/10 dark:border-white/10">
            {rows.map((r) => (
              <li key={r.line} className="px-3.5 py-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate font-medium">
                    <span className="mr-2 text-xs font-normal text-muted dark:text-zinc-500">Fila {r.line}</span>
                    {r.item?.title ?? "—"}
                  </span>
                  {r.item && <span className="shrink-0 tabular-nums">{formatPrice(r.item.price)}</span>}
                </div>
                {[...r.errors.map((m) => [m, true] as const), ...r.warnings.map((m) => [m, false] as const)].map(
                  ([m, isError]) => (
                    <p
                      key={m}
                      className={`mt-0.5 flex items-center gap-1 text-xs ${isError ? "text-red-600" : "text-amber-600"}`}
                    >
                      <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
                      {m}
                    </p>
                  ),
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 flex justify-end gap-3">
        <button type="button" onClick={onCancel} className={ghostBtn}>
          Cancelar
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={valid.length === 0 || busy}
          className="rounded-full bg-chestnut px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-chestnut-hover active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50"
        >
          {valid.length > 0 ? `Importar ${valid.length}` : "Importar"}
        </button>
      </div>
    </div>
  );
}
