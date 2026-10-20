"use client";

import { useSyncExternalStore } from "react";
import { pastaBackend } from "@/lib/pasta";

const noopSubscribe = () => () => {};

export function usePastaInventory() {
  const items = useSyncExternalStore(
    pastaBackend.subscribe,
    pastaBackend.getSnapshot,
    pastaBackend.getServerSnapshot,
  );
  // False during server render and hydration, true afterwards. Lets the UI avoid
  // flashing seed data before the saved inventory is read.
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  return {
    items,
    hydrated,
    create: pastaBackend.create,
    createMany: pastaBackend.createMany,
    update: pastaBackend.update,
    updateMany: pastaBackend.updateMany,
    remove: pastaBackend.remove,
  };
}
