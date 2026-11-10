"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AsciiCanvas } from "@/components/ascii/AsciiCanvas";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";
import { InfraPanel, type InfraStats } from "./InfraPanel";
import { COLS, ROWS, createInfraScene, infraText } from "./scene";
import {
  availability,
  createSim,
  currentRps,
  deploy,
  desiredCapacity,
  inService,
  killInstance,
  setTraffic,
  spike,
  step,
  type SimState,
} from "./sim";

const STEP_S = 0.1;
const START_RPS = 120;

function snapshot(s: SimState): InfraStats {
  const healthy = inService(s);
  return {
    rps: currentRps(s),
    inService: healthy.length,
    desired: desiredCapacity(currentRps(s)),
    cpu: healthy.length
      ? healthy.reduce((a, i) => a + i.cpu, 0) / healthy.length
      : 0,
    latencyMs: s.latencyMs,
    availability: availability(s),
    dropped: s.dropped,
    deploying: s.deploying,
    events: s.events,
  };
}

export default function InfraLab({ idBase }: { idBase: string }) {
  // One simulation per mount; refs are never read during render.
  const [initial] = useState(() => createSim(START_RPS));
  const sim = useRef<SimState>(initial);
  const root = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const [stats, setStats] = useState<InfraStats>(() => snapshot(initial));
  const [baseRps, setBaseRps] = useState(START_RPS);
  const [text, setText] = useState(() => infraText(initial));

  // Step the model in real time while the lab is on screen and the tab is
  // visible; publish a snapshot to React a few times a second.
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let onScreen = false;
    const observer = new IntersectionObserver((entries) => {
      onScreen = entries.some((e) => e.isIntersecting);
    });
    observer.observe(element);
    let ticks = 0;
    const timer = window.setInterval(() => {
      if (!onScreen || document.hidden) return;
      step(sim.current, STEP_S);
      ticks += 1;
      if (ticks % 3 === 0) {
        setStats(snapshot(sim.current));
        if (reducedMotion) setText(infraText(sim.current));
      }
    }, STEP_S * 1000);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, [reducedMotion]);

  const refresh = () => {
    setStats(snapshot(sim.current));
    setText(infraText(sim.current));
  };

  const scene = useCallback(() => createInfraScene(() => sim.current), []);

  return (
    <div ref={root} className="infra">
      <div className="infra-view">
        {reducedMotion ? (
          <pre
            className="infra-pre"
            role="img"
            aria-label="Architecture diagram (static)"
          >
            {text}
          </pre>
        ) : (
          <div className="ascii-scroll" data-lenis-prevent>
            <AsciiCanvas
              scene={scene}
              cols={COLS}
              rows={ROWS}
              fps={30}
              label="Animated architecture: users reach CloudFront for static assets and an Application Load Balancer for the API, which spreads requests across auto-scaled EC2 instances."
            />
          </div>
        )}
      </div>
      <InfraPanel
        idBase={idBase}
        stats={stats}
        baseRps={baseRps}
        onTraffic={(rps) => {
          setBaseRps(rps);
          setTraffic(sim.current, rps);
          refresh();
        }}
        onSpike={() => {
          spike(sim.current);
          refresh();
        }}
        onDeploy={() => {
          deploy(sim.current);
          refresh();
        }}
        onKill={() => {
          killInstance(sim.current);
          refresh();
        }}
        onReset={() => {
          sim.current = createSim(START_RPS);
          setBaseRps(START_RPS);
          refresh();
        }}
      />
    </div>
  );
}
