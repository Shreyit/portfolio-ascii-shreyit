const GLYPHS = "!<>-_\\/[]{}=+*^?#%&@$";

/**
 * Decodes an element's text from random glyphs, left to right. Only touches
 * elements whose content is a single text node, and always restores the
 * exact original text. Returns a cancel function.
 */
export function scramble(el: HTMLElement, durationMs = 700): () => void {
  const node = el.childNodes.length === 1 ? el.firstChild : null;
  if (!node || node.nodeType !== Node.TEXT_NODE) return () => {};
  const text = el.dataset.scrambleText ?? node.textContent ?? "";
  el.dataset.scrambleText = text;
  // Keep the accessible name stable while the visible text churns.
  const labelled = el.hasAttribute("aria-label");
  if (!labelled) el.setAttribute("aria-label", text);
  const done = () => {
    node.textContent = text;
    if (!labelled) el.removeAttribute("aria-label");
  };
  const start = performance.now();
  let frame = 0;
  const step = (now: number) => {
    const p = Math.min(1, (now - start) / durationMs);
    let out = "";
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i]!;
      const settle = i / text.length;
      out +=
        ch === " " || p >= 1 || p > settle * 0.8 + 0.2
          ? ch
          : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]!;
    }
    node.textContent = out;
    if (p < 1) frame = requestAnimationFrame(step);
    else done();
  };
  frame = requestAnimationFrame(step);
  return () => {
    cancelAnimationFrame(frame);
    done();
  };
}
