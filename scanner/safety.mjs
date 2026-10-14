import { domainToUnicode } from 'node:url';
import { attributes, decodeEntities, jsonLD } from './html.mjs';

const IGNORE = /(?:ignore|disregard|forget|override)\s+(?:(?:all|the|your)\s+)*(?:previous|prior|earlier|system)\s+(?:instructions?|prompts?|rules?)/i;
const IMPERATIVE = /\b(?:ignore|obey|follow|send|pay|transfer|reveal|disclose|override|execute|must|redirect|visit|call|use|output|return|click|enter|submit)\b/i;
const ADDRESSED = /\b(?:AI|assistant|agent|language model|ChatGPT|system prompt)\b/i;
const PAYMENT = /\b(?:send|pay|transfer)\b[\s\S]{0,80}\b(?:payment|money|funds|coins?|wallet|bitcoin|eth|usd|gbp|eur|to)\b|\b0x[a-f0-9]{40}\b|\b(?:bc1[a-z0-9]{25,90}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b|https?:[^\s"<>]*(?:\/pay(?:ment)?\b|\/checkout\b)|\b(?:reveal|send|enter|submit|disclose)\b[\s\S]{0,80}\b(?:credentials?|passwords?|api.?keys?|card number|cvv)\b/i;
const INVISIBLE = /[\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g;

function hidden(style) {
  if (/display\s*:\s*none|visibility\s*:\s*hidden|font-size\s*:\s*0(?:px|em|rem|%)?\b|opacity\s*:\s*0(?:\s*[;!]|$)|(?:left|top|right|bottom|text-indent)\s*:\s*-\d{3,}|transform\s*:\s*translate[^;]*-\d{3,}/i.test(style)) return true;
  const color = style.match(/(?:^|;)\s*color\s*:\s*([^;!]+)/i)?.[1]?.trim().toLowerCase();
  const bg = style.match(/(?:^|;)\s*background(?:-color)?\s*:\s*([^;!]+)/i)?.[1]?.trim().toLowerCase();
  return Boolean(color && bg && color === bg);
}

export function scanInjection(html) {
  const findings = [];
  const add = (code, severity, text) => {
    if (findings.some(x => x.code === code)) return;
    findings.push({ code, severity, span: decodeEntities(text).replace(/[\r\n\t]/g, ' ').slice(0, 200), untrusted_evidence: true });
  };
  const inspect = (text, context) => {
    const decoded = decodeEntities(text);
    const clean = decoded.replace(INVISIBLE, '');
    if (IGNORE.test(clean)) add('IGNORE_PREVIOUS_INSTRUCTIONS', 'high', decoded);
    if (context === 'metadata') {
      if (PAYMENT.test(clean)) add('METADATA_PAYMENT_OR_CREDENTIAL_INSTRUCTION', 'high', decoded);
      else if (ADDRESSED.test(clean) && IMPERATIVE.test(clean)) add('METADATA_AI_INSTRUCTION', 'high', decoded);
      else if (/\b(?:instructions?|system prompt)\b/i.test(clean) && IMPERATIVE.test(clean)) add('SUSPICIOUS_META_INSTRUCTION', 'medium', decoded);
    } else if (context === 'hidden' && ADDRESSED.test(clean) && IMPERATIVE.test(clean)) add('HIDDEN_TEXT_INSTRUCTION', 'high', decoded);
    else if (context === 'comment' && IMPERATIVE.test(clean)) add('COMMENT_INSTRUCTION', 'medium', decoded);
    else if (context === 'attribute' && clean.length > 200 && IMPERATIVE.test(clean)) add('LONG_ACCESSIBILITY_INSTRUCTION', 'medium', decoded);
    if ((decoded.match(INVISIBLE)?.length ?? 0) > 10) add('INVISIBLE_UNICODE', 'medium', decoded);
  };
  // Decode JSON string escapes before inspecting metadata, but never echo whole manifests.
  for (const value of jsonLD(html)) {
    try { inspect(JSON.stringify(value), 'metadata'); }
    catch { add('HTML_INSPECTION_LIMIT', 'info', 'JSON-LD exceeds safe static inspection depth.'); }
  }
  const selectors = new Set();
  for (const css of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)) {
    for (const rule of css[1].matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (hidden(rule[2])) for (const selector of rule[1].split(',')) selectors.add(selector.trim());
    }
  }
  const stack = [];
  // Tags with quoted > are kept whole. Script/style contents are opaque.
  const tokenRE = /<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script\s*>|<style\b[^>]*>[\s\S]*?<\/style\s*>|<(?:"[^"]*"|'[^']*'|[^'">])*>|[^<]+/gi;
  for (const token of html.matchAll(tokenRE)) {
    const value = token[0];
    if (value.startsWith('<!--')) { inspect(value.slice(4, -3), 'comment'); continue; }
    if (/^<style\b/i.test(value)) continue;
    if (/^<script\b/i.test(value)) {
      if (/application\/ld\+json/i.test(value)) inspect(value.replace(/^<[^>]*>|<\/script\s*>$/gi, ''), 'metadata');
      continue;
    }
    if (value.startsWith('</')) {
      const name = value.match(/^<\/\s*([\w-]+)/)?.[1]?.toLowerCase();
      const i = stack.findLastIndex(x => x.name === name);
      if (i >= 0) {
        inspect(stack[i].text, stack[i].hidden ? 'hidden' : 'visible');
        stack.splice(i);
      }
      continue;
    }
    if (value.startsWith('<')) {
      const name = value.match(/^<\s*([\w-]+)/)?.[1]?.toLowerCase();
      if (!name) continue;
      const attrs = attributes(value.replace(/^<\s*[\w-]+/, '').replace(/>$/, ''));
      if (name === 'meta') inspect(Object.values(attrs).join(' '), 'metadata');
      for (const key of ['alt', 'aria-label']) if (attrs[key]) inspect(attrs[key], 'attribute');
      const classes = (attrs.class ?? '').split(/\s+/);
      const cssHidden = selectors.has(name) || selectors.has(`#${attrs.id}`) || classes.some(c => selectors.has(`.${c}`) || selectors.has(`${name}.${c}`));
      const isHidden = stack.some(x => x.hidden) || 'hidden' in attrs || attrs['aria-hidden'] === 'true' || hidden(attrs.style ?? '') || cssHidden;
      if (!/^(?:area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/.test(name) && !value.endsWith('/>')) {
        if(stack.length>=128) {add('HTML_INSPECTION_LIMIT','info','HTML exceeds safe static inspection depth.');break;}
        stack.push({ name, hidden: isHidden, text: '' });
      }
      continue;
    }
    inspect(value, stack.some(x => x.hidden) ? 'hidden' : 'visible');
    for (const entry of stack) entry.text += value.slice(0, Math.max(0, 4000 - entry.text.length));
  }
  for (const entry of stack) inspect(entry.text, entry.hidden ? 'hidden' : 'visible');
  return findings;
}

export function hasProduct(html) {
  const pending = [...jsonLD(html)];
  let count = 0;
  while (pending.length && count++ < 10000) {
    const value = pending.pop();
    if (!value || typeof value !== 'object') continue;
    const types = [value['@type']].flat();
    if (types.some(t => typeof t === 'string' && /^(?:https?:\/\/schema\.org\/)?Product$/.test(t))) return true;
    pending.push(...Object.values(value).filter(x => x && typeof x === 'object'));
  }
  return false;
}

export function domainAge(rdap, at = new Date().toISOString()) {
  const dates = (rdap?.events ?? []).filter(x => x.eventAction === 'registration').map(x => Date.parse(x.eventDate)).filter(Number.isFinite);
  if (!dates.length) return null;
  const age = Math.floor((Date.parse(at) - Math.min(...dates)) / 86400000);
  return age >= 0 ? age : null;
}

function distance(a, b) {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(next[j - 1] + 1, row[j] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    row = next;
  }
  return row[b.length];
}
function skeleton(domain) {
  const map = { 'а': 'a', 'ɑ': 'a', 'α': 'a', 'е': 'e', 'ε': 'e', 'о': 'o', 'ο': 'o', 'р': 'p', 'ρ': 'p', 'с': 'c', 'х': 'x', 'у': 'y', 'і': 'i', 'ӏ': 'l', '0': 'o', '1': 'l' };
  return domainToUnicode(domain).toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '').replace(/[аɑαеεоοрρсхуіӏ01]/g, c => map[c]);
}
export function lookalike(domain, seeds) {
  if (seeds.includes(domain)) return null;
  const target = skeleton(domain);
  const candidates = seeds.map(seed => ({ seed, distance: distance(target, skeleton(seed)) })).filter(x => x.distance <= 2);
  candidates.sort((a, b) => a.distance - b.distance || a.seed.localeCompare(b.seed));
  return candidates[0]?.seed ?? null;
}
