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
      {/* The ASCII art above is the visual name; the heading stays the
          real, readable title for search engines and screen readers. */}
      <h1 className="visually-hidden">Shreyit Sinha</h1>
      <p className="hero-role" aria-hidden="true">
        <span className="t-prompt">&gt;</span> analytics · sustainability ·
        engineering
        <span ref={cursor} className="terminal-cursor">
          _
        </span>
      </p>
    </div>
  );
}
