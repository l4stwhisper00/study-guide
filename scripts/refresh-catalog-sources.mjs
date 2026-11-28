import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const root = process.cwd();
const statusPath = root + '/catalog-source-status.json';
const previous = existsSync(statusPath) ? JSON.parse(readFileSync(statusPath, 'utf8')) : null;
const now = new Date();
const intervalMs = 14 * 24 * 60 * 60 * 1000;
const force = process.env.FORCE_CATALOG_REFRESH === 'true';
const checkOnly = process.env.CATALOG_REFRESH_CHECK_ONLY === 'true';

const sandbox = {};
const bundle = readFileSync(root + '/data.js', 'utf8') + '\n' +
  readFileSync(root + '/data-extra.js', 'utf8') + '\n' +
  readFileSync(root + '/catalog-data-live.js', 'utf8') + '\n' +
  readFileSync(root + '/catalog-details.js', 'utf8') +
  '\n;globalThis.__catalogBundle = { SCHOOLS, CATALOG_DETAILS, CATALOG_LIVE_DETAILS };';
vm.runInNewContext(bundle, sandbox, { timeout: 5000 });
const { SCHOOLS, CATALOG_DETAILS, CATALOG_LIVE_DETAILS } = sandbox.__catalogBundle;

if (!force && previous?.checkedAt && now.getTime() - Date.parse(previous.checkedAt) < intervalMs) {
  console.log('Official source availability check skipped: last full check is less than 14 days old.');
  process.exit(0);
}

const byUrl = new Map();
function addReference(rawUrl, reference) {
  if (!rawUrl) return;
  let url;
  try {
    url = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : 'https://' + rawUrl);
  } catch {
    return;
  }
  if (!['http:', 'https:'].includes(url.protocol)) return;
  const key = url.href;
  if (!byUrl.has(key)) {
    byUrl.set(key, {
      url: key,
      references: []
    });
  }
  byUrl.get(key).references.push(reference);
}

for (const school of SCHOOLS) {
  addReference(school.u, {
    schoolId: school.id,
    school: school.n,
    city: school.c,
    type: 'institution_website'
  });
}

const detailMaps = [
  CATALOG_DETAILS?.schools || {},
  CATALOG_LIVE_DETAILS?.schools || {}
];
for (const detailMap of detailMaps) {
  for (const [schoolId, details] of Object.entries(detailMap)) {
    for (const item of details.tuition || []) {
      addReference(item.sourceUrl || details.sourceUrl, {
        schoolId,
        type: 'tuition_document',
        program: item.program || null,
        year: item.year || null
      });
    }
    for (const item of details.budgetPlaces || []) {
      addReference(item.sourceUrl || details.sourceUrl, {
        schoolId,
        type: 'funded_places_document',
        program: item.program || null,
        year: item.year || null
      });
    }
    if (details.sourceUrl) {
      addReference(details.sourceUrl, {
        schoolId,
        type: 'institution_profile_source'
      });
    }
  }
}

const sources = [...byUrl.values()];
const cache = new Map();

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function request(url, method) {
  return fetch(url, {
    method,
    redirect: 'follow',
    signal: AbortSignal.timeout(12000),
    headers: {
      'user-agent': 'SchoolNavigatorCatalogBot/1.1 (+https://navigator.devs.li)',
      'accept': 'text/html,application/pdf,application/xhtml+xml,*/*'
    }
  });
}

async function checkSource(url) {
  if (cache.has(url)) return cache.get(url);
  const promise = (async () => {
    let lastError = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        let response = await request(url, 'HEAD');
        if ([403, 405, 501].includes(response.status)) {
          response = await request(url, 'GET');
          if (response.body) await response.body.cancel().catch(() => {});
        }
        if ([429, 500, 502, 503, 504].includes(response.status) && attempt === 0) {
          await wait(1200);
          continue;
        }
        return {
          reachable: response.ok,
          httpStatus: response.status,
          finalUrl: response.url,
          contentType: response.headers.get('content-type'),
          error: response.ok ? null : 'http_error'
        };
      } catch (error) {
        lastError = error;
        if (attempt === 0) {
          await wait(600);
          continue;
        }
      }
    }
    return {
      reachable: null,
      httpStatus: null,
      finalUrl: null,
      contentType: null,
      error: lastError?.name === 'TimeoutError' ? 'timeout' : 'network_or_tls_error'
    };
  })();
  cache.set(url, promise);
  return promise;
}

let cursor = 0;
const results = new Array(sources.length);
async function worker() {
  while (true) {
    const index = cursor++;
    if (index >= sources.length) return;
    const source = sources[index];
    results[index] = {
      url: source.url,
      referenceCount: source.references.length,
      references: source.references,
      checkedAt: now.toISOString(),
      ...(await checkSource(source.url))
    };
  }
}

await Promise.all(Array.from({ length: 10 }, worker));
const reachable = results.filter(item => item.reachable === true).length;
const unreachable = results.filter(item => item.reachable === false).length;
const unknown = results.length - reachable - unreachable;
const organizationReferences = sources.reduce((sum, item) =>
  sum + item.references.filter(reference => reference.type === 'institution_website').length, 0);
const admissionsReferences = sources.reduce((sum, item) =>
  sum + item.references.filter(reference => reference.type !== 'institution_website').length, 0);

const report = {
  checkedAt: now.toISOString(),
  intervalDays: 14,
  organizations: organizationReferences,
  total: results.length,
  admissionsReferences,
  reachable,
  unreachable,
  unknown,
  note: 'This is a technical availability check for official institution and admissions URLs. It does not prove that prices or funded places are unchanged; those values are updated only by the separate official-data importer.',
  sources: results
};

console.log('Official source availability: ' + reachable + '/' + results.length +
  ' URLs reachable, ' + unreachable + ' HTTP errors, ' + unknown + ' inconclusive.');
console.log('Checked ' + organizationReferences + ' institution homepage references and ' +
  admissionsReferences + ' admissions-document references.');

for (const item of results.filter(result => result.reachable !== true)) {
  console.log((item.references[0]?.schoolId || 'unknown') + ': ' +
    item.error + (item.httpStatus ? ' HTTP ' + item.httpStatus : '') + ' ' + item.url);
}

if (!checkOnly) {
  writeFileSync(statusPath, JSON.stringify(report, null, 2) + '\n');
}
