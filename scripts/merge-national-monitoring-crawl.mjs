import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const inputDir = process.env.INPUT_DIR || "data/incoming/parts";
const outputCsv = process.env.OUTPUT_CSV || "data/incoming/national-monitoring-2025-combined.csv";
const outputReport = process.env.OUTPUT_REPORT || "data/incoming/national-monitoring-2025-combined-report.json";

function parseCsv(text, delimiter = ";") {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const source = String(text).replace(/^\uFEFF/, "");
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') { cell += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) { row.push(cell); cell = ""; }
    else if (char === "\n") {
      row.push(cell);
      if (row.some(value => String(value).trim())) rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") cell += char;
  }
  row.push(cell);
  if (row.some(value => String(value).trim())) rows.push(row);
  return rows;
}

function csvCell(value) {
  return '"' + String(value ?? "").replace(/"/g, '""') + '"';
}

function sumObjects(items, key) {
  const out = {};
  for (const item of items) {
    for (const [name, value] of Object.entries(item[key] || {})) {
      out[name] = (out[name] || 0) + Number(value || 0);
    }
  }
  return out;
}

const files = readdirSync(inputDir).sort();
const csvFiles = files.filter(name => /^national-monitoring-2025-part-\d+\.csv$/.test(name));
const reportFiles = files.filter(name => /^national-monitoring-2025-part-\d+-report\.json$/.test(name));
if (csvFiles.length !== 3 || reportFiles.length !== 3) {
  throw new Error("Expected three CSV parts and three reports; found " + csvFiles.length + " CSV / " + reportFiles.length + " reports.");
}

const partReports = reportFiles.map(name => JSON.parse(readFileSync(path.join(inputDir, name), "utf8")));
const allRows = [];
let headers = null;
for (const name of csvFiles) {
  const parsed = parseCsv(readFileSync(path.join(inputDir, name), "utf8"));
  if (parsed.length < 2) throw new Error("Empty crawl part: " + name);
  if (!headers) headers = parsed[0];
  if (JSON.stringify(parsed[0]) !== JSON.stringify(headers)) {
    throw new Error("CSV headers differ in " + name);
  }
  for (const values of parsed.slice(1)) {
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    allRows.push(row);
  }
}
if (!headers.includes("regionId") || !headers.includes("sourceId")) {
  throw new Error("The crawl CSV is missing source identity columns.");
}

const uniqueRows = new Map();
for (const row of allRows) {
  const key = String(row.regionId) + "|" + String(row.sourceId);
  if (!row.regionId || !row.sourceId) throw new Error("A row has no regionId/sourceId.");
  const existing = uniqueRows.get(key);
  if (existing && JSON.stringify(existing) !== JSON.stringify(row)) {
    throw new Error("Conflicting records share source identity " + key);
  }
  if (!existing) uniqueRows.set(key, row);
}
const rows = [...uniqueRows.values()].sort((a, b) =>
  String(a.region).localeCompare(String(b.region), "ru")
  || String(a.city).localeCompare(String(b.city), "ru")
  || String(a.name).localeCompare(String(b.name), "ru")
);

const uniqueSettlements = new Set(rows.map(row => row.region + "|" + row.city));
const uniqueCityNames = new Set(rows.map(row => row.city));
const byType = {
  vuz: rows.filter(row => row.type === "vuz").length,
  college: rows.filter(row => row.type === "college").length
};
const byLocationKind = {
  institution: rows.filter(row => row.locationKind === "institution").length,
  branch: rows.filter(row => row.locationKind === "branch").length
};
const missingFields = {
  sourceId: rows.filter(row => !row.sourceId).length,
  regionId: rows.filter(row => !row.regionId).length,
  name: rows.filter(row => !row.name).length,
  type: rows.filter(row => !["vuz", "college"].includes(row.type)).length,
  city: rows.filter(row => !row.city).length,
  region: rows.filter(row => !row.region).length,
  address: rows.filter(row => !row.address).length,
  coordinates: rows.filter(row => !row.coordinates).length
};
const exactIdentityCounts = new Map();
for (const row of rows) {
  const key = [row.type, row.region, row.name, row.city, row.address]
    .map(value => String(value).toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim())
    .join("|");
  exactIdentityCounts.set(key, (exactIdentityCounts.get(key) || 0) + 1);
}
const exactDuplicateRows = [...exactIdentityCounts.values()].reduce((sum, count) => sum + Math.max(0, count - 1), 0);
const regionPagesDiscovered = Math.max(...partReports.map(report => Number(report.regionPagesDiscovered || 0)));
const regionPagesRequested = partReports.reduce((sum, report) => sum + Number(report.regionPagesRequested || 0), 0);
const regionPagesFetched = partReports.reduce((sum, report) => sum + Number(report.regionPagesFetched || 0), 0);
const regionFailures = partReports.flatMap(report => report.regionFailures || []);
const needsReview = partReports.flatMap(report => report.needsReview || []);
const report = {
  generatedAt: new Date().toISOString(),
  sourceIndexUrl: partReports[0].sourceIndexUrl,
  regionPagesDiscovered,
  regionPagesRequested,
  regionPagesFetched,
  regionFailures,
  rawVpoRows: partReports.reduce((sum, item) => sum + Number(item.rawVpoRows || 0), 0),
  rawSpoRows: partReports.reduce((sum, item) => sum + Number(item.rawSpoRows || 0), 0),
  uniqueRecords: rows.length,
  uniqueSettlements: uniqueSettlements.size,
  uniqueCityNames: uniqueCityNames.size,
  byType,
  byLocationKind,
  skipped: sumObjects(partReports, "skipped"),
  needsReviewCount: needsReview.length,
  needsReview,
  missingFields,
  exactDuplicateRows,
  parts: partReports.map(item => ({
    chunkIndex: item.chunkIndex,
    regionPagesRequested: item.regionPagesRequested,
    regionPagesFetched: item.regionPagesFetched,
    uniqueRecords: item.uniqueRecords,
    uniqueSettlements: item.uniqueSettlements,
    failedRegions: (item.regionFailures || []).length
  })),
  coverageNote: "Официальный мониторинг охватывает организации, предоставившие сведения; он не является полным реестром лицензий и не включает часть ведомственных организаций и организации, не предоставившие данные."
};

if (regionPagesRequested !== regionPagesDiscovered || regionPagesFetched !== regionPagesDiscovered) {
  throw new Error("Incomplete region coverage: requested " + regionPagesRequested + ", fetched " + regionPagesFetched + ", discovered " + regionPagesDiscovered);
}
if (regionFailures.length) throw new Error("Regional page failures: " + regionFailures.length);
if (needsReview.length) throw new Error("Records need manual type review: " + needsReview.length);
if (rows.length < 4000 || uniqueSettlements.size < 1000) {
  throw new Error("Catalogue target not met: " + rows.length + " records / " + uniqueSettlements.size + " region-settlements.");
}
if (exactDuplicateRows) throw new Error("Exact duplicate records found: " + exactDuplicateRows);
if (Object.values(missingFields).some(value => value > 0)) {
  throw new Error("Missing required fields: " + JSON.stringify(missingFields));
}

mkdirSync(path.dirname(outputCsv), { recursive: true });
mkdirSync(path.dirname(outputReport), { recursive: true });
writeFileSync(outputCsv, [headers.join(";"), ...rows.map(row => headers.map(header => csvCell(row[header])).join(";"))].join("\n") + "\n", "utf8");
writeFileSync(outputReport, JSON.stringify(report, null, 2) + "\n", "utf8");
console.log("MERGE_SUMMARY " + JSON.stringify({
  regionPagesDiscovered,
  regionPagesFetched,
  uniqueRecords: rows.length,
  uniqueSettlements: uniqueSettlements.size,
  uniqueCityNames: uniqueCityNames.size,
  byType,
  byLocationKind,
  missingFields,
  exactDuplicateRows,
  needsReviewCount: needsReview.length
}));
console.log("MERGE_OUTPUT " + JSON.stringify({ csv: outputCsv, report: outputReport }));
