import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const temp = mkdtempSync(path.join(tmpdir(), 'national-catalog-test-'));
try {
  const csv = [
    'source_id;name;type;city;region;address;parent_name;location_kind;is_branch;inn;ogrn;website;license_status;accreditation_status;ownership;programs;source_url;legal_entity_status;legal_entity_checked_at;territory_code;coordinates;source_snapshot;catalog_source',
    'test-college-1;Тестовый колледж;college;Тестоград;Тестовая область;улица Первая, 1;;institution;false;1234567890;1027700000001;https://college.example.test;Действующая;Действует;Государственная;Информационные системы;https://registry.example.test/1',
    'test-college-1;Тестовый колледж;college;Тестоград;Тестовая область;улица Первая, 1;;institution;false;1234567890;1027700000001;https://college.example.test;Действующая;Действует;Государственная;Информационные системы;https://registry.example.test/1',
    'test-branch-1;Тестовый колледж — филиал;СПО;Тестоград;Тестовая область;улица Вторая, 2;Тестовый колледж;branch;true;1234567890;1027700000001;https://college.example.test;Действующая;Действует;Государственная;Программирование;https://registry.example.test/2',
    'test-vuz-1;Тестовый университет;ВПО;Тестоград;Тестовая область;проспект Третий, 3;;institution;false;1234567891;1027700000002;https://university.example.test;Действующая;Действует;Государственная;Математика;https://registry.example.test/3',
    'test-closed-1;Закрытый колледж;СПО;Другоград;Тестовая область;улица Закрытая, 4;;institution;false;1234567892;1027700000003;https://closed.example.test;Прекращена;Недействует;Государственная;Технологии;https://registry.example.test/4',
    '91558;Автономная некоммерческая организация профессионального образования "Колледж правосудия";колледж;Рязань;Рязанская область;;;institution;false;6234169645;1176234012349;;Действующая;есть действующая аккредитация;;;;действующее;25.08.2026;61701;есть',
    'test-college-explicit;Колледж при Университете;college;Тестоград;Тестовая область;улица Пятая, 5;;institution;false;;;;;;;Программирование;;;;;;2026-02-03;Источник строки'
  ].join('\n');
  const inputPath = path.join(temp, 'input.csv');
  const outputPath = path.join(temp, 'catalog-national.js');
  const yearOutputPath = path.join(temp, 'catalog-national-year.js');
  const preservedOutputPath = path.join(temp, 'catalog-national-preserved.js');
  writeFileSync(inputPath, csv, 'utf8');

  const commonArgs = [
    path.join(root, 'scripts/import-national-catalog.mjs'),
    '--input', inputPath,
    '--source', 'Тестовый источник',
    '--snapshot', '2026-09-06',
    '--source-url', 'https://tutvidnee.ru/data/'
  ];
  execFileSync(process.execPath, [...commonArgs, '--output', outputPath], { cwd: root, stdio: 'pipe' });
  execFileSync(process.execPath, [...commonArgs, '--snapshot', '2025', '--output', yearOutputPath], { cwd: root, stdio: 'pipe' });
  execFileSync(process.execPath, [...commonArgs, '--preserve-existing-national', 'true', '--output', preservedOutputPath], {
    cwd: root,
    stdio: 'pipe'
  });

  const yearContext = {};
  const yearCode = readFileSync(path.join(root, 'data.js'), 'utf8') + '\n' +
    readFileSync(path.join(root, 'data-extra.js'), 'utf8') + '\n' +
    readFileSync(yearOutputPath, 'utf8') +
    '\n;globalThis.__year = CATALOG_NATIONAL;';
  vm.runInNewContext(yearCode, yearContext, { timeout: 5000 });
  const yearRows = yearContext.__year.records;
  if (!yearRows.filter(record => record.sourceId !== 'test-college-explicit').every(record => record.sourceSnapshot === '2025')) {
    throw new Error('Global year snapshot was not preserved');
  }
  if (yearRows.find(record => record.sourceId === 'test-college-explicit')?.sourceSnapshot !== '2026-02-03') {
    throw new Error('Per-row source snapshot was not preserved');
  }

  const context = {};
  const code = readFileSync(path.join(root, 'data.js'), 'utf8') + '\n' +
    readFileSync(path.join(root, 'data-extra.js'), 'utf8') + '\n' +
    readFileSync(outputPath, 'utf8') +
    '\n;globalThis.__result = { SCHOOLS, CATALOG_NATIONAL };';
  vm.runInNewContext(code, context, { timeout: 5000 });

  const catalog = context.__result.CATALOG_NATIONAL;
  const imported = catalog.records;
  if (imported.length !== 5) throw new Error('Expected 5 records after deduplication/status filtering, got ' + imported.length);
  if (catalog.uniqueCities !== 2) throw new Error('Expected two cities, got ' + catalog.uniqueCities);
  if (catalog.byType.college !== 4 || catalog.byType.vuz !== 1) throw new Error('Unexpected counts by education level');
  if (imported.filter(record => record.locationKind === 'branch').length !== 1) throw new Error('Branch record was not preserved');
  if (imported.some(record => record.n === 'Закрытый колледж')) throw new Error('Terminated institution was incorrectly imported');
  if (new Set(imported.map(record => record.id)).size !== imported.length) throw new Error('Importer produced duplicate IDs');
  const defaultSourceRows = imported.filter(record => record.sourceId !== 'test-college-explicit');
  if (!defaultSourceRows.every(record => record.catalogSource === 'Тестовый источник' && record.sourceSnapshot === '2026-09-06')) {
    throw new Error('Imported records are missing default source provenance');
  }
  const explicitCollege = imported.find(record => record.sourceId === 'test-college-explicit');
  if (!explicitCollege || explicitCollege.t !== 'college') throw new Error('Explicit college type was incorrectly expanded to multiple levels');
  if (explicitCollege.catalogSource !== 'Источник строки' || explicitCollege.sourceSnapshot !== '2026-02-03') {
    throw new Error('Per-row source provenance was not preserved');
  }
  const publicRow = imported.find(record => record.sourceId === '91558');
  if (!publicRow) throw new Error('Tutvidnee public sample row was not imported');
  if (publicRow.parentName) throw new Error('Legal-entity status was incorrectly treated as a parent organization');
  if (publicRow.legalEntityStatus !== 'действующее') throw new Error('Legal-entity status was not mapped');
  if (publicRow.legalEntityCheckedAt !== '25.08.2026') throw new Error('Legal-entity check date was not mapped');
  if (publicRow.territoryCode !== '61701') throw new Error('OKTMO/territory code was not mapped');
  if (publicRow.coordinates !== '' || publicRow.coordinatesAvailable !== 'Есть') throw new Error('Coordinate availability was confused with actual coordinates');
  if (publicRow.sourceUrl !== 'https://tutvidnee.ru/data/') throw new Error('Fallback source URL was not applied');

  const preservedContext = {};
  const preservedCode = readFileSync(path.join(root, 'data.js'), 'utf8') + '\n' +
    readFileSync(path.join(root, 'data-extra.js'), 'utf8') + '\n' +
    readFileSync(preservedOutputPath, 'utf8') +
    '\n;globalThis.__preserved = CATALOG_NATIONAL;';
  vm.runInNewContext(preservedCode, preservedContext, { timeout: 10000 });
  const preserved = preservedContext.__preserved;
  if (preserved.preservedExistingRecords < 400) throw new Error('Existing national catalogue records were not preserved');
  if (!preserved.records.some(record => record.sourceId === 'test-college-explicit')) {
    throw new Error('New records were not merged into the existing national catalogue');
  }
  if (preserved.records.length <= imported.length) throw new Error('Preserve mode did not retain the prior national catalogue');

  console.log('National catalogue importer test passed: explicit type, row-level provenance, safe merge, duplicate and inactive status checks passed.');
} finally {
  rmSync(temp, { recursive: true, force: true });
}
