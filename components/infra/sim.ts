// An illustrative model of the pattern from the AI DataCraftTech internship:
// FastAPI on EC2 instances in an Auto Scaling group behind an Application
// Load Balancer, static assets on S3/CloudFront, and rolling releases.
// The numbers are teaching values, NOT production measurements.

export type InstanceState =
  | "booting" // launched, waiting for the ALB health check
  | "healthy" // in service
  | "draining" // deregistered; finishing in-flight requests
  | "failed"; // crashed; ALB has not noticed yet

export interface Instance {
  id: string;
  version: number;
  state: InstanceState;
  /** Seconds left in the current state (boot, drain, detection). */
  timer: number;
  cpu: number;
  /** Stable display slot (lowest free one at launch). */
  slot: number;
}

export interface SimEvent {
  t: number;
  text: string;
}

export interface SimState {
  t: number;
  baseRps: number;
  spikeLeft: number;
  instances: Instance[];
  nextId: number;
  version: number;
  deploying: boolean;
  /** Dropped-request total when the current release started. */
  droppedAtDeploy: number;
  cooldown: number;
  served: number;
  dropped: number;
  latencyMs: number;
  events: SimEvent[];
}

export const PARAMS = {
  capacityPerInstance: 100, // requests/s one instance can serve
  targetCpu: 0.6, // target-tracking policy
  minInstances: 2,
  maxInstances: 8,
  bootSeconds: 3, // launch + health check grace
  drainSeconds: 1.5, // connection draining
  detectSeconds: 1.5, // health-check failures before the ALB stops routing
  scaleInCooldown: 6,
  spikeMultiplier: 3,
  spikeSeconds: 10,
  baseLatencyMs: 40,
  maxEvents: 8,
} as const;

export function createSim(baseRps = 120): SimState {
  const s: SimState = {
    t: 0,
    baseRps,
    spikeLeft: 0,
    instances: [],
    nextId: 1,
    version: 1,
    deploying: false,
    droppedAtDeploy: 0,
    cooldown: 0,
    served: 0,
    dropped: 0,
    latencyMs: PARAMS.baseLatencyMs,
    events: [],
  };
  // Start in steady state: exactly the capacity the starting traffic needs.
  for (let i = 0; i < desiredCapacity(baseRps); i += 1) {
    s.instances.push(launch(s, "healthy"));
  }
  return s;
}

export function currentRps(s: SimState): number {
  return s.spikeLeft > 0 ? s.baseRps * PARAMS.spikeMultiplier : s.baseRps;
}

export function inService(s: SimState): Instance[] {
  return s.instances.filter((i) => i.state === "healthy");
}

function freeSlot(s: SimState): number {
  const used = new Set(s.instances.map((i) => i.slot));
  let slot = 0;
  while (used.has(slot)) slot += 1;
  return slot;
}

function launch(s: SimState, state: InstanceState = "booting"): Instance {
  const instance: Instance = {
    id: `i-${String(s.nextId).padStart(2, "0")}`,
    version: s.version,
    state,
    timer: state === "booting" ? PARAMS.bootSeconds : 0,
    cpu: 0,
    slot: freeSlot(s),
  };
  s.nextId += 1;
  return instance;
}

function log(s: SimState, text: string): void {
  s.events = [{ t: s.t, text }, ...s.events].slice(0, PARAMS.maxEvents);
}

/** Instances the ASG counts toward capacity (in service or on the way). */
function counted(s: SimState): Instance[] {
  return s.instances.filter(
    (i) => i.state === "healthy" || i.state === "booting",
  );
}

export function desiredCapacity(rps: number): number {
  const needed = Math.ceil(
    rps / (PARAMS.capacityPerInstance * PARAMS.targetCpu),
  );
  return Math.min(PARAMS.maxInstances, Math.max(PARAMS.minInstances, needed));
}

// ------------------------------------------------------------------ actions

export function setTraffic(s: SimState, rps: number): void {
  s.baseRps = Math.max(0, Math.round(rps));
}

export function spike(s: SimState): void {
  s.spikeLeft = PARAMS.spikeSeconds;
  log(
    s,
    `traffic spike: ×${PARAMS.spikeMultiplier} for ${PARAMS.spikeSeconds}s`,
  );
}

export function killInstance(s: SimState): string | null {
  const victim = inService(s)[0];
  if (!victim) return null;
  victim.state = "failed";
  victim.timer = PARAMS.detectSeconds;
  log(s, `${victim.id} crashed`);
  return victim.id;
}

