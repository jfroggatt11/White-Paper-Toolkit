/**
 * Lighten a hex color by a specified amount
 * @param {string} hex - Hex color code (with or without #, 3 or 6 characters)
 * @param {number} amt - Amount to lighten (0 to 1, where 1 is full white)
 * @returns {string} Lightened hex color in lowercase 6-character format (#rrggbb)
 */
export function lighten(hex, amt = 0.3) {
  let c = hex?.replace("#", "") || "64748b";
  if (c.length === 3) c = c.split("").map(ch => ch + ch).join("");
  const n = parseInt(c, 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.min(255, Math.round(r + (255 - r) * amt));
  g = Math.min(255, Math.round(g + (255 - g) * amt));
  b = Math.min(255, Math.round(b + (255 - b) * amt));
  const h = (v) => v.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}
