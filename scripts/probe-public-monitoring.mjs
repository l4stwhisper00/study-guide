const url = "https://monitoring.miccedu.ru/iam/2025/_spo/material.php?id=10402&type=2";

const response = await fetch(url, {
  headers: { "User-Agent": "SchoolNavigator public catalogue research/1.0" },
  signal: AbortSignal.timeout(30000)
});
if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
const html = await response.text();

console.log("STATUS", response.status);
console.log("BYTES", Buffer.byteLength(html));
console.log("TITLE", html.match(/<title[^>]*>([\\s\\S]*?)<\\/title>/i)?.[1]?.replace(/<[^>]+>/g, " ").trim() ?? "not found");
console.log("INSTITUTION_LINKS", [...html.matchAll(/href=["'][^"']*inst\\.php\\?id=\\d+[^"']*["']/gi)].length);

const needle = "inst.php?id=104432";
const pos = html.indexOf(needle);
console.log("KNOWN_LINK_FOUND", pos >= 0);
if (pos >= 0) console.log("HTML_SNIPPET", html.slice(Math.max(0, pos - 800), pos + 1800));

const rowPattern = /<tr\\b[\\s\\S]*?<\\/tr>/gi;
const rows = [...html.matchAll(rowPattern)].map(m => m[0]);
console.log("TABLE_ROWS", rows.length);
const candidate = rows.find(row => row.includes(needle));
console.log("LINK_IN_TABLE_ROW", Boolean(candidate));
if (candidate) console.log("ROW_TEXT", candidate.replace(/<script[\\s\\S]*?<\\/script>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\\s+/g, " ").slice(0, 2500));
