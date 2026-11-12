import { gsap, loadScrollTrigger } from "./gsap-setup";
import { scramble } from "./scramble";
import { startGovernor } from "@/lib/perf/governor";
import { startCursor } from "./cursor";
import { startQuirks } from "./quirks";

const REVEAL = "[data-reveal], .lab-section, .content-section > h2";

/**
 * Page-wide motion, started once the page is idle (never under reduced
 * motion): scroll reveals, heading decodes, nav hover scrambles, hero
 * parallax and the pointer-following light on panel borders. Returns a
 * cleanup function.
 */
export async function startEffects(): Promise<() => void> {
  const ScrollTrigger = await loadScrollTrigger();
  const cleanups: (() => void)[] = [
    startGovernor(),
    startCursor(),
    startQuirks(),
  ];
  const ctx = gsap.context(() => {
    // Reveal what is still below the fold; never hide what is on screen.
    const below = gsap.utils
      .toArray<HTMLElement>(REVEAL)
      .filter((el) => el.getBoundingClientRect().top > window.innerHeight);
    gsap.set(below, { opacity: 0, y: 40 });
    ScrollTrigger.batch(below, {
      start: "top 92%",
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: "power3.out",
          stagger: 0.08,
          overwrite: true,
          clearProps: "transform,opacity",
        }),
    });

    // Section headings decode as they arrive.
    for (const h of gsap.utils.toArray<HTMLElement>("main h2")) {
      ScrollTrigger.create({
        trigger: h,
        start: "top 88%",
        once: true,
        onEnter: () => cleanups.push(scramble(h, 650)),
      });
    }

    // The hero drifts up and fades a little as you scroll past it.
    const hero = document.querySelector(".hero-art-wrap, .hero-art");
    if (hero) {
      gsap.to(hero, {
        yPercent: -12,
        opacity: 0.35,
        ease: "none",
        scrollTrigger: {
          trigger: hero,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    }
  });

  // Nav links scramble on hover/focus.
  const onNav = (event: Event) => {
    const link = (event.target as Element).closest<HTMLElement>(
      "nav[aria-label='Sections'] a",
    );
    if (link) cleanups.push(scramble(link, 380));
  };
  document.addEventListener("pointerover", onNav);
  document.addEventListener("focusin", onNav);

  // Panels and cards: a light follows the pointer along their border.
  // At most once per frame: pointer events can outpace the display.
  let spotEvent: PointerEvent | null = null;
  let spotRaf = 0;
  const moveSpot = () => {
    spotRaf = 0;
    const event = spotEvent;
    const el = event
      ? (event.target as Element).closest<HTMLElement>(".spot")
      : null;
    if (!event || !el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${event.clientX - r.left}px`);
    el.style.setProperty("--my", `${event.clientY - r.top}px`);
  };
  const onMove = (event: PointerEvent) => {
    spotEvent = event;
    if (!spotRaf) spotRaf = requestAnimationFrame(moveSpot);
  };
  document.addEventListener("pointermove", onMove, { passive: true });

  return () => {
    ctx.revert();
    for (const c of cleanups) c();
    document.removeEventListener("pointerover", onNav);
    document.removeEventListener("focusin", onNav);
    document.removeEventListener("pointermove", onMove);
    cancelAnimationFrame(spotRaf);
  };
}
