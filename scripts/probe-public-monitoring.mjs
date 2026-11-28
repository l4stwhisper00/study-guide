const headers = { "User-Agent": "SchoolNavigator public catalogue research/1.0" };
const rootUrl = "https://monitoring.miccedu.ru/?m=spo&year=2025";
const sampleIds = new Set(["10104", "10201", "10301", "10302", "10305", "10308", "10309", "10310", "10402", "10503", "10702", "10903"]);

async function get(url) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error("HTTP " + response.status + " for " + url);
  return response.text();
}
function decode(s) {
  return String(s ?? "")
    .replace(/&nbsp;/gi, " ").replace(/&ndash;/gi, "–").replace(/&mdash;/gi, "—")
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function attr(attrs, key) {
  const re = new RegExp("\\b" + key + "\\s*=\\s*(?:'([^']*)'|\\"([^\\"]*)\\"|([^\\s>]+))", "i");
  const m = attrs.match(re);
  return m ? (m[1] ?? m[2] ?? m[3] ?? "") : "";
}
function parseRecords(html) {
  const anchors = [...html.matchAll(/<a\b[^>]*href=['"][^'"]*inst\.php\?id=(\d+)[^'"]*['"][^>]*>([\s\S]*?)<\/a>/gi)];
  return anchors.map(match => {
    const index = match.index ?? 0;
    const tdStart = html.lastIndexOf("<td", index);
    const openEnd = html.indexOf(">", tdStart);
    const tdEnd = html.indexOf("</td>", index);
    const rawTag = tdStart >= 0 && openEnd >= 0 ? html.slice(tdStart, openEnd + 1) : "";
    const body = tdEnd >= 0 && openEnd >= 0 ? html.slice(openEnd + 1, tdEnd) : "";
    const addressBox = body.match(/<div\b[^>]*class=['"]adr['"][^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? "";
    const paragraphs = [...addressBox.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(x => decode(x[1]));
    return {
      id: attr(rawTag, "id") || match[1],
      icon: attr(rawTag, "icon"),
      city: attr(rawTag, "city"),
      coordinates: attr(rawTag, "coordinates"),
      name: decode(match[2]),
      address: paragraphs[1] ?? ""
    };
  });
}
function summarize(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key = row.icon || "(no icon)";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return Object.fromEntries([...groups].map(([icon, items]) => [icon, {
    count: items.length,
    examples: items.slice(0, 5).map(x => ({ name: x.name, city: x.city, address: x.address }))
  }]));
}

const root = await get(rootUrl);
const links = [...root.matchAll(/<a\b[^>]*href=['"]([^'"]*material\.php\?[^'"]*)['"][^>]*>([\s\S]*?)<\/a>/gi)]
  .map(m => ({ href: m[1], name: decode(m[2]) }));
const regions = new Map();
for (const item of links) {
  const id = item.href.match(/[?&]id=(\d+)/)?.[1];
  if (id && !regions.has(id)) regions.set(id, { ...item, id });
}
console.log("ROOT", JSON.stringify({ links: links.length, uniqueRegions: regions.size }));
console.log("REGION_INDEX", JSON.stringify([...regions.values()].map(x => ({ id: x.id, name: x.name, href: x.href }))));
const selected = [...regions.values()].filter(x => sampleIds.has(x.id));
if (!selected.length) throw new Error("No sample region IDs matched the official index.");

for (const item of selected) {
  const baseUrl = new URL(item.href, rootUrl).href;
  const vpoUrl = baseUrl.includes("/_vpo/") ? baseUrl : baseUrl.replace("/_spo/", "/_vpo/");
  const spoUrl = vpoUrl.replace("/_vpo/", "/_spo/");
  const [vpoHtml, spoHtml] = await Promise.all([get(vpoUrl), get(spoUrl)]);
  const vpo = parseRecords(vpoHtml);
  const spo = parseRecords(spoHtml);
  const vpoIds = new Set(vpo.map(x => x.id));
  const spoOnly = spo.filter(x => !vpoIds.has(x.id));
  console.log("REGION", JSON.stringify({
    id: item.id,
    name: item.name,
    vpoRows: vpo.length,
    vpoIcons: summarize(vpo),
    spoRows: spo.length,
    spoIcons: summarize(spo),
    sameIdsAcrossLevels: spo.length - spoOnly.length
  }));
}
