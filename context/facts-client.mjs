import { sourceClient } from './fetch.mjs';
// The only POST supported by facts is OSV's read-only package lookup.
export function factsClient(options={}) {
  const read=sourceClient(options);
  return (url,request={})=>{
    if(request.method && request.method!=='GET') {
      const body=JSON.parse(request.body);
      if(url!=='https://api.osv.dev/v1/query'||request.method!=='POST'||
        Object.keys(body).join()!=='package'||Object.keys(body.package).sort().join()!=='ecosystem,name')
        throw Error('Unsupported facts request');
    }
    return read(url,request);
  };
}
