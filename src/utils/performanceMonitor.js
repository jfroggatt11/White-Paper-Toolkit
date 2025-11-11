/**
 * Performance Monitoring Utilities
 *
 * This module provides utilities for monitoring and tracking application performance
 * in both development and production environments.
 */

// Performance marks storage
const marks = new Map();

/**
 * Start a performance measurement
 * @param {string} name - Name of the measurement
 */
export const startMeasure = (name) => {
  if (typeof performance === 'undefined') return;

  const markName = `${name}-start`;
  performance.mark(markName);
  marks.set(name, markName);
};

/**
 * End a performance measurement and return the duration
 * @param {string} name - Name of the measurement
 * @returns {number|null} Duration in milliseconds, or null if measurement failed
 */
export const endMeasure = (name) => {
  if (typeof performance === 'undefined') return null;

  const startMarkName = marks.get(name);
  if (!startMarkName) {
    console.warn(`No start mark found for measurement: ${name}`);
    return null;
  }

  const endMarkName = `${name}-end`;
  performance.mark(endMarkName);

  try {
    performance.measure(name, startMarkName, endMarkName);
    const entries = performance.getEntriesByName(name);
    const duration = entries[entries.length - 1]?.duration || 0;

    // Cleanup
    performance.clearMarks(startMarkName);
    performance.clearMarks(endMarkName);
    performance.clearMeasures(name);
    marks.delete(name);

    return duration;
  } catch (error) {
    console.warn(`Failed to measure ${name}:`, error);
    return null;
  }
};

/**
 * Measure the execution time of a function
 * @param {string} name - Name of the measurement
 * @param {Function} fn - Function to measure
 * @returns {any} The return value of the function
 */
export const measureFunction = (name, fn) => {
  startMeasure(name);
  try {
    const result = fn();
    const duration = endMeasure(name);

    if (duration !== null && import.meta.env.DEV) {
      console.log(`⚡ ${name}: ${duration.toFixed(2)}ms`);
    }

    return result;
  } catch (error) {
    endMeasure(name);
    throw error;
  }
};

/**
 * Measure the execution time of an async function
 * @param {string} name - Name of the measurement
 * @param {Function} fn - Async function to measure
 * @returns {Promise<any>} The return value of the function
 */
export const measureAsyncFunction = async (name, fn) => {
  startMeasure(name);
  try {
    const result = await fn();
    const duration = endMeasure(name);

    if (duration !== null && import.meta.env.DEV) {
      console.log(`⚡ ${name}: ${duration.toFixed(2)}ms`);
    }

    return result;
  } catch (error) {
    endMeasure(name);
    throw error;
  }
};

/**
 * Get current memory usage (Chrome only)
 * @returns {Object|null} Memory usage info or null if not available
 */
