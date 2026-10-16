import { readFile, writeFile, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const TTL = 604800;
export const SOURCES = [
  { provider: 'Groq', source: 'https://console.groq.com/docs/deprecations' },
  { provider: 'Google Gemini', source: 'https://ai.google.dev/gemini-api/docs/deprecations' },
];
const text = html => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&quot;/g, '').replace(/\s+/g, ' ').trim();
export function explicitDate(value) {
  let parts;
  if ((parts = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(value))) {
    value = `${parts[3].length === 2 ? '20' : ''}${parts[3]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  } else if (/^[A-Z][a-z]+ \d{1,2}, \d{4}$/.test(value)) {
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const [month, day, year] = value.replace(',', '').split(' ');
    if (!months.includes(month)) return null;
    value = `${year}-${String(months.indexOf(month)+1).padStart(2,'0')}-${day.padStart(2,'0')}`;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(value);
  return Number.isFinite(+date) && date.toISOString().slice(0,10) === value ? value : null;
}
export function parsePage(html, provider, checked_at) {
  const source = SOURCES.find(s => s.provider === provider)?.source;
  if (!source) throw new Error('Unsupported provider');
  const rows = [];
  for (const table of html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)) {
    let columns;
    for (const row of table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const cells = [...row[1].matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi)].map(m => text(m[1]));
      if (cells.some(c => /^Shutdown date$/i.test(c))) {
        columns = { model: cells.findIndex(c => /^(Deprecated Model|Model ID|Model)$/i.test(c)), date: cells.findIndex(c => /^Shutdown date$/i.test(c)), replacement: cells.findIndex(c => /replacement/i.test(c)) };
        continue;
      }
      if (!columns || columns.model < 0) continue;
      const model_id = cells[columns.model];
      if (!model_id || !/^[a-zA-Z0-9][a-zA-Z0-9/_.-]+$/.test(model_id)) continue;
      const shutdown_date = explicitDate(cells[columns.date] ?? '');
      const replacement = cells[columns.replacement];
      rows.push({ provider, model_id, shutdown_date, replacement: replacement && !/^[—–-]$/.test(replacement) ? replacement : null,
        status: shutdown_date ? 'dated' : 'unknown', date_kind: shutdown_date ? (provider === 'Google Gemini' ? 'earliest_possible' : 'shutdown') : 'unknown',
        source, checked_at, ttl_seconds: TTL });
    }
  }
  return rows;
}
export async function refresh({ fetcher = fetch, at = new Date().toISOString() } = {}) {
  const providers = [], models = [];
  for (const { provider, source } of SOURCES) {
    let rows = [], reason = null;
    try {
      const response = await fetcher(source, { signal: AbortSignal.timeout(30000), redirect: 'error', headers: { Accept: 'text/html' } });
      if (!response.ok) throw new Error('HTTP failure');
      const html = await response.text();
      if (html.length > 5_000_000) throw new Error('Oversized page');
      rows = parsePage(html, provider, at);
      if (!rows.length) reason = 'No recognizable model shutdown table';
    } catch { reason = 'Official page unavailable'; }
    providers.push({ provider, source, checked_at: at, ttl_seconds: TTL, status: reason ? 'unknown' : 'parsed', reason });
    models.push(...rows);
  }
  return { providers, models };
}
export async function writeSnapshot(snapshot, path = new URL('../data/model-deprecations.json', import.meta.url)) {
  const target = path instanceof URL ? path : resolve(path);
  const temporary = target instanceof URL ? new URL(target.href + '.tmp') : target + '.tmp';
  await writeFile(temporary, JSON.stringify(snapshot, null, 2) + '\n');
  await rename(temporary, target);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await writeSnapshot(await refresh());

// Keep source timestamps and expiry intact when included in signed context output.
export async function modelDeprecationFacts() {
  const snapshot = JSON.parse(await readFile(new URL('../data/model-deprecations.json', import.meta.url), 'utf8'));
  return [...snapshot.providers, ...snapshot.models].map(({source, checked_at, ttl_seconds, ...value}) => ({value, source, checked_at, ttl_seconds, untrusted_evidence: true}));
}
