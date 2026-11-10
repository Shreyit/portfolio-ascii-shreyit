"use client";

import { useEffect } from "react";

const MIN_MS = 2100; // let the boot log play
const MAX_MS = 6000; // never hold the page longer than this

/**
 * Lifts the boot screen once the hero art (name and portrait canvases) is
 * drawn, or on any key/click, or after MAX_MS. Under reduced motion the art
 * never animates, so it lifts as soon as the log has had a moment.
 */
export function BootDismiss() {
  useEffect(() => {
    const root = document.documentElement;
    const boot = document.querySelector<HTMLElement>(".boot");
    if (!boot || root.dataset.booted) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const start = performance.now();
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      try {
        sessionStorage.setItem("booted", "1");
      } catch {
        // Storage unavailable: it simply shows again next visit.
      }
      boot.classList.add("boot--off");
      window.setTimeout(() => (root.dataset.booted = "1"), reduced ? 250 : 750);
      cleanup();
    };

    const ready = () =>
      reduced ||
      document.querySelectorAll(
        ".hero-art canvas[data-ready='true'], .portrait-art canvas[data-ready='true']",
      ).length >= 2;

    const poll = window.setInterval(() => {
      const t = performance.now() - start;
      if (t > MAX_MS || (t > MIN_MS && ready())) finish();
    }, 100);
    const skip = () => finish();
    window.addEventListener("keydown", skip);
    boot.addEventListener("pointerdown", skip);
    const cleanup = () => {
      window.clearInterval(poll);
      window.removeEventListener("keydown", skip);
      boot.removeEventListener("pointerdown", skip);
    };
    return cleanup;
  }, []);
  return null;
}
