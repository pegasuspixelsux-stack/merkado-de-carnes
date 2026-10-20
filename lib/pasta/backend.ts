import type { NewPastaItem, PastaItem } from "@/types/pasta";

/**
 * Everything the UI needs from a data source. The localStorage adapter (./local.ts)
 * implements it today. To move to Firestore, write a second adapter that satisfies this
 * interface (subscribe via onSnapshot, mutate via addDoc / updateDoc / deleteDoc) and change
 * the single export in ./index.ts. No component needs to change.
 */
export interface PastaBackend {
  // Reactive read side, shaped for React's useSyncExternalStore.
  subscribe(onChange: () => void): () => void;
  getSnapshot(): PastaItem[];
  getServerSnapshot(): PastaItem[];

  // Write side. Async so a network backend can replace it without API changes.
  create(data: NewPastaItem): Promise<PastaItem>;
  // Adds several products as one write (the spreadsheet import).
  createMany(data: NewPastaItem[]): Promise<PastaItem[]>;
  update(id: string, patch: Partial<NewPastaItem>): Promise<void>;
  remove(id: string): Promise<void>;
  // Applies several edits as one write, so a batch (like a price sheet) saves all at once.
  updateMany(patches: { id: string; patch: Partial<NewPastaItem> }[]): Promise<void>;

  // Marks every product in a category as uncategorized ("") in one step. Used when a category
  // is deleted, so no product is left pointing at something that no longer exists.
  clearCategory(categoryId: string): Promise<void>;
}
