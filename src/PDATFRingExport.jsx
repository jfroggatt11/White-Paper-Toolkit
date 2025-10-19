// PDATF Ring Export – publication-ready SVG generator
// Drop-in React component that renders the inner (themes) and outer (barriers) rings
// with correct alignment and export-friendly SVG.
//
// Usage example:
// <PDATFRingExport variant="B" focusThemeId={null} width={2480} height={3508} ellipticalStretch={1.25} />
//
// Notes:
// - START_ANGLE and CLOCKWISE can be adjusted if your existing App.jsx uses a different orientation.
// - Data files are expected to be JSON arrays matching the toolkit structure.

import React, { forwardRef, useMemo } from "react";
import barrierThemes from "./data/barrier_themes.json";
import barriers from "./data/barriers.json";
import resources from "./data/resources.json";
import { downloadCurrentSvg, exportSvg, exportRaster, serializeSvgNode } from "./utils/exportSVG";

const PALETTE = {
  "leadership-and-alignment": "#2563eb",
  "data-pooling-and-interoperability": "#06b6d4",
  "digital-and-tech-constraints": "#7c3aed",
  "skill-and-culture-gaps": "#16a34a",
  "procurement-and-commercial-models": "#f59e0b",
  "risk-ethics-and-assurance": "#ef4444",
};

// Tweak if your App.jsx uses a different layout basis
const START_ANGLE = -Math.PI / 2; // 12 o'clock
const CLOCKWISE = true;            // true = clockwise, false = anticlockwise

function orderedThemes(list) {
  return [...list].sort((a, b) => parseInt(a.order || 999, 10) - parseInt(b.order || 999, 10));
}

function groupBarriersByTheme(barriers, themeIds) {
  const map = Object.fromEntries(themeIds.map((id) => [id, []]));
  for (const b of barriers) map[b.themeId]?.push(b);
  return map;
}

function countResourcesPerBarrier(resources, allBarrierIds) {
  const counts = Object.fromEntries(allBarrierIds.map((id) => [id, 0]));
  for (const r of resources) {
    for (const bid of r.barriers || []) {
      if (counts[bid] != null) counts[bid] += 1;
    }
  }
  return counts;
}

function ellipsePoint(cx, cy, r, angle, stretch = 1) {
  const x = cx + r * Math.cos(angle);
  const y = cy + (r * stretch) * Math.sin(angle);
  return [x, y];
}

function ellipticalArcPath(cx, cy, r, a0, a1, stretch = 1) {
  const [x0, y0] = ellipsePoint(cx, cy, r, a0, stretch);
  const [x1, y1] = ellipsePoint(cx, cy, r, a1, stretch);
  const raw = Math.abs(a1 - a0) % (2 * Math.PI);
  const large = raw > Math.PI ? 1 : 0;
  const sweep = a1 - a0 >= 0 ? 1 : 0;
  const rx = r.toFixed(3);
  const ry = (r * stretch).toFixed(3);
  return `M ${x0.toFixed(3)} ${y0.toFixed(3)} A ${rx} ${ry} 0 ${large} ${sweep} ${x1.toFixed(3)} ${y1.toFixed(3)}`;
}

function ellipticalWedgePath(cx, cy, r0, r1, a0, a1, stretch = 1) {
  const outer = ellipticalArcPath(cx, cy, r1, a0, a1, stretch);
  const [x2, y2] = ellipsePoint(cx, cy, r0, a1, stretch);
  const inner = ellipticalArcPath(cx, cy, r0, a1, a0, stretch).replace(/^M/, "L");
  return `${outer} L ${x2.toFixed(3)} ${y2.toFixed(3)} ${inner} Z`;
}

function midAngle(a0, a1) {
  return (a0 + a1) / 2;
}

function normalizeDegrees(deg) {
  return ((deg % 360) + 360) % 360;
}

function shouldFlipAngle(angleRad) {
  const deg = normalizeDegrees(angleRad * 180 / Math.PI);
  return deg > 90 && deg < 270;
}

