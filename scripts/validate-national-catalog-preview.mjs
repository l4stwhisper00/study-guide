import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const previewPath = process.env.PREVIEW_CATALOG || "data/incoming/catalog-national-preview.js";
const reportPath = process.env.PREVIEW_REPORT || "data/incoming/catalog-national-preview-report.json";
const report = JSON.parse(readFileSync(reportPath, "utf8"));
const source = readFileSync(path.join(root, "data.js"), "utf8") + "\n"
  + readFileSync(path.join(root, "data-extra.js"), "utf8") + "\n"
  + readFileSync(previewPath, "utf8")
  + "\n;globalThis.__preview = { SCHOOLS, CATALOG_NATIONAL };";
const context = {};
vm.runInNewContext(source, context, { timeout: 15000 });
const { SCHOOLS, CATALOG_NATIONAL } = context.__preview;
const records = CATALOG_NATIONAL.records;
const newSource = records.filter(record => record.catalogSource === report.source);
const ids = new Set(records.map(record => record.id));

if (records.length < 4000) throw new Error("National catalogue contains fewer than 4,000 records.");
if (new Set(records.map(record => record.id)).size !== records.length) throw new Error("Duplicate catalogue record IDs.");
if (report.totals.nationalLayerRecords !== records.length) throw new Error("Report and generated catalogue record totals differ.");
if (report.totals.nationalLayerLocations < 1000) throw new Error("National catalogue contains fewer than 1,000 distinct region-settlements.");
if (report.totals.combinedCatalogueRecords < 4000) throw new Error("Combined catalogue target was not reached.");
if (report.needsReview?.length) throw new Error("Catalogue contains records requiring manual review.");
if (!report.coverageNote) throw new Error("The official monitoring coverage limitation is not documented.");
if (newSource.length < 4000) throw new Error("Expected at least 4,000 records from the official monitoring crawl.");

const badNewRows = newSource.filter(record =>
  !record.sourceId || !record.regionId || !record.n || !record.c || !record.region
  || !record.address || !record.coordinates || !record.sourceUrl
  || !["college", "vuz"].includes(record.t)
  || !["institution", "branch"].includes(record.locationKind)
);
if (badNewRows.length) throw new Error("New monitoring records have incomplete required fields: " + badNewRows.length);

const missingSourceLinks = newSource.filter(record => !/monitoring\.miccedu\.ru/i.test(record.sourceUrl));
if (missingSourceLinks.length) throw new Error("Monitoring records have missing source links: " + missingSourceLinks.length);
if (SCHOOLS.length < report.totals.combinedCatalogueRecords) {
  throw new Error("SCHOOLS array is smaller than the reported combined catalogue.");
}

console.log("PREVIEW_VALIDATION " + JSON.stringify({
  nationalRecords: records.length,
  newMonitoringRecords: newSource.length,
  combinedCatalogueRecords: SCHOOLS.length,
  nationalSettlements: report.totals.nationalLayerLocations,
  combinedSettlements: report.totals.combinedCatalogueLocations,
  byType: CATALOG_NATIONAL.byType
}));
