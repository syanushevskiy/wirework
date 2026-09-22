/**
 * ALL copy-cell logic lives here (guidelines: render-only components): the
 * copy itself, and "Copied" shown for a moment afterwards. A cell renderer
 * never touches the store; the clipboard is the BROWSER's, so this one acts
 * on it directly — no reaction, no action, nothing a page must wire.
 */
import { useCallback, useEffect, useState } from "react";

const COPIED_FOR_MS = 1500;

export function useCopyCell(text: string) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_FOR_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = useCallback(() => {
    void navigator.clipboard.writeText(text).then(() => setCopied(true));
  }, [text]);

  return { copied, copy };
}
