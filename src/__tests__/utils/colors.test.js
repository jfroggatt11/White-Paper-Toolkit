import { describe, it, expect } from 'vitest';
import { lighten } from '../../utils/colors';

describe('lighten()', () => {
  describe('valid hex formats', () => {
    it('should handle 3-character hex without #', () => {
      const result = lighten('fff', 0.5);
      expect(result).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('should handle 3-character hex with #', () => {
      const result = lighten('#fff', 0.5);
      expect(result).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('should handle 6-character hex without #', () => {
      const result = lighten('ffffff', 0.5);
      expect(result).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('should handle 6-character hex with #', () => {
      const result = lighten('#ffffff', 0.5);
      expect(result).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('should handle uppercase hex codes', () => {
      const result = lighten('#FFF', 0.5);
      expect(result).toMatch(/^#[0-9a-f]{6}$/);
      expect(result).toBe(result.toLowerCase());
    });

    it('should handle mixed case hex codes', () => {
      const result = lighten('#FfFfFf', 0.5);
      expect(result).toMatch(/^#[0-9a-f]{6}$/);
      expect(result).toBe(result.toLowerCase());
    });
  });

  describe('boundary cases', () => {
    it('should handle lighten by 0% (no change)', () => {
      const input = '#2563eb';
      const result = lighten(input, 0);
      expect(result).toBe(input);
    });

    it('should handle lighten by 50%', () => {
      const result = lighten('#000000', 0.5);
      // Black at 50% should be #808080 (128,128,128) - rounds up
      expect(result).toBe('#808080');
    });

    it('should handle lighten by 100% (full white)', () => {
      const result = lighten('#000000', 1);
      expect(result).toBe('#ffffff');
    });

    it('should not change white when lightening', () => {
      const result = lighten('#ffffff', 0.5);
      expect(result).toBe('#ffffff');
    });
  });

  describe('invalid inputs', () => {
    it('should handle null input with default fallback', () => {
      const result = lighten(null, 0.3);
      expect(result).toMatch(/^#[0-9a-f]{6}$/);
      // Should use default color 64748b
      expect(result).toBeTruthy();
    });

    it('should handle undefined input with default fallback', () => {
      const result = lighten(undefined, 0.3);
      expect(result).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('should handle empty string with default fallback', () => {
      const result = lighten('', 0.3);
      expect(result).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  describe('return format', () => {
    it('should always return lowercase hex', () => {
      const result = lighten('#ABCDEF', 0.3);
      expect(result).toBe(result.toLowerCase());
    });

    it('should always return 6-character hex with #', () => {
      const result = lighten('#abc', 0.3);
      expect(result).toMatch(/^#[0-9a-f]{6}$/);
      expect(result.length).toBe(7); // # + 6 characters
    });
  });

  describe('default amount parameter', () => {
    it('should use default amount of 0.3 when not specified', () => {
      const withDefault = lighten('#000000');
      const withExplicit = lighten('#000000', 0.3);
      expect(withDefault).toBe(withExplicit);
    });
  });

  describe('realistic color examples', () => {
    it('should lighten blue correctly', () => {
      const blue = '#2563eb';
      const lightened = lighten(blue, 0.35);
      expect(lightened).toMatch(/^#[0-9a-f]{6}$/);
      // Result should be lighter (higher RGB values)
      const original = parseInt(blue.slice(1), 16);
      const result = parseInt(lightened.slice(1), 16);
      expect(result).toBeGreaterThan(original);
    });

    it('should lighten red correctly', () => {
      const red = '#ef4444';
      const lightened = lighten(red, 0.3);
      expect(lightened).toMatch(/^#[0-9a-f]{6}$/);
      const original = parseInt(red.slice(1), 16);
      const result = parseInt(lightened.slice(1), 16);
      expect(result).toBeGreaterThan(original);
    });
  });
});