export const getMemoryUsage = () => {
  if (typeof performance === 'undefined' || !performance.memory) {
    return null;
  }

  return {
    usedJSHeapSize: performance.memory.usedJSHeapSize,
    totalJSHeapSize: performance.memory.totalJSHeapSize,
    jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
    usedMB: (performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(2),
    totalMB: (performance.memory.totalJSHeapSize / (1024 * 1024)).toFixed(2),
    limitMB: (performance.memory.jsHeapSizeLimit / (1024 * 1024)).toFixed(2)
  };
};

/**
 * Log memory usage to console
 */
export const logMemoryUsage = () => {
  const memory = getMemoryUsage();
  if (memory) {
    console.log(`💾 Memory: ${memory.usedMB}MB / ${memory.limitMB}MB (${((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(1)}%)`);
  }
};

/**
 * Monitor component render count
 * Use this in a useEffect to track how many times a component renders
 * @param {string} componentName - Name of the component
 */
export const useRenderCount = (componentName) => {
  if (typeof window === 'undefined') return;

  if (!window.__renderCounts) {
    window.__renderCounts = {};
  }

  window.__renderCounts[componentName] = (window.__renderCounts[componentName] || 0) + 1;

  if (import.meta.env.DEV) {
    console.log(`🔄 ${componentName} rendered ${window.__renderCounts[componentName]} times`);
  }
};

/**
 * Get all render counts
 * @returns {Object} Object with component names and render counts
 */
export const getRenderCounts = () => {
  return window.__renderCounts || {};
};

/**
 * Reset all render counts
 */
export const resetRenderCounts = () => {
  window.__renderCounts = {};
};

/**
 * Measure Web Vitals metrics
 * @returns {Object|null} Web Vitals metrics or null if not available
 */
export const getWebVitals = () => {
  if (typeof performance === 'undefined') return null;

  const navigation = performance.getEntriesByType('navigation')[0];
  const paint = performance.getEntriesByType('paint');

  return {
    // First Contentful Paint
    fcp: paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || null,

    // DOM Content Loaded
    domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart || null,

    // Load Complete
    loadComplete: navigation?.loadEventEnd - navigation?.loadEventStart || null,

    // Time to Interactive (approximation)
    tti: navigation?.domInteractive || null,

    // Total Load Time
    totalLoadTime: navigation?.loadEventEnd || null
  };
};

/**
 * Log Web Vitals to console
 */
export const logWebVitals = () => {
  const vitals = getWebVitals();
  if (vitals) {
    console.log('📊 Web Vitals:');
    console.log(`  FCP: ${vitals.fcp?.toFixed(2)}ms`);
    console.log(`  TTI: ${vitals.tti?.toFixed(2)}ms`);
    console.log(`  DOM Content Loaded: ${vitals.domContentLoaded?.toFixed(2)}ms`);
    console.log(`  Load Complete: ${vitals.loadComplete?.toFixed(2)}ms`);
    console.log(`  Total Load: ${vitals.totalLoadTime?.toFixed(2)}ms`);
  }
};

/**
 * Create a performance observer to track long tasks
 * @param {Function} callback - Callback to receive long task entries
 * @returns {PerformanceObserver|null} The observer instance or null
 */
export const observeLongTasks = (callback) => {
  if (typeof PerformanceObserver === 'undefined') return null;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) { // Tasks longer than 50ms
          callback({
            name: entry.name,
            duration: entry.duration,
            startTime: entry.startTime
          });
        }
      }
    });

    observer.observe({ entryTypes: ['measure', 'longtask'] });
    return observer;
  } catch (error) {
    console.warn('Long task observation not supported:', error);
    return null;
  }
};

/**
 * Performance budget checker
 * Logs warnings if performance thresholds are exceeded
 */
export const checkPerformanceBudget = () => {
  const vitals = getWebVitals();
  const memory = getMemoryUsage();

  const budgets = {
    fcp: 1800, // First Contentful Paint should be < 1.8s
    tti: 3800, // Time to Interactive should be < 3.8s
    totalLoadTime: 3000, // Total load should be < 3s
    memoryUsageMB: 100 // Memory usage should be < 100MB
  };

  const warnings = [];

  if (vitals?.fcp && vitals.fcp > budgets.fcp) {
    warnings.push(`⚠️ FCP (${vitals.fcp.toFixed(2)}ms) exceeds budget (${budgets.fcp}ms)`);
  }

  if (vitals?.tti && vitals.tti > budgets.tti) {
    warnings.push(`⚠️ TTI (${vitals.tti.toFixed(2)}ms) exceeds budget (${budgets.tti}ms)`);
  }

  if (vitals?.totalLoadTime && vitals.totalLoadTime > budgets.totalLoadTime) {
    warnings.push(`⚠️ Total Load (${vitals.totalLoadTime.toFixed(2)}ms) exceeds budget (${budgets.totalLoadTime}ms)`);
  }

  if (memory && parseFloat(memory.usedMB) > budgets.memoryUsageMB) {
    warnings.push(`⚠️ Memory usage (${memory.usedMB}MB) exceeds budget (${budgets.memoryUsageMB}MB)`);
  }

  if (warnings.length > 0) {
    console.warn('Performance Budget Warnings:');
    warnings.forEach(w => console.warn(w));
  } else if (import.meta.env.DEV) {
    console.log('✅ All performance budgets met');
  }

  return warnings;
};

export default {
  startMeasure,
  endMeasure,
  measureFunction,
  measureAsyncFunction,
  getMemoryUsage,
  logMemoryUsage,
  useRenderCount,
  getRenderCounts,
  resetRenderCounts,
  getWebVitals,
  logWebVitals,
  observeLongTasks,
  checkPerformanceBudget
};
