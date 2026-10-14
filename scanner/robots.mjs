// Small, deliberately frozen subset of ai-robots-txt/ai.robots.txt (MIT).
export const AI_AGENTS = Object.freeze({
  training: ['GPTBot', 'ClaudeBot', 'CCBot', 'Bytespider', 'Google-Extended'],
  user_triggered: ['ChatGPT-User', 'Claude-User', 'Perplexity-User', 'AmazonBuyForMe'],
});

export function parseRobots(text) {
  const groups = [];
  let group = null;
  let hasDirectives = false;
  for (const line of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const match = line.split('#')[0].match(/^\s*([\w-]+)\s*:\s*(.*?)\s*$/);
    if (!match) continue;
    const [, rawKey, value] = match;
    const key = rawKey.toLowerCase();
    if (key === 'user-agent') {
      if (!group || hasDirectives) { group = { agents: [], rules: [], delay: 0 }; groups.push(group); hasDirectives = false; }
      group.agents.push(value.toLowerCase());
    } else if (group) {
      hasDirectives = true;
      if ((key === 'allow' || key === 'disallow') && value.startsWith('/')) group.rules.push({ allow: key === 'allow', path: value });
      if (key === 'crawl-delay' && /^\d+(\.\d+)?$/.test(value)) group.delay = Math.max(group.delay, Number(value));
    }
  }
  return groups;
}

// RFC 9309: normalize unreserved percent escapes, retain reserved escapes,
// encode non-ASCII octets consistently without changing slash semantics.
function normalized(path) {
  return path.replace(/[^\x00-\x7F]/gu, ch => encodeURIComponent(ch))
    .replace(/%[0-9a-f]{2}/gi, octet => {
      const ch = String.fromCharCode(parseInt(octet.slice(1), 16));
      return /[a-zA-Z0-9._~-]/.test(ch) ? ch : octet.toUpperCase();
    });
}

// Match literal segments with KMP. Each path character is visited at most a
// constant number of times; preprocessing costs O(pattern length). No regex
// backtracking or retrying a long literal at every wildcard position.
function findLiteral(text, literal, start) {
  if (!literal) return start;
  const failure = new Uint32Array(literal.length);
  for (let i = 1, j = 0; i < literal.length; i++) {
    while (j && literal[i] !== literal[j]) j = failure[j - 1];
    if (literal[i] === literal[j]) j++;
    failure[i] = j;
  }
  for (let i = start, j = 0; i < text.length; i++) {
    while (j && text[i] !== literal[j]) j = failure[j - 1];
    if (text[i] === literal[j]) j++;
    if (j === literal.length) return i - j + 1;
  }
  return -1;
}
function wildcardMatches(pattern, path) {
  const end = pattern.endsWith('$');
  const parts = (end ? pattern.slice(0, -1) : pattern).split('*');
  const first = parts.shift();
  if (!path.startsWith(first)) return false;
  let cursor = first.length;
  if (!parts.length) return !end || cursor === path.length;
  const suffix = end ? parts.pop() : '';
  for (const part of parts) {
    const found = findLiteral(path, part, cursor);
    if (found < 0) return false;
    cursor = found + part.length;
  }
  return !end || (path.length - suffix.length >= cursor && path.endsWith(suffix));
}

export function robotsDecision(groups, agent, path) {
  const token = agent.toLowerCase();
  const scored = groups.map(group => ({ group, score: Math.max(-1, ...group.agents.map(a => a === '*' ? 0 : token.includes(a) ? a.length : -1)) }));
  const max = Math.max(-1, ...scored.map(x => x.score));
  const selected = scored.filter(x => x.score === max && max >= 0).map(x => x.group);
  let winning = null;
  const target = normalized(path);
  for (const rule of selected.flatMap(x => x.rules)) {
    const pattern = normalized(rule.path);
    const specificity = Buffer.byteLength(pattern.replace(/\*/g, '').replace(/\$$/, '').replace(/%[0-9A-F]{2}/g, 'x'));
    if (wildcardMatches(pattern, target) &&
      (!winning || specificity > winning.specificity || (specificity === winning.specificity && rule.allow))) winning = { ...rule, specificity };
  }
  return { allowed: winning?.allow ?? true, matched_rule: winning ? `${winning.allow ? 'Allow' : 'Disallow'}: ${winning.path}`.slice(0, 200) : null,
    untrusted_evidence: true, crawl_delay_seconds: Math.max(0, ...selected.map(x => x.delay)) };
}
