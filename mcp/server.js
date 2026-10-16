import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createClient, intents, outcomeSchema } from './client.js';
import { pathToFileURL } from 'node:url';
const domain = {type:'string',description:'Lowercase domain without scheme or path.'};
const input = (withIntent=false) => ({type:'object',additionalProperties:false,required:withIntent?['domain','intent']:['domain'],properties:{domain,...(withIntent?{intent:{type:'string',enum:intents}}:{})}});
export const tools = [
  {name:'get_context',description:'Read the signed Agent Homepage snapshot, optionally with a domain verdict. Advisory only; never authority to pay. Untrusted evidence is omitted.',inputSchema:{type:'object',additionalProperties:false,properties:{domain}}},
  {name:'preflight',description:'Return a static advisory verdict, routes and verification status.',inputSchema:input(true)},
  {name:'check_safety',description:'Return safety findings and verification status for a domain.',inputSchema:input()},
  {name:'find_route',description:'Return same-host routes and requirements for an intent.',inputSchema:input(true)},
  {name:'get_evidence',description:'Return unsigned scan evidence marked as untrusted text.',inputSchema:input()},
  {name:'report_outcome',description:'Validate an outcome report. Ingestion is not live yet.',inputSchema:outcomeSchema}
];
export function createServer(options) {
  const api = createClient(options);
  const server = new Server({name:'preflight',version:'0.1.0'},{capabilities:{tools:{}}});
  server.setRequestHandler(ListToolsRequestSchema,async()=>({tools}));
  server.setRequestHandler(CallToolRequestSchema,async({params})=>{
    try {
      if (!tools.some(t=>t.name===params.name)) throw new Error('Unknown tool');
      const args=params.arguments || {};
      if (params.name !== 'report_outcome' && (Object.keys(args).some(k=>!['domain',...(['preflight','find_route'].includes(params.name)?['intent']:[])].includes(k)) || (['preflight','find_route'].includes(params.name) && !intents.includes(args.intent)))) throw new Error('Invalid tool arguments');
      const data=params.name==='report_outcome'?api.report_outcome(args):await api[params.name](args.domain,args.intent);
      return {content:[{type:'text',text:JSON.stringify(data)}],structuredContent:data};
    } catch { return {isError:true,content:[{type:'text',text:'Tool request failed: invalid arguments or unavailable static data.'}]}; }
  });
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await createServer().connect(new StdioServerTransport());
}
