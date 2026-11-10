import type { Metadata } from "next";
import { PlasmaCanvas } from "@/components/ascii/PlasmaCanvas";

export const metadata: Metadata = {
  title: "ASCII engine lab",
  description: "Engine test page for the ASCII renderer.",
  robots: { index: false, follow: false },
};

export default function AsciiLabPage() {
  return (
    <div className="lab-page">
      <h1>ASCII engine lab</h1>
      <p>Engine test page — not portfolio content.</p>

      <div className="ascii-scroll">
        <PlasmaCanvas
          cols={160}
          rows={60}
          label="Sine-plasma ASCII field rendered as 160 by 60 characters (engine demo)"
        />
      </div>

      <div className="lab-spacer" aria-hidden="true" />

      <PlasmaCanvas
        cols={40}
        rows={12}
        label="Sine-plasma ASCII field rendered as 40 by 12 characters (below the fold)"
      />
    </div>
  );
}
