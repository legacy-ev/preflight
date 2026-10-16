import { writeFile,rename } from 'node:fs/promises';
import { join } from 'node:path';
import { timezoneData } from './timezones.mjs';
import { referenceFacts } from './reference-facts.mjs';
import { vulnerabilityFacts } from './vulnerabilities.mjs';
export async function extendedFacts(options) {
  const [timezones,reference,vulnerabilities]=await Promise.all([timezoneData(options),referenceFacts(options),vulnerabilityFacts(options)]);
  return {timezones,reference,vulnerabilities};
}
export function extendSections(sections,facts) {
  sections.world=sections.world.filter(i=>i.source!=='https://www.iana.org/time-zones');
  sections.world.push(facts.timezones.pointer,...facts.reference.countries);
  sections.software=facts.reference.software;
  sections.vulnerabilities=facts.vulnerabilities;
}
export async function publishExtended(result,root) {
  if(!result.timezones)return;
  const path=join(root,'api/v1/timezones.json');
  await writeFile(path+'.tmp',JSON.stringify(result.timezones)+'\n');await rename(path+'.tmp',path);
}
