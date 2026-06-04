import { useEffect, useRef } from "react";

/**
 * Shared modal behavior: close on Escape and lock background scroll while open.
 * `onClose` is kept in a ref so the effect only re-binds when `open` flips, not
 * on every render (callers can pass an inline arrow safely).
 */
export function useModalDismiss(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);
}
