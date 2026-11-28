/* Подтверждённые расширенные сведения о заведениях.
   Неизвестные значения намеренно остаются пустыми: цены и бюджетные места
   зависят от программы и года приёма и не должны додумываться. */
const CATALOG_DETAILS = {
  defaults: {
    ownership: 'unknown',
    programs: [],
    budgetPlaces: [],
    tuition: [],
    verifiedAt: null,
    sourceUrl: null
  },
  schools: {
    synergy: {
      ownership: 'private',
      ownershipSource: 'Официальные сведения об организации',
      sourceUrl: 'https://synergy.ru/abiturientam/priemnaya_komissiya',
      verifiedAt: '2026-11-28',
      programs: ['Юриспруденция', 'Информационные технологии и программирование', 'Менеджмент и бизнес', 'Экономика', 'Психология', 'Дизайн', 'Педагогика', 'Медицина', 'Инженерия', 'Логистика', 'Туризм', 'Игровая индустрия и киберспорт'],
      tuition: [{ program: 'Бакалавриат — минимальная опубликованная цена, зависит от программы и формы', year: 2026, annualRub: 38000, monthlyRub: 3166.67, monthlyIsEquivalent: true, paymentPeriod: 'от 19 000 ₽ за семестр; годовой эквивалент рассчитан за два семестра', sourceUrl: 'https://synergy.ru/abiturientam/priemnaya_komissiya' }]
    },
    mfua: {
      ownership: 'private',
      ownershipSource: 'Официальные сведения об организации',
      sourceUrl: 'https://www.mfua.ru/',
      verifiedAt: '2026-11-28',
      programs: ['Юриспруденция', 'Экономика и финансы', 'Менеджмент', 'Прикладная информатика', 'Таможенное дело', 'Правоохранительная деятельность']
    },
    'rosnou-moscow': {
      ownership: 'private',
      ownershipSource: 'Автономная некоммерческая организация высшего образования',
      sourceUrl: 'https://rosnou.ru/bak/official/',
      verifiedAt: '2026-11-28',
      programs: ['Прикладная математика и информатика', 'Информатика и вычислительная техника', 'Информационные системы и технологии', 'Экономика', 'Менеджмент', 'Юриспруденция', 'Психология', 'Педагогика', 'Лингвистика', 'Туризм', 'Гостиничное дело', 'Реклама и связи с общественностью'],
      budgetPlaces: [
        { program: 'Прикладная математика и информатика (очная)', year: 2026, count: 1, sourceUrl: 'https://rosnou.ru/bak/program/' },
        { program: 'Математическое обеспечение и администрирование информационных систем (очная)', year: 2026, count: 3, sourceUrl: 'https://rosnou.ru/bak/program/' },
        { program: 'Информационные системы и технологии (очная)', year: 2026, count: 7, sourceUrl: 'https://rosnou.ru/bak/program/' },
        { program: 'Социальная работа (очная)', year: 2026, count: 1, sourceUrl: 'https://rosnou.ru/bak/program/' },
        { program: 'Начальное образование (очная)', year: 2026, count: 2, sourceUrl: 'https://rosnou.ru/bak/program/' },
        { program: 'Издательское дело (очная)', year: 2026, count: 1, sourceUrl: 'https://rosnou.ru/bak/program/' },
        { program: 'Туризм (очная)', year: 2026, count: 2, sourceUrl: 'https://rosnou.ru/bak/program/' },
        { program: 'Финансы и кредит (очная)', year: 2026, count: 2, sourceUrl: 'https://rosnou.ru/bak/program/' }
      ],
      tuition: [
        { program: 'Экономика — налоги и налогообложение (очная)', year: 2026, annualRub: 240000, monthlyRub: 20000, monthlyIsEquivalent: true, paymentPeriod: 'Стоимость за 2026/2027 учебный год', sourceUrl: 'https://rosnou.ru/bak/price/' },
        { program: 'Экономика — налоги и налогообложение (очно-заочная)', year: 2026, annualRub: 127000, monthlyRub: 10583.33, monthlyIsEquivalent: true, paymentPeriod: 'Стоимость за 2026/2027 учебный год', sourceUrl: 'https://rosnou.ru/bak/price/' }
      ]
    },
    skoltech: {
      ownership: 'private',
      ownershipSource: 'Автономная некоммерческая образовательная организация',
      sourceUrl: 'https://www.skoltech.ru/admissions',
      verifiedAt: '2026-11-28',
      programs: ['Магистерские и аспирантские исследовательские программы в области технологий, инженерии и естественных наук']
    },
    'spbgup-spb': {
      ownership: 'private',
      ownershipSource: 'Негосударственное образовательное учреждение высшего образования',
      sourceUrl: 'https://www.gup.ru/',
      verifiedAt: '2026-11-28',
      programs: ['Конфликтология', 'Культурология', 'Искусство и творческие направления', 'Экономика и управление', 'Право', 'Журналистика и гуманитарные науки'],
      budgetPlaces: [
        { program: 'Факультет конфликтологии (места по линии Министерства труда РФ)', year: 2026, count: 127, sourceUrl: 'https://www.gup.ru/' }
      ]
    },
    'iict-voronezh': {
      ownership: 'private',
      ownershipSource: 'Автономная некоммерческая образовательная организация высшего образования',
      sourceUrl: 'https://abiturient.iict.ru/',
      verifiedAt: '2026-11-28',
      programs: ['Информатика и вычислительная техника', 'Инфокоммуникационные технологии и системы связи', 'Информационная безопасность', 'Дизайн'],
      budgetPlaces: [
        { program: 'Инфокоммуникационные технологии и системы связи (очная)', year: 2026, count: 30, sourceUrl: 'https://abiturient.iict.ru/' },
        { program: 'Инфокоммуникационные технологии и системы связи (заочная)', year: 2026, count: 25, sourceUrl: 'https://abiturient.iict.ru/' }
      ],
      tuition: [
        { program: 'Бакалавриат — очная форма (минимальная опубликованная стоимость)', year: 2026, annualRub: 101900, monthlyRub: 8491.67, monthlyIsEquivalent: true, paymentPeriod: 'Стоимость за 2026/2027 учебный год', sourceUrl: 'https://abiturient.iict.ru/' },
        { program: 'Бакалавриат — заочная и очно-заочная формы', year: 2026, annualRub: 59900, monthlyRub: 4991.67, monthlyIsEquivalent: true, paymentPeriod: 'Стоимость за 2026/2027 учебный год', sourceUrl: 'https://abiturient.iict.ru/' },
        { program: 'Дизайн (очная форма)', year: 2026, annualRub: 159900, monthlyRub: 13325, monthlyIsEquivalent: true, paymentPeriod: 'Стоимость за 2026/2027 учебный год', sourceUrl: 'https://abiturient.iict.ru/' }
      ]
    },
    'iict-college-voronezh': {
      ownership: 'private',
      ownershipSource: 'Колледж при негосударственной образовательной организации',
      sourceUrl: 'https://college.iict.ru/',
      verifiedAt: '2026-11-28',
      programs: ['Наладчик компьютерных сетей', 'Защита информации', 'Информационные системы и программирование', 'Графический дизайн'],
      tuition: [
        { program: 'СПО — очная форма', year: 2026, annualRub: 59900, monthlyRub: 4991.67, monthlyIsEquivalent: true, paymentPeriod: 'Стоимость за 2026/2027 учебный год', sourceUrl: 'https://college.iict.ru/' },
        { program: 'Графический дизайнер (очная форма)', year: 2026, annualRub: 69900, monthlyRub: 5825, monthlyIsEquivalent: true, paymentPeriod: 'Стоимость за 2026/2027 учебный год', sourceUrl: 'https://college.iict.ru/' }
      ]
    },
    'mip-moscow': {
      ownership: 'private',
      ownershipSource: 'Негосударственное образовательное частное учреждение высшего образования',
      sourceUrl: 'https://inpsycho.ru/abitur/bachelor/',
      verifiedAt: '2026-11-28',
      programs: ['Биология', 'Психология', 'Управление персоналом', 'Психолого-педагогическое образование', 'Специальное (дефектологическое) образование', 'Культурология', 'Клиническая психология', 'Педагогика и психология девиантного поведения'],
      budgetPlaces: [
        { program: 'Педагогика и психология девиантного поведения (очная специалитет)', year: 2026, count: 0, sourceUrl: 'https://inpsycho.ru/abitur/bachelor/' }
      ],
      tuition: [
        { program: 'Педагогика и психология девиантного поведения (очная)', year: 2026, annualRub: 240000, monthlyRub: 20000, monthlyIsEquivalent: true, paymentPeriod: 'Стоимость за 2026/2027 учебный год', sourceUrl: 'https://inpsycho.ru/abitur/bachelor/' },
        { program: 'Педагогика и психология девиантного поведения (очно-заочная)', year: 2026, annualRub: 180000, monthlyRub: 15000, monthlyIsEquivalent: true, paymentPeriod: 'Стоимость за 2026/2027 учебный год', sourceUrl: 'https://inpsycho.ru/abitur/bachelor/' },
        { program: 'Клиническая психология (очная)', year: 2026, annualRub: 370000, monthlyRub: 30833.33, monthlyIsEquivalent: true, paymentPeriod: 'Стоимость за 2026/2027 учебный год', sourceUrl: 'https://inpsycho.ru/abitur/bachelor/' }
      ]
    },
    'mmiu-moscow': {
      ownership: 'private',
      ownershipSource: 'Автономная некоммерческая организация высшего образования',
      sourceUrl: 'https://mi.university/sveden/education/programs/',
      verifiedAt: '2026-11-28',
      programs: ['Информатика и вычислительная техника', 'Информационные системы и технологии', 'Прикладная информатика', 'Землеустройство и кадастры', 'Менеджмент', 'Юриспруденция', 'Журналистика', 'Лингвистика', 'Искусства и гуманитарные науки', 'Актёрское искусство']
    }
  }
};

function getCatalogDetails(school) {
  const specific = CATALOG_DETAILS.schools[school.id] || {};
  return {
    ...CATALOG_DETAILS.defaults,
    ...specific,
    sourceUrl: specific.sourceUrl || (school.u ? 'https://' + school.u : null)
  };
}
