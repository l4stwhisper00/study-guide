import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

const root = process.cwd();
const context = {};
const bundle = [
  'data.js',
  'data-extra.js',
  'catalog-data-live.js',
  'catalog-details.js'
].map(file => readFileSync(path.join(root, file), 'utf8')).join('\n')
  + '\n;globalThis.__catalogTest = { SCHOOLS, CATALOG_DETAILS, CATALOG_LIVE_DETAILS, getCatalogDetails };';

vm.runInNewContext(bundle, context, { timeout: 10000 });
const { SCHOOLS, CATALOG_DETAILS, getCatalogDetails } = context.__catalogTest;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function school(id) {
  const match = SCHOOLS.find(item => item.id === id);
  assert(match, 'Expected institution not found in SCHOOLS: ' + id);
  return match;
}
function assertRows(rows, label, predicate) {
  assert(Array.isArray(rows), label + ' must be an array');
  for (const row of rows) {
    assert(row.program, label + ' row is missing program name');
    assert(Number.isInteger(Number(row.year)), label + ' row is missing a year');
    assert(Number.isFinite(Number(row[predicate.field])), label + ' row has invalid ' + predicate.field);
    assert(/^https:\/\//i.test(row.sourceUrl || ''), label + ' row is missing an HTTPS source URL');
    assert(predicate.test(row), label + ' row failed validation');
  }
}

assert(Array.isArray(CATALOG_DETAILS.defaults.minimumScores), 'minimumScores default must exist');
assert(Array.isArray(CATALOG_DETAILS.defaults.passingScores), 'passingScores default must exist');
assert(typeof CATALOG_DETAILS.defaults.description === 'string', 'description default must exist');
assert(CATALOG_DETAILS.defaults.ownershipConfidence === 'unknown', 'ownership confidence must default to unknown');

const kfu = getCatalogDetails(school('kfu'));
assert(kfu.ownership === 'public', 'KFU ownership is not marked public');
assert(kfu.ownershipConfidence === 'official-name', 'KFU ownership must be marked from official name');
assert(kfu.description && kfu.description.length > 150, 'KFU profile description is too short');
assert(kfu.descriptionSourceUrl?.endsWith('.pdf'), 'KFU description source should point to the official 2026 result document');
assertRows(kfu.passingScores, 'KFU passing scores', {
  field: 'score',
  test: row => row.score > 0 && row.basis === 'budget' || row.score > 0 && row.basis === 'paid'
});
assert(kfu.passingScores.length >= 70, 'KFU 2026 exact admitted scores are incomplete');
assert(kfu.passingScores.every(row => row.scoreKind === 'minimum-admitted-total'), 'KFU scores must be labelled as minimum admitted totals');
assert(kfu.passingScores.every(row => row.year === 2026), 'KFU scores must keep their actual admission year');
assertRows(kfu.budgetPlaces, 'KFU budget places', {
  field: 'count',
  test: row => Number.isInteger(row.count) && row.count > 0 && row.fundingType.includes('2026/27')
});
assert(kfu.budgetPlaces.reduce((sum, row) => sum + row.count, 0) === 918, 'KFU listed 2026/27 budget-place total changed unexpectedly');
assertRows(kfu.minimumScores, 'KFU subject minimum scores', {
  field: 'score',
  test: row => row.score >= 40 && row.score <= 100 && row.subject
});
assert(kfu.minimumScores.length >= 12, 'KFU subject minimum-score data is incomplete');

const rosnou = getCatalogDetails(school('rosnou-moscow'));
assertRows(rosnou.budgetPlaces, 'RosNOU budget places', {
  field: 'count',
  test: row => Number.isInteger(row.count) && row.count >= 0
});
assert(rosnou.budgetPlaces.reduce((sum, row) => sum + row.count, 0) === 19, 'RosNOU listed budget-place total changed unexpectedly');
assertRows(rosnou.tuition, 'RosNOU tuition', {
  field: 'annualRub',
  test: row => row.annualRub > 0 && row.monthlyRub > 0
});

const mfua = getCatalogDetails(school('mfua'));
assert(mfua.ownership === 'private', 'MFUA should be marked private');
assert(mfua.budgetPlaces.reduce((sum, row) => sum + row.count, 0) === 10, 'MFUA published budget-seat total changed unexpectedly');

const unknownEntry = { id: '__unknown_test__', n: 'Учебное заведение без источников', t: 'vuz', c: 'Тестоград' };
const empty = getCatalogDetails(unknownEntry);
assert(empty.ownership === 'unknown', 'Unknown ownership must not be guessed as public/private');
assert(empty.budgetPlaces.length === 0 && empty.tuition.length === 0 && empty.passingScores.length === 0,
  'Unknown test institution must not receive invented admissions data');

console.log('Catalog admissions profile test passed: ownership confidence, programme-level budgets, annual/monthly tuition, exact admitted scores and source URLs.');
