export const BASE = 'https://legacy-ev.github.io/preflight';
export const PRICES = 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json';
export const AGENTS = 'https://raw.githubusercontent.com/ai-robots-txt/ai.robots.txt/main/robots.json';
export const FX = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';
export const REGISTRY = 'https://registry.modelcontextprotocol.io/v0.1/servers?limit=100&version=latest';
// An endpoint being public does not grant commercial redistribution rights.
export const STATUS = Object.entries({Cloudflare:'www.cloudflarestatus.com',GitHub:'www.githubstatus.com',OpenAI:'status.openai.com',Anthropic:'status.claude.com',Vercel:'www.vercel-status.com',Netlify:'www.netlifystatus.com',Discord:'discordstatus.com',Atlassian:'status.atlassian.com',DigitalOcean:'status.digitalocean.com',Twilio:'status.twilio.com'}).map(([name,host])=>({name,url:`https://${host}/api/v2/summary.json`,reuse:'link_only'}));
export const CLOUD_LINKS = {AWS:'https://health.aws.amazon.com/health/status',GCP:'https://status.cloud.google.com/',Azure:'https://azure.status.microsoft/'};
export const COUNTRIES = ['US','GB','CA','AU','NZ','DE','FR','IT','ES','NL','BE','CH','AT','SE','NO','DK','FI','JP','BR','MX'];
export const ZONES = ['UTC','Europe/London','Europe/Paris','Europe/Berlin','America/New_York','America/Chicago','America/Denver','America/Los_Angeles','America/Toronto','America/Sao_Paulo','Africa/Johannesburg','Asia/Dubai','Asia/Kolkata','Asia/Singapore','Asia/Shanghai','Asia/Tokyo','Asia/Seoul','Australia/Sydney','Pacific/Auckland'];
export const MODELS = ['gpt-5','gpt-4.1','gpt-4o','claude-opus-4-1-20250805','claude-sonnet-4-20250514','gemini/gemini-2.5-pro','gemini/gemini-2.5-flash','deepseek/deepseek-chat'];
export const OWASP = 'https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html';
export const PROTOCOLS = [
  {name:'A2A',path:'/.well-known/agent-card.json',source:'https://a2a-protocol.org/latest/specification/'},
  {name:'UCP discovery (not payment authority)',path:'/.well-known/ucp',source:'https://ucp.dev/specification/overview/'},
  {name:'OAuth protected resource metadata',path:'/.well-known/oauth-protected-resource',source:'https://www.rfc-editor.org/rfc/rfc9728.html'},
];
export const PATTERNS = [
  ['IGNORE_PREVIOUS_INSTRUCTIONS','Instruction override attempts'],['HIDDEN_TEXT_INSTRUCTION','Instructions hidden in page content'],
  ['METADATA_PAYMENT_OR_CREDENTIAL_INSTRUCTION','Payment or credential redirection in metadata'],['METADATA_AI_INSTRUCTION','Agent instructions in metadata'],
  ['INVISIBLE_UNICODE','Obfuscated Unicode content'],['COMMENT_INSTRUCTION','Instructions embedded in HTML comments'],['SUSPICIOUS_META_INSTRUCTION','Suspicious metadata instructions'],['LONG_ACCESSIBILITY_INSTRUCTION','Long instructions in accessibility attributes'],['HTML_INSPECTION_LIMIT','Content exceeds static inspection limits'],['SCAM_URGENCY','Urgency or impersonation used to solicit sensitive actions'],
];
export const FAILURES = [
  ['untrusted_instructions','Web content changes the task','Keep retrieved content separate from instructions; require user approval for sensitive actions.',OWASP],
  ['adversarial_browser_content','A page manipulates browser agents','Validate actions against the original user request and constrain tool permissions.','https://arxiv.org/abs/2605.05509'],
  ['false_completion','A finished trace lacks the requested result','Check observable success criteria before reporting completion.','https://arxiv.org/abs/2606.20724'],
  ['stale_context','A cached fact is treated as current','Check each item timestamp and TTL; unavailable data remains unknown.',`${BASE}/api`],
  ['signature_as_authority','A valid signature is treated as permission','Verify provenance, then apply user permissions independently; never infer authority to pay.',`${BASE}/methodology`],
];
