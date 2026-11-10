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

    // Nested scroll panes that must keep native scrolling (e.g. a code block
    // or terminal pane) should add `data-lenis-prevent` to the scrollable
    // element — Lenis will not hijack wheel/touch events over it.
    const instance = new Lenis({ autoRaf: false });
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