export function deploy(s: SimState): boolean {
  if (s.deploying) return false;
  s.version += 1;
  s.deploying = true;
  s.droppedAtDeploy = s.dropped;
  log(s, `rolling release v${s.version} started`);
  return true;
}

// --------------------------------------------------------------------- step

/** Advances the simulation by `dt` seconds (call with small steps). */
export function step(s: SimState, dt: number): void {
  s.t += dt;
  s.spikeLeft = Math.max(0, s.spikeLeft - dt);
  s.cooldown = Math.max(0, s.cooldown - dt);

  // Lifecycle timers.
  for (const i of s.instances) {
    if (i.state === "booting" && (i.timer -= dt) <= 0) {
      i.state = "healthy";
      log(s, `${i.id} (v${i.version}) passed health checks`);
    } else if (i.state === "draining" && (i.timer -= dt) <= 0) {
      i.state = "failed"; // reuse as a tombstone; removed below
      i.timer = -1;
      log(s, `${i.id} terminated`);
    } else if (i.state === "failed" && i.timer > 0 && (i.timer -= dt) <= 0) {
      i.timer = -1;
      log(s, `ALB marked ${i.id} unhealthy; ASG replacing it`);
    }
  }
  s.instances = s.instances.filter(
    (i) => !(i.state === "failed" && i.timer < 0),
  );

  // Traffic: the ALB spreads load over in-service instances. Requests routed
  // to a crashed instance before detection are lost.
  const rps = currentRps(s);
  const healthy = inService(s);
  const undetected = s.instances.filter((i) => i.state === "failed").length;
  const targets = healthy.length + undetected;
  const toFailed = targets ? (rps * undetected) / targets : 0;
  const toHealthy = rps - toFailed;
  const capacity = healthy.length * PARAMS.capacityPerInstance;
  const served = Math.min(toHealthy, capacity);
  s.served += served * dt;
  s.dropped += (rps - served) * dt;
  const load = healthy.length ? toHealthy / capacity : 1;
  for (const i of s.instances) {
    i.cpu = i.state === "healthy" ? Math.min(1, load) : 0;
  }
  s.latencyMs = Math.round(PARAMS.baseLatencyMs + 400 * Math.min(1, load) ** 4);

  // Target-tracking scaling.
  const desired = desiredCapacity(rps);
  const count = counted(s).length;
  if (count < desired) {
    for (let k = count; k < desired; k += 1) s.instances.push(launch(s));
    log(s, `scale out → ${desired} (CPU ${Math.round(load * 100)}%)`);
    s.cooldown = PARAMS.scaleInCooldown;
  } else if (count > desired && s.cooldown === 0 && !s.deploying) {
    const victim = healthy.at(-1);
    if (victim && healthy.length > PARAMS.minInstances) {
      victim.state = "draining";
      victim.timer = PARAMS.drainSeconds;
      log(s, `scale in: draining ${victim.id}`);
      s.cooldown = PARAMS.scaleInCooldown;
    }
  }

  // Rolling release, one instance at a time, never below desired capacity:
  // launch a new-version instance (surge), and only once it is healthy
  // drain one old-version instance.
  if (s.deploying) {
    const old = s.instances.filter(
      (i) =>
        i.version < s.version &&
        (i.state === "healthy" || i.state === "booting"),
    );
    const surging = s.instances.some(
      (i) => i.version === s.version && i.state === "booting",
    );
    if (old.length === 0) {
      if (!s.instances.some((i) => i.state === "draining")) {
        s.deploying = false;
        const lost = Math.round(s.dropped - s.droppedAtDeploy);
        log(
          s,
          `release v${s.version} complete · ${lost} requests dropped meanwhile`,
        );
      }
    } else if (!surging) {
      const fresh = s.instances.filter(
        (i) => i.version === s.version && i.state === "healthy",
      ).length;
      const draining = s.instances.some((i) => i.state === "draining");
      if (!draining && fresh > 0 && inService(s).length > desired) {
        const retire = old.find((i) => i.state === "healthy");
        if (retire) {
          retire.state = "draining";
          retire.timer = PARAMS.drainSeconds;
          log(s, `draining ${retire.id} (v${retire.version})`);
        }
      } else if (!draining) {
        s.instances.push(launch(s));
        log(s, `launched ${s.instances.at(-1)!.id} (v${s.version})`);
      }
    }
  }
}

export function availability(s: SimState): number {
  const total = s.served + s.dropped;
  return total ? s.served / total : 1;
}
