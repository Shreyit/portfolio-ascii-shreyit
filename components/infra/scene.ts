import { AsciiGrid } from "@/components/ascii/engine/grid";
import type { AsciiScene } from "@/components/ascii/engine/scene";
import { PARAMS, createSim, currentRps, type SimState } from "./sim";

export const COLS = 64;
export const ROWS = 18;
// maxInstances plus one surge instance during a rolling release.
const SLOTS = PARAMS.maxInstances + 1;

// Palette indices (see engine/palette.ts).
const FG = 0;
const MUTED = 1;
const ACCENT = 2;
const BORDER = 3;
const ERROR = 4;

const SLOT_X = 37; // instance list column
const SLOT_TOP = 1;
const ALB = { x: 20, y: 7, w: 9 };
const USERS = { x: 1, y: 7, w: 11 };
const CDN = { x: 1, y: 1, w: 15 };

function box(
  grid: AsciiGrid,
  x: number,
  y: number,
  w: number,
  lines: string[],
  color = MUTED,
): void {
  grid.writeText(x, y, `┌${"─".repeat(w - 2)}┐`, color);
  lines.forEach((line, i) => {
    grid.writeText(x, y + 1 + i, "│", color);
    grid.writeText(x + 1, y + 1 + i, line.padEnd(w - 2).slice(0, w - 2), FG);
    grid.writeText(x + w - 1, y + 1 + i, "│", color);
  });
  grid.writeText(x, y + 1 + lines.length, `└${"─".repeat(w - 2)}┘`, color);
}

type Path = [number, number][];

/** Cells of an orthogonal path through the given corner points. */
function route(points: [number, number][]): Path {
  const cells: Path = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const [x0, y0] = points[i]!;
    const [x1, y1] = points[i + 1]!;
    const dx = Math.sign(x1 - x0);
    const dy = Math.sign(y1 - y0);
    let x = x0;
    let y = y0;
    while (x !== x1 || y !== y1) {
      cells.push([x, y]);
      x += dx;
      y += dy;
    }
  }
  cells.push(points.at(-1)!);
  return cells;
}

const USERS_TO_ALB = route([
  [USERS.x + USERS.w, 9],
  [ALB.x - 1, 9],
]);
const USERS_TO_CDN = route([
  [6, USERS.y - 1],
  [6, CDN.y + 4],
]);

function slotY(i: number): number {
  return SLOT_TOP + i * 2;
}

function albToSlot(i: number): Path {
  const y = slotY(i);
  return route([
    [ALB.x + ALB.w, 9],
    [33, 9],
    [33, y],
    [SLOT_X - 1, y],
  ]);
}

const UP = 1;
const DOWN = 2;
const LEFT = 4;
const RIGHT = 8;
const JUNCTIONS: Record<number, string> = {
  [LEFT | RIGHT]: "─",
  [UP | DOWN]: "│",
  [DOWN | RIGHT]: "┌",
  [DOWN | LEFT]: "┐",
  [UP | RIGHT]: "└",
  [UP | LEFT]: "┘",
  [UP | DOWN | RIGHT]: "├",
  [UP | DOWN | LEFT]: "┤",
  [LEFT | RIGHT | DOWN]: "┬",
  [LEFT | RIGHT | UP]: "┴",
  [UP | DOWN | LEFT | RIGHT]: "┼",
  [LEFT]: "─",
  [RIGHT]: "─",
  [UP]: "│",
  [DOWN]: "│",
};
const ARROWS: Record<number, string> = {
  [UP]: "^",
  [DOWN]: "v",
  [LEFT]: "<",
  [RIGHT]: ">",
};

function direction(from: [number, number], to: [number, number]): number {
  if (to[0] > from[0]) return RIGHT;
  if (to[0] < from[0]) return LEFT;
  return to[1] > from[1] ? DOWN : UP;
}

const OPPOSITE: Record<number, number> = {
  [UP]: DOWN,
  [DOWN]: UP,
  [LEFT]: RIGHT,
  [RIGHT]: LEFT,
};

/**
 * Draws several paths at once, deriving each cell's box character from all
 * the connections through it, so shared trunks get proper ├ ┤ ┬ junctions.
 */
function drawEdges(
  grid: AsciiGrid,
  edges: { path: Path; color: number }[],
): void {
  const cells = new Map<
    string,
    { x: number; y: number; mask: number; color: number; arrow?: string }
  >();
  const at = (x: number, y: number, color: number) => {
    const key = `${x},${y}`;
    let cell = cells.get(key);
    if (!cell) {
      cell = { x, y, mask: 0, color };
      cells.set(key, cell);
    }
    // An active (brighter) edge wins over an idle one.
    if (color === BORDER) cell.color = BORDER;
    return cell;
  };
  for (const { path, color } of edges) {
    for (let i = 0; i < path.length - 1; i += 1) {
      const d = direction(path[i]!, path[i + 1]!);
      at(path[i]![0], path[i]![1], color).mask |= d;
      at(path[i + 1]![0], path[i + 1]![1], color).mask |= OPPOSITE[d]!;
    }
    const last = path.at(-1)!;
    const prev = path.at(-2);
    if (prev) at(last[0], last[1], color).arrow = ARROWS[direction(prev, last)];
  }
  for (const cell of cells.values()) {
    grid.set(
      cell.x,
      cell.y,
      cell.arrow ?? JUNCTIONS[cell.mask] ?? "+",
      cell.color,
    );
  }
}

