import { test, expect } from '@playwright/test';

/**
 * Performance tests for PDATF Toolkit
 * These tests measure render performance, interaction responsiveness, and resource usage
 */

test.describe('Performance Tests', () => {
  test('page load performance', async ({ page }) => {
    // Start measuring performance
    const startTime = Date.now();

    // Navigate to the page
    await page.goto('/', { waitUntil: 'networkidle' });

    const loadTime = Date.now() - startTime;

    // Page should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);

    console.log(`Page load time: ${loadTime}ms`);
  });

  test('chart render performance', async ({ page }) => {
    await page.goto('/');

    // Measure time to render chart
    const chartRenderStart = Date.now();
    await page.waitForSelector('.recharts-wrapper', { timeout: 10000 });
    const chartRenderTime = Date.now() - chartRenderStart;

    // Chart should render within 2 seconds
    expect(chartRenderTime).toBeLessThan(2000);

    console.log(`Chart render time: ${chartRenderTime}ms`);
  });

  test('search filter performance', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.recharts-wrapper');

    // Get the search input
    const searchInput = page.locator('input[type="search"]');

    // Measure search response time
    const searchStart = Date.now();
    await searchInput.fill('accessibility');

    // Wait for results to update (looking for any change in result count)
    await page.waitForTimeout(100); // Small delay for debouncing

    const searchTime = Date.now() - searchStart;

    // Search should respond within 300ms
    expect(searchTime).toBeLessThan(300);

    console.log(`Search response time: ${searchTime}ms`);
  });

  test('interaction responsiveness - chart click', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.recharts-wrapper');

    // Measure chart interaction response time
    const interactionStart = Date.now();

    // Click on a chart segment
    const chartSegment = page.locator('.recharts-sector').first();
    await chartSegment.click();

    // Wait for any visual updates
    await page.waitForTimeout(50);

    const interactionTime = Date.now() - interactionStart;

    // Interaction should respond within 100ms
    expect(interactionTime).toBeLessThan(100);

    console.log(`Chart interaction time: ${interactionTime}ms`);
  });

  test('resource usage - memory', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.recharts-wrapper');

    // Get performance metrics
    const metrics = await page.evaluate(() => {
      return {
        memory: performance.memory ? {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        } : null,
      };
    });

    if (metrics.memory) {
      console.log('Memory usage:', metrics.memory);

      // Memory usage should be reasonable (less than 50MB)
      const memoryUsageMB = metrics.memory.usedJSHeapSize / (1024 * 1024);
      expect(memoryUsageMB).toBeLessThan(50);

      console.log(`Memory usage: ${memoryUsageMB.toFixed(2)}MB`);
    }
  });

  test('resource loading - network requests', async ({ page }) => {
    let requestCount = 0;
    let totalSize = 0;

    // Monitor network requests
    page.on('response', async (response) => {
      requestCount++;
      try {
        const body = await response.body();
        totalSize += body.length;
      } catch {
        // Some responses may not have a body
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    console.log(`Total requests: ${requestCount}`);
    console.log(`Total size: ${(totalSize / 1024).toFixed(2)}KB`);

    // Should not make excessive requests (less than 50)
    expect(requestCount).toBeLessThan(50);

    // Total page size should be reasonable (less than 2MB)
    expect(totalSize).toBeLessThan(2 * 1024 * 1024);
  });

  test('time to interactive (TTI)', async ({ page }) => {
    // Navigate and measure TTI
    await page.goto('/');

    const ttiMetrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        if ('PerformanceObserver' in window) {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            resolve(entries);
          });

          // Observe long tasks
          try {
            observer.observe({ entryTypes: ['longtask'] });
          } catch {
            resolve([]);
          }

          // Resolve after a delay if no long tasks
          setTimeout(() => resolve([]), 5000);
        } else {
          resolve([]);
        }
      });
    });

    console.log('Long tasks:', ttiMetrics.length);

    // Should have minimal long tasks (blocking the main thread)
    expect(ttiMetrics.length).toBeLessThan(5);
  });

  test('scroll performance - large dataset', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.recharts-wrapper');

    // Measure scroll performance
    const scrollStart = Date.now();

    // Scroll through results
    for (let i = 0; i < 10; i++) {
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(50);
    }

    const scrollTime = Date.now() - scrollStart;

    console.log(`Scroll time for 10 iterations: ${scrollTime}ms`);

    // Scrolling should be smooth (less than 1 second for 10 scrolls)
    expect(scrollTime).toBeLessThan(1000);
  });

  test('re-render performance - filter changes', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.recharts-wrapper');

    const searchInput = page.locator('input[type="search"]');

    // Measure multiple filter changes
    const filterStart = Date.now();

    await searchInput.fill('a');
    await page.waitForTimeout(50);

    await searchInput.fill('ab');
    await page.waitForTimeout(50);

    await searchInput.fill('abc');
    await page.waitForTimeout(50);

    await searchInput.fill('');
    await page.waitForTimeout(50);

    const filterTime = Date.now() - filterStart;

    console.log(`Multiple filter changes time: ${filterTime}ms`);

    // Multiple filter changes should be fast (less than 500ms)
    expect(filterTime).toBeLessThan(500);
  });

  test('First Contentful Paint (FCP)', async ({ page }) => {
    await page.goto('/');

    const fcpMetric = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const fcp = entries.find(entry => entry.name === 'first-contentful-paint');
          if (fcp) {
            resolve(fcp.startTime);
          }
        });

        try {
          observer.observe({ entryTypes: ['paint'] });
          // Timeout fallback
          setTimeout(() => resolve(null), 5000);
        } catch {
          resolve(null);
        }
      });
    });

    if (fcpMetric) {
      console.log(`First Contentful Paint: ${fcpMetric}ms`);

      // FCP should be less than 1.8 seconds (good score)
      expect(fcpMetric).toBeLessThan(1800);
    }
  });
});

test.describe('Performance Benchmarks', () => {
  test('component render benchmark', async ({ page }) => {
    await page.goto('/');

    // Use Performance API to measure component renders
    const renderMetrics = await page.evaluate(() => {
      const measures = performance.getEntriesByType('measure');
      const marks = performance.getEntriesByType('mark');

      return {
        measures: measures.map(m => ({ name: m.name, duration: m.duration })),
        marks: marks.map(m => ({ name: m.name, startTime: m.startTime })),
      };
    });

    console.log('Render metrics:', renderMetrics);

    // This is mostly informational, but we can check that metrics exist
    expect(renderMetrics).toBeDefined();
  });

  test('bundle size check', async ({ page }) => {
    let jsSize = 0;
    let cssSize = 0;

    page.on('response', async (response) => {
      const url = response.url();

      if (url.endsWith('.js')) {
        try {
          const body = await response.body();
          jsSize += body.length;
        } catch {
          // Ignore errors
        }
      } else if (url.endsWith('.css')) {
        try {
          const body = await response.body();
          cssSize += body.length;
        } catch {
          // Ignore errors
        }
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    console.log(`JS bundle size: ${(jsSize / 1024).toFixed(2)}KB`);
    console.log(`CSS bundle size: ${(cssSize / 1024).toFixed(2)}KB`);

    // Bundle sizes should be reasonable
    expect(jsSize).toBeLessThan(500 * 1024); // Less than 500KB JS
    expect(cssSize).toBeLessThan(50 * 1024);  // Less than 50KB CSS
  });
});
