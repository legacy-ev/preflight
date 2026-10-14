export const WELL_KNOWN = [
  '/.well-known/mcp/server.json', '/.well-known/mcp.json',
  '/.well-known/agent-card.json', '/.well-known/agent.json', '/llms.txt',
];
const TYPES = ['api', 'mcp', 'ucp', 'acp', 'pap', 'a2a', 'nlweb', 'webmcp', 'structured_feed', 'markdown', 'browser'];
const STATUSES = ['observed_working', 'discovered', 'announced_only', 'unknown', 'broken'];

export function safeEndpoint(value, origin) {
  if (typeof value !== 'string' || value.length > 2048 || /[\x00-\x20\\]/.test(value)) return null;
  try {
    const url = new URL(value, origin);
    if (url.origin !== origin || url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return null;
    let path = url.pathname;
    for (let i = 0; i < 4; i++) { const next = decodeURIComponent(path); if (next === path) break; path = next; }
    if (/%|[\x00-\x20\\@]/.test(path) || (path !== '/.well-known/agent-card.json' && /(?:pay(?:ment|ee|pal)?|checkout|wallet|invoice|billing|credential|password|login|log-in|sign-?in|oauth|auth|token|secret|card|transfer|bank)/i.test(path))) return null;
    return url.href;
  } catch { return null; }
}

export function discoverRoute(probe, origin) {
  if (probe.status !== 200 || probe.truncated || probe.challenge) return [];
  const url = new URL(probe.url);
  if (url.origin !== origin || !WELL_KNOWN.includes(url.pathname)) return [];
  const route = { status: 'discovered', auth: 'unknown', success_rate_7d: null, sample_size_7d: null,
    discovered_by: 'preflight_scan', discovery_path: url.pathname };
  if (url.pathname === '/llms.txt') {
    if (/^\s*(?:\uFEFF)?#\s+\S/m.test(probe.body) && !/<(?:html|!doctype|script)\b/i.test(probe.body)) return [{ ...route, type: 'markdown', endpoint: `${origin}/llms.txt` }];
    return [];
  }
  let data;
  try { data = JSON.parse(probe.body); } catch { return []; }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return [];
  const a2a = url.pathname.includes('agent');
  // Only explicitly declared service URL fields; never search arbitrary strings.
  const candidates = a2a
    ? [data.url, ...(Array.isArray(data.supportedInterfaces) ? data.supportedInterfaces.map(x => x?.url) : [])]
    : [data.url, data.endpoint, data.server?.url, ...(Array.isArray(data.servers) ? data.servers.map(x => x?.url) : []), ...(Array.isArray(data.remotes) ? data.remotes.map(x => x?.url) : [])];
  return [...new Set(candidates.map(x => safeEndpoint(x, origin)).filter(Boolean))].map(endpoint => ({ ...route,
    type: a2a ? 'a2a' : 'mcp', endpoint, ...(url.pathname.endsWith('/agent.json') ? { legacy: true } : {}) }));
}

export function orderRoutes(routes) {
  return [...routes].sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || TYPES.indexOf(a.type) - TYPES.indexOf(b.type) ||
    ((b.sample_size_7d >= 5 ? b.success_rate_7d ?? -1 : -1) - (a.sample_size_7d >= 5 ? a.success_rate_7d ?? -1 : -1)));
}

export function responseRoutes(routes, domain) {
  const origin = `https://${domain}`;
  return orderRoutes(routes.filter(r => r.discovered_by === 'preflight_scan' && TYPES.includes(r.type) && STATUSES.includes(r.status) && safeEndpoint(r.endpoint, origin)))
    .map(r => ({ type: r.type, status: r.status, endpoint: safeEndpoint(r.endpoint, origin), auth: r.auth ?? 'unknown',
      success_rate_7d: r.sample_size_7d >= 5 ? r.success_rate_7d ?? null : null, sample_size_7d: r.sample_size_7d ?? null,
      ...(r.legacy ? { legacy: true } : {}) }));
}
