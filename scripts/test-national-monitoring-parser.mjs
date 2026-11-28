import assert from "node:assert/strict";
import {
  classifyMonitoringRecord,
  normalizeSettlement,
  parseMonitoringRecords
} from "./national-monitoring-parser.mjs";

const html = '<table><tr><td id="org-123" icon="_2" city="г. Москва" coordinates="55.75,37.61"><a href="inst.php?id=123">Федеральный университет &amp; институт</a><div class="adr"><p>Адрес</p><p>101000, г. Москва, ул. Примерная, д. 1</p></div></td></tr></table>';
const [record] = parseMonitoringRecords(html);
assert.equal(record.id, "org-123");
assert.equal(record.icon, "_2");
assert.equal(record.city, "г. Москва");
assert.equal(record.name, "Федеральный университет & институт");
assert.equal(record.address, "101000, г. Москва, ул. Примерная, д. 1");
assert.equal(record.coordinates, "55.75,37.61");
assert.deepEqual(
  classifyMonitoringRecord(record, { pageType: "vpo" }),
  { ...record, type: "vuz", locationKind: "institution" }
);

const college = classifyMonitoringRecord({ ...record, icon: "_1" }, { pageType: "spo" });
assert.equal(college.type, "college");
assert.equal(college.locationKind, "institution");

const branchOfUniversity = classifyMonitoringRecord({ ...record, id: "branch-1", icon: "_0" }, {
  pageType: "spo",
  vpoIds: new Set(["branch-1"])
});
assert.equal(branchOfUniversity.type, "vuz");
assert.equal(branchOfUniversity.locationKind, "branch");

const branchOfCollege = classifyMonitoringRecord({
  ...record,
  id: "branch-2",
  icon: "_0",
  name: 'Злынковский филиал ГБПОУ «БАТ имени Героя России А.С. Зайцева»'
}, {
  pageType: "spo",
  vpoIds: new Set()
});
assert.equal(branchOfCollege.type, "college");
assert.equal(branchOfCollege.locationKind, "branch");

const branchOfInstitute = classifyMonitoringRecord({
  ...record,
  id: "branch-3",
  icon: "_0",
  name: "Калужский филиал Московского областного финансово-юридического института"
}, {
  pageType: "spo",
  vpoIds: new Set()
});
assert.equal(branchOfInstitute.type, "vuz");

assert.equal(normalizeSettlement("г. Вятские Поляны"), "Вятские Поляны");
assert.equal(normalizeSettlement("с. Кочубеевское"), "Кочубеевское");
assert.equal(normalizeSettlement("пгт. Медвенка"), "Медвенка");

console.log("Official monitoring parser tests passed.");
