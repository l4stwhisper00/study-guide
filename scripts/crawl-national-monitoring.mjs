import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  classifyMonitoringRecord,
  decodeHtml,
  normalizeSettlement,
  parseMonitoringRecords
} from "./national-monitoring-parser.mjs";

const ROOT_URL = "https://monitoring.miccedu.ru/?m=spo&year=2025";
const USER_AGENT = "SchoolNavigator public catalogue research/1.0";
const CONCURRENCY = Math.max(1, Number(process.env.CRAWL_CONCURRENCY || 2));
const REQUEST_DELAY_MS = Math.max(0, Number(process.env.CRAWL_REQUEST_DELAY_MS || 300));
const CHUNK_INDEX = Math.max(0, Number(process.env.CRAWL_CHUNK_INDEX || 0));
const CHUNK_COUNT = Math.max(1, Number(process.env.CRAWL_CHUNKS || 1));
const OUTPUT_CSV = process.env.OUTPUT_CSV || "data/incoming/national-monitoring-2025.csv";
const OUTPUT_REPORT = process.env.OUTPUT_REPORT || "data/incoming/national-monitoring-2025-report.json";

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchText(url) {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(45000)
      });
      if (!response.ok) {
        throw new Error("HTTP " + response.status + " for " + url);
      }
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        const rateLimited = String(error).includes("HTTP 468");
        await sleep(rateLimited ? 5000 * (attempt + 1) : 1000 * (attempt + 1));
      }
    }
  }
  throw lastError;
}

function parseRegionIndex(html) {
  const links = [...String(html).matchAll(/<a\b[^>]*href=['"]([^'"]*material\.php\?[^'"]*)['"][^>]*>([\s\S]*?)<\/a>/gi)]
    .map(match => ({ href: match[1], name: decodeHtml(match[2]) }));
  const regions = new Map();
  for (const item of links) {
    const id = item.href.match(/[?&]id=(\d+)/)?.[1];
    if (id && !regions.has(id)) regions.set(id, { ...item, id });
  }
  return [...regions.values()];
}

async function mapLimit(items, limit, callback) {
  const output = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      try {
        output[index] = await callback(items[index], index);
      } catch (error) {
        output[index] = { error: String(error), region: items[index] };
      }
    }
  });
  await Promise.all(workers);
  return output;
}

function ownershipFromName(name) {
  const value = String(name || "");
  if (/(частн|негосудар|автономная некоммерческая организация высшего образования|АНО|ЧОУ|ЧПОУ|ООО)/i.test(value)) return "private";
  if (/(государствен|федеральн|муницип|бюджетн|казенн)/i.test(value)) return "public";
  return "";
}

