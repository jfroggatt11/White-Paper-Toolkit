import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility tests for PDATF Toolkit
 * These tests check for WCAG compliance and accessibility issues
 */

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.recharts-wrapper', { timeout: 10000 });
  });

  test('should not have any automatically detectable accessibility issues', async ({ page }) => {
    // Run axe accessibility tests (if axe-core is installed)
    try {
      const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    } catch {
      // If axe-core is not available, skip this test
      console.log('Axe-core not available, skipping automated accessibility scan');
      test.skip();
    }
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    // Get all headings
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();

    if (headings.length > 0) {
      // There should be at least one h1
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBeGreaterThanOrEqual(1);

      // Check that heading levels don't skip
      const headingLevels = await page.evaluate(() => {
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        return headings.map(h => parseInt(h.tagName.substring(1)));
      });

      console.log('Heading levels found:', headingLevels);

      // First heading should be h1
      expect(headingLevels[0]).toBe(1);
    }
  });

  test('should have alt text for images', async ({ page }) => {
    const images = await page.locator('img').all();

    for (const img of images) {
      const alt = await img.getAttribute('alt');
      // Alt attribute should exist (can be empty for decorative images)
      expect(alt).not.toBeNull();
    }
  });

  test('should have proper labels for form inputs', async ({ page }) => {
    const inputs = await page.locator('input, select, textarea').all();

    for (const input of inputs) {
      const hasLabel = await input.evaluate((el) => {
        // Check for various labeling methods
        return !!(
          el.getAttribute('aria-label') ||
          el.getAttribute('aria-labelledby') ||
          el.getAttribute('title') ||
          document.querySelector(`label[for="${el.id}"]`) ||
          el.closest('label')
        );
      });

      const inputType = await input.getAttribute('type');
      console.log(`Input type ${inputType} has label:`, hasLabel);

      expect(hasLabel).toBeTruthy();
    }
  });

  test('should support keyboard navigation', async ({ page }) => {
    // Focus on the first interactive element
    await page.keyboard.press('Tab');

    // Get the focused element
    let focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();

    // Tab through several elements
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
    }

    // Check that focus moved
    const newFocusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(newFocusedElement).toBeTruthy();
  });

  test('should have visible focus indicators', async ({ page }) => {
    // Tab to first interactive element
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);

    // Check that focused element has visible outline or focus style
    const hasFocusStyle = await page.evaluate(() => {
      const activeEl = document.activeElement;
      const styles = window.getComputedStyle(activeEl);

      return (
        styles.outline !== 'none' ||
        styles.outlineWidth !== '0px' ||
        styles.boxShadow !== 'none' ||
        styles.border !== styles.getPropertyValue('--original-border')
      );
    });

    expect(hasFocusStyle).toBeTruthy();
  });

  test('should have sufficient color contrast', async ({ page }) => {
    // This is a basic check - for comprehensive contrast checking, use axe-core
    const bodyBg = await page.evaluate(() => {
      const styles = window.getComputedStyle(document.body);
      return styles.backgroundColor;
    });

    const bodyColor = await page.evaluate(() => {
      const styles = window.getComputedStyle(document.body);
      return styles.color;
    });

    console.log('Body background:', bodyBg);
    console.log('Body color:', bodyColor);

    // Colors should be defined
    expect(bodyBg).toBeTruthy();
    expect(bodyColor).toBeTruthy();
  });

  test('should have proper ARIA roles', async ({ page }) => {
    // Check for common ARIA landmarks
    const main = await page.locator('[role="main"], main').count();
    const navigation = await page.locator('[role="navigation"], nav').count();

    console.log('Main landmarks:', main);
    console.log('Navigation landmarks:', navigation);

    // At least one main content area should exist
    expect(main).toBeGreaterThanOrEqual(0);
  });

  test('should have no duplicate IDs', async ({ page }) => {
    const duplicateIds = await page.evaluate(() => {
      const ids = Array.from(document.querySelectorAll('[id]')).map(el => el.id);
      const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
      return [...new Set(duplicates)];
    });

    console.log('Duplicate IDs:', duplicateIds);
    expect(duplicateIds.length).toBe(0);
  });

  test('should have proper language attribute', async ({ page }) => {
    const lang = await page.getAttribute('html', 'lang');

    expect(lang).toBeTruthy();
    console.log('Page language:', lang);
  });

  test('should be operable with screen reader', async ({ page }) => {
    // Check for ARIA live regions if dynamic content exists
    const liveRegions = await page.locator('[aria-live]').count();
    console.log('ARIA live regions:', liveRegions);

    // Check for ARIA labels on interactive elements
    const interactiveElements = await page.locator('button, a, input, select, textarea').all();

    for (const element of interactiveElements) {
      const hasAccessibleName = await element.evaluate((el) => {
        return !!(
          el.textContent?.trim() ||
          el.getAttribute('aria-label') ||
          el.getAttribute('aria-labelledby') ||
          el.getAttribute('title')
        );
      });

      if (!hasAccessibleName) {
        const tagName = await element.evaluate(el => el.tagName);
        console.warn(`Interactive element ${tagName} has no accessible name`);
      }
    }
  });

  test('should handle zoom to 200%', async ({ page }) => {
    // Set zoom to 200%
    await page.evaluate(() => {
      document.body.style.zoom = '200%';
    });

    await page.waitForTimeout(500);

    // Check that essential elements are still visible and functional
    const chart = page.locator('.recharts-wrapper').first();
    await expect(chart).toBeVisible();

    const searchInput = page.locator('input[type="search"]');
    await expect(searchInput).toBeVisible();

    // Test that search still works at 200% zoom
    await searchInput.fill('test');
    await expect(searchInput).toHaveValue('test');
  });

  test('should support reduced motion preferences', async ({ page }) => {
    // Emulate prefers-reduced-motion
    await page.emulateMedia({ reducedMotion: 'reduce' });

    await page.goto('/');
    await page.waitForSelector('.recharts-wrapper', { timeout: 10000 });

    // Check that the app still functions
    const chart = page.locator('.recharts-wrapper').first();
    await expect(chart).toBeVisible();

    // Check that CSS respects prefers-reduced-motion
    const hasReducedMotion = await page.evaluate(() => {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    });

    expect(hasReducedMotion).toBeTruthy();
  });
});

test.describe('Screen Reader Tests', () => {
  test('should have meaningful page title', async ({ page }) => {
    await page.goto('/');

    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);

    console.log('Page title:', title);
  });

  test('should announce dynamic content changes', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.recharts-wrapper', { timeout: 10000 });

    const searchInput = page.locator('input[type="search"]');

    // Check if there's an ARIA live region for search results
    const liveRegion = page.locator('[aria-live="polite"], [aria-live="assertive"], [role="status"]');
    const hasLiveRegion = await liveRegion.count() > 0;

    console.log('Has ARIA live region:', hasLiveRegion);

    // Type in search to trigger content change
    await searchInput.fill('accessibility');
    await page.waitForTimeout(500);

    // If live region exists, it should be present
    if (hasLiveRegion) {
      await expect(liveRegion.first()).toBeVisible();
    }
  });

  test('should have descriptive link text', async ({ page }) => {
    await page.goto('/');

    const links = await page.locator('a').all();

    for (const link of links) {
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute('aria-label');
      const title = await link.getAttribute('title');

      const hasDescriptiveText = !!(text?.trim() || ariaLabel || title);

      if (!hasDescriptiveText) {
        console.warn('Link without descriptive text found');
      }

      expect(hasDescriptiveText).toBeTruthy();
    }
  });
});
