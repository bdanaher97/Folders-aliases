/**
 * File: app/page.tsx
 * Minimal landing page — "stills | motion" with controls at top
 * (No client JS needed)
 */

import Link from "next/link";

export default function Home() {
  // ---- Controls (edit here) ----
  const ui = {
    topGap: "20vh", // vertical gap from top
    fontFamily: "sans-serif", // font face
    fontSize: "1.8rem", // text size
    fontColor: "#000000", // hex color
    centerGap: "clamp(0.5rem, 5vw, 3rem)", // space either side of the divider
    leftText: "stills", // left word
    rightText: "motion", // right word
    dividerChar: "|", // the central divider character
    leftHref: "/portfolio", // link for left word (existing gallery)
    rightHref: "/motion", // link for right word
  };
  // --------------------------------

  return (
    <main
      className="min-h-screen"
      style={{
        paddingTop: ui.topGap,
        fontFamily: ui.fontFamily,
        fontSize: ui.fontSize,
        color: ui.fontColor,
      }}
    >
      <nav
        className="mx-auto w-full px-4"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          columnGap: ui.centerGap,
        }}
      >
        {/* Left (right-aligned) */}
        <div
          style={{
            textAlign: "right",
            minWidth: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          <Link href={ui.leftHref} className="hover:underline">
            {ui.leftText}
          </Link>
        </div>

        {/* Center divider (exact center) */}
        <div style={{ textAlign: "center" }}>{ui.dividerChar}</div>

        {/* Right (left-aligned) */}
        <div
          style={{
            textAlign: "left",
            minWidth: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          <Link href={ui.rightHref} className="hover:underline">
            {ui.rightText}
          </Link>
        </div>
      </nav>
    </main>
  );
}
