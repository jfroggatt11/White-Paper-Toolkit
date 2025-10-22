import React from "react";
import PDATFRingExport from "./PDATFRingExport";
import { exportSvg, exportRaster } from "./utils/exportSVG";

export default function App() {
  const svgRef = React.useRef(null);
  const [ringSelection, setRingSelection] = React.useState("both");
  const [format, setFormat] = React.useState("svg");
  const [isExporting, setIsExporting] = React.useState(false);
  const [showNumbers, setShowNumbers] = React.useState(false);

  const handleExport = React.useCallback(async () => {
    const node = svgRef.current;
    if (!node) return;

    const suffix = ringSelection === "both" ? "full" : ringSelection;
    const baseName = `pdatf_ring_${suffix}`;

    setIsExporting(true);
    try {
      if (format === "svg") {
        exportSvg(node, baseName);
      } else {
        await exportRaster(node, {
          filename: baseName,
          format,
          scale: 4,               // boost raster export quality (approx 1200dpi)
          background: "transparent",
        });
      }
    } catch (err) {
      console.error("Failed to export PDATF ring", err);
    } finally {
      setIsExporting(false);
    }
  }, [format, ringSelection]);

  return (
    <div style={{ padding: 16, background: "transparent", minHeight: "100vh" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <h1 style={{ margin: 0, fontSize: 18, flexGrow: 1 }}>PDATF – Square Export (A4 Width)</h1>

        <label style={{ display: "flex", flexDirection: "column", fontSize: 12, color: "#475569" }}>
          Ring selection
          <select
            value={ringSelection}
            onChange={(event) => setRingSelection(event.target.value)}
            style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14 }}
          >
            <option value="both">Inner + outer</option>
            <option value="inner">Inner only</option>
          </select>
        </label>

        <label style={{ display: "flex", flexDirection: "column", fontSize: 12, color: "#475569" }}>
          Export format
          <select
            value={format}
            onChange={(event) => setFormat(event.target.value)}
            style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14 }}
          >
            <option value="svg">SVG</option>
            <option value="png">PNG</option>
            <option value="jpg">JPG</option>
          </select>
        </label>

        <label style={{ display: "flex", alignItems: "center", fontSize: 12, color: "#475569", gap: 6 }}>
          <input
            type="checkbox"
            checked={showNumbers}
            onChange={(event) => setShowNumbers(event.target.checked)}
          />
          Show numbering
        </label>

        <button
          onClick={handleExport}
          disabled={isExporting}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            background: isExporting ? "#475569" : "#111827",
            color: "white",
            cursor: isExporting ? "wait" : "pointer",
            minWidth: 120,
          }}
        >
          {isExporting ? "Exporting…" : "Export"}
        </button>
      </div>

      {/* Square export: 2480×2480 @ ~300dpi; stretch keeps rings circular */}
      <div style={{ overflow: "auto", border: "1px solid #e5e7eb", borderRadius: 12, background: "transparent" }}>
        <PDATFRingExport
          ref={svgRef}
          variant="B"               // "A" interactive-style, "B" publication, "C" mono, "D" focus
          focusThemeId={null}      // e.g. "risk-ethics-and-assurance" for variant D
          width={2480}
          ellipticalStretch={1}    // keep rings perfectly circular
          includeLegend={true}
          showCounts={true}
          ringSelection={ringSelection}
          background="transparent"
          showNumbers={showNumbers}
        />
      </div>
    </div>
  );
}
