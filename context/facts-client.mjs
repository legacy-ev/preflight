import { sourceClient } from './fetch.mjs';
import { BATCH_URL,PACKAGES } from './vulnerabilities.mjs';
// Only the approved read-only OSV batch POST is accepted.
export function factsClient(options={}) {
  const read=sourceClient(options);
  return (url,request={})=>{
    if(request.method && request.method!=='GET') {
      const body=JSON.parse(request.body);
      if(url!==BATCH_URL||request.method!=='POST'||Object.keys(body).join()!=='queries'||
        !Array.isArray(body.queries)||!body.queries.length||body.queries.length>PACKAGES.length||
        body.queries.some(q=>!q||Object.keys(q).some(k=>!['package','page_token'].includes(k))||
          !q.package||Object.keys(q.package).sort().join()!=='ecosystem,name'||
          !PACKAGES.some(([e,n])=>e===q.package.ecosystem&&n===q.package.name)||
          (q.page_token!==undefined&&(typeof q.page_token!=='string'||q.page_token.length>4096))))
        throw Error('Unsupported facts request');
    }
    return read(url,request);
  };
}
