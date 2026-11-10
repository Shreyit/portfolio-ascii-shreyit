export interface Palette {
  bg: string;
  // Index 0=fg, 1=muted, 2=accent, 3=border (bg used for clearing)
  colors: [string, string, string, string];
}

export function readPalette(element: Element): Palette {
  const styles = getComputedStyle(element);
  const read = (name: string) => styles.getPropertyValue(name).trim();
  return {
    bg: read("--bg"),
    colors: [read("--fg"), read("--muted"), read("--accent"), read("--border")],
  };
}

export function onThemeChange(callback: () => void): () => void {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  const media = window.matchMedia("(prefers-color-scheme: light)");
  const onMedia = () => callback();
  media.addEventListener("change", onMedia);

  return () => {
    observer.disconnect();
    media.removeEventListener("change", onMedia);
  };
}
