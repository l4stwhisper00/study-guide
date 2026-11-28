import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const options = {};
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const equalAt = arg.indexOf('=');
  const key = equalAt >= 0 ? arg.slice(2, equalAt) : arg.slice(2);
  const inlineValue = equalAt >= 0 ? arg.slice(equalAt + 1) : null;
  const nextValue = process.argv[index + 1] && !process.argv[index + 1].startsWith('--')
    ? process.argv[++index]
    : '';
  options[key] = inlineValue ?? nextValue;
}

const input = options.input;
const source = options.source;
const snapshot = options.snapshot;
const defaultType = options.type || '';
const output = options.output || path.join(root, 'catalog-national.js');
if (!input || !source || !/^(?:\d{4}|\d{4}-\d{2}-\d{2})$/.test(snapshot || '')) {
  throw new Error('Usage: node scripts/import-national-catalog.mjs --input data/incoming.csv --source "Top100 Digital" --snapshot 2026-08-31 [--type college|vuz]');
}

function norm(value) {
  return String(value || '').replace(/^\uFEFF/, '').trim().toLowerCase().replace(/ё/g, 'е')
    .replace(/[\s./()-]+/g, '_').replace(/[^a-zа-я0-9_]/gi, '').replace(/^_+|_+$/g, '');
}

function delimiterFor(text) {
  const first = text.split(/\r?\n/, 1)[0] || '';
  const count = delimiter => {
    let n = 0, quoted = false;
    for (let i = 0; i < first.length; i++) {
      if (first[i] === '"') quoted = !quoted;
      else if (first[i] === delimiter && !quoted) n++;
    }
    return n;
  };
  return [';', ',', '\t'].sort((a, b) => count(b) - count(a))[0];
}

function parseRows(text, delimiter) {
  const out = [];
  let row = [], cell = '', quoted = false;
  const src = String(text).replace(/^\uFEFF/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); if (row.some(x => String(x).trim())) out.push(row); row = []; cell = ''; }
    else if (ch !== '\r') cell += ch;
  }
  row.push(cell);
  if (row.some(x => String(x).trim())) out.push(row);
  return out;
}

const fieldAliases = {
  sourceId: ['org_id','record_id','source_id','schoolguid','sysguid','guid','id','код_организации'],
  name: ['наименование','наименование_организации','название','полное_наименование','краткое_наименование','shortname','name','org_name'],
  type: ['ступени','ступень','уровень_образования','вид_организации','тип_организации','тип','type','level','education_level','schooltypename'],
  city: ['населённый_пункт','населенный_пункт','город','city','locality','settlement'],
  region: ['субъект','субъект_рф','регион','region','subject'],
  address: ['адрес_места_осуществления_образовательной_деятельности','адрес_филиала','адрес_обучения','адрес','место_нахождения','address'],
  parent: ['головная_организация','родительская_организация','parent_name','parent_organization','legal_entity_name'],
  legalEntityStatus: ['юридическое_лицо','состояние_юрлица','статус_юридического_лица','legal_entity_status'],
  legalEntityCheckedAt: ['сверено_егрюл','дата_сверки_егрюл','egul_checked_at','legal_entity_checked_at'],
  territoryCode: ['октмо','код_октмо','territory_code','oktmo'],
  coordinatesAvailable: ['координаты_доступны','есть_координаты','coordinates_available'],
  latitude: ['широта','latitude','lat'],
  longitude: ['долгота','longitude','lon','lng'],
  locationKind: ['тип_площадки','тип_объекта','вид_места_обучения','branch_type','location_type'],
  isBranch: ['филиал','это_филиал','is_branch','branch'],
  inn: ['инн','inn'], ogrn: ['огрн','ogrn'],
  website: ['официальный_сайт','сайт','сайт_организации','website','official_site','url'],
  licenseStatus: ['статус_лицензии','статус_лицензии_на_образование','статус','statusname','лицензия','license_status','license'],
  accreditation: ['аккредитация','статус_аккредитации','accreditation','accreditation_status'],
  ownership: ['форма_собственности','собственность','ownership','ownership_type','окфс'],
  programs: ['специальности','программы','направления_подготовки','licensedprograms','programs','specialties'],
  sourceUrl: ['ссылка_на_источник','url_источника','источник','source_url'],
  sourceSnapshot: ['source_snapshot','snapshot_date','sourcesnapshot'],
  catalogSource: ['catalog_source','source_name','catalogsource'],
  coordinates: ['координаты','coordinates','геокоординаты']
};

