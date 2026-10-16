import {readFile,writeFile,mkdtemp,cp,rename,rm} from 'node:fs/promises';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {sourceClient} from './fetch.mjs';
export const IDENTITY_SOURCES={
 'public_suffix_list.dat':'https://publicsuffix.org/list/public_suffix_list.dat',
 'confusables.txt':'https://www.unicode.org/Public/17.0.0/security/confusables.txt',
 'Scripts.txt':'https://www.unicode.org/Public/17.0.0/ucd/Scripts.txt',
};
function validate(name,text) {
 if(typeof text!=='string' || Buffer.byteLength(text)>2*1024*1024 || /<html|<!doctype/i.test(text)) throw Error('Invalid identity snapshot');
 const lines=text.split('\n').map(l=>l.split(name==='public_suffix_list.dat'?'//':'#')[0].trim()).filter(Boolean);
 const pattern=name==='public_suffix_list.dat'? /^(?:!|\*\.)?[^\s;<>]+$/u : name==='Scripts.txt'?/^[0-9A-F]+(?:\.\.[0-9A-F]+)?\s*;\s*[A-Za-z_]+$/ : /^[0-9A-F]+\s*;\s*(?:[0-9A-F]+\s*)+;\s*MA$/;
 if(lines.length<1000 || lines.some(l=>!pattern.test(l)) || (name==='public_suffix_list.dat'?!text.includes('Mozilla Public'):!text.includes('17.0.0'))) throw Error('Invalid identity snapshot');
}
export async function refreshIdentity({directory=fileURLToPath(new URL('./vendor/',import.meta.url)),at=new Date().toISOString(),read=sourceClient()}={}) {
 const metadata=JSON.parse(await readFile(join(directory,'metadata.json'),'utf8'));
 const age=Date.parse(at)-Date.parse(metadata.checked_at);
 if(!Number.isFinite(age) || age<0) throw Error('Invalid identity snapshot time');
 if(age<604800000)return false;
 const files={};
 // Fixed URLs, bounded transport, robots and no redirects; no credentials.
 for(const [name,url] of Object.entries(IDENTITY_SOURCES)) {files[name]=await read(url);validate(name,files[name]);}
 const stage=await mkdtemp(join(dirname(directory),'identity-stage-'));
 const backup=stage+'-previous';
 try {
  await cp(directory,stage,{recursive:true});
  for(const [name,text] of Object.entries(files))await writeFile(join(stage,name),text);
  await writeFile(join(stage,'metadata.json'),JSON.stringify({checked_at:at,sources:IDENTITY_SOURCES,sha256:Object.fromEntries(Object.entries(files).map(([n,t])=>[n,createHash('sha256').update(t).digest('hex')]))},null,2)+'\n');
  await rename(directory,backup);
  try {await rename(stage,directory);}catch(error){await rename(backup,directory);throw error;}
  await rm(backup,{recursive:true,force:true});
  return true;
 }finally{await rm(stage,{recursive:true,force:true});}
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
 try {console.log(await refreshIdentity()?'Identity snapshots refreshed.':'Identity snapshots are within weekly TTL.');}
 catch {console.error('Identity refresh unavailable; previous snapshots retained.');process.exitCode=1;}
}
