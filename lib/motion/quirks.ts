// Small, harmless surprises. All of them clean up after themselves.

const KONAMI = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

const AWAY_TITLES = [
  "come back, the SQL misses you",
  "⠿ the portrait is waiting",
  "brb, brewing chai",
  "404: visitor not found",
];

/** A pixel toast at the bottom of the screen. */
export function toast(text: string, ms = 2600): void {
  const el = document.createElement("div");
  el.className = "px-toast";
  el.setAttribute("role", "status");
  el.textContent = text;
  document.body.append(el);
  window.setTimeout(() => {
    el.classList.add("px-toast--out");
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }, ms);
}

export function startQuirks(): () => void {
  const root = document.documentElement;

  // Konami code: party mode.
  let pos = 0;
  let party = 0;
  const onKey = (event: KeyboardEvent) => {
    const target = event.target as Element | null;
    if (target?.closest("input, textarea")) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    pos = key === KONAMI[pos] ? pos + 1 : key === KONAMI[0] ? 1 : 0;
    if (pos < KONAMI.length) return;
    pos = 0;
    root.dataset.party = "1";
    toast("cheat code accepted · +30 lives · party mode");
    window.clearTimeout(party);
    party = window.setTimeout(() => delete root.dataset.party, 5000);
  };
  window.addEventListener("keydown", onKey);

  // A different tab title while you are away, and a welcome back.
  const title = document.title;
  let n = 0;
  let back = 0;
  const onVisibility = () => {
    window.clearTimeout(back);
    if (document.hidden) {
      document.title = AWAY_TITLES[n++ % AWAY_TITLES.length]!;
    } else if (document.title !== title) {
      document.title = "welcome back ✦";
      back = window.setTimeout(() => (document.title = title), 1800);
    }
  };
  document.addEventListener("visibilitychange", onVisibility);

  // For the curious ones with devtools open.
  console.log(
    "%c ⠿ shreyit-os \n%chey, curious one. the source is public: https://github.com/Shreyit/portfolio-ascii-shreyit\ntry the konami code, or type `sudo` in the terminal.",
    "font: bold 16px monospace; color: #b9a2ff",
    "font: 12px monospace; color: #8e8d99",
  );

  return () => {
    window.removeEventListener("keydown", onKey);
    document.removeEventListener("visibilitychange", onVisibility);
    window.clearTimeout(party);
    window.clearTimeout(back);
    delete root.dataset.party;
    document.title = title;
  };
}
