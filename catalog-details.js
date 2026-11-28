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
      tuition: [{ program: 'Бакалавриат — минимальная опубликованная цена, зависит от программы и формы', year: 2026, annualRub: 38000, monthlyRub: 3166.67, paymentPeriod: 'от 19 000 ₽ за семестр; годовой эквивалент рассчитан за два семестра', sourceUrl: 'https://synergy.ru/abiturientam/priemnaya_komissiya' }]
    },
    mfua: {
      ownership: 'private',
      ownershipSource: 'Официальные сведения об организации',
      sourceUrl: 'https://www.mfua.ru/',
      verifiedAt: '2026-11-28',
      programs: ['Юриспруденция', 'Экономика и финансы', 'Менеджмент', 'Прикладная информатика', 'Таможенное дело', 'Правоохранительная деятельность']
    },
    rosnou: {
      ownership: 'private',
      ownershipSource: 'Официальные сведения об организации',
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
      ]
    },
    skoltech: {
      ownership: 'private',
      ownershipSource: 'Автономная некоммерческая образовательная организация',
      sourceUrl: 'https://www.skoltech.ru/admissions',
      verifiedAt: '2026-11-28',
      programs: ['Магистерские и аспирантские исследовательские программы в области технологий, инженерии и естественных наук']
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