function csvCell(value) {
  return '"' + String(value ?? "").replace(/"/g, '""') + '"';
}

function toCsv(rows) {
  const columns = [
    "sourceId", "regionId", "name", "type", "city", "region", "address",
    "locationKind", "parentName", "sourceUrl", "snapshotDate",
    "coordinates", "coordinatesAvailable", "ownership"
  ];
  return [columns.join(";"), ...rows.map(row => columns.map(key => csvCell(row[key])).join(";"))].join("\n") + "\n";
}

const rootHtml = await fetchText(ROOT_URL);
const allRegions = parseRegionIndex(rootHtml);
if (allRegions.length < 80) {
  throw new Error("Expected the national index to expose at least 80 regional pages; found " + allRegions.length);
}
if (CHUNK_INDEX >= CHUNK_COUNT) {
  throw new Error("CRAWL_CHUNK_INDEX must be smaller than CRAWL_CHUNKS.");
}
const chunkSize = Math.ceil(allRegions.length / CHUNK_COUNT);
const regions = allRegions.slice(CHUNK_INDEX * chunkSize, (CHUNK_INDEX + 1) * chunkSize);
if (!regions.length) throw new Error("The selected crawl chunk contains no regions.");

console.log("REGIONS_DISCOVERED " + allRegions.length);
console.log("REGIONS_SELECTED " + JSON.stringify({ chunkIndex: CHUNK_INDEX, chunkCount: CHUNK_COUNT, count: regions.length }));
const regionResults = await mapLimit(regions, CONCURRENCY, async region => {
  await sleep(REQUEST_DELAY_MS);
  const vpoUrl = new URL(region.href, ROOT_URL).href;
  const spoUrl = vpoUrl.replace("/_vpo/", "/_spo/");
  const pages = await Promise.all([fetchText(vpoUrl), fetchText(spoUrl)]);
  const vpoRows = parseMonitoringRecords(pages[0]);
  const spoRows = parseMonitoringRecords(pages[1]);
  return {
    region,
    vpoUrl,
    spoUrl,
    vpoRows,
    spoRows,
    vpoIds: new Set(vpoRows.map(row => String(row.id)))
  };
});

const successful = regionResults.filter(result => !result.error);
const failures = regionResults.filter(result => result.error).map(result => ({
  id: result.region.id,
  name: result.region.name,
  error: result.error
}));
const records = new Map();
const needsReview = [];
const skipped = { missingId: 0, missingName: 0, missingCity: 0, unknownMarker: 0, duplicateSourceId: 0 };
let rawVpoRows = 0;
let rawSpoRows = 0;

function addRows(rows, regionResult, pageType, pageUrl) {
  for (const row of rows) {
    if (!row.id) { skipped.missingId += 1; continue; }
    if (!row.name) { skipped.missingName += 1; continue; }
    const classified = classifyMonitoringRecord(row, {
      pageType,
      vpoIds: regionResult.vpoIds
    });
    if (!classified.type) {
      skipped.unknownMarker += 1;
      needsReview.push({
        region: regionResult.region.name,
        sourceId: row.id,
        marker: row.icon,
        name: row.name,
        city: row.city
      });
      continue;
    }
    const city = normalizeSettlement(row.city);
    if (!city) {
      skipped.missingCity += 1;
      needsReview.push({
        region: regionResult.region.name,
        sourceId: row.id,
        marker: row.icon,
        name: row.name,
        city: row.city,
        reason: "Не указан населённый пункт"
      });
      continue;
    }
    const record = {
      sourceId: String(row.id),
      regionId: String(regionResult.region.id),
      name: row.name,
      type: classified.type,
      city,
      region: regionResult.region.name,
      address: row.address || "",
      locationKind: classified.locationKind,
      parentName: "",
      sourceUrl: pageUrl,
      snapshotDate: pageType === "vpo" ? "2026-02-03" : "2025",
      coordinates: row.coordinates || "",
      coordinatesAvailable: row.coordinates ? "Есть" : "",
      ownership: ownershipFromName(row.name),
      _sourceLevel: pageType
    };
    const key = regionResult.region.id + "|" + record.sourceId;
    const existing = records.get(key);
    const score = item => (item._sourceLevel === "vpo" && item.type === "vuz" ? 4 : 0)
      + (item.address ? 2 : 0) + (item.city ? 1 : 0);
    if (!existing) records.set(key, record);
    else {
      skipped.duplicateSourceId += 1;
      if (score(record) > score(existing)) records.set(key, record);
    }
  }
}

for (const result of successful) {
  rawVpoRows += result.vpoRows.length;
  rawSpoRows += result.spoRows.length;
  addRows(result.vpoRows, result, "vpo", result.vpoUrl);
  addRows(result.spoRows, result, "spo", result.spoUrl);
}

const outputRows = [...records.values()]
  .map(({ _sourceLevel, ...record }) => record)
  .sort((a, b) => a.region.localeCompare(b.region, "ru")
    || a.city.localeCompare(b.city, "ru")
    || a.name.localeCompare(b.name, "ru"));

const cities = new Set(outputRows.map(row => row.city));
const settlementLocations = new Set(outputRows.map(row => row.region + "|" + row.city));
const byType = {
  vuz: outputRows.filter(row => row.type === "vuz").length,
  college: outputRows.filter(row => row.type === "college").length
};
const byLocationKind = {
  institution: outputRows.filter(row => row.locationKind === "institution").length,
  branch: outputRows.filter(row => row.locationKind === "branch").length
};
const regionStats = successful.map(result => {
  const rows = outputRows.filter(row => row.region === result.region.name);
  return {
    id: result.region.id,
    name: result.region.name,
    vpoListedRows: result.vpoRows.length,
    spoListedRows: result.spoRows.length,
    uniqueRecords: rows.length,
    uniqueSettlements: new Set(rows.map(row => row.city)).size
  };
});

const report = {
  generatedAt: new Date().toISOString(),
  sourceIndexUrl: ROOT_URL,
  regionPagesDiscovered: allRegions.length,
  regionPagesRequested: regions.length,
  chunkIndex: CHUNK_INDEX,
  chunkCount: CHUNK_COUNT,
  regionPagesFetched: successful.length,
  regionFailures: failures,
  rawVpoRows,
  rawSpoRows,
  uniqueRecords: outputRows.length,
  uniqueSettlements: settlementLocations.size,
  uniqueCityNames: cities.size,
  byType,
  byLocationKind,
  skipped,
  needsReviewCount: needsReview.length,
  needsReview: needsReview.slice(0, 250),
  regionStats
};

mkdirSync(path.dirname(OUTPUT_CSV), { recursive: true });
mkdirSync(path.dirname(OUTPUT_REPORT), { recursive: true });
writeFileSync(OUTPUT_CSV, toCsv(outputRows), "utf8");
writeFileSync(OUTPUT_REPORT, JSON.stringify(report, null, 2) + "\n", "utf8");

console.log("CRAWL_SUMMARY " + JSON.stringify({
  regionPagesDiscovered: report.regionPagesDiscovered,
  regionPagesRequested: report.regionPagesRequested,
  chunkIndex: CHUNK_INDEX,
  chunkCount: CHUNK_COUNT,
  regionPagesFetched: report.regionPagesFetched,
  failedRegions: failures.length,
  rawVpoRows,
  rawSpoRows,
  uniqueRecords: outputRows.length,
  uniqueSettlements: settlementLocations.size,
  uniqueCityNames: cities.size,
  byType,
  byLocationKind,
  skipped,
  needsReviewCount: needsReview.length
}));
if (failures.length) {
  console.log("CRAWL_FAILURES " + JSON.stringify(failures));
  process.exitCode = 1;
}
console.log("CRAWL_OUTPUT " + JSON.stringify({ csv: OUTPUT_CSV, report: OUTPUT_REPORT }));
