"use client";

import { useState } from "react";
import { INITIAL_ML_STATE, MlView, type MlViewState } from "./MlView";

export default function MlLab({ idBase }: { idBase: string }) {
  const [state, setState] = useState<MlViewState>(INITIAL_ML_STATE);
  return (
    <MlView
      {...state}
      idBase={idBase}
      onChange={(patch) => setState((current) => ({ ...current, ...patch }))}
    />
  );
}
