"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, registerGsap } from "@/lib/motion/gsap-setup";

export function HeroHeading() {
  const scope = useRef<HTMLDivElement>(null);
  const cursor = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      registerGsap();
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        if (!cursor.current) {
          return;
        }
        gsap.to(cursor.current, {
          autoAlpha: 0,
          duration: 0.6,
          repeat: -1,
          yoyo: true,
          ease: "steps(1)",
        });
      });

      return () => mm.revert();
    },
    { scope },
  );

  return (
    <div ref={scope} className="hero-heading">
      <h1>Shreyit Sinha</h1>
      <span ref={cursor} className="terminal-cursor" aria-hidden="true">
        _
      </span>
    </div>
  );
}
