import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const temp = mkdtempSync(path.join(tmpdir(), 'national-catalog-test-'));
try {
  const csv = [
    'source_id;name;type;city;region;address;parent_name;location_kind;is_branch;inn;ogrn;website;license_status;accreditation_status;ownership;programs;source_url',
    'test-college-1;Тестовый колледж;college;Тестоград;Тестовая область;улица Первая, 1;;institution;false;1234567890;1027700000001;https://college.example.test;Действующая;Действует;Государственная;Информационные системы;https://registry.example.test/1',
    'test-college-1;Тестовый колледж;college;Тестоград;Тестовая область;улица Первая, 1;;institution;false;1234567890;1027700000001;https://college.example.test;Действующая;Действует;Государственная;Информационные системы;https://registry.example.test/1',
    'test-branch-1;Тестовый колледж — филиал;СПО;Тестоград;Тестовая область;улица Вторая, 2;Тестовый колледж;branch;true;1234567890;1027700000001;https://college.example.test;Действующая;Действует;Государственная;Программирование;https://registry.example.test/2',
    'test-vuz-1;Тестовый университет;ВПО;Тестоград;Тестовая область;проспект Третий, 3;;institution;false;1234567891;1027700000002;https://university.example.test;Действующая;Действует;Государственная;Математика;https://registry.example.test/3',
    'test-closed-1;Закрытый колледж;СПО;Другоград;Тестовая область;улица Закрытая, 4;;institution;false;1234567892;1027700000003;https://closed.example.test;Прекращена;Недействует;Государственная;Технологии;https://registry.example.test/4'
  ].join('\n');
  const inputPath = path.join(temp, 'input.csv');
  const outputPath = path.join(temp, 'catalog-national.js');
  writeFileSync(inputPath, csv, 'utf8');

  execFileSync(process.execPath, [
    path.join(root, 'scripts/import-national-catalog.mjs'),
    '--input', inputPath,
    '--source', 'Тестовый источник',
    '--snapshot', '2026-11-28',
    '--output', outputPath
  ], { cwd: root, stdio: 'pipe' });

  const context = {};
  const code = readFileSync(path.join(root, 'data.js'), 'utf8') + '\n' +
    readFileSync(path.join(root, 'data-extra.js'), 'utf8') + '\n' +
    readFileSync(outputPath, 'utf8') +
    '\n;globalThis.__result = { SCHOOLS, CATALOG_NATIONAL };';
  vm.runInNewContext(code, context, { timeout: 5000 });

  const catalog = context.__result.CATALOG_NATIONAL;
  const imported = catalog.records;
  if (imported.length !== 3) throw new Error('Expected 3 records after deduplication/status filtering, got ' + imported.length);
  if (catalog.uniqueCities !== 1) throw new Error('Expected one city, got ' + catalog.uniqueCities);
  if (catalog.byType.college !== 2 || catalog.byType.vuz !== 1) throw new Error('Unexpected counts by education level');
  if (imported.filter(record => record.locationKind === 'branch').length !== 1) throw new Error('Branch record was not preserved');
  if (imported.some(record => record.n === 'Закрытый колледж')) throw new Error('Terminated institution was incorrectly imported');
  if (new Set(imported.map(record => record.id)).size !== imported.length) throw new Error('Importer produced duplicate IDs');
  if (!imported.every(record => record.catalogSource === 'Тестовый источник' && record.sourceSnapshot === '2026-11-28')) {
    throw new Error('Imported records are missing source provenance');
  }
  console.log('National catalogue importer test passed: 3 records, 1 city, 2 colleges, 1 university; duplicate and terminated rows excluded.');
} finally {
  rmSync(temp, { recursive: true, force: true });
}
