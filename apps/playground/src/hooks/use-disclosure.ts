/** Open/closed state for a panel (guidelines: render-only components). */
import { useCallback, useState } from "react";

export function useDisclosure(defaultOpen = false) {
  const [open, setOpen] = useState(defaultOpen);
  const toggle = useCallback(() => setOpen((previous) => !previous), []);
  return { open, toggle };
}
