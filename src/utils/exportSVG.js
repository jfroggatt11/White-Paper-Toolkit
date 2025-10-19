function ensureExtension(filename, extension) {
  if (!filename) return extension.startsWith('.') ? `export${extension}` : `export.${extension}`;
  const normalized = filename.trim();
  if (!extension) return normalized;
  const ext = extension.startsWith('.') ? extension.toLowerCase() : `.${extension.toLowerCase()}`;
  return normalized.toLowerCase().endsWith(ext) ? normalized : `${normalized}${ext}`;
}

export function serializeSvgNode(svgNode) {
  if (!svgNode) return "";
  const serializer = new XMLSerializer();
  return serializer.serializeToString(svgNode);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadCurrentSvg(svgNode, filename = "pdatf_ring.svg") {
  if (!svgNode) return;
  const svgStr = serializeSvgNode(svgNode);
  const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
  downloadBlob(blob, ensureExtension(filename, ".svg"));
}

export function exportSvg(svgNode, filename = "pdatf_ring.svg") {
  downloadCurrentSvg(svgNode, filename);
}

export async function exportRaster(svgNode, {
  filename = "pdatf_ring",
  format = "png",
  scale = 2,
  background = "transparent",
} = {}) {
  if (!svgNode) return;
  const fmt = (format || "png").toLowerCase();
  const rasterExt = fmt === "jpeg" ? ".jpg" : fmt === "jpg" ? ".jpg" : ".png";
  const svgStr = serializeSvgNode(svgNode);
  const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const img = new Image();
    const width = svgNode.viewBox?.baseVal?.width || svgNode.width?.baseVal?.value || svgNode.clientWidth || 2000;
    const height = svgNode.viewBox?.baseVal?.height || svgNode.height?.baseVal?.value || svgNode.clientHeight || 2000;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");

    if (fmt === "jpg" || fmt === "jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (background && background !== "transparent" && background !== "none") {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    await new Promise((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
    });

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    await new Promise((resolve, reject) => {
      const mime = (fmt === "jpg" || fmt === "jpeg") ? "image/jpeg" : "image/png";
      const quality = (fmt === "jpg" || fmt === "jpeg") ? 0.95 : 1.0;
      canvas.toBlob((out) => {
        if (!out) {
          reject(new Error("Failed to render raster export"));
          return;
        }
        downloadBlob(out, ensureExtension(filename, rasterExt));
        resolve();
      }, mime, quality);
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
