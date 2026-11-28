import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const root = process.cwd();
const now = new Date();
const intervalMs = 14 * 24 * 60 * 60 * 1000;
const force = process.env.FORCE_CATALOG_REFRESH === 'true';
const checkOnly = process.env.CATALOG_REFRESH_CHECK_ONLY === 'true';
const livePath = root + '/catalog-data-live.js';
const statusPath = root + '/catalog-data-status.json';

function readPreviousLive() {
  if (!existsSync(livePath)) return { generatedAt: null, schools: {} };
  const sandbox = {};
  vm.runInNewContext(readFileSync(livePath, 'utf8'), sandbox, { timeout: 1000 });
  return sandbox.CATALOG_LIVE_DETAILS || { generatedAt: null, schools: {} };
}

const previous = readPreviousLive();
const lastAttempt = previous.lastAttemptedAt || previous.generatedAt;
if (!force && lastAttempt && now.getTime() - Date.parse(lastAttempt) < intervalMs) {
  console.log('Official admissions-data refresh skipped: last refresh is less than 14 days old.');
  process.exit(0);
}

const sources = [
  {
    id: 'rosnou-price',
    schoolId: 'rosnou-moscow',
    url: 'https://rosnou.ru/bak/price/',
    kind: 'table-prices',
    annualIndex: 0,
    programs: [
      { alias: 'Математическое моделирование и вычислительная математика', program: 'Математическое моделирование и вычислительная математика (очная)' },
      { alias: 'Технологии программного обеспечения', program: 'Технологии программного обеспечения (очная)' },
      { alias: 'Кибербезопасность', program: 'Кибербезопасность (очная)' },
      { alias: 'Цифровые системы и технологии обмена данными', program: 'Информационные системы и технологии (очная)' },
      { alias: 'Прикладная информатика в экономике', program: 'Прикладная информатика в экономике (очная)' },
      { alias: 'Психолого-педагогическая профилактика девиантного поведения несовершеннолетних', program: 'Психолого-педагогическая профилактика девиантного поведения несовершеннолетних (очная)' },
      { alias: 'Психологическое консультирование', program: 'Психологическое консультирование (очная)' },
      { alias: 'Начальное образование', program: 'Начальное образование (очная)' },
      { alias: 'Гражданско-правовая', program: 'Гражданско-правовая (очная)' },
      { alias: 'Организация и управление бизнесом', program: 'Организация и управление бизнесом (очно-заочная)' },
      { alias: 'HR-менеджмент', program: 'HR-менеджмент (очно-заочная)' },
      { alias: 'Менеджмент туристской индустрии', program: 'Менеджмент туристской индустрии (очная)' }
    ]
  },
  {
    id: 'rosnou-budget',
    schoolId: 'rosnou-moscow',
    url: 'https://rosnou.ru/bak/program/',
    kind: 'table-budget',
    programs: [
      { alias: 'Математическое моделирование и вычислительная математика', program: 'Математическое моделирование и вычислительная математика (очная)' },
      { alias: 'Технологии программного обеспечения', program: 'Технологии программного обеспечения (очная)' },
      { alias: 'Цифровые системы и технологии обмена данными', program: 'Цифровые системы и технологии обмена данными (очная)' },
      { alias: 'Социальная работа с различными группами населения', program: 'Социальная работа с различными группами населения (очная)' },
      { alias: 'Начальное образование', program: 'Начальное образование (очная)' },
      { alias: 'Редактор средств массовой информации', program: 'Редактор средств массовой информации (очная)' },
      { alias: 'Менеджмент туристской индустрии', program: 'Менеджмент туристской индустрии (очная)' },
      { alias: 'Финансы и кредит', program: 'Финансы и кредит (очная)' }
    ]
  },
  {
    id: 'mip-price',
    schoolId: 'mip-moscow',
    url: 'https://inpsycho.ru/abitur/bachelor/',
    kind: 'table-prices',
    annualIndex: 0,
    programs: [
      { alias: 'Вычислительная биология', program: 'Вычислительная биология (очная)' },
      { alias: 'Аналитика данных и искусственный интеллект в психологии и образовании', program: 'Аналитика данных и ИИ в психологии и образовании (очная)' },
      { alias: 'Детское и семейное консультирование', program: 'Детское и семейное консультирование (очно-заочная)' },
      { alias: 'Клинические основы психологического здоровья человека', program: 'Клинические основы психологического здоровья человека (очная)' },
      { alias: 'Психологическое консультирование и психотерапия качества жизни', program: 'Психологическое консультирование и психотерапия качества жизни (очная)' },
      { alias: 'Психолого-педагогическая коррекция и реабилитация лиц с девиантным поведением', program: 'Педагогика и психология девиантного поведения (очная)' },
      { alias: 'Клиническая психология', program: 'Клиническая психология (очная)' }
    ]
  },
  {
    id: 'mmiu-price',
    schoolId: 'mmiu-moscow',
    url: 'https://mi.university/postupayushchim/price-list',
    kind: 'table-prices',
    annualIndex: 1,
    programs: [
      { alias: 'Информационные системы и технологии', program: 'Информационные системы и технологии (бакалавриат, очная)' },
      { alias: 'Психология', program: 'Психология (бакалавриат, очная)' },
      { alias: 'Экономика', program: 'Экономика (бакалавриат, очная)' },
      { alias: 'Менеджмент', program: 'Менеджмент (бакалавриат, очная)' },
      { alias: 'Юриспруденция', program: 'Юриспруденция (бакалавриат, очная)' },
      { alias: 'Реклама и связи с общественностью', program: 'Реклама и связи с общественностью (бакалавриат, очная)' }
    ]
  },
  {
    id: 'synergy-minimums',
    schoolId: 'synergy',
    url: 'https://synergy.ru/abiturientam/priemnaya_komissiya',
    kind: 'semester-minimums',
    programs: [
      { alias: 'Колледж', program: 'Колледж — минимальная опубликованная цена' },
      { alias: 'Бакалавриат', program: 'Бакалавриат — минимальная опубликованная цена' },
      { alias: 'Специалитет', program: 'Специалитет — минимальная опубликованная цена' },
      { alias: 'Магистратура', program: 'Магистратура — минимальная опубликованная цена' }
    ]
  },
  {
    id: 'mikt-price',
    schoolId: 'iict-voronezh',
    url: 'https://abiturient.iict.ru/',
    kind: 'mikt-price',
    programs: [
      { program: 'Бакалавриат — очная форма (минимальная опубликованная стоимость)', form: 'fulltime' },
      { program: 'Бакалавриат — заочная и очно-заочная формы', form: 'parttime' },
      { program: 'Дизайн (очная форма)', form: 'design' }
    ]
  },
  {
    id: 'mikt-college-price',
    schoolId: 'iict-college-voronezh',
    url: 'https://college.iict.ru/',
    kind: 'mikt-college-price',
    programs: [
      { program: 'Колледж — очная форма (минимальная опубликованная стоимость)', form: 'fulltime' },
      { program: 'Графический дизайнер (очная форма)', form: 'graphic' }
    ]
  },
  {
    id: 'gup-subsidy',
    schoolId: 'spbgup-spb',
    url: 'https://www.gup.ru/enroll/help/abits/2026/enrolled/getrating/1111428527/',
    kind: 'fixed-budget-count'
  }
];

