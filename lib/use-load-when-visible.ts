"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * Becomes true once the element is genuinely on screen (threshold) or the
 * visitor reaches for it (pointer enter / focus). Used to load interactive
 * islands lazily, keeping them out of the first-load bundle.
 */
export function useLoadWhenVisible(
  ref: RefObject<HTMLElement | null>,
  threshold = 0.15,
): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || visible) return;
    const show = () => setVisible(true);
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) show();
      },
      { threshold },
    );
    observer.observe(element);
    element.addEventListener("pointerenter", show);
    element.addEventListener("focusin", show);
    return () => {
      observer.disconnect();
      element.removeEventListener("pointerenter", show);
      element.removeEventListener("focusin", show);
    };
  }, [ref, threshold, visible]);

  return visible;
}
