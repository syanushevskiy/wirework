/**
 * Open/closed state for a panel (guidelines: render-only components).
 * Remembered per panel id for as long as the playground is open: the
 * page visit view starts over with every visit, and a panel the user opened
 * should not snap shut because they changed page.
 */
import { useCallback, useState } from "react";

const remembered = new Map<string, boolean>();

export function useDisclosure(id: string, defaultOpen = false) {
  const [open, setOpen] = useState(() => remembered.get(id) ?? defaultOpen);
  const toggle = useCallback(() => {
    setOpen((previous) => {
      remembered.set(id, !previous);
      return !previous;
    });
  }, [id]);
  return { open, toggle };
}
