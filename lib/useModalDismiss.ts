import { useEffect, useRef } from "react";

/**
 * Accessible modal behavior in one hook. While `open`:
 *  - Escape closes it; background scroll is locked.
 *  - Focus moves into the dialog (unless something inside is already focused,
 *    e.g. an autoFocus input) and is trapped within it on Tab / Shift+Tab.
 *  - On close, focus returns to whatever was focused before it opened.
 *
 * Attach the returned ref to the dialog container. `onClose` is held in a ref so
 * callers can pass an inline arrow without re-binding the listeners each render.
 */
export function useModalDismiss<T extends HTMLElement = HTMLDivElement>(
  open: boolean,
  onClose: () => void
) {
  const containerRef = useRef<T | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusables = (): HTMLElement[] =>
      container
        ? Array.from(
            container.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
          )
        : [];

    // Move focus in — but don't steal it from an autoFocus'd field already inside.
    if (container && !container.contains(document.activeElement)) {
      const first = focusables()[0];
      if (first) first.focus();
      else {
        container.setAttribute("tabindex", "-1");
        container.focus();
      }
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !container) return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !container.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !container.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  return containerRef;
}
