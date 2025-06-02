interface DOIAuthor {
  given?: string;
  family?: string;
  literal?: string;
}

interface DOICitation {
  title?: string;
  'container-title'?: string;
  publisher?: string;
  'published-online'?: { 'date-parts': number[][] };
  'published-print'?: { 'date-parts': number[][] };
  issued?: { 'date-parts': number[][] };
  author?: DOIAuthor[];
  page?: string;
  volume?: string;
  issue?: string;
  DOI?: string;
  URL?: string;
  type?: string;
  abstract?: string;
  'journal-issue'?: any;
  'short-container-title'?: string[];
  ISSN?: string[];
  'publisher-location'?: string;
  language?: string;
  subject?: string[];
}

export async function fetchDOICitation(doi: string): Promise<DOICitation | null> {
  if (!doi) return null;

  try {
    // Clean the DOI (remove "https://doi.org/" prefix if present)
    const cleanDOI = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//, '');
    
    const response = await fetch(`https://doi.org/${cleanDOI}`, {
      headers: {
        'Accept': 'application/vnd.citationstyles.csl+json',
      },
    });

    if (!response.ok) {
      console.warn(`DOI API request failed for ${cleanDOI}:`, response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    return data as DOICitation;
  } catch (error) {
    console.error('Error fetching DOI citation data:', error);
    return null;
  }
}

export function formatAuthors(authors: DOIAuthor[], highlightName?: string): string {
  if (!authors || authors.length === 0) return '';

  const formattedAuthors = authors.map(author => {
    let name = '';
    
    if (author.literal) {
      name = author.literal;
    } else {
      const given = author.given || '';
      const family = author.family || '';
      name = given && family ? `${given} ${family}` : given || family;
    }

    // Check if this author matches the highlight regex
    if (highlightName && name.match(new RegExp(highlightName, 'i'))) {
      return `<strong>${name}</strong>`;
    }
    
    return name;
  }).filter(Boolean);

  // Format author list with proper grammar
  if (formattedAuthors.length === 1) {
    return formattedAuthors[0];
  } else if (formattedAuthors.length === 2) {
    return `${formattedAuthors[0]} and ${formattedAuthors[1]}`;
  } else if (formattedAuthors.length > 2) {
    const allButLast = formattedAuthors.slice(0, -1);
    const last = formattedAuthors[formattedAuthors.length - 1];
    return `${allButLast.join(', ')}, and ${last}`;
  }
  
  return '';
}

export function parseJatsToHtml(text: string): string {
  if (!text) return '';

  // Common JATS XML to HTML tag mappings
  const jatsToHtml: { [key: string]: string } = {
    // Text formatting
    'italic': 'em',
    'bold': 'strong',
    'underline': 'u',
    'strike': 's',
    'monospace': 'code',
    
    // Scientific formatting
    'sup': 'sup',
    'sub': 'sub',
    'sc': 'span', // small caps - will add CSS class
    
    // Special characters and math
    'inline-formula': 'span',
    'tex-math': 'span',
    
    // Links and references
    'ext-link': 'a',
    'xref': 'a',
    
    // Lists (basic support)
    'list': 'ul',
    'list-item': 'li',
    
    // Paragraphs
    'p': 'p',
    'sec': 'div',
    
    // Tables (basic)
    'table': 'table',
    'thead': 'thead',
    'tbody': 'tbody',
    'tr': 'tr',
    'td': 'td',
    'th': 'th',
  };

  let html = text;

  // Convert JATS tags to HTML tags
  Object.entries(jatsToHtml).forEach(([jatsTag, htmlTag]) => {
    // Handle opening tags with attributes
    const openTagRegex = new RegExp(`<${jatsTag}([^>]*)>`, 'gi');
    html = html.replace(openTagRegex, (match, attributes) => {
      if (jatsTag === 'sc') {
        return `<${htmlTag} class="small-caps"${attributes}>`;
      }
      if (jatsTag === 'ext-link' && attributes.includes('ext-link-type="uri"')) {
        // Extract href from attributes if present
        const hrefMatch = attributes.match(/xlink:href="([^"]+)"/);
        const href = hrefMatch ? ` href="${hrefMatch[1]}"` : '';
        return `<${htmlTag}${href} target="_blank" rel="noopener">`;
      }
      return `<${htmlTag}${attributes}>`;
    });

    // Handle closing tags
    const closeTagRegex = new RegExp(`</${jatsTag}>`, 'gi');
    html = html.replace(closeTagRegex, `</${htmlTag}>`);
  });

  // Clean up any remaining unknown JATS tags (convert to spans to preserve content)
  html = html.replace(/<([a-zA-Z][a-zA-Z0-9-]*)[^>]*>/g, (match, tagName) => {
    // List of safe HTML tags to keep as-is
    const safeTags = ['em', 'strong', 'u', 's', 'code', 'sup', 'sub', 'span', 'a', 'p', 'div', 'ul', 'li', 'br'];
    if (safeTags.includes(tagName.toLowerCase())) {
      return match;
    }
    // Convert unknown tags to spans
    return '<span>';
  });

  html = html.replace(/<\/([a-zA-Z][a-zA-Z0-9-]*)>/g, (match, tagName) => {
    const safeTags = ['em', 'strong', 'u', 's', 'code', 'sup', 'sub', 'span', 'a', 'p', 'div', 'ul', 'li', 'br'];
    if (safeTags.includes(tagName.toLowerCase())) {
      return match;
    }
    return '</span>';
  });

  // Handle common XML entities
  const entities: { [key: string]: string } = {
    '&lt;': '<',
    '&gt;': '>',
    '&amp;': '&',
    '&quot;': '"',
    '&apos;': "'",
    '&nbsp;': ' ',
    '&ndash;': '–',
    '&mdash;': '—',
    '&hellip;': '…',
  };

  Object.entries(entities).forEach(([entity, char]) => {
    html = html.replace(new RegExp(entity, 'g'), char);
  });

  return html.trim();
}

export function cleanAbstract(text: string): string {
  if (!text) return '';
  
  // First, handle any HTML tags that might wrap the abstract word
  let cleaned = text.trim();
  
  // Remove "Abstract" from the beginning (case insensitive)
  // Handle various patterns including HTML tags, punctuation, and whitespace
  cleaned = cleaned.replace(/^(\s*<[^>]*>\s*)*\s*abstract\s*(<[^>]*>\s*)*[:\.\-]?\s*/i, '');
  
  // Also handle cases where "Abstract" might be after some initial HTML tags
  cleaned = cleaned.replace(/^(\s*<[^>]*>\s*)+abstract\s*[:\.\-]?\s*/i, '');
  
  // Handle plain text cases with various separators
  cleaned = cleaned.replace(/^abstract\s*[:\.\-\u2014\u2013]?\s*/i, '');
  
  // Remove any leading whitespace or empty HTML tags
  cleaned = cleaned.replace(/^(\s|<br\s*\/?>|<p>\s*<\/p>|<div>\s*<\/div>)+/i, '');
  
  // Trim any remaining whitespace
  cleaned = cleaned.trim();
  
  return cleaned;
} 