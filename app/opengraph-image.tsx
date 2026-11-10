import { ImageResponse } from "next/og";

export const alt = "Shreyit Sinha — personal portfolio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#0d0d0d",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "96px",
        fontFamily: "monospace",
      }}
    >
      <div style={{ color: "#7ee787", fontSize: 40 }}>~/shreyit</div>
      <div
        style={{
          color: "#e8e6e3",
          fontSize: 128,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          marginTop: 16,
        }}
      >
        Shreyit Sinha
      </div>
      <div
        style={{
          color: "#8a8a8a",
          fontSize: 34,
          marginTop: 32,
        }}
      >
        BS Analytics &amp; Sustainability Studies · TISS Mumbai
      </div>
    </div>,
    size,
  );
}
