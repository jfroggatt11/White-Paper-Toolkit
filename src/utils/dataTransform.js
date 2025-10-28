/**
 * Convert a pipe-delimited string or array to an array of trimmed strings
 * @param {string|Array} v - Value to convert (pipe-delimited string or array)
 * @returns {Array<string>} Array of trimmed, non-empty strings
 */
export const toArray = (v) =>
  Array.isArray(v)
    ? v
    : (typeof v === "string" ? v.split("|").map(s => s.trim()).filter(Boolean) : []);

/**
 * Normalize a resource object with consistent field structure
 * @param {Object} r - Raw resource object
 * @returns {Object} Normalized resource with arrays for personas, barriers, tags
 */
export const normalizeResource = (r) => ({
  ...r,
  personas: toArray(r.personas),
  barriers: toArray(r.barriers),
  tags: toArray(r.tags),
  barrier_category: r.barrier_category || r.barrier_theme || "",
});

/**
 * Filter resources based on text search and persona selection
 * @param {Array<Object>} resources - Array of normalized resources
 * @param {string} searchQuery - Search query string (searches title, description, tags)
 * @param {Array<string>} selectedPersonas - Array of selected persona IDs
 * @returns {Array<Object>} Filtered resources
 */
export const filterResources = (resources, searchQuery = '', selectedPersonas = []) => {
  const q = searchQuery.trim().toLowerCase();

  return resources.filter((r) => {
    const matchesText = !q ||
      r.title.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      (r.tags || []).some((t) => t.toLowerCase().includes(q));

    const matchesPersonas = !selectedPersonas.length ||
      r.personas.some((p) => selectedPersonas.includes(p));

    return matchesText && matchesPersonas;
  });
};