function decodeHtml(text) {
  return String(text)
    .replace(/&nbsp;|&#160;|&#xA0;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

function stripHtml(html) {
  return decodeHtml(String(html)
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(?:br|\/p|\/div|\/tr|\/li|\/h[1-6]|\/section|\/article)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '))
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function normalize(text) {
  return stripHtml(text).toLocaleLowerCase('ru-RU')
    .replace(/[ё]/g, 'е')
    .replace(/[–—−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTables(html) {
  const tables = [];
  for (const tableMatch of html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)) {
    const tableHtml = tableMatch[1];
    const rows = [];
    for (const rowMatch of tableHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const cells = [...rowMatch[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)]
        .map(cell => stripHtml(cell[1]).replace(/\s+/g, ' ').trim());
      if (cells.length) rows.push({ cells, text: cells.join(' | ') });
    }
    tables.push({ header: normalize(tableHtml.slice(0, 2500)), rows });
  }
  return tables;
}

function moneyValues(text) {
  const values = [];
  const pattern = /(\d[\d\s\u00a0]*(?:[.,]\d+)?)\s*(тыс\.?\s*)?(?:₽|руб(?:\.|лей)?)/gi;
  for (const match of String(text).matchAll(pattern)) {
    const raw = match[1].replace(/[\s\u00a0]/g, '').replace(',', '.');
    let value = Number(raw);
    if (!Number.isFinite(value)) continue;
    if (match[2]) value *= 1000;
    values.push(Math.round(value * 100) / 100);
  }
  return values;
}

function numberFromCell(text) {
  const clean = String(text).replace(/[\s\u00a0]/g, '').replace(',', '.');
  if (!/^\d+(?:\.\d+)?$/.test(clean)) return null;
  const value = Number(clean);
  return Number.isFinite(value) ? value : null;
}

function academicYear(text) {
  const values = [...String(text).matchAll(/\b(20\d{2})\s*[\/–-]\s*(20\d{2}|\d{2})\b/g)]
    .map(match => Number(match[1]));
  if (values.length) return Math.max(...values);
  const years = [...String(text).matchAll(/\b(20\d{2})\b/g)].map(match => Number(match[1]));
  return years.length ? Math.max(...years) : null;
}

function findMatchingRows(tables, alias) {
  const wanted = normalize(alias);
  const hits = [];
  for (const table of tables) {
    for (let index = 0; index < table.rows.length; index += 1) {
      const row = table.rows[index];
      if (normalize(row.text).includes(wanted)) {
        hits.push({ table, row, index });
      }
    }
  }
  return hits;
}

function extractTablePrice(tables, alias, annualIndex) {
  const hits = findMatchingRows(tables, alias);
  for (const hit of hits) {
    const fromCells = hit.row.cells.slice(1).flatMap(cell => moneyValues(cell));
    if (fromCells.length) return fromCells[Math.min(annualIndex, fromCells.length - 1)];
    const numericCells = hit.row.cells.slice(1).map(numberFromCell).filter(value => value !== null);
    if (numericCells.length) return numericCells[Math.min(annualIndex, numericCells.length - 1)];
    const fromRow = moneyValues(hit.row.text);
    if (fromRow.length) return fromRow[Math.min(annualIndex, fromRow.length - 1)];
  }
  return null;
}

function extractProgramPrice(html, tables, alias, annualIndex = 0) {
  const tableValue = extractTablePrice(tables, alias, annualIndex);
  if (tableValue !== null) return tableValue;
  const plain = stripHtml(html);
  const wanted = normalize(alias);
  const lines = plain.split(/\n+/).map(line => line.trim()).filter(Boolean);
  for (let index = 0; index < lines.length; index += 1) {
    if (!normalize(lines[index]).includes(wanted)) continue;
    const nearby = lines.slice(index, Math.min(lines.length, index + 6)).join(' ');
    const values = moneyValues(nearby);
    if (values.length) return values[Math.min(annualIndex, values.length - 1)];
  }
  return null;
}

function extractRosnouBudget(tables, alias) {
  const hits = findMatchingRows(tables, alias);
  for (const hit of hits) {
    if (!hit.table.header.includes('бюджет')) continue;
    const lastCell = hit.row.cells[hit.row.cells.length - 1] || '';
    const count = numberFromCell(lastCell);
    if (Number.isInteger(count) && count >= 0) return count;
  }
  return null;
}

function semesterMinimum(text, label) {
  const plain = stripHtml(text);
  const lower = plain.toLocaleLowerCase('ru-RU');
  const sectionStart = lower.indexOf('стоимость за семестр');
  const searchStart = sectionStart >= 0 ? sectionStart : 0;
  const labelAt = lower.indexOf(String(label).toLocaleLowerCase('ru-RU'), searchStart);
  if (labelAt < 0) return null;
  const fragment = plain.slice(labelAt, labelAt + 320);
  const match = fragment.match(/от\s*(\d[\d\s\u00a0]*)(?:\s*₽)?/i);
  if (!match) return null;
  const value = Number(match[1].replace(/[\s\u00a0]/g, ''));
  return Number.isFinite(value) ? value : null;
}

function miktAnnualPrice(text, form) {
  const clean = stripHtml(text).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
  const patterns = {
    fulltime: /очная форма\s*[—–-]\s*(\d+(?:[,.]\d+)?)\s*тыс\.?\s*руб/i,
    parttime: /заочная и очно-заочная формы\s*[—–-]\s*(\d+(?:[,.]\d+)?)\s*тыс\.?\s*руб/i,
    design: /очная форма\s*\(\s*направление\s*["«]?дизайн["»]?\s*\)\s*[—–-]\s*(\d+(?:[,.]\d+)?)\s*тыс\.?\s*руб/i,
    graphic: /очная форма\s*\(\s*профессия\s*["«]?графический дизайнер["»]?\s*\)\s*[—–-]\s*(\d+(?:[,.]\d+)?)\s*тыс\.?\s*руб/i
  };
  const match = patterns[form]?.exec(clean);
  return match ? Math.round(Number(match[1].replace(',', '.')) * 1000) : null;
}

async function fetchPage(url) {
  const response = await fetch(url, {
    method: 'GET',
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
    headers: {
      'user-agent': 'SchoolNavigatorAdmissionsRefresh/1.0 (+https://navigator.devs.li)',
      'accept': 'text/html,application/xhtml+xml'
    }
  });
  const html = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    finalUrl: response.url,
    html,
    text: stripHtml(html)
  };
}

function appendUpdate(target, key, item) {
  if (!target[key]) target[key] = { tuition: [], budgetPlaces: [] };
  const listName = item.kind === 'budget' ? 'budgetPlaces' : 'tuition';
  const record = { ...item };
  delete record.kind;
  target[key][listName].push(record);
}

function mergeByProgram(oldRows, newRows) {
  const merged = Array.isArray(oldRows) ? oldRows.map(item => ({ ...item })) : [];
  for (const row of newRows || []) {
    const index = merged.findIndex(item => item.program === row.program);
    if (index >= 0) merged[index] = { ...merged[index], ...row };
    else merged.push(row);
  }
  return merged;
}

const results = [];
const updates = {};
for (const source of sources) {
  const result = {
    id: source.id,
    schoolId: source.schoolId,
    url: source.url,
    status: 'pending',
    extractedPrices: 0,
    extractedBudgetPlaces: 0,
    warnings: []
  };
  try {
    const page = await fetchPage(source.url);
    result.httpStatus = page.status;
    result.finalUrl = page.finalUrl;
    if (!page.ok) {
      result.status = 'unavailable';
      result.warnings.push('official_source_http_error');
      results.push(result);
      continue;
    }
    const year = academicYear(page.text);
    if (!year) {
      result.status = 'needs_review';
      result.warnings.push('academic_year_not_detected');
      results.push(result);
      continue;
    }
    result.year = year;
    const tables = extractTables(page.html);
    result.tableCount = tables.length;
    result.tableRows = tables.reduce((sum, table) => sum + table.rows.length, 0);

    if (source.kind === 'table-prices') {
      for (const item of source.programs) {
        const annualRub = extractProgramPrice(page.html, tables, item.alias, source.annualIndex || 0);
        if (!annualRub || annualRub < 1000) continue;
        appendUpdate(updates, source.schoolId, {
          kind: 'tuition',
          program: item.program,
          year,
          annualRub,
          monthlyRub: Math.round((annualRub / 12) * 100) / 100,
          monthlyIsEquivalent: true,
          paymentPeriod: 'Официальная стоимость за учебный год',
          sourceUrl: source.url,
          verifiedAt: now.toISOString().slice(0, 10)
        });
        result.extractedPrices += 1;
      }
    } else if (source.kind === 'table-budget') {
      for (const item of source.programs) {
        const count = extractRosnouBudget(tables, item.alias);
        if (count === null) continue;
        appendUpdate(updates, source.schoolId, {
          kind: 'budget',
          program: item.program,
          year,
          count,
          fundingType: 'Бюджет',
          sourceUrl: source.url,
          verifiedAt: now.toISOString().slice(0, 10)
        });
        result.extractedBudgetPlaces += 1;
      }
    } else if (source.kind === 'semester-minimums') {
      for (const item of source.programs) {
        const semesterRub = semesterMinimum(page.text, item.alias);
        if (!semesterRub || semesterRub < 1000) continue;
        const annualRub = semesterRub * 2;
        appendUpdate(updates, source.schoolId, {
          kind: 'tuition',
          program: item.program,
          year,
          annualRub,
          monthlyRub: Math.round((annualRub / 12) * 100) / 100,
          monthlyIsEquivalent: true,
          paymentPeriod: 'Минимальная опубликованная цена за семестр: ' + new Intl.NumberFormat('ru-RU').format(semesterRub) + ' ₽; год рассчитан как два семестра',
          sourceUrl: source.url,
          verifiedAt: now.toISOString().slice(0, 10)
        });
        result.extractedPrices += 1;
      }
    } else if (source.kind === 'mikt-price' || source.kind === 'mikt-college-price') {
      for (const item of source.programs) {
        const annualRub = miktAnnualPrice(page.text, item.form);
        if (!annualRub || annualRub < 1000) continue;
        appendUpdate(updates, source.schoolId, {
          kind: 'tuition',
          program: item.program,
          year,
          annualRub,
          monthlyRub: Math.round((annualRub / 12) * 100) / 100,
          monthlyIsEquivalent: true,
          paymentPeriod: 'Официальная стоимость за учебный год',
          sourceUrl: source.url,
          verifiedAt: now.toISOString().slice(0, 10)
        });
        result.extractedPrices += 1;
      }
    } else if (source.kind === 'fixed-budget-count') {
      const match = page.text.match(/Всего\s+мест:\s*(\d[\d\s]*)/i);
      const count = match ? Number(match[1].replace(/\s/g, '')) : null;
      if (Number.isInteger(count) && count >= 0) {
        appendUpdate(updates, source.schoolId, {
          kind: 'budget',
          program: 'Конфликтология — места по линии федеральной субсидии',
          year,
          count,
          fundingType: 'Государственное финансирование: федеральная субсидия Минтруда РФ',
          sourceUrl: source.url,
          verifiedAt: now.toISOString().slice(0, 10)
        });
        result.extractedBudgetPlaces += 1;
      }
    }

    result.status = result.extractedPrices + result.extractedBudgetPlaces > 0 ? 'updated' : 'needs_review';
    if (result.status === 'needs_review') {
      result.warnings.push('no_structured_values_extracted');
      const marker = page.text.toLocaleLowerCase('ru-RU').indexOf('стоимость');
      result.debugPreview = (marker >= 0 ? page.text.slice(marker, marker + 700) : page.text.slice(0, 450)).replace(/\\s+/g, ' ');
    }
  } catch (error) {
    result.status = 'error';
    result.warnings.push(error?.name === 'TimeoutError' ? 'source_timeout' : 'source_fetch_or_parse_error');
    result.errorMessage = String(error?.message || error).slice(0, 220);
  }
  results.push(result);
}

const updatedPrices = results.reduce((sum, item) => sum + item.extractedPrices, 0);
const updatedBudgetPlaces = results.reduce((sum, item) => sum + item.extractedBudgetPlaces, 0);
const hasNewData = updatedPrices + updatedBudgetPlaces > 0;
const live = {
  generatedAt: hasNewData ? now.toISOString() : (previous.generatedAt || null),
  lastAttemptedAt: now.toISOString(),
  lastSuccessfulDataAt: hasNewData ? now.toISOString() : (previous.lastSuccessfulDataAt || previous.generatedAt || null),
  intervalDays: 14,
  schools: { ...(previous.schools || {}) }
};
for (const [schoolId, patch] of Object.entries(updates)) {
  const old = live.schools[schoolId] || {};
  live.schools[schoolId] = {
    ...old,
    verifiedAt: now.toISOString().slice(0, 10),
    tuition: mergeByProgram(old.tuition, patch.tuition),
    budgetPlaces: mergeByProgram(old.budgetPlaces, patch.budgetPlaces)
  };
}

const okSources = results.filter(item => item.status === 'updated').length;
const needsReview = results.filter(item => item.status !== 'updated').length;
const report = {
  checkedAt: now.toISOString(),
  lastSuccessfulDataAt: live.lastSuccessfulDataAt,
  intervalDays: 14,
  sources: results.length,
  successfulSources: okSources,
  needsReview,
  updatedPrices,
  updatedBudgetPlaces,
  note: 'Automatic values are imported only when the configured official page contains a matching program row and a readable current-year amount/count. Monthly values are calculated as annual amount divided by 12 and are not an instalment schedule. Missing or changed layouts are flagged for review; previously verified values are preserved.',
  sourceResults: results
};

console.log('Official admissions sources: ' + okSources + '/' + results.length + ' parsed; ' +
  updatedPrices + ' tuition values, ' + updatedBudgetPlaces + ' funded-place values refreshed.');
for (const item of results) {
  const details = [
    'prices=' + item.extractedPrices,
    'funded=' + item.extractedBudgetPlaces,
    ...(item.tableCount === undefined ? [] : ['tables=' + item.tableCount, 'rows=' + item.tableRows]),
    ...(item.warnings.length ? ['warnings=' + item.warnings.join(',')] : []),
    ...(item.debugPreview ? ['preview=' + item.debugPreview] : [])
  ];
  console.log(item.id + ': ' + item.status + ' (' + details.join('; ') + ')');
}
if (!checkOnly) {
  writeFileSync(livePath,
    '/* Generated by scripts/refresh-catalog-data.mjs. Do not edit by hand. */\n' +
    'var CATALOG_LIVE_DETAILS = ' + JSON.stringify(live, null, 2) + ';\n'
  );
  writeFileSync(statusPath, JSON.stringify(report, null, 2) + '\n');
}
