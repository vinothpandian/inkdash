import { Readable, Writable } from 'node:stream';
import { expect, it, vi } from 'vitest';
import { createPreviewMiddleware } from '../dev/openThreadsPreview.mjs';
const secret = `e30.${Buffer.from(JSON.stringify({id:'owner',exp:Date.now()/1000+3600})).toString('base64url')}.signature`;
async function request(path: string, method = 'GET', body = '', origin = 'http://127.0.0.1:5173', remoteAddress = '127.0.0.1', fetcher = vi.fn(async () => new Response(JSON.stringify({ id: 'owner', collectionName: 'open_threads_users' })))) {
  const req = Object.assign(Readable.from(body ? [body] : []), { url: `/__open_threads${path}`, method, headers: { host:'127.0.0.1:5173', origin }, socket: {remoteAddress} });
  const chunks: Buffer[] = [];
  const headers: Record<string,string> = {};
  const res = Object.assign(new Writable({ write(chunk, _, next) { chunks.push(Buffer.from(chunk)); next(); } }), {statusCode:200, setHeader(name: string,value: string) {headers[name]=value;}, flushHeaders() {}});
  const finished = new Promise(resolve => res.on('finish', resolve));
  const loadConfig = vi.fn(async () => ({url:'https://db.vinoth.app',token:secret}));
  await createPreviewMiddleware({loadConfig,fetcher})(req,res,vi.fn());
  await finished;
  return {status:res.statusCode,body:Buffer.concat(chunks).toString(),headers,fetcher,loadConfig};
}
it('returns only the verified owner, never the secret', async () => {
  const r=await request('/config');
  expect(r.status).toBe(200); expect(JSON.parse(r.body)).toEqual({owner:'owner'}); expect(r.body).not.toContain(secret);
  expect(r.fetcher.mock.calls[0][1].headers.Authorization).toBe(secret);
});
it.each([['/api/collections/open_threads/records','POST'],['/api/collections/users/records','GET'],['/api/collections/open_threads/records/id','DELETE']])('blocks record writes and unrelated collections: %s %s',async (path,method)=>{
  const r=await request(path,method);expect(r.status).toBe(405);expect(r.fetcher).not.toHaveBeenCalled();
});
it('rejects remote clients and cross-origin access before reading secrets',async()=>{
  for (const [origin,remote] of [['https://evil.example','127.0.0.1'],['http://127.0.0.1:5173','192.168.1.10']]) {
    const r=await request('/config','GET','',origin,remote);expect(r.status).toBe(403);expect(r.loadConfig).not.toHaveBeenCalled();
  }
});
it('limits realtime subscriptions to Open Threads',async()=>{
  const r=await request('/api/realtime','POST',JSON.stringify({clientId:'client',subscriptions:['users/*']}));
  expect(r.status).toBe(400);expect(r.fetcher).not.toHaveBeenCalled();
});
it('streams SSE without buffering it into a JSON response',async()=>{
  const fetcher=vi.fn(async()=>new Response('event: PB_CONNECT\ndata: {"clientId":"abc"}\n\n',{headers:{'content-type':'text/event-stream'}}));
  const r=await request('/api/realtime','GET','','http://127.0.0.1:5173','127.0.0.1',fetcher);
  expect(r.body).toContain('event: PB_CONNECT'); expect(r.headers['Content-Type']).toBe('text/event-stream');
});
it('forces owner filtering on record reads',async()=>{
  const fetcher=vi.fn(async()=>new Response(JSON.stringify({items:[]})));
  await request('/api/collections/open_threads/records?filter=owner%3D%22another%22','GET','','http://127.0.0.1:5173','127.0.0.1',fetcher);
  expect(new URL(fetcher.mock.calls[0][0]).searchParams.get('filter')).toBe('owner = "owner"');
});

it('does not expose upstream errors or accept a user from another collection',async()=>{
  const fetcher=vi.fn(async()=>new Response(JSON.stringify({id:'owner',collectionName:'users',token:secret})));
  const r=await request('/config','GET','','http://127.0.0.1:5173','127.0.0.1',fetcher);
  expect(r.status).toBe(503);expect(r.body).not.toContain(secret);
});
it('rejects upstream redirects instead of forwarding credentials elsewhere',async()=>{
  const fetcher=vi.fn(async()=>new Response(null,{status:302,headers:{location:'https://evil.example'}}));
  const r=await request('/config','GET','','http://127.0.0.1:5173','127.0.0.1',fetcher);
  expect(r.status).toBe(502);expect(r.fetcher.mock.calls[0][1].redirect).toBe('manual');expect(r.headers.Location).toBeUndefined();
});