const PDATFRingExport = forwardRef(function PDATFRingExportComponent(props, ref) {
  const {
    variant = "B",                // "A" | "B" | "C" | "D"
    focusThemeId = null,          // for variant D
    width = 2480,                 // A4 @300dpi: 2480x3508
    height = 3508,
    ellipticalStretch = 1.0,      // >1 stretches vertically
    includeLegend = true,
    showCounts = true,
    background = "transparent",   // default: transparent background
    ringSelection = "both",       // "both" | "inner" (render-only inner ring)
    showNumbers = false,
  } = props;
  const data = useMemo(() => {
    const themesOrdered = orderedThemes(barrierThemes);
    const themeIds = themesOrdered.map((t) => t.id);
    const byTheme = groupBarriersByTheme(barriers, themeIds);
    const allBarrierIds = barriers.map((b) => b.id);
    const barrierCounts = countResourcesPerBarrier(resources, allBarrierIds);

    // Equal-sized outer wedges: each barrier gets the same angular span
    const totalBarriers = barriers.length || 1;
    const perBarrierSpan = (2 * Math.PI) / totalBarriers * (CLOCKWISE ? 1 : -1);

    let angle = START_ANGLE;
    const innerSegments = [];
    const outerSegments = [];

    for (const [themeOrderIndex, tid] of themeIds.entries()) {
      const blist = byTheme[tid];
      const themeSpan = perBarrierSpan * blist.length; // inner theme span equals its number of barriers
      const a0T = angle;
      const a1T = angle + themeSpan;
      const themeOrder = themeOrderIndex + 1;
      innerSegments.push({
        themeId: tid,
        a0: a0T,
        a1: a1T,
        count: blist.length,
        color: PALETTE[tid] || "#999",
        themeOrder,
      });
      let barrierOrder = 0;
      for (const b of blist) {
        barrierOrder += 1;
        const a0 = angle; const a1 = angle + perBarrierSpan;
        const c = barrierCounts[b.id] || 0; // still useful for optional counts/tooltip
        const mid = midAngle(a0, a1);
        outerSegments.push({
          barrierId: b.id,
          themeId: tid,
          a0,
          a1,
          count: c,
          name: b.name,
          color: PALETTE[tid] || "#999",
          tA0: a0T,
          tA1: a1T,
          themeOrder,
          barrierOrder,
          mid,
          baseFlip: shouldFlipAngle(mid),
        });
        angle += perBarrierSpan;
      }
    }

    const themeOrientationOverride = new Map();
    for (const tid of themeIds) {
      const segs = outerSegments.filter((seg) => seg.themeId === tid);
      if (!segs.length) continue;
      const base = segs.map((seg) => seg.baseFlip);
      const allSame = base.every((v) => v === base[0]);
      if (!allSame) {
        const flippedCount = base.filter(Boolean).length;
        const majority = flippedCount >= (segs.length / 2);
        themeOrientationOverride.set(tid, majority);
      }
    }

    return { themesOrdered, themeIds, byTheme, barrierCounts, innerSegments, outerSegments, totalBarriers, themeOrientationOverride };
  }, [variant, focusThemeId, ellipticalStretch, width, height, barriers, barrierThemes, resources]);

  const W = width, H = height; // portrait A4
  const cx = Math.floor(W / 2), cy = Math.floor(H / 2);

  // Radii tuned for A4 portrait
  const innerR0 = 520, innerR1 = 740;    // inner theme ring
  const outerR0 = 760, outerR1 = 1120;   // outer barrier ring

  const TEXT_PAD_DEG = 7; // shrink label arc by ±7°
  const INNER_TEXT_PAD_DEG = 2; // inner labels hug boundaries more closely

  // Helper to build a polyline path along the ellipse between two angles at radius r,
  // reversing direction when on the bottom half so text stays upright.
  function buildTextPath(a0, a1, r) {
    const RAD = Math.PI / 180;
    // Midpoint to decide orientation (SVG coords: y increases downward)
    const mid = (a0 + a1) / 2;
    const [mx, my] = ellipsePoint(cx, cy, r, mid, ellipticalStretch);
    const isBottom = my > cy;
    const start = isBottom ? a1 : a0;
    const end = isBottom ? a0 : a1;
    // Sampled polyline for reliable textPath on ellipse
    const steps = Math.max(10, Math.ceil(Math.abs(end - start) / (6 * (Math.PI / 180))));
    let d = "";
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const a = start + (end - start) * t;
      const [x, y] = ellipsePoint(cx, cy, r, a, ellipticalStretch);
      d += (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
    }
    return d;
  }

  // Variant: buildTextPath with forced orientation (useful to keep outer labels aligned to inner theme orientation)
  function buildTextPathOriented(a0, a1, r, isBottomForced) {
    const mid = (a0 + a1) / 2;
    const isBottom = typeof isBottomForced === 'boolean' ? isBottomForced : (ellipsePoint(cx, cy, r, mid, ellipticalStretch)[1] > cy);
    const start = isBottom ? a1 : a0;
    const end = isBottom ? a0 : a1;
    const steps = Math.max(10, Math.ceil(Math.abs(end - start) / (6 * (Math.PI / 180))));
    let d = "";
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const a = start + (end - start) * t;
      const [x, y] = ellipsePoint(cx, cy, r, a, ellipticalStretch);
      d += (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
    }
    return d;
  }

  function buildTextPathOrientedPadded(a0, a1, r, isBottomForced, padDeg) {
    const pad = (padDeg || 0) * Math.PI / 180;
    // Keep order then apply padding towards the middle of the span
    let s = a0, e = a1;
    if (e < s) { const t = s; s = e; e = t; }
    const sP = s + pad; const eP = e - pad;
    // Reapply original direction
    const dir = (a1 - a0) >= 0 ? 1 : -1;
    const A0 = dir > 0 ? sP : eP;
    const A1 = dir > 0 ? eP : sP;
    return buildTextPathOriented(A0, A1, r, isBottomForced);
  }

  // Greedy word wrap to N lines based on an approximate width model for Inter
  function wrapToLines(text, maxWidthPx, maxLines, fontPx) {
    const words = text.trim().split(/\s+/);
    const lines = [];
    let line = "";
    const charPx = fontPx * 0.55; // average glyph width for Inter/Arial
    const measure = (s) => s.length * charPx;
    for (let w of words) {
      const test = line ? line + " " + w : w;
      if (measure(test) <= maxWidthPx || line === "") {
        line = test;
      } else {
        lines.push(line);
        line = w;
        if (lines.length === maxLines) break;
      }
    }
    if (lines.length < maxLines && line) lines.push(line);
    // Hard clip any overflowing lines (rare with font downscaling)
    return lines.slice(0, maxLines);
  }

  function uprightRotationDegrees(angleRad, forceFlip = null) {
    let deg = angleRad * 180 / Math.PI;
    const flip = forceFlip != null ? forceFlip : shouldFlipAngle(angleRad);
    if (flip) deg += 180;
    return normalizeDegrees(deg);
  }

  // IDs for textPaths
  const idInner = (i) => `inner-arc-${i}`;
  const idOuter = (i) => `outer-arc-${i}`;

  return (
    <svg ref={ref} width={W} height={H} viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg">
      {/* Background (optional) */}
      {background && background !== "transparent" && background !== "none" && (
        <rect width={W} height={H} fill={background} />
      )}

      <defs>
        {data.innerSegments.map((seg, i) => {
          const rMid = (innerR0 + innerR1) / 2;
          const d = buildTextPathOrientedPadded(seg.a0, seg.a1, rMid, undefined, INNER_TEXT_PAD_DEG);
          return <path key={i} id={idInner(i)} d={d} fill="none" />;
        })}
        {ringSelection !== "inner" && data.outerSegments.map((seg, i) => {
          const rMid = (outerR0 + outerR1) / 2;
          const d = buildTextPathOrientedPadded(seg.a0, seg.a1, rMid, undefined, TEXT_PAD_DEG);
          return <path key={i} id={idOuter(i)} d={d} fill="none" />;
        })}
      </defs>

      {/* Inner theme ring */}
      {data.innerSegments.map((seg, i) => (
        <path
          key={i}
          d={ellipticalWedgePath(cx, cy, innerR0, innerR1, seg.a0, seg.a1, ellipticalStretch)}
          fill={variant === "C" ? "#111827" : PALETTE[seg.themeId] || "#999"}
          fillOpacity={0.85}
          opacity={variant === "D" && focusThemeId ? (seg.themeId === focusThemeId ? 1 : 0.2) : 1}
          stroke="#ffffff"
          strokeWidth={3}
        />
      ))}

      {/* Theme labels (draw last so they sit above the outer ring) */}
      {data.innerSegments.map((seg, i) => {
        const rMid = innerR0 + 0.58 * (innerR1 - innerR0); // same inward nudge for clearance
        const pad = (INNER_TEXT_PAD_DEG * Math.PI) / 180;
        const span = Math.abs(seg.a1 - seg.a0);
        const usableArc = Math.max(0, (span - 2 * pad) * rMid); // approximate arc length in px
        const theme = data.themesOrdered.find((t) => t.id === seg.themeId);
        const themeName = theme?.name || "";
        const labelText = showNumbers ? `${seg.themeOrder}. ${themeName}` : themeName;
        let fontSize = 34;
        const minFontSize = 18;
        const approxWidth = (text, size) => text.length * size * 0.55;
        while (fontSize > minFontSize && approxWidth(labelText, fontSize) > usableArc) {
          fontSize -= 1;
        }
        return (
          <text
            key={`tl-${i}`}
            fontFamily="Inter, Arial, sans-serif"
            fontSize={fontSize}
            fill="#111827"
            pointerEvents="none"
          >
            <textPath href={`#${idInner(i)}`} startOffset="50%" textAnchor="middle">
              {labelText}
            </textPath>
          </text>
        );
      })}

      {/* Outer barrier ring */}
      {ringSelection !== "inner" && data.outerSegments.map((seg, i) => (
        <path
          key={`o-${i}`}
          d={ellipticalWedgePath(cx, cy, outerR0, outerR1, seg.a0, seg.a1, ellipticalStretch)}
          fill={variant === "C" ? "#111827" : PALETTE[seg.themeId] || "#999"}
          fillOpacity={0.85}
          opacity={variant === "D" && focusThemeId ? (seg.themeId === focusThemeId ? 1 : 0.2) : 1}
          stroke="#ffffff"
          strokeWidth={2.5}
        />
      ))}

      {/* Barrier labels – upright, multi-line (up to 3), tangent-centered */}
      {ringSelection !== "inner" && data.outerSegments.map((seg, i) => {
        const span = Math.abs(seg.a1 - seg.a0);
        const spanDeg = span * 180 / Math.PI;
        // 1) Increase usable arc and move label slightly outward for a longer chord:
        const localPadDeg = Math.max(0.3, Math.min(TEXT_PAD_DEG, spanDeg * 0.08));
        const pad = localPadDeg * Math.PI / 180;
        const a0p = seg.a0 < seg.a1 ? seg.a0 + pad : seg.a0 - pad;
        const a1p = seg.a0 < seg.a1 ? seg.a1 - pad : seg.a1 + pad;
        const spanPadded = Math.max(0.0001, Math.abs(a1p - a0p));

        // Label anchor and rotation (tangent)
        const mid = (a0p + a1p) / 2;
        // Place label safely inside the ring thickness
        const rLabel = outerR0 + 0.5 * (outerR1 - outerR0); // slightly inward for more outer-edge margin
        const [x, y] = ellipsePoint(cx, cy, rLabel, mid, ellipticalStretch);
        const override = data.themeOrientationOverride.get(seg.themeId);
        const finalFlip = override != null ? override : seg.baseFlip;
        const rot = uprightRotationDegrees(mid, finalFlip);

        // Available width ≈ chord length at rLabel times a margin
        const chord = 2 * rLabel * Math.sin(spanPadded / 2);
        const avail = Math.max(60, chord * 1.4);

        // Radial fit guard: ensure the stacked lines stay within the ring thickness (asymmetric margin)
        const ringThickness = outerR1 - outerR0;
        const margin = 6;
        const distInner = rLabel - outerR0;
        const distOuter = outerR1 - rLabel;
        const availHalf = Math.max(8, Math.min(distInner, distOuter) - margin); // fit to nearest edge

        // Find biggest font that fits into <=4 lines and radial fit
        let font = 50; // start larger
        const minFont = 12;
        const maxLines = 5;
        let lines = [];
        const baseLabel = showNumbers ? `${seg.themeOrder}.${seg.barrierOrder} ${seg.name}` : seg.name;
        while (font >= minFont) {
          // width-driven wrap at current font
          lines = wrapToLines(baseLabel, avail, maxLines, font);
          const charPx = font * 0.55;
          const widthsOk = lines.every(l => l.length * charPx <= avail * 1.02);
          // estimate vertical stack height (radial direction)
          const lineGap = Math.round(font * 1.03);
          const n = lines.length;
          const totalHeight = (n - 1) * lineGap + font;
          const blockHalf = totalHeight / 2;
          const radialOk = blockHalf <= availHalf;
          if (widthsOk && radialOk) break;
          font -= 1;
        }

        // Vertical layout: center the block around the anchor along the normal
        // Final gap/height and enforce radial fit by downscaling if needed
        let lineGap = Math.round(font * 1.03);
        let n = lines.length;
        // Final guard: if the stack still exceeds the band, shrink font until it fits
        while (n > 0) {
          const totalHeight = (n - 1) * lineGap + font;
          if (totalHeight / 2 <= availHalf || font <= 10) break;
          font -= 1;
          lineGap = Math.round(font * 1.03);
        }

        return (
          <g key={`lblg-${i}`} transform={`translate(${x},${y}) rotate(${rot})`}>
            {lines.map((txt, idx) => {
              const dy = (idx - (n - 1) / 2) * lineGap;
              return (
                <text key={idx}
                      x={0}
                      y={dy}
                      fontFamily="Inter, Arial, sans-serif"
                      fontSize={font}
                      fill="#111827"
                      textAnchor="middle"
                      dominantBaseline="middle">
                  {txt}
                </text>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
});

// ===== Static helpers attached to the component (keeps module as default-export-only) =====
PDATFRingExport.downloadCurrentSvg = downloadCurrentSvg;
PDATFRingExport.serializeSvg = serializeSvgNode;
PDATFRingExport.exportSVG = exportSvg;
PDATFRingExport.exportRaster = exportRaster;

export default PDATFRingExport;
export { downloadCurrentSvg, exportSvg, exportRaster };
