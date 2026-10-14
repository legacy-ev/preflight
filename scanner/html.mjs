// Static inspection only: no JavaScript execution, remote CSS or linked resources.
export function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|colon|Tab|NewLine|nbsp);?/gi, (whole, entity) => {
    if (entity.startsWith('#')) {
      const n = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
      return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : whole;
    }
    return ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", colon: ':', tab: '\t', newline: '\n', nbsp: ' ' })[entity.toLowerCase()] ?? whole;
  });
}

export function attributes(tag) {
  const result = Object.create(null);
  for (const m of tag.matchAll(/([^\s=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    result[m[1].toLowerCase()] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? '');
  }
  return result;
}

export function jsonLD(html) {
  const values = [];
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (attributes(m[1]).type?.toLowerCase() !== 'application/ld+json') continue;
    try { values.push(JSON.parse(m[2])); } catch { /* Invalid JSON is not structured data. */ }
  }
  return values;
}
