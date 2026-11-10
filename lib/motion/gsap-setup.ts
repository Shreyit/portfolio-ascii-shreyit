import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP);
}

type ScrollTriggerPlugin =
  (typeof import("gsap/ScrollTrigger"))["ScrollTrigger"];

let registered = false;
let scrollTriggerPlugin: ScrollTriggerPlugin | null = null;
let scrollTriggerPromise: Promise<ScrollTriggerPlugin> | null = null;

export function registerGsap(): void {
  if (registered || typeof window === "undefined") {
    return;
  }
  gsap.registerPlugin(useGSAP);
  registered = true;
}

// Set synchronously once the plugin has loaded, so hot paths like
// Lenis's scroll handler can check without awaiting.
export function getScrollTrigger(): ScrollTriggerPlugin | null {
  return scrollTriggerPlugin;
}

// Dynamic-imports ScrollTrigger on first use, registers it once and caches
// the promise. Callers that animate on scroll should `await loadScrollTrigger()`.
export function loadScrollTrigger(): Promise<ScrollTriggerPlugin> {
  if (!scrollTriggerPromise) {
    scrollTriggerPromise = import("gsap/ScrollTrigger").then(
      ({ ScrollTrigger }) => {
        gsap.registerPlugin(ScrollTrigger);
        scrollTriggerPlugin = ScrollTrigger;
        return ScrollTrigger;
      },
    );
  }
  return scrollTriggerPromise;
}

export { gsap, useGSAP };
