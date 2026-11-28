import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const pass = (condition, message) => {
  if (!condition) errors.push(message);
};
const walk = (dir) => {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if ([".git", "node_modules", "dist", "build", "coverage"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.isFile()) files.push(full);
  }
  return files;
};

const files = walk(root);
const jsFiles = files.filter((file) => file.endsWith(".js") || file.endsWith(".mjs"));
const htmlFiles = files.filter((file) => file.endsWith(".html") && !file.includes(`${path.sep}supabase${path.sep}email-templates${path.sep}`));

for (const file of jsFiles) {
  try {
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  } catch (error) {
    errors.push(`JavaScript syntax error in ${path.relative(root, file)}: ${error.stderr?.toString() || error.message}`);
  }
}

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  const relative = path.relative(root, file);
  pass(/<html\b[^>]*\blang\s*=\s*["'][^"']+["']/i.test(html), `${relative}: missing html lang attribute`);
  pass(/<meta\s+charset\s*=/i.test(html), `${relative}: missing charset meta`);
  pass(/<meta\s+name\s*=\s*["']viewport["']/i.test(html), `${relative}: missing viewport meta`);
  pass(/<title>[^<]+<\/title>/i.test(html), `${relative}: missing page title`);

  for (const match of html.matchAll(/\b(src|href)\s*=\s*(["'])(.*?)\2/gi)) {
    const value = match[3].trim();
    if (!value || value.startsWith("#") || /^(?:data:|blob:|mailto:|tel:|sms:|https?:|\/\/)/i.test(value)) continue;
    if (/^javascript:/i.test(value)) {
      errors.push(`${relative}: javascript: URL is not allowed`);
      continue;
    }
    const clean = decodeURIComponent(value.split(/[?#]/, 1)[0]);
    if (!clean) continue;
    const target = clean.startsWith("/")
      ? path.resolve(root, clean.slice(1))
      : path.resolve(path.dirname(file), clean);
    pass(target.startsWith(root + path.sep) || target === root, `${relative}: reference escapes repository root: ${value}`);
    pass(statSyncSafe(target), `${relative}: local asset not found: ${value}`);
  }

  for (const match of html.matchAll(/<a\b[^>]*>/gi)) {
    const tag = match[0];
    if (/\btarget\s*=\s*["']_blank["']/i.test(tag)) {
      const rel = tag.match(/\brel\s*=\s*["']([^"']*)["']/i)?.[1] || "";
      pass(/\b(?:noopener|noreferrer)\b/i.test(rel), `${relative}: target=_blank link missing noopener/noreferrer`);
    }
  }
}


function statSyncSafe(file) {
  try { return statSync(file).isFile() || statSync(file).isDirectory(); }
  catch { return false; }
}

// Check that account.js never queries or reports a missing static account element.
try {
  const accountHtml = readFileSync(path.join(root, "account.html"), "utf8");
  const accountJs = readFileSync(path.join(root, "account.js"), "utf8");
  const accountIds = new Set([...accountHtml.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]));
  const selectors = [
    ...accountJs.matchAll(/\$\(['"]#([A-Za-z][A-Za-z0-9_-]*)['"]\)/g),
    ...accountJs.matchAll(/setMessage\(['"]#([A-Za-z][A-Za-z0-9_-]*)['"]/g),
  ];
  for (const match of selectors) {
    pass(accountIds.has(match[1]), "account.js references missing #" + match[1] + " in account.html");
  }
} catch (error) {
  errors.push("Account markup validation failed: " + error.message);
}

// Execute only the repository's static catalogue data in an isolated context.
try {
  const data = readFileSync(path.join(root, "data.js"), "utf8") + "\n" +
    readFileSync(path.join(root, "data-extra.js"), "utf8") + "\n" +
    readFileSync(path.join(root, "catalog-national.js"), "utf8") +
    "\n;globalThis.__studyGuideData = { SUBJECTS, CATEGORIES, SCHOOLS, CATALOG_NATIONAL };";
  const context = {};
  vm.runInNewContext(data, context, { timeout: 2000 });
  const { SUBJECTS, CATEGORIES, SCHOOLS, CATALOG_NATIONAL } = context.__studyGuideData;
  pass(Array.isArray(CATALOG_NATIONAL?.records), "catalog-national.js must expose a records array");
  pass(Number(CATALOG_NATIONAL?.importedRecords || 0) === CATALOG_NATIONAL.records.length, "national catalogue importedRecords must match its records array");
  for (const record of CATALOG_NATIONAL.records) {
    pass(["vuz", "college"].includes(record.t), `${record.id}: imported record must be a university or college`);
    pass(typeof record.catalogSource === "string" && record.catalogSource.length > 0, `${record.id}: missing data source name`);
    pass(/^\d{4}-\d{2}-\d{2}$/.test(record.sourceSnapshot || ""), `${record.id}: missing source snapshot date`);
    pass(["institution", "branch", "campus"].includes(record.locationKind), `${record.id}: invalid location kind`);
    pass(typeof record.c === "string" && record.c.trim().length > 0, `${record.id}: missing city`);
  }
  pass(Array.isArray(SCHOOLS) && SCHOOLS.length > 0, "Catalogue is empty or invalid");
  const ids = new Set();
  const categoryKeys = new Set(CATEGORIES.map((item) => item.key));
  for (const school of SCHOOLS) {
    pass(typeof school.id === "string" && school.id.length > 0, "Catalogue item has no id");
    pass(!ids.has(school.id), `Duplicate catalogue id: ${school.id}`);
    ids.add(school.id);
    pass(typeof school.n === "string" && school.n.trim().length > 0, `${school.id}: missing name`);
    pass(categoryKeys.has(school.cat), `${school.id}: unknown category ${school.cat}`);
    pass(Array.isArray(school.sub), `${school.id}: subjects must be an array`);
    for (const subject of school.sub || []) pass(Object.hasOwn(SUBJECTS, subject), `${school.id}: unknown subject ${subject}`);
    if (school.s !== null && school.s !== undefined) {
      pass(Number.isFinite(Number(school.s)), `${school.id}: score must be numeric or null`);
      if (school.t === "vuz") pass(Number(school.s) >= 0 && Number(school.s) <= 300, `${school.id}: EGE sum must be between 0 and 300`);
      if (school.t === "college") pass(Number(school.s) >= 2 && Number(school.s) <= 5, `${school.id}: college average must be between 2 and 5`);
    }
  }
} catch (error) {
  errors.push(`Catalogue validation failed: ${error.message}`);
}

// Validate the structured institution profile metadata and merged live data.
try {
  const data = readFileSync(path.join(root, "data.js"), "utf8") + "\n" +
    readFileSync(path.join(root, "data-extra.js"), "utf8") + "\n" +
    readFileSync(path.join(root, "catalog-national.js"), "utf8") + "\n" +
    readFileSync(path.join(root, "catalog-data-live.js"), "utf8") + "\n" +
    readFileSync(path.join(root, "catalog-details.js"), "utf8") +
    "\n;globalThis.__catalogCheck = { SCHOOLS, CATALOG_DETAILS, CATALOG_LIVE_DETAILS, getCatalogDetails };";
  const context = {};
  vm.runInNewContext(data, context, { timeout: 5000 });
  const catalog = context.__catalogCheck;
  const ids = new Set(catalog.SCHOOLS.map((school) => school.id));
  pass(ids.size === catalog.SCHOOLS.length, "Catalogue contains duplicate institution IDs");
  pass(typeof catalog.getCatalogDetails === "function", "catalog-details.js must expose getCatalogDetails");
  pass(catalog.CATALOG_LIVE_DETAILS && typeof catalog.CATALOG_LIVE_DETAILS.schools === "object", "catalog-data-live.js must expose the generated school map");

  for (const [id, item] of Object.entries(catalog.CATALOG_DETAILS.schools)) {
    pass(ids.has(id), `catalog-details.js references unknown institution: ${id}`);
    pass(["private", "public", "unknown"].includes(item.ownership || "unknown"), `${id}: invalid ownership value`);
    pass(Array.isArray(item.programs || []), `${id}: programs must be an array`);
    pass(Array.isArray(item.budgetPlaces || []), `${id}: budgetPlaces must be an array`);
    pass(Array.isArray(item.tuition || []), `${id}: tuition must be an array`);
  }

  for (const school of catalog.SCHOOLS) {
    const details = catalog.getCatalogDetails(school);
    for (const program of details.programs || []) {
      pass(typeof program === "string" && program.trim().length > 0, `${school.id}: program name must be a non-empty string`);
    }
    for (const place of details.budgetPlaces || []) {
      pass(typeof place.program === "string" && place.program.trim().length > 0, `${school.id}: funded-place record is missing a programme name`);
      pass(place.count !== null && place.count !== undefined && Number.isInteger(Number(place.count)) && Number(place.count) >= 0, `${school.id}: budget place count must be a non-negative integer`);
      pass(Number.isInteger(Number(place.year)) && Number(place.year) >= 2020, `${school.id}: budget place year must be a valid academic year`);
      pass(typeof place.sourceUrl === "string" && /^https:\/\//.test(place.sourceUrl), `${school.id}: budget place must have an official HTTPS source URL`);
    }
    for (const price of details.tuition || []) {
      pass(typeof price.program === "string" && price.program.trim().length > 0, `${school.id}: tuition record is missing a programme name`);
      pass(Number.isFinite(Number(price.annualRub)) && Number(price.annualRub) > 0, `${school.id}: tuition must have a positive annual amount`);
      pass(Number.isFinite(Number(price.monthlyRub)) && Number(price.monthlyRub) > 0, `${school.id}: tuition must have a positive monthly amount or equivalent`);
      pass(Number.isInteger(Number(price.year)) && Number(price.year) >= 2020, `${school.id}: tuition year must be a valid academic year`);
      pass(typeof price.sourceUrl === "string" && /^https:\/\//.test(price.sourceUrl), `${school.id}: tuition must have an official HTTPS source URL`);
    }
  }

  const sourceStatusPath = path.join(root, "catalog-data-status.json");
  const sourceStatus = JSON.parse(readFileSync(sourceStatusPath, "utf8"));
  pass(Number.isInteger(sourceStatus.intervalDays) && sourceStatus.intervalDays === 14, "Admissions refresh interval must be 14 days");
  for (const field of ["sources", "successfulSources", "needsReview", "updatedPrices", "updatedBudgetPlaces"]) {
    if (sourceStatus[field] !== undefined) pass(Number.isFinite(Number(sourceStatus[field])) && Number(sourceStatus[field]) >= 0, `catalog-data-status.json: ${field} must be a non-negative number`);
  }
} catch (error) {
  errors.push(`Institution profile metadata validation failed: ${error.message}`);
}

// Fail if an actual Supabase secret has accidentally been committed.
for (const file of files.filter((file) => /\.(?:js|ts|json|html)$/i.test(file))) {
  const source = readFileSync(file, "utf8");
  pass(!/sb_secret_[A-Za-z0-9_-]{20,}/.test(source), `${path.relative(root, file)}: Supabase secret key detected`);
}

if (errors.length) {
  console.error("Site validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Site validation passed: ${htmlFiles.length} HTML pages, ${jsFiles.length} JavaScript files, and ${"catalogue data"} checked.`);
}
