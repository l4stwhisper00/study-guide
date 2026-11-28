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
  const re = new RegExp("\\b" + key + "\\s*=\\s*(?:'([^']*)'|\"([^\"]*)\"|([^\\s>]+))", "i");
  const m = attrs.match(re);
  return m ? (m[1] ?? m[2] ?? m[3] ?? "") : "";
}
const regionUrl = "https://monitoring.miccedu.ru/iam/2025/_spo/material.php?id=10402&type=2";
const html = await get(regionUrl);
console.log("REGION_BYTES", Buffer.byteLength(html));
const anchors = [...html.matchAll(/<a\b[^>]*href=['"][^'"]*inst\.php\?id=(\d+)[^'"]*['"][^>]*>([\s\S]*?)<\/a>/gi)];
console.log("INSTITUTION_ANCHORS", anchors.length);
const records = anchors.map(match => {
  const index = match.index ?? 0;
  const tdStart = html.lastIndexOf("<td", index);
  const openEnd = html.indexOf(">", tdStart);
  const tdEnd = html.indexOf("</td>", index);
  const rawTag = tdStart >= 0 && openEnd >= 0 ? html.slice(tdStart, openEnd + 1) : "";
  const body = tdEnd >= 0 && openEnd >= 0 ? html.slice(openEnd + 1, tdEnd) : "";
  const addressBox = body.match(/<div\b[^>]*class=['"]adr['"][^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? "";
  const paragraphs = [...addressBox.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(x => decode(x[1]));
  return {
    id: attr(rawTag, "id"),
    icon: attr(rawTag, "icon"),
    city: attr(rawTag, "city"),
    coordinates: attr(rawTag, "coordinates"),
    linkId: match[1],
    name: decode(match[2]),
    address: paragraphs[1] ?? "",
    rawTag
  };
});
console.log("RAW_TAG_FIRST", records[0]?.rawTag);
console.log("ICON_COUNTS", JSON.stringify(records.reduce((a,x)=>(a[x.icon]=(a[x.icon]||0)+1,a),{})));
for (const icon of [...new Set(records.map(x=>x.icon))]) {
  console.log("ICON_SAMPLE", icon, JSON.stringify(records.filter(x=>x.icon===icon).slice(0,8).map(x=>({id:x.id,name:x.name,city:x.city,address:x.address}))));
}
console.log("SAMPLE", JSON.stringify(records.slice(0,5).map(({rawTag,...x})=>x)));
const rootUrls = [
  "https://monitoring.miccedu.ru/?m=spo&year=2025",
  "https://monitoring.miccedu.ru/?m=spo",
  "https://monitoring.miccedu.ru/?m=vpo&year=2025",
  "https://monitoring.miccedu.ru/iam/2025/_spo/"
];
for (const rootUrl of rootUrls) {
  try {
    const root = await get(rootUrl);
    const allLinks = [...root.matchAll(/<a\b[^>]*href=['"]([^'"]*material\.php\?[^'"]*)['"][^>]*>([\s\S]*?)<\/a>/gi)]
      .map(m => ({ href:m[1], name:decode(m[2]) }));
    console.log("ROOT", rootUrl, "BYTES",Buffer.byteLength(root),"MATERIAL", (root.match(/material\.php/gi)||[]).length, "REGION_LINKS", allLinks.length);
    console.log("ROOT_LINKS", JSON.stringify(allLinks.slice(0,8)));
    const regionPos = root.indexOf("Белгородская область");
    console.log("ROOT_REGION_SNIPPET",root.slice(Math.max(0,regionPos-250),regionPos+350).replace(/\s+/g," ").slice(0,800));
  } catch(e) { console.log("ROOT_ERROR",rootUrl,String(e)); }
}
