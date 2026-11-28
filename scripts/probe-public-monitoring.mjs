const headers = { "User-Agent": "SchoolNavigator public catalogue research/1.0" };
async function get(url) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(30000) });
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
  const quoted = attrs.match(new RegExp("\\\\b" + key + "\\\\s*=\\\\s*['\\\"]([^'\\\"]*)['\\\"]", "i"));
  if (quoted) return quoted[1];
  return attrs.match(new RegExp("\\\\b" + key + "\\\\s*=\\\\s*([^\\\\s>]+)", "i"))?.[1] ?? "";
}
const regionUrl = "https://monitoring.miccedu.ru/iam/2025/_spo/material.php?id=10402&type=2";
const html = await get(regionUrl);
console.log("REGION_BYTES", Buffer.byteLength(html));
const cells = [...html.matchAll(/<td\b([^>]*)class=['"]inst['"][^>]*>([\s\S]*?)<\/td>/gi)];
console.log("INST_CELLS", cells.length);
const records = cells.map(match => {
  const attrs = match[1], body = match[2];
  const anchor = body.match(/<a\b[^>]*href=['"][^'"]*inst\.php\?id=(\d+)[^'"]*['"][^>]*>([\s\S]*?)<\/a>/i);
  const addressBox = body.match(/<div\b[^>]*class=['"]adr['"][^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? "";
  const paragraphs = [...addressBox.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(x => decode(x[1]));
  return {
    id: attr(attrs, "id"),
    icon: attr(attrs, "icon"),
    city: attr(attrs, "city"),
    coordinates: attr(attrs, "coordinates"),
    linkId: anchor?.[1] ?? "",
    name: decode(anchor?.[2] ?? ""),
    address: paragraphs[1] ?? ""
  };
});
console.log("ICON_COUNTS", JSON.stringify(records.reduce((a,x)=>(a[x.icon]=(a[x.icon]||0)+1,a),{})));
for (const icon of [...new Set(records.map(x=>x.icon))]) {
  console.log("ICON_SAMPLE", icon, JSON.stringify(records.filter(x=>x.icon===icon).slice(0,6).map(x=>({name:x.name,city:x.city,address:x.address}))));
}
console.log("SAMPLE", JSON.stringify(records.slice(0,5)));
const rootUrl = "https://monitoring.miccedu.ru/?m=spo&year=2025";
const root = await get(rootUrl);
console.log("ROOT_BYTES", Buffer.byteLength(root));
const regionLinks = [...root.matchAll(/<a\b[^>]*href=['"]([^'"]*material\.php\?id=\d+[^'"]*type=2[^'"]*)['"][^>]*>([\s\S]*?)<\/a>/gi)]
 .map(m => ({href:m[1],name:decode(m[2])}));
console.log("ROOT_REGION_LINKS", regionLinks.length);
console.log("ROOT_LINK_SAMPLE", JSON.stringify(regionLinks.slice(0,12)));