function cpuBar(cpu: number, width: number): string {
  const filled = Math.round(Math.min(1, cpu) * width);
  return `[${"#".repeat(filled)}${".".repeat(width - filled)}]`;
}

/** Draws the architecture for a simulation state (no moving packets). */
export function drawInfra(grid: AsciiGrid, s: SimState): void {
  grid.fill(" ", FG);
  const rps = Math.round(currentRps(s));

  box(grid, CDN.x, CDN.y, CDN.w, ["CloudFront", "+ S3 static"]);
  box(grid, USERS.x, USERS.y, USERS.w, ["users", `${rps} req/s`.padEnd(9)]);
  box(
    grid,
    ALB.x,
    ALB.y,
    ALB.w,
    ["  ALB", "health ok"],
    s.spikeLeft > 0 ? ACCENT : MUTED,
  );
  drawEdges(grid, [
    { path: USERS_TO_CDN, color: BORDER },
    { path: USERS_TO_ALB, color: BORDER },
    ...s.instances
      .filter((i) => i.slot >= 0)
      .map((i) => ({
        path: albToSlot(i.slot),
        color: i.state === "healthy" || i.state === "failed" ? BORDER : MUTED,
      })),
  ]);
  grid.writeText(8, 5, "assets", MUTED);
  grid.writeText(USERS.x + USERS.w + 1, 8, "api", MUTED);

  grid.writeText(SLOT_X, 0, "ASG · FastAPI on EC2", MUTED);
  for (let slot = 0; slot < SLOTS; slot += 1) {
    const instance = s.instances.find((i) => i.slot === slot);
    const y = slotY(slot);
    if (!instance) {
      grid.writeText(SLOT_X, y, "·", BORDER);
      continue;
    }
    const head = `${instance.id} v${instance.version} `;
    grid.writeText(SLOT_X, y, head, instance.state === "failed" ? ERROR : FG);
    const x = SLOT_X + head.length;
    switch (instance.state) {
      case "healthy": {
        const color =
          instance.cpu > 0.85 ? ERROR : instance.cpu > 0.6 ? FG : ACCENT;
        grid.writeText(x, y, cpuBar(instance.cpu, 8), color);
        grid.writeText(
          x + 11,
          y,
          `${Math.round(instance.cpu * 100)}%`.padStart(4),
          MUTED,
        );
        break;
      }
      case "booting":
        grid.writeText(
          x,
          y,
          `booting ${Math.ceil(instance.timer)}s`.padEnd(15),
          MUTED,
        );
        break;
      case "draining":
        grid.writeText(x, y, "draining...".padEnd(15), MUTED);
        break;
      case "failed":
        grid.writeText(x, y, "x not responding".padEnd(15), ERROR);
        break;
    }
  }

  const status = s.deploying
    ? `rolling release -> v${s.version}`
    : s.spikeLeft > 0
      ? `spike ${Math.ceil(s.spikeLeft)}s left`
      : "steady";
  grid.writeText(
    1,
    ROWS - 2,
    `p95 ~${s.latencyMs}ms`.padEnd(14),
    s.latencyMs > 200 ? ERROR : MUTED,
  );
  grid.writeText(
    1,
    ROWS - 1,
    status.padEnd(30),
    s.deploying || s.spikeLeft ? ACCENT : MUTED,
  );
}

interface Packet {
  path: Path;
  pos: number;
}

/**
 * Animated scene: redraws the architecture each frame and moves request
 * "packets" along the edges at a density proportional to traffic. The
 * simulation itself is stepped elsewhere; this only reads it.
 */
export function createInfraScene(getSim: () => SimState): AsciiScene {
  let packets: Packet[] = [];
  let spawnDebt = 0;
  const SPEED = 24; // cells per second

  return {
    init(grid) {
      drawInfra(grid, getSim());
    },
    update(grid, _timeMs, dtMs) {
      const s = getSim();
      const dt = dtMs / 1000;
      drawInfra(grid, s);

      // ~1 packet per 25 req/s, so the flow visibly thickens under load.
      spawnDebt += (currentRps(s) / 25) * dt;
      // The ALB still routes to a crashed instance until it is detected.
      const targets = s.instances.filter(
        (inst) => inst.state === "healthy" || inst.state === "failed",
      );
      while (spawnDebt >= 1 && targets.length) {
        spawnDebt -= 1;
        const pick = targets[Math.floor(Math.random() * targets.length)]!;
        packets.push({
          path: [...USERS_TO_ALB, ...albToSlot(pick.slot)],
          pos: 0,
        });
      }
      if (!targets.length) spawnDebt = 0;

      packets = packets.filter((p) => {
        p.pos += SPEED * dt;
        const cell = p.path[Math.floor(p.pos)];
        if (!cell) return false;
        grid.set(cell[0], cell[1], "•", ACCENT);
        return true;
      });
      if (packets.length > 400) packets = packets.slice(-400);
    },
    staticFrame(grid) {
      drawInfra(grid, createSim());
    },
  };
}

/** Plain-text rendering of a state, for the reduced-motion view. */
export function infraText(s: SimState): string {
  const grid = new AsciiGrid(COLS, ROWS);
  drawInfra(grid, s);
  return grid.toPlainText();
}
