"use client";

import { useState, type KeyboardEvent } from "react";
import { press, type Cart, type ConsoleInput } from "./carts";
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

export default function SkillConsole({ carts }: { carts: Cart[] }) {
  const [state, setState] = useState({ cart: 0, cursor: 0, inspecting: false });
  const input = (i: ConsoleInput) => setState((s) => press(s, i, carts));
  const skill = carts[state.cart]?.skills[state.cursor];

  const start = () => {
    if (skill?.lab) window.location.hash = skill.lab.href;
  };
  // SELECT: a random skill from any cartridge, opened straight away.
  const random = () => {
    const cart = Math.floor(Math.random() * carts.length);
    const cursor = Math.floor(Math.random() * carts[cart]!.skills.length);
    setState({ cart, cursor, inspecting: true });
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

  return (
    <ConsoleView
      {...state}
      carts={carts}
      onPress={input}
      onInsert={(cart) => setState({ cart, cursor: 0, inspecting: false })}
      onStart={start}
      onSelect={random}
      onKeyDown={onKeyDown}
    />
  );
}
