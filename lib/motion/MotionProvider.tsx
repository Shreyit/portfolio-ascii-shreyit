"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import Lenis from "lenis";
import { gsap, getScrollTrigger, registerGsap } from "./gsap-setup";
import { useReducedMotion } from "./use-reduced-motion";

const LenisContext = createContext<Lenis | null>(null);

export function useLenis(): Lenis | null {
  return useContext(LenisContext);
}

export function MotionProvider({ children }: { children: ReactNode }) {
  // Re-runs this effect when the preference changes so Lenis can be
  // created or destroyed live. The actual decision below reads the real
  // media query inside the effect, not React state, so the server snapshot
  // (false) can never cause Lenis to start on a reduced-motion client.
  const reducedMotion = useReducedMotion();
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    registerGsap();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    // Nested scroll panes (terminal output, SQL results) carry
    // `data-scroll-pane`. They keep native scrolling only while they really
    // overflow; otherwise the wheel goes to the page, so a pointer resting
    // on a pane never blocks scrolling.
    const instance = new Lenis({
      autoRaf: false,
      lerp: 0.085,
      wheelMultiplier: 0.9,
      prevent: (node) =>
        node.hasAttribute?.("data-scroll-pane") === true &&
        node.scrollHeight > node.clientHeight + 1,
    });
    const onScroll = () => getScrollTrigger()?.update();
    instance.on("scroll", onScroll);

    const tick = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const frame = requestAnimationFrame(() => setLenis(instance));

    return () => {
      cancelAnimationFrame(frame);
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      instance.off("scroll", onScroll);
      instance.destroy();
      setLenis(null);
    };
  }, [reducedMotion]);

  return (
    <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>
  );
}
