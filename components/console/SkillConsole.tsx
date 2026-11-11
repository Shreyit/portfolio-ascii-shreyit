"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { press, type Cart, type ConsoleInput } from "./carts";
import { isMuted, playSound, toggleMuted } from "./sound";
import { ConsoleView } from "./ConsoleView";

const KEYS: Record<string, ConsoleInput> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  Enter: "a",
  x: "a",
  Escape: "b",
  z: "b",
  Backspace: "b",
};

// Konami: up up down down left right left right b a
const KONAMI: readonly ConsoleInput[] = [
  "up",
  "up",
  "down",
  "down",
  "left",
  "right",
  "left",
  "right",
  "b",
  "a",
];

export default function SkillConsole({ carts }: { carts: Cart[] }) {
  const [state, setState] = useState({ cart: 0, cursor: 0, inspecting: false });
  const [muted, setMuted] = useState(() => isMuted());
  const stateRef = useRef(state);
  const konamiRef = useRef<ConsoleInput[]>([]);
  const firstInteractionRef = useRef(true);

  const skill = carts[state.cart]?.skills[state.cursor];

  const gesture = () => {
    if (firstInteractionRef.current) {
      firstInteractionRef.current = false;
      playSound("powerOn");
      return true;
    }
    return false;
  };

  const trackKonami = (input: ConsoleInput) => {
    const next = [...konamiRef.current, input].slice(-KONAMI.length);
    konamiRef.current = next;
    if (
      next.length === KONAMI.length &&
      next.every((v, i) => v === KONAMI[i])
    ) {
      konamiRef.current = [];
      playSound("konami");
    }
  };

  const input = (i: ConsoleInput) => {
    const prev = stateRef.current;
    const next = press(prev, i, carts);
    stateRef.current = next;
    setState(next);

    gesture();
    trackKonami(i);

    if (i === "up") {
      playSound(next.cursor > prev.cursor ? "wrap" : "move");
    } else if (i === "down") {
      playSound(next.cursor < prev.cursor ? "wrap" : "move");
    } else if (i === "left" || i === "right") {
      playSound(next.cart === prev.cart ? "move" : "cart");
    } else if (i === "a") {
      playSound("confirm");
    } else if (i === "b") {
      playSound("back");
    }
  };

  const insert = (cart: number) => {
    stateRef.current = { cart, cursor: 0, inspecting: false };
    setState(stateRef.current);
    gesture();
    playSound("cart");
  };

  const start = () => {
    if (!skill?.lab) return;
    gesture();
    playSound("start");
    window.location.hash = skill.lab.href;
  };

  // SELECT: a random skill from any cartridge, opened straight away.
  const random = () => {
    const cart = Math.floor(Math.random() * carts.length);
    const cursor = Math.floor(Math.random() * carts[cart]!.skills.length);
    stateRef.current = { cart, cursor, inspecting: true };
    setState(stateRef.current);
    gesture();
    playSound("select");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Only when the console itself has focus, not one of its buttons.
    if (event.target !== event.currentTarget) return;
    if (event.key === "s") return start();
    const mapped = KEYS[event.key];
    if (!mapped) return;
    event.preventDefault();
    input(mapped);
  };

  const toggleSound = () => {
    // Toggling sound is itself a gesture: power the console on first.
    gesture();
    const next = toggleMuted();
    setMuted(next);
    if (!next) {
      playSound("move");
    }
  };

  return (
    <ConsoleView
      {...state}
      carts={carts}
      onPress={input}
      onInsert={insert}
      onStart={start}
      onSelect={random}
      onKeyDown={onKeyDown}
      soundMuted={muted}
      onToggleSound={toggleSound}
    />
  );
}
