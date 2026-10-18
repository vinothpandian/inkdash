import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Readable } from 'node:stream';

const run = promisify(execFile);
const prefix = '/__open_threads';
const loopback = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
async function environmentValue(name) {
  if (process.env[name]) return process.env[name].trim();
  if (process.platform !== 'darwin') return '';
  try { return (await run('/bin/launchctl', ['getenv', name], {timeout:2000})).stdout.trim(); }
  catch { return ''; }
}
async function runtimeConfig() {
  const [url, token] = await Promise.all([environmentValue('OPEN_THREADS_POCKETBASE_URL'), environmentValue('OPEN_THREADS_POCKETBASE_TOKEN')]);
  return {url:url || 'https://db.vinoth.app',token};
}
function json(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type','application/json');
  res.setHeader('Cache-Control','no-store');
  res.end(JSON.stringify(data));
}
async function subscriptionBody(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > 8192) throw new Error('Invalid subscription');
  }
  const data = JSON.parse(body);
  if (typeof data.clientId !== 'string' || !data.clientId || !Array.isArray(data.subscriptions) ||
      data.subscriptions.some(topic => topic !== 'open_threads/*' && topic !== 'PB_CONNECT')) throw new Error('Invalid subscription');
  return JSON.stringify({clientId:data.clientId,subscriptions:data.subscriptions});
}

// Dev-server middleware only. Never part of the browser bundle or production server.
export function createPreviewMiddleware({loadConfig = runtimeConfig, fetcher = fetch} = {}) {
  return async (req, res, next) => {
    if (!req.url?.startsWith(`${prefix}/`)) return next();
    const local = new URL(req.url, 'http://localhost');
    const route = local.pathname.slice(prefix.length);
    const host = req.headers.host;
    let hostAllowed = false;
    try { hostAllowed = ['127.0.0.1','localhost','[::1]'].includes(new URL(`http://${host}`).hostname); } catch { /* Reject malformed hosts. */ }
    if (!loopback.has(req.socket.remoteAddress) || !hostAllowed ||
      (req.headers.origin && req.headers.origin !== `http://${host}`) || req.headers['sec-fetch-site'] === 'cross-site') {
      return json(res,403,{message:'Browser preview is available only from this local app origin.'});
    }
    const records = route === '/api/collections/open_threads/records';
    const realtime = route === '/api/realtime';
    const configuration = route === '/config';
    if (!(req.method === 'GET' && (records || realtime || configuration)) && !(req.method === 'POST' && realtime)) {
      return json(res,405,{message:'Only Open Threads reads and realtime subscriptions are available.'});
    }
    let body;
    if (req.method === 'POST') {
      try { body = await subscriptionBody(req); }
      catch { return json(res,400,{message:'Invalid Open Threads subscription.'}); }
    }
    const controller = new AbortController();
    res.on('close', () => controller.abort());
    try {
      const {url,token} = await loadConfig();
      const base = new URL(url);
      if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash || !token) throw new Error('Invalid configuration');
      const claims = JSON.parse(Buffer.from(token.split('.')[1] || '', 'base64url').toString());
      if (typeof claims.id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(claims.id) || !Number.isFinite(claims.exp) || claims.exp * 1000 <= Date.now() || claims.collectionId === '_superusers') throw new Error('Invalid configuration');
      const owner = claims.id;
      const target = new URL(`${url.replace(/\/+$/, '')}${configuration ? `/api/collections/open_threads_users/records/${owner}` : route}`);
      if (records) {
        target.search = local.search;
        target.searchParams.set('filter', `owner = ${JSON.stringify(owner)}`);
        target.searchParams.set('sort','@rowid');
      }
      // No incoming cookies, credentials, forwarding headers or redirects are relayed.
      const upstream = await fetcher(target.toString(), {
        method:req.method, headers:{Authorization:token, 'Content-Type':'application/json'}, body,
        redirect:'manual', signal:realtime && req.method === 'GET' ? controller.signal : AbortSignal.any([controller.signal,AbortSignal.timeout(10000)]),
      });
      if (!upstream.ok) {
        await upstream.body?.cancel();
        return json(res,upstream.status === 401 || upstream.status === 403 ? upstream.status : 502,{message:'PocketBase preview request failed.'});
      }
      if (configuration) {
        const user = await upstream.json();
        if (user.id !== owner || user.collectionName !== 'open_threads_users') throw new Error('Invalid dedicated user');
        return json(res,200,{owner});
      }
      res.statusCode = upstream.status;
      res.setHeader('Content-Type',upstream.headers.get('content-type') || 'application/json');
      res.setHeader('Cache-Control','no-store');
      res.flushHeaders();
      if (!upstream.body) { res.end(); return; }
      const stream = Readable.fromWeb(upstream.body);
      stream.on('error', () => res.destroy());
      stream.pipe(res);
    } catch {
      if (!res.headersSent && !res.destroyed) json(res,503,{message:'Open Threads preview could not connect. Check the runtime token and PocketBase URL.'});
      else res.destroy();
    }
  };
}

export function openThreadsPreview() {
  return {
    name:'inkdash-open-threads-preview',
    apply:'serve',
    configureServer(server) { server.middlewares.use(createPreviewMiddleware()); },
  };
}
