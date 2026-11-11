// A pixel-art cursor with an ASCII trail. Mouse/trackpad only; touch keeps
// the platform behaviour. One fixed element moved with transforms, a small
// pool of trail glyphs, and a rAF loop that runs only while the pointer
// moves, so it costs nothing at rest.

type Shape = "arrow" | "hand" | "text" | "cross";

// 1 = outline, 2 = fill. Drawn as crisp SVG rects.
const SPRITES: Record<Shape, string[]> = {
  arrow: [
    "1",
    "11",
    "121",
    "1221",
    "12221",
    "122221",
    "1222221",
    "12222221",
    "122222221",
    "1222211111",
    "1221221",
    "121 1221",
    "11  1221",
    "     1221",
    "     111",
  ],
  hand: [
    "    11",
    "   1221",
    "   1221",
    "   1221",
    "   122111",
    "   12212211",
    "11 122122121",
    "121122122121",
    "122122222221",
    " 12222222221",
    "  1222222221",
    "  122222221",
    "   12222221",
    "   1111111",
  ],
  text: [
    "111 111",
    "  121",
    "  121",
    "  121",
    "  121",
    "  121",
    "  121",
    "  121",
    "  121",
    "  121",
    "111 111",
  ],
  cross: [
    "    121",
    "    121",
    "    121",
    "    121",
    "1111 1111",
    "2222 2222",
    "1111 1111",
    "    121",
    "    121",
    "    121",
    "    121",
  ],
};

// Hotspot of each sprite, in sprite pixels.
const HOT: Record<Shape, [number, number]> = {
  arrow: [0, 0],
  hand: [4, 0],
  text: [3, 5],
  cross: [4, 5],
};

const PX = 2; // CSS px per sprite pixel
const TRAIL = "*+:·.";
const TRAIL_LEN = 10;
const BURST = "*+x#@%";

function svg(shape: Shape): string {
  const rows = SPRITES[shape];
  const w = Math.max(...rows.map((r) => r.length));
  let rects = "";
  rows.forEach((row, y) => {
    [...row].forEach((c, x) => {
      if (c === " ") return;
      const fill = c === "1" ? "var(--cursor-ink)" : "var(--cursor-fill)";
      rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${fill}"/>`;
    });
  });
  return `<svg width="${w * PX}" height="${rows.length * PX}" viewBox="0 0 ${w} ${rows.length}" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
}

function shapeFor(el: Element | null): Shape {
  if (!el) return "arrow";
  if (el.closest("input, textarea, [contenteditable='true']")) return "text";
  if (el.closest(".hero-art, .portrait-art, .map-art, .console-screen"))
    return "cross";
  if (el.closest("a, button, label, summary, select, [role='button'], .cart"))
    return "hand";
  return "arrow";
}

export function startCursor(): () => void {
  if (!window.matchMedia("(pointer: fine)").matches) return () => {};
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;

  const cursor = document.createElement("div");
  cursor.className = "px-cursor";
  cursor.setAttribute("aria-hidden", "true");
  document.body.append(cursor);
  const sprites = {} as Record<Shape, string>;
  for (const s of Object.keys(SPRITES) as Shape[]) sprites[s] = svg(s);

  const trail = Array.from({ length: TRAIL_LEN }, () => {
    const span = document.createElement("span");
    span.className = "px-trail";
    span.setAttribute("aria-hidden", "true");
    document.body.append(span);
    return span;
  });
  const history: { x: number; y: number }[] = [];

  let shape: Shape | null = null;
  let x = -100;
  let y = -100;
  let raf = 0;
  let lastMove = 0;
  let seq = 0;

  const setShape = (next: Shape) => {
    if (next === shape) return;
    shape = next;
    cursor.innerHTML = sprites[next];
    cursor.dataset.shape = next;
  };
  setShape("arrow");

  const frame = () => {
    const [hx, hy] = HOT[shape ?? "arrow"];
    cursor.style.transform = `translate3d(${x - hx * PX}px, ${y - hy * PX}px, 0)`;
    const showTrail = !reduced && root.dataset.fx !== "low";
    history.unshift({ x, y });
    history.length = Math.min(history.length, TRAIL_LEN * 2);
    trail.forEach((span, i) => {
      const p = history[i * 2 + 2];
      if (!showTrail || !p) {
        span.style.opacity = "0";
        return;
      }
      span.textContent = TRAIL[Math.min(TRAIL.length - 1, i >> 1)]!;
      span.style.transform = `translate3d(${p.x + 6}px, ${p.y + 10}px, 0)`;
      span.style.opacity = String(0.75 * (1 - i / TRAIL_LEN));
    });
    // Keep running briefly after the pointer stops so the trail settles.
    if (performance.now() - lastMove < 400) raf = requestAnimationFrame(frame);
    else {
      raf = 0;
      history.length = 0;
      trail.forEach((s) => (s.style.opacity = "0"));
    }
  };

  const onMove = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    x = event.clientX;
    y = event.clientY;
    lastMove = performance.now();
    root.dataset.pxCursor = "on";
    setShape(shapeFor(event.target as Element | null));
    if (!raf) raf = requestAnimationFrame(frame);
  };
  const onLeave = () => delete root.dataset.pxCursor;
  const onDown = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    cursor.classList.add("px-cursor--down");
    if (reduced) return;
    // A small burst of characters from the click point.
    for (let i = 0; i < 6; i += 1) {
      const bit = document.createElement("span");
      bit.className = "px-burst";
      bit.textContent = BURST[(seq + i) % BURST.length]!;
      const a = (i / 6) * Math.PI * 2 + seq;
      bit.style.setProperty("--dx", `${Math.cos(a) * 28}px`);
      bit.style.setProperty("--dy", `${Math.sin(a) * 28}px`);
      bit.style.left = `${event.clientX}px`;
      bit.style.top = `${event.clientY}px`;
      document.body.append(bit);
      bit.addEventListener("animationend", () => bit.remove(), { once: true });
    }
    seq += 1;
  };
  const onUp = () => cursor.classList.remove("px-cursor--down");

  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerdown", onDown, { passive: true });
  window.addEventListener("pointerup", onUp, { passive: true });
  document.documentElement.addEventListener("pointerleave", onLeave);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerdown", onDown);
    window.removeEventListener("pointerup", onUp);
    document.documentElement.removeEventListener("pointerleave", onLeave);
    cursor.remove();
    trail.forEach((s) => s.remove());
    delete root.dataset.pxCursor;
  };
}
