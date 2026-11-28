export function decodeHtml(value) {
  return String(value ?? "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getAttribute(tag, key) {
  const tokens = tag.match(/[\w-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/g) || [];
  for (const token of tokens) {
    const equalAt = token.indexOf("=");
    if (token.slice(0, equalAt).trim().toLowerCase() !== key.toLowerCase()) continue;
    return token.slice(equalAt + 1).trim().replace(/^["']|["']$/g, "");
  }
  return "";
}

export function parseMonitoringRecords(html) {
  const source = String(html);
  const anchors = [...source.matchAll(/<a\b[^>]*href=['"][^'"]*inst\.php\?id=(\d+)[^'"]*['"][^>]*>([\s\S]*?)<\/a>/gi)];
  return anchors.map(match => {
    const index = match.index ?? 0;
    const tdStart = source.lastIndexOf("<td", index);
    const openEnd = source.indexOf(">", tdStart);
    const tdEnd = source.indexOf("</td>", index);
    const rawTag = tdStart >= 0 && openEnd >= 0 ? source.slice(tdStart, openEnd + 1) : "";
    const body = tdEnd >= 0 && openEnd >= 0 ? source.slice(openEnd + 1, tdEnd) : "";
    const addressBox = body.match(/<div\b[^>]*class=['"]adr['"][^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? "";
    const paragraphs = [...addressBox.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(item => decodeHtml(item[1]));
    return {
      id: getAttribute(rawTag, "id") || match[1],
      icon: getAttribute(rawTag, "icon"),
      city: decodeHtml(getAttribute(rawTag, "city")),
      coordinates: getAttribute(rawTag, "coordinates"),
      name: decodeHtml(match[2]),
      address: paragraphs[1] ?? ""
    };
  }).filter(item => item.id && item.name);
}

export function normalizeSettlement(value) {
  return String(value ?? "")
    .replace(/^\s*(?:г(?:ород)?\.?\s*|пгт\.?\s*|пос(?:елок|ёлок)?\.?\s*|п\.?\s*|с\.?\s*|д\.?\s*|ст-ца\.?\s*|м-ко\s*)/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function classifyMonitoringRecord(record, { pageType, vpoIds = new Set() } = {}) {
  const icon = String(record.icon ?? "").trim();
  const isBranch = icon === "_0";
  const name = String(record.name ?? "");
  let type = "";
  if (icon === "_2") type = "vuz";
  else if (icon === "_1") type = "college";
  else if (isBranch) {
    if (pageType === "vpo" || vpoIds.has(String(record.id))) type = "vuz";
    else if (/(университет|академ|институт|мфюи|высшего образования|высшего профессион)/i.test(name)) type = "vuz";
    else if (/(колледж|техникум|училищ|профессиональн|среднего профессион|гбпоу|гапоу|гпоу|обпоу|анпоо|ано по|кгбпоу|чпоу|батт?|вбмк|нтгпк|сатт|смт|чрт)/i.test(name)) type = "college";
  }
  return {
    ...record,
    type,
    locationKind: isBranch ? "branch" : "institution"
  };
}
