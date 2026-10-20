import type { Category } from "@/types/category";
import type { NewPastaItem } from "@/types/pasta";
import { normalize } from "@/lib/format";

export interface ImportRow {
  line: number; // spreadsheet row number, header included
  item: NewPastaItem | null; // null when the row has errors
  errors: string[];
  warnings: string[];
}

// Column headers are matched loosely, in Spanish or English.
const COLUMNS: Record<string, string[]> = {
  title: ["titulo", "nombre", "producto", "title", "name"],
  category: ["categoria", "category"],
  description: ["descripcion", "description"],
  price: ["precio", "price"],
  unit: ["unidad", "unit"],
  available: ["disponible", "stock", "available"],
};

const YES = new Set(["si", "s", "yes", "y", "true", "1", "x", "disponible"]);
const NO = new Set(["no", "n", "false", "0", "agotado"]);

// Minimal CSV reader: quoted fields, doubled quotes, commas or semicolons (Excel in Spanish
// exports semicolons), and CRLF line ends.
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

const cellText = (v: unknown) => (v == null ? "" : String(v).trim());

// Turns raw sheet rows (first row = headers) into validated products.
export function rowsToItems(raw: unknown[][], categories: Category[]): { rows: ImportRow[]; fatal?: string } {
  if (raw.length === 0) return { rows: [], fatal: "El archivo está vacío." };
  const headers = raw[0].map((h) => normalize(cellText(h)));
  const col = (key: string) => headers.findIndex((h) => COLUMNS[key].includes(h));
  const idx = Object.fromEntries(Object.keys(COLUMNS).map((k) => [k, col(k)])) as Record<string, number>;
  if (idx.title < 0 || idx.price < 0) {
    return { rows: [], fatal: 'Faltan columnas obligatorias: "titulo" y "precio". Descargá la plantilla de ejemplo.' };
  }

  const rows: ImportRow[] = [];
  for (let r = 1; r < raw.length; r++) {
    const cells = raw[r];
    if (cells.every((c) => cellText(c) === "")) continue; // skip blank lines
    const get = (key: string) => (idx[key] >= 0 ? cellText(cells[idx[key]]) : "");
    const errors: string[] = [];
    const warnings: string[] = [];

    const title = get("title");
    if (!title) errors.push("Falta el título");

    const priceText = get("price").replace(/[$\s]/g, "").replace(",", ".");
    const price = Number(priceText);
    if (priceText === "" || !Number.isFinite(price) || price < 0) errors.push("Precio inválido");

    let category = "";
    const catText = get("category");
    if (catText) {
      const n = normalize(catText);
      const found = categories.find((c) => [c.name, c.slug, c.id].some((v) => normalize(v) === n));
      if (found) category = found.id;
      else warnings.push(`Categoría "${catText}" no existe: queda sin categoría`);
    }

    let available = true;
    const availText = normalize(get("available"));
    if (availText) {
      if (YES.has(availText)) available = true;
      else if (NO.has(availText)) available = false;
      else warnings.push(`"${get("available")}" no se entiende: queda disponible`);
    }

    rows.push({
      line: r + 1,
      errors,
      warnings,
      item: errors.length
        ? null
        : { title, category, description: get("description"), price, unit: get("unit") || "kg", imageUrl: "", available },
    });
  }
  if (rows.length === 0) return { rows, fatal: "No hay productos debajo de los encabezados." };
  return { rows };
}

export async function readSpreadsheet(file: File): Promise<unknown[][]> {
  if (/\.csv$/i.test(file.name) || file.type === "text/csv") return parseCsv(await file.text());
  // Loaded on demand so the admin bundle only pays for it when someone imports an Excel file.
  const { readSheet } = await import("read-excel-file/browser");
  return (await readSheet(file)) as unknown[][];
}
