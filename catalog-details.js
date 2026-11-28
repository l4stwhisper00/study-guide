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
      programs: ['Бизнес и менеджмент', 'Информационные технологии', 'Дизайн', 'Психология', 'Спорт', 'Медиа и коммуникации']
    },
    mfua: {
      ownership: 'private',
      ownershipSource: 'Официальные сведения об организации',
      programs: ['Юриспруденция', 'Экономика и финансы', 'Менеджмент', 'Информационные технологии']
    },
    rosnou: {
      ownership: 'private',
      ownershipSource: 'Официальные сведения об организации',
      programs: ['Экономика и управление', 'Юриспруденция', 'Психология', 'Лингвистика', 'Информационные технологии']
    },
    skoltech: {
      ownership: 'private',
      ownershipSource: 'Автономная некоммерческая образовательная организация',
      programs: ['Информационные технологии и искусственный интеллект', 'Энергетические системы', 'Биотехнологии', 'Материаловедение', 'Фотоника и квантовые технологии']
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
