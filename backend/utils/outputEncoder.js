/**
 * Output Encoding Utilities
 * Context-aware encoding to prevent XSS attacks
 */

/**
 * HTML entity encoding
 */
export const encodeHTML = (str) => {
  if (typeof str !== 'string') return str;
  
  const entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;'
  };
  
  return str.replace(/[&<>"'/]/g, (s) => entityMap[s]);
};

/**
 * JavaScript encoding
 */
export const encodeJS = (str) => {
  if (typeof str !== 'string') return str;
  
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
};

/**
 * URL encoding
 */
export const encodeURL = (str) => {
  if (typeof str !== 'string') return str;
  return encodeURIComponent(str);
};

/**
 * CSS encoding
 */
export const encodeCSS = (str) => {
  if (typeof str !== 'string') return str;
  
  return str.replace(/[^a-zA-Z0-9]/g, (char) => {
    const code = char.charCodeAt(0);
    return `\\${code.toString(16).padStart(4, '0')}`;
  });
};

/**
 * Context-aware encoding for JSON responses
 */
export const encodeForJSON = (data) => {
  if (typeof data === 'string') {
    return encodeHTML(data);
  }
  
  if (Array.isArray(data)) {
    return data.map(item => encodeForJSON(item));
  }
  
  if (data && typeof data === 'object') {
    const encoded = {};
    for (const [key, value] of Object.entries(data)) {
      encoded[key] = encodeForJSON(value);
    }
    return encoded;
  }
  
  return data;
};

/**
 * Sanitize user input for display
 */
export const sanitizeForDisplay = (str) => {
  if (typeof str !== 'string') return str;
  
  // Remove null bytes
  let sanitized = str.replace(/\0/g, '');
  
  // Encode HTML entities
  sanitized = encodeHTML(sanitized);
  
  return sanitized;
};

