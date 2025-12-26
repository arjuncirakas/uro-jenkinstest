/**
 * Tests for output encoder utilities
 * Tests all functions to achieve 100% coverage
 */
import { describe, it, expect } from '@jest/globals';
import * as outputEncoder from '../utils/outputEncoder.js';

describe('Output Encoder', () => {
  describe('encodeHTML', () => {
    it('should encode HTML special characters', () => {
      expect(outputEncoder.encodeHTML('&')).toBe('&amp;');
      expect(outputEncoder.encodeHTML('<')).toBe('&lt;');
      expect(outputEncoder.encodeHTML('>')).toBe('&gt;');
      expect(outputEncoder.encodeHTML('"')).toBe('&quot;');
      expect(outputEncoder.encodeHTML("'")).toBe('&#39;');
      expect(outputEncoder.encodeHTML('/')).toBe('&#x2F;');
    });

    it('should encode multiple special characters', () => {
      expect(outputEncoder.encodeHTML('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
    });

    it('should return non-string values as-is', () => {
      expect(outputEncoder.encodeHTML(123)).toBe(123);
      expect(outputEncoder.encodeHTML(null)).toBe(null);
      expect(outputEncoder.encodeHTML(undefined)).toBe(undefined);
      expect(outputEncoder.encodeHTML({})).toEqual({});
    });

    it('should not encode regular text', () => {
      expect(outputEncoder.encodeHTML('Hello World')).toBe('Hello World');
    });
  });

  describe('encodeJS', () => {
    it('should encode JavaScript special characters', () => {
      expect(outputEncoder.encodeJS('\\')).toBe('\\\\');
      expect(outputEncoder.encodeJS("'")).toBe("\\'");
      expect(outputEncoder.encodeJS('"')).toBe('\\"');
      expect(outputEncoder.encodeJS('\n')).toBe('\\n');
      expect(outputEncoder.encodeJS('\r')).toBe('\\r');
      expect(outputEncoder.encodeJS('\t')).toBe('\\t');
    });

    it('should encode multiple special characters', () => {
      expect(outputEncoder.encodeJS("alert('xss')")).toBe("alert(\\'xss\\')");
    });

    it('should return non-string values as-is', () => {
      expect(outputEncoder.encodeJS(123)).toBe(123);
      expect(outputEncoder.encodeJS(null)).toBe(null);
      expect(outputEncoder.encodeJS(undefined)).toBe(undefined);
    });
  });

  describe('encodeURL', () => {
    it('should encode URL special characters', () => {
      expect(outputEncoder.encodeURL('hello world')).toBe('hello%20world');
      expect(outputEncoder.encodeURL('test&value=123')).toBe('test%26value%3D123');
    });

    it('should return non-string values as-is', () => {
      expect(outputEncoder.encodeURL(123)).toBe(123);
      expect(outputEncoder.encodeURL(null)).toBe(null);
    });
  });

  describe('encodeCSS', () => {
    it('should encode CSS special characters', () => {
      const result = outputEncoder.encodeCSS('test-value');
      expect(result).toContain('\\');
    });

    it('should not encode alphanumeric characters', () => {
      expect(outputEncoder.encodeCSS('test123')).toBe('test123');
    });

    it('should return non-string values as-is', () => {
      expect(outputEncoder.encodeCSS(123)).toBe(123);
      expect(outputEncoder.encodeCSS(null)).toBe(null);
    });
  });

  describe('encodeForJSON', () => {
    it('should encode strings', () => {
      expect(outputEncoder.encodeForJSON('<script>')).toBe('&lt;script&gt;');
    });

    it('should encode arrays recursively', () => {
      const result = outputEncoder.encodeForJSON(['<test>', 'normal']);
      expect(result).toEqual(['&lt;test&gt;', 'normal']);
    });

    it('should encode objects recursively', () => {
      const result = outputEncoder.encodeForJSON({
        name: '<script>',
        value: 'normal',
        nested: {
          key: '<alert>'
        }
      });
      expect(result).toEqual({
        name: '&lt;script&gt;',
        value: 'normal',
        nested: {
          key: '&lt;alert&gt;'
        }
      });
    });

    it('should handle nested arrays and objects', () => {
      const result = outputEncoder.encodeForJSON({
        items: ['<item1>', { name: '<item2>' }]
      });
      expect(result).toEqual({
        items: ['&lt;item1&gt;', { name: '&lt;item2&gt;' }]
      });
    });

    it('should return non-string, non-object, non-array values as-is', () => {
      expect(outputEncoder.encodeForJSON(123)).toBe(123);
      expect(outputEncoder.encodeForJSON(null)).toBe(null);
      expect(outputEncoder.encodeForJSON(true)).toBe(true);
    });
  });

  describe('sanitizeForDisplay', () => {
    it('should remove null bytes and encode HTML', () => {
      const result = outputEncoder.sanitizeForDisplay('test\0<script>');
      expect(result).toBe('test&lt;script&gt;');
    });

    it('should encode HTML entities', () => {
      expect(outputEncoder.sanitizeForDisplay('<>&"\'/')).toBe('&lt;&gt;&amp;&quot;&#39;&#x2F;');
    });

    it('should return non-string values as-is', () => {
      expect(outputEncoder.sanitizeForDisplay(123)).toBe(123);
      expect(outputEncoder.sanitizeForDisplay(null)).toBe(null);
    });
  });
});











