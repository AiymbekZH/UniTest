/**
 * Centralized sanitization helpers for user-generated content.
 *
 * Usage:
 *   const { sanitizeHtml, sanitizePlainText, sanitizeObject } = require('../utils/sanitize');
 *   const clean = sanitizeHtml(userInput);                     // rich text
 *   const plain = sanitizePlainText(userInput);                // strip ALL tags
 *   const body  = sanitizeObject(req.body, ['title', 'bio']); // bulk clean fields
 */
const sanitize = require('sanitize-html');

// Strict: remove ALL HTML tags — for names, emails, IDs, etc.
function sanitizePlainText(value) {
  if (typeof value !== 'string') return '';
  return sanitize(value, { allowedTags: [], allowedAttributes: {} }).trim();
}

// Permissive: allow basic formatting — for rich text editors, comments, bios.
const SAFE_TAGS = [
  'b', 'i', 'u', 'em', 'strong', 's', 'strike', 'del',
  'p', 'br', 'hr', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'blockquote', 'pre', 'code',
  'a', 'span', 'sub', 'sup',
  'table', 'thead', 'tbody', 'tr', 'th', 'td'
];

const SAFE_ATTRS = {
  a: ['href', 'target', 'rel'],
  span: ['style'],
  td: ['colspan', 'rowspan'],
  th: ['colspan', 'rowspan']
};

function sanitizeRichText(value) {
  if (typeof value !== 'string') return '';
  return sanitize(value, {
    allowedTags: SAFE_TAGS,
    allowedAttributes: SAFE_ATTRS,
    allowedSchemes: ['http', 'https', 'mailto'],
    // Force safe link attributes
    transformTags: {
      a: sanitize.simpleTransform('a', { rel: 'noopener noreferrer nofollow', target: '_blank' })
    }
  }).trim();
}

/**
 * Sanitize specific string fields on an object in-place.
 * @param {Object} obj — e.g. req.body
 * @param {string[]} plainFields — fields to strip ALL HTML from
 * @param {string[]} richFields  — fields to allow safe HTML in
 * @returns {Object} same object, mutated
 */
function sanitizeObject(obj, plainFields = [], richFields = []) {
  if (!obj || typeof obj !== 'object') return obj;
  for (const key of plainFields) {
    if (typeof obj[key] === 'string') {
      obj[key] = sanitizePlainText(obj[key]);
    }
  }
  for (const key of richFields) {
    if (typeof obj[key] === 'string') {
      obj[key] = sanitizeRichText(obj[key]);
    }
  }
  return obj;
}

module.exports = { sanitizePlainText, sanitizeRichText, sanitizeObject };
