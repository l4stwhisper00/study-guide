import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const options = Object.fromEntries(process.argv.slice(2).map((arg, index, list) => {
  if (!arg.startsWith('--')) return [];
  const [key, inline] = arg.slice(2).split('=');
  return [key, inline ?? (list[index + 1] && !list[index + 1].startsWith('--') ? list[index + 1] : '')];
}).filter(Boolean));

const input = options.input;
const source = options.source;
const snapshot = options.snapshot;
const defaultType = options.type || '';
const output = options.output || path.join(root, 'catalog-national.js');
if (!input || !source || !/^\d{4}-\d{2}-\d{2}$/.test(snapshot || '')) {
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
  type: ['ступени','ступень','уровень_образования','вид_организации','тип_организации','тип','type','level','education_level'],
  city: ['населённый_пункт','населенный_пункт','город','city','locality','settlement'],
  region: ['субъект','субъект_рф','регион','region','subject'],
  address: ['адрес_места_осуществления_образовательной_деятельности','адрес_филиала','адрес_обучения','адрес','место_нахождения','address'],
  parent: ['юридическое_лицо','головная_организация','родительская_организация','parent_name','parent_organization','legal_entity'],
  locationKind: ['тип_площадки','тип_объекта','вид_места_обучения','branch_type','location_type'],
  isBranch: ['филиал','это_филиал','is_branch','branch'],
  inn: ['инн','inn'], ogrn: ['огрн','ogrn'],
  website: ['официальный_сайт','сайт','сайт_организации','website','official_site','url'],
  licenseStatus: ['статус_лицензии','лицензия','license_status','license'],
  accreditation: ['аккредитация','статус_аккредитации','accreditation','accreditation_status'],
  ownership: ['форма_собственности','собственность','ownership','ownership_type','окфс'],
  programs: ['специальности','программы','направления_подготовки','licensedprograms','programs','specialties'],
  sourceUrl: ['ссылка_на_источник','url_источника','источник','source_url'],
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
    ['it', /(информат|программирован|кибербезопас|информационн|разработк|вычислительн|компьютер)/],
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
  if (/(кампус|учебная площадка|площадка)/i.test(v)) return 'campus';
  if (/(филиал|представительств|отделение)/i.test(v) || (parent && keyText(parent) !== keyText(name))) return 'branch';
  return 'institution';
}

const existingContext = {};
const existingText = readFileSync(path.join(root, 'data.js'), 'utf8') + '\n' +
  readFileSync(path.join(root, 'data-extra.js'), 'utf8') + '\n;globalThis.__schools = SCHOOLS;';
vm.runInNewContext(existingText, existingContext, { timeout: 5000 });
const existingKeys = new Set(existingContext.__schools.map(item => keyText(item.n) + '|' + keyText(item.c)));

const records = new Map();
const skipped = { missingName: 0, missingCity: 0, unsupportedType: 0, inactiveLicense: 0, duplicate: 0, currentCatalogueMatch: 0 };
const needsReview = [];
for (let rowNo = 1; rowNo < rows.length; rowNo++) {
  const row = rows[rowNo];
  const name = clean(get(row, 'name'));
  const city = clean(get(row, 'city'));
  const region = clean(get(row, 'region'));
  const address = clean(get(row, 'address'));
  const parent = clean(get(row, 'parent'));
  const status = clean(get(row, 'licenseStatus'));
  const typeList = levels(get(row, 'type') || defaultType, name);
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
  const programs = clean(get(row, 'programs')).split(/[;|]/).map(clean).filter(Boolean);
  const site = website(get(row, 'website'));
  const sourceUrl = website(get(row, 'sourceUrl')).url;
  const owner = ownership(get(row, 'ownership'));
  const kind = locationKind(get(row, 'locationKind') + ' ' + get(row, 'isBranch'), name, parent);
  const duplicateBase = inn || ogrn || sourceId || keyText(parent || name);
  for (const type of typeList) {
    const identity = [duplicateBase, type, keyText(parent), keyText(city), keyText(address || name)].join('|');
    const id = 'national-' + hash(identity);
    const duplicateKey = [duplicateBase, type, keyText(city), keyText(address || name)].join('|');
    if (records.has(duplicateKey)) { skipped.duplicate++; continue; }
    if (existingKeys.has(keyText(name) + '|' + keyText(city)) && kind === 'institution') {
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
      licenseStatus: status || 'Не указан в выгрузке',
      accreditationStatus: clean(get(row, 'accreditation')) || 'Не указан в выгрузке',
      programs, coordinates: clean(get(row, 'coordinates')),
      catalogSource: source, sourceSnapshot: snapshot,
      sourceId: sourceId || null, sourceUrl: sourceUrl || null
    });
  }
}
const imported = [...records.values()].sort((a, b) => a.c.localeCompare(b.c, 'ru') || a.n.localeCompare(b.n, 'ru'));
const cities = new Set(imported.map(item => item.c));
const byType = { vuz: imported.filter(item => item.t === 'vuz').length, college: imported.filter(item => item.t === 'college').length };
const report = { generatedAt: new Date().toISOString(), source, snapshotDate: snapshot, inputRows: rows.length - 1, importedRecords: imported.length, uniqueCities: cities.size, byType, skipped, needsReview };
const outputData = {
  generatedAt: report.generatedAt, source, snapshotDate: snapshot,
  inputRows: report.inputRows, importedRecords: imported.length,
  uniqueCities: cities.size, byType, skipped, needsReview: needsReview.length,
  records: imported
};
writeFileSync(output, '/* Generated by scripts/import-national-catalog.mjs. Do not edit by hand. */\nvar CATALOG_NATIONAL = ' + JSON.stringify(outputData, null, 2) + ';\nSCHOOLS.push(...CATALOG_NATIONAL.records.filter(record => !SCHOOLS.some(item => item.id === record.id)));\n');
writeFileSync(output.replace(/\.js$/i, '-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log('Imported ' + imported.length + ' records in ' + cities.size + ' cities (' + byType.college + ' colleges, ' + byType.vuz + ' universities).');
console.log('Skipped: ' + JSON.stringify(skipped) + '; rows needing review: ' + needsReview.length);
