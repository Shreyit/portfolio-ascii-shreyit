"use client";

import { useState } from "react";
import {
  INITIAL_RESEARCH_STATE,
  ResearchView,
  type ResearchData,
  type ResearchState,
} from "./ResearchView";

export default function ResearchLab({
  idBase,
  data,
}: {
  idBase: string;
  data: ResearchData;
}) {
  const [state, setState] = useState<ResearchState>(INITIAL_RESEARCH_STATE);
  return (
    <ResearchView
      {...state}
      idBase={idBase}
      data={data}
      onChange={(patch) => setState((current) => ({ ...current, ...patch }))}
    />
  );
}
