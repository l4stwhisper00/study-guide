const headers = { "User-Agent": "SchoolNavigator public catalogue research/1.0" };
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
  const re = new RegExp("\\b" + key + "\\s*=\\s*(?:'([^']*)'|\"([^\"]*)\"|([^\\s>]+))", "i");
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
const rootUrl = "https://monitoring.miccedu.ru/?m=spo&year=2025";
const root = await get(rootUrl);
const rootLinks = [...root.matchAll(/<a\b[^>]*href=['"]([^'"]*material\.php\?[^'"]*)['"][^>]*>([\s\S]*?)<\/a>/gi)]
 .map(m => ({ href:m[1], name:decode(m[2]) }));
console.log("ROOT_LINKS", rootLinks.length);
console.log("ROOT_SAMPLE", JSON.stringify(rootLinks.slice(0,5)));
const sampleIds = new Set(["10402","10310","10302","10201","10301"]);
const samples = rootLinks.filter(x => {
  const id = x.href.match(/[?&]id=(\d+)/)?.[1];
  return sampleIds.has(id);
});
for (const item of samples) {
  const id = item.href.match(/[?&]id=(\d+)/)[1];
  const vpoUrl = new URL(item.href, rootUrl).href;
  const spoUrl = vpoUrl.replace("/_vpo/","/_spo/");
  const [vpoHtml,spoHtml] = await Promise.all([get(vpoUrl),get(spoUrl)]);
  const vpo = parseRecords(vpoHtml), spo = parseRecords(spoHtml);
  const vpoIds = new Set(vpo.map(x=>x.id));
  const branchRows = spo.filter(x=>x.icon==="_0");
  console.log("REGION",JSON.stringify({
    id,name:item.name,
    vpoRows:vpo.length,vpoIcons:vpo.reduce((a,x)=>(a[x.icon]=(a[x.icon]||0)+1,a),{}),
    spoRows:spo.length,spoIcons:spo.reduce((a,x)=>(a[x.icon]=(a[x.icon]||0)+1,a),{}),
    spoBranches:branchRows.length,spoBranchMatchesVpo:branchRows.filter(x=>vpoIds.has(x.id)).length,
    spoBranchSample:branchRows.slice(0,4).map(x=>({id:x.id,name:x.name,city:x.city,vpo:vpoIds.has(x.id)}))
  }));
}
