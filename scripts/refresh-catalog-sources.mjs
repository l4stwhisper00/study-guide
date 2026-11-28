import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const root = process.cwd();
const context = {};
const data = readFileSync(root + '/data.js', 'utf8') + '\n' +
  readFileSync(root + '/data-extra.js', 'utf8') +
  '\n;globalThis.__catalogSchools = SCHOOLS;';
vm.runInNewContext(data, context, { timeout: 5000 });
const schools = context.__catalogSchools;
const statusPath = root + '/catalog-source-status.json';
const previous = existsSync(statusPath) ? JSON.parse(readFileSync(statusPath, 'utf8')) : null;
const now = new Date();
const intervalMs = 14 * 24 * 60 * 60 * 1000;
const force = process.env.FORCE_CATALOG_REFRESH === 'true';
if (!force && previous?.checkedAt && now.getTime() - Date.parse(previous.checkedAt) < intervalMs) {
  console.log('Source check skipped: the last full check is less than 14 days old.');
  process.exit(0);
}

const cache = new Map();
async function checkSource(raw) {
  if (!raw) return { reachable: null, httpStatus: null, finalUrl: null, error: 'missing_official_site' };
  let url;
  try { url = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw); }
  catch { return { reachable: null, httpStatus: null, finalUrl: null, error: 'invalid_url' }; }
  if (!['http:', 'https:'].includes(url.protocol)) return { reachable: null, httpStatus: null, finalUrl: null, error: 'unsupported_protocol' };
  const key = url.origin;
  if (cache.has(key)) return cache.get(key);
  const promise = (async () => {
    try {
      let response = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(10000),
        headers: { 'user-agent': 'SchoolNavigatorCatalogBot/1.0 (+https://navigator.devs.li)' }
      });
      if ([403, 405, 501].includes(response.status)) {
        response = await fetch(url, {
          method: 'GET',
          redirect: 'follow',
          signal: AbortSignal.timeout(10000),
          headers: { 'user-agent': 'SchoolNavigatorCatalogBot/1.0 (+https://navigator.devs.li)', range: 'bytes=0-0' }
        });
        if (response.body) await response.body.cancel().catch(() => {});
      }
      return {
        reachable: response.ok,
        httpStatus: response.status,
        finalUrl: response.url,
        error: response.ok ? null : 'http_error'
      };
    } catch (error) {
      return {
        reachable: null,
        httpStatus: null,
        finalUrl: null,
        error: error?.name === 'TimeoutError' ? 'timeout' : 'network_or_tls_error'
      };
    }
  })();
  cache.set(key, promise);
  return promise;
}

let cursor = 0;
const results = new Array(schools.length);
async function worker() {
  while (true) {
    const index = cursor++;
    if (index >= schools.length) return;
    const school = schools[index];
    const checked = await checkSource(school.u);
    results[index] = {
      id: school.id,
      name: school.n,
      city: school.c,
      source: school.u || null,
      checkedAt: now.toISOString(),
      ...checked
    };
  }
}
await Promise.all(Array.from({ length: 8 }, worker));
const reachable = results.filter(item => item.reachable === true).length;
const unreachable = results.filter(item => item.reachable === false).length;
const unknown = results.length - reachable - unreachable;
const report = {
  checkedAt: now.toISOString(),
  intervalDays: 14,
  total: results.length,
  reachable,
  unreachable,
  unknown,
  note: 'This job checks official-site availability only. It does not infer or overwrite tuition fees, state-funded places, admission scores, or program details.',
  sources: results
};
writeFileSync(statusPath, JSON.stringify(report, null, 2) + '\n');
console.log(`Checked ${results.length} institution sources: ${reachable} reachable, ${unreachable} HTTP errors, ${unknown} unknown.`);