const inputText = readFileSync(input, 'utf8');
const rows = parseRows(inputText, delimiterFor(inputText));
if (rows.length < 2) throw new Error('CSV must contain a header and at least one row.');
const headers = rows[0].map(norm);
const index = new Map(headers.map((h, i) => [h, i]));
const get = (row, key) => {
  for (const alias of fieldAliases[key] || []) {
    const at = index.get(norm(alias));
    if (at !== undefined && String(row[at] || '').trim()) return String(row[at]).trim();
  }
  return '';
};
const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
const keyText = value => clean(value).toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/gi, ' ').trim();
const hash = value => createHash('sha256').update(value).digest('hex').slice(0, 20);

function levels(raw, name) {
  const value = keyText(raw + ' ' + name);
  const out = [];
  if (/(колледж|техникум|спо|среднее профессион)/i.test(value)) out.push('college');
  if (/(вуз|университет|академия|впо|высшее образование|высшее профессион)/i.test(value)) out.push('vuz');
  return [...new Set(out)];
}
function rejectedStatus(value) {
  return /(прекращ|аннулирован|отозван|приостанов|недейств|revoked|suspended|terminated)/i.test(keyText(value));
}
function category(name, programs) {
  const value = keyText(name + ' ' + programs);
  const rules = [
    ['it', /(информат|программ|кибербезопас|информационн|разработк|вычислительн|компьютер)/],
    ['med', /(медицин|лечебное дело|педиатр|фармац|стоматолог|сестрин|лабораторн)/],
    ['agro', /(аграр|агроном|сельскохозяй|ветеринар|лесное хозяй|землеустрой)/],
    ['edu', /(педагог|образовани|учитель|логопед|дефектолог)/],
    ['law', /(юриспруд|право|юридичес|правоохран|таможенн)/],
    ['econ', /(эконом|финанс|бухгалтер|банковск|менеджмент|маркетинг|торгов|туризм|логистик)/],
    ['eng', /(инженер|машиностро|строитель|энергетик|авиац|транспорт|автомобил|электротех)/],
    ['sci', /(физик|математ|хими|биолог|географ|эколог|естественн|наук)/],
    ['art', /(дизайн|художеств|музык|искусств|культур|режисс|актер|архитектур)/],
    ['hum', /(гуманитар|филолог|истор|журналист|лингв|перевод|психолог|социальн)/]
  ];
  return rules.find(item => item[1].test(value))?.[0] || 'other';
}
function ownership(value) {
  const v = keyText(value);
  if (/(частн|негосудар|ооо|ано|ноу|чоу|акционерн)/i.test(v)) return 'private';
  if (/(государств|муницип|федеральн|казенн|бюджетн|гбоу)/i.test(v)) return 'public';
  return 'unknown';
}
function website(value) {
  if (!value) return { url: '', host: '' };
  try {
    const parsed = new URL(/^https?:\/\//i.test(value) ? value : 'https://' + value);
    return { url: parsed.href, host: parsed.hostname.replace(/^www\./, '') };
  } catch { return { url: '', host: '' }; }
}
function locationKind(raw, name, parent) {
  const v = keyText(raw + ' ' + name);
  const flag = keyText(raw);
  if (['1', 'true', 'yes', 'да', 'филиал', 'branch'].includes(flag)) return 'branch';
  if (/(кампус|учебная площадка|площадка)/i.test(v)) return 'campus';
  if (/(филиал|представительств|отделение)/i.test(v) || (parent && keyText(parent) !== keyText(name))) return 'branch';
  return 'institution';
}

const existingContext = {};
const existingText = readFileSync(path.join(root, 'data.js'), 'utf8') + '\n' +
  readFileSync(path.join(root, 'data-extra.js'), 'utf8') + '\n;globalThis.__schools = SCHOOLS;';
vm.runInNewContext(existingText, existingContext, { timeout: 5000 });
const existingKeys = new Set(existingContext.__schools.map(item => keyText(item.n) + '|' + keyText(item.c)));

const preserveExistingNational = ['true', '1', 'yes'].includes(String(options['preserve-existing-national'] || '').toLowerCase());
let existingNationalRecords = [];
let previousReport = {};
if (preserveExistingNational) {
  const nationalContext = {};
  const nationalText = readFileSync(path.join(root, 'catalog-national.js'), 'utf8') +
    '\n;globalThis.__national = CATALOG_NATIONAL.records;';
  vm.runInNewContext(nationalText, nationalContext, { timeout: 10000 });
  existingNationalRecords = Array.isArray(nationalContext.__national) ? nationalContext.__national : [];
  try {
    previousReport = JSON.parse(readFileSync(path.join(root, 'catalog-national-report.json'), 'utf8'));
  } catch {
    previousReport = {};
  }
}
const existingNationalBySourceId = new Map();
const existingNationalExact = new Set();
const existingNationalNameCityWithoutAddress = new Map();
for (const item of existingNationalRecords) {
  const type = keyText(item.t);
  const name = keyText(item.n);
  const city = keyText(item.c);
  const address = keyText(item.address);
  if (/monitoring\.miccedu\.ru/i.test(String(item.sourceUrl || '')) && item.sourceId) {
    existingNationalBySourceId.set(String(item.sourceId) + '|' + type, item);
  }
  existingNationalExact.add([type, name, city, address].join('|'));
  if (!address) existingNationalNameCityWithoutAddress.set([type, name, city].join('|'), item);
}

const records = new Map();
const skipped = { missingName: 0, missingCity: 0, unsupportedType: 0, inactiveLicense: 0, duplicate: 0, currentCatalogueMatch: 0, currentNationalMatch: 0 };
const needsReview = [];
for (let rowNo = 1; rowNo < rows.length; rowNo++) {
  const row = rows[rowNo];
  const name = clean(get(row, 'name'));
  const city = clean(get(row, 'city'));
  const region = clean(get(row, 'region'));
  const address = clean(get(row, 'address'));
  const parent = clean(get(row, 'parent'));
  const status = clean(get(row, 'licenseStatus'));
  const programsRaw = get(row, 'programs');
  const rawType = keyText(get(row, 'type'));
  const typeList = ['college', 'vuz'].includes(rawType)
    ? [rawType]
    : levels((get(row, 'type') || defaultType) + ' ' + programsRaw, name);
  if (!name) { skipped.missingName++; continue; }
  if (!city) { skipped.missingCity++; continue; }
  if (rejectedStatus(status)) { skipped.inactiveLicense++; continue; }
  if (!typeList.length) {
    skipped.unsupportedType++;
    needsReview.push({ row: rowNo + 1, name, rawType: get(row, 'type'), reason: 'Не удалось определить уровень ВО/СПО' });
    continue;
  }

  const sourceId = clean(get(row, 'sourceId'));
  const inn = clean(get(row, 'inn')).replace(/\D/g, '');
  const ogrn = clean(get(row, 'ogrn')).replace(/\D/g, '');
  const programs = programsRaw.split(/[;|]/).map(clean).filter(Boolean);
  const site = website(get(row, 'website'));
  const sourceUrl = website(get(row, 'sourceUrl') || options['source-url']).url;
  const rowSource = clean(get(row, 'catalogSource')) || source;
  const rowSnapshot = clean(get(row, 'sourceSnapshot')) || snapshot;
  const owner = ownership(get(row, 'ownership'));
  const legalEntityStatus = clean(get(row, 'legalEntityStatus'));
  const legalEntityCheckedAt = clean(get(row, 'legalEntityCheckedAt'));
  const territoryCode = clean(get(row, 'territoryCode'));
  const rawCoordinates = clean(get(row, 'coordinates'));
  const latitude = clean(get(row, 'latitude'));
  const longitude = clean(get(row, 'longitude'));
  const coordinatePair = latitude && longitude ? `${latitude},${longitude}`
    : (rawCoordinates.match(/-?\d+(?:\.\d+)?\s*[,; ]\s*-?\d+(?:\.\d+)?/) || [])[0] || '';
  const coordinates = coordinatePair.replace(/\s+/g, '');
  const coordinatesAvailable = clean(get(row, 'coordinatesAvailable')) ||
    (coordinates || /^(есть|да|true|yes)$/i.test(rawCoordinates) ? 'Есть' : '');
  const kind = locationKind(get(row, 'locationKind') + ' ' + get(row, 'isBranch'), name, parent);
  const duplicateBase = inn || ogrn || sourceId || keyText(parent || name);
  for (const type of typeList) {
    const identity = [duplicateBase, type, keyText(parent), keyText(city), keyText(address || name)].join('|');
    const id = 'national-' + hash(identity);
    const duplicateKey = [duplicateBase, type, keyText(city), keyText(address || name)].join('|');
    if (records.has(duplicateKey)) { skipped.duplicate++; continue; }
    if (preserveExistingNational) {
      const sourceMatchKey = sourceId + '|' + type;
      const sourceMatch = sourceId ? existingNationalBySourceId.get(sourceMatchKey) : null;
      if (sourceMatch) {
        const updated = {
          ...sourceMatch,
          region: sourceMatch.region || region,
          address: sourceMatch.address || address,
          coordinates: sourceMatch.coordinates || coordinates,
          coordinatesAvailable: sourceMatch.coordinatesAvailable || coordinatesAvailable,
          sourceUrl: sourceMatch.sourceUrl || sourceUrl,
          catalogSource: sourceMatch.catalogSource || rowSource,
          sourceSnapshot: sourceMatch.sourceSnapshot || rowSnapshot
        };
        const oldIndex = existingNationalRecords.indexOf(sourceMatch);
        if (oldIndex >= 0) existingNationalRecords[oldIndex] = updated;
        existingNationalBySourceId.set(sourceMatchKey, updated);
        skipped.currentNationalMatch++;
        continue;
      }
      const exactNationalKey = [type, keyText(name), keyText(city), keyText(address)].join('|');
      if (existingNationalExact.has(exactNationalKey)) {
        skipped.currentNationalMatch++;
        continue;
      }
      const noAddressKey = [type, keyText(name), keyText(city)].join('|');
      const noAddressMatch = existingNationalNameCityWithoutAddress.get(noAddressKey);
      if (noAddressMatch) {
        const updated = {
          ...noAddressMatch,
          region: noAddressMatch.region || region,
          address: address || noAddressMatch.address,
          coordinates: noAddressMatch.coordinates || coordinates,
          coordinatesAvailable: noAddressMatch.coordinatesAvailable || coordinatesAvailable,
          sourceUrl: noAddressMatch.sourceUrl || sourceUrl,
          catalogSource: noAddressMatch.catalogSource || rowSource,
          sourceSnapshot: noAddressMatch.sourceSnapshot || rowSnapshot
        };
        const oldIndex = existingNationalRecords.indexOf(noAddressMatch);
        if (oldIndex >= 0) existingNationalRecords[oldIndex] = updated;
        existingNationalNameCityWithoutAddress.set(noAddressKey, updated);
        skipped.currentNationalMatch++;
        continue;
      }
    }
    if (existingKeys.has(keyText(name) + '|' + keyText(city))) {
      skipped.currentCatalogueMatch++;
      continue;
    }
    records.set(duplicateKey, {
      id, n: name, t: type, c: city, region, address,
      cat: category(name, programs), s: null, sub: [],
      d: kind === 'institution' ? 'Образовательная организация. Условия приёма и программы уточняются по официальным документам.'
        : (kind === 'branch' ? 'Филиал образовательной организации.' : 'Отдельная учебная площадка / кампус.') + (parent ? ' Головная организация: ' + parent + '.' : ''),
      u: site.host, officialUrl: site.url, parentName: parent, locationKind: kind,
      ownership: owner, inn: inn || null, ogrn: ogrn || null,
      legalEntityStatus: legalEntityStatus || null,
      legalEntityCheckedAt: legalEntityCheckedAt || null,
      territoryCode: territoryCode || null,
      coordinatesAvailable: coordinatesAvailable || null,
      licenseStatus: status || 'Не указан в выгрузке',
      accreditationStatus: clean(get(row, 'accreditation')) || 'Не указан в выгрузке',
      programs, coordinates,
      catalogSource: rowSource, sourceSnapshot: rowSnapshot,
      sourceId: sourceId || null, sourceUrl: sourceUrl || null
    });
  }
}
const newlyImported = [...records.values()];
const combinedById = new Map();
for (const item of (preserveExistingNational ? existingNationalRecords : []).concat(newlyImported)) {
  const identity = item.id || [item.t, keyText(item.n), keyText(item.c), keyText(item.address)].join('|');
  if (!combinedById.has(identity)) combinedById.set(identity, item);
}
const imported = [...combinedById.values()].sort((a, b) => a.c.localeCompare(b.c, 'ru') || a.n.localeCompare(b.n, 'ru'));
const cities = new Set(imported.map(item => item.c));
const settlementLocations = new Set(imported.map(item => keyText(item.region) + '|' + keyText(item.c)));
const byType = { vuz: imported.filter(item => item.t === 'vuz').length, college: imported.filter(item => item.t === 'college').length };
const baseCities = new Set(existingContext.__schools.map(item => item.c));
const combinedCities = new Set([...existingContext.__schools.map(item => item.c), ...imported.map(item => item.c)]);
const combinedLocations = new Set([
  ...existingContext.__schools.map(item => keyText(item.region) + '|' + keyText(item.c)),
  ...imported.map(item => keyText(item.region) + '|' + keyText(item.c))
]);
const sourceUrl = website(options['source-url']).url;
const previousSources = Array.isArray(previousReport.sources) ? previousReport.sources : [];
const currentSourceEntry = {
  name: source,
  snapshotDate: snapshot,
  listedRows: rows.length - 1,
  records: newlyImported.length,
  url: sourceUrl
};
const sources = preserveExistingNational
  ? previousSources.filter(item => item.name !== source).concat(currentSourceEntry)
  : [currentSourceEntry];
const totals = {
  nationalLayerRecords: imported.length,
  nationalLayerSettlements: cities.size,
  nationalLayerLocations: settlementLocations.size,
  combinedCatalogueRecords: existingContext.__schools.length + imported.length,
  combinedCatalogueSettlements: combinedCities.size,
  combinedCatalogueLocations: combinedLocations.size,
  baseMainRecords: existingContext.__schools.length,
  baseMainSettlements: baseCities.size
};
const report = {
  generatedAt: new Date().toISOString(),
  source,
  snapshotDate: snapshot,
  inputRows: rows.length - 1,
  importedRecords: imported.length,
  newlyImportedRecords: newlyImported.length,
  preservedExistingRecords: preserveExistingNational ? existingNationalRecords.length : 0,
  uniqueCities: cities.size,
  uniqueSettlements: settlementLocations.size,
  byType,
  skipped,
  needsReview,
  totals,
  sources,
  coverageNote: 'Мониторинг охватывает организации, предоставившие сведения; он не является полным реестром лицензий и не включает часть ведомственных организаций и организации, не предоставившие данные.',
  previousQuality: preserveExistingNational ? previousReport.quality || null : null
};
const outputData = {
  generatedAt: report.generatedAt,
  source,
  snapshotDate: snapshot,
  inputRows: report.inputRows,
  importedRecords: imported.length,
  newlyImportedRecords: newlyImported.length,
  preservedExistingRecords: preserveExistingNational ? existingNationalRecords.length : 0,
  uniqueCities: cities.size,
  uniqueSettlements: settlementLocations.size,
  byType,
  skipped,
  needsReview: needsReview.length,
  records: imported
};
writeFileSync(output, '/* Generated by scripts/import-national-catalog.mjs. Do not edit by hand. */\nvar CATALOG_NATIONAL = ' + JSON.stringify(outputData, null, 2) + ';\nSCHOOLS.push(...CATALOG_NATIONAL.records.filter(record => !SCHOOLS.some(item => item.id === record.id)));\n');
writeFileSync(output.replace(/\.js$/i, '-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log('Imported ' + imported.length + ' total national records (' + newlyImported.length + ' new) in ' + cities.size + ' cities / ' + settlementLocations.size + ' region-settlements (' + byType.college + ' colleges, ' + byType.vuz + ' universities).');
console.log('Skipped: ' + JSON.stringify(skipped) + '; rows needing review: ' + needsReview.length);
