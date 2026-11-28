/* Структурированные сведения об организациях и наборе.
   Все цены и места привязаны к году, программе, форме обучения и официальному источнику.
   Пустые массивы означают, что проверенных значений для публикации пока нет. */
const CATALOG_DETAILS = {
  defaults: {
    ownership: 'unknown',
    programs: [],
    budgetPlaces: [],
    tuition: [],
    minimumScores: [],
    passingScores: [],
    description: '',
    descriptionSourceUrl: null,
    ownershipConfidence: 'unknown',
    verifiedAt: null,
    sourceUrl: null
  },
  schools: {
    synergy: {
      ownership: 'private',
      ownershipSource: 'Частная образовательная организация',
      sourceUrl: 'https://synergy.ru/abiturientam/priemnaya_komissiya',
      verifiedAt: '2026-11-28',
      programs: ['Среднее профессиональное образование', 'Бакалавриат', 'Специалитет', 'Магистратура', 'Аспирантура', 'Юриспруденция', 'Информационные технологии и программирование', 'Менеджмент и бизнес', 'Экономика', 'Психология', 'Дизайн', 'Педагогика', 'Медицина', 'Инженерия', 'Логистика', 'Туризм', 'Игровая индустрия и киберспорт'],
      tuition: [
        { program: 'Колледж — минимальная опубликованная цена', year: 2026, annualRub: 30000, monthlyRub: 2500, monthlyIsEquivalent: true, paymentPeriod: 'От 15 000 ₽ за семестр; год и месяц — расчётный эквивалент', sourceUrl: 'https://synergy.ru/abiturientam/priemnaya_komissiya' },
        { program: 'Бакалавриат — минимальная опубликованная цена', year: 2026, annualRub: 38000, monthlyRub: 3166.67, monthlyIsEquivalent: true, paymentPeriod: 'От 19 000 ₽ за семестр; год и месяц — расчётный эквивалент', sourceUrl: 'https://synergy.ru/abiturientam/priemnaya_komissiya' },
      { program: 'Специалитет — минимальная опубликованная цена', year: 2026, annualRub: 38000, monthlyRub: 3166.67, monthlyIsEquivalent: true, paymentPeriod: 'От 19 000 ₽ за семестр; год и месяц — расчётный эквивалент', sourceUrl: 'https://synergy.ru/abiturientam/priemnaya_komissiya' },
        { program: 'Магистратура — минимальная опубликованная цена', year: 2026, annualRub: 56000, monthlyRub: 4666.67, monthlyIsEquivalent: true, paymentPeriod: 'От 28 000 ₽ за семестр; год и месяц — расчётный эквивалент', sourceUrl: 'https://synergy.ru/abiturientam/priemnaya_komissiya' }
      ]
    },
    mfua: {
      ownership: 'private',
      ownershipSource: 'Аккредитованное образовательное частное учреждение высшего образования',
      sourceUrl: 'https://www.mfua.ru/abiturientu/',
      verifiedAt: '2026-11-28',
      programs: [
        'Информатика и вычислительная техника',
        'Информационные системы и технологии',
        'Прикладная информатика',
        'Технологии цифровой трансформации и управление изменениями',
        'Цифровые технологии международного бизнеса',
        'Юриспруденция',
        'Экономика и финансы',
        'Менеджмент',
        'Таможенное дело',
        'Правоохранительная деятельность',
        'Дизайн и медиакоммуникации',
        'Телевидение и кино',
        'Геодезия и кадастр',
        'Туризм и управление'
      ],
      budgetPlaces: [
        { program: 'Технологии цифровой трансформации и управление изменениями (прикладная информатика)', year: 2026, count: 5, fundingType: 'Бюджетные места по данным приёмной страницы МФЮА', sourceUrl: 'https://www.mfua.ru/types-education/vysshee-obrazovanie/bakalavriat/' },
        { program: 'Цифровые технологии международного бизнеса (прикладная информатика)', year: 2026, count: 5, fundingType: 'Бюджетные места по данным приёмной страницы МФЮА', sourceUrl: 'https://www.mfua.ru/types-education/vysshee-obrazovanie/bakalavriat/' }
      ],
      tuition: [
        { program: 'Бакалавриат — минимальная опубликованная стоимость (зависит от программы и формы)', year: 2026, annualRub: 100000, monthlyRub: 8333.33, monthlyIsEquivalent: true, paymentPeriod: 'Стоимость «от 100 000 ₽» на официальной странице программ; месячная сумма рассчитана как годовой эквивалент', sourceUrl: 'https://www.mfua.ru/types-education/vysshee-obrazovanie/bakalavriat/' }
      ]
    },
    'rosnou-moscow': {
      ownership: 'private',
      ownershipSource: 'Автономная некоммерческая организация высшего образования',
      sourceUrl: 'https://rosnou.ru/bak/official/',
      verifiedAt: '2026-11-28',
      programs: [
        'Прикладная математика и информатика', 'Информатика и вычислительная техника',
        'Информационные системы и технологии', 'Прикладная информатика', 'Бизнес-информатика',
        'Электроэнергетика и электротехника', 'Экономика', 'Менеджмент', 'Юриспруденция',
        'Политология', 'Психология', 'Социальная работа', 'Педагогическое образование',
        'Психолого-педагогическое образование', 'Логопедия', 'Лингвистика', 'Перевод и переводоведение',
        'Реклама и связи с общественностью', 'Издательское дело', 'Туризм', 'Гостиничное дело',
        'Таможенное дело', 'Педагогика и психология девиантного поведения'
      ],
      budgetPlaces: [
        { program: 'Математическое моделирование и вычислительная математика (очная)', year: 2026, count: 1, fundingType: 'Бюджет', sourceUrl: 'https://rosnou.ru/bak/program/' },
        { program: 'Технологии программного обеспечения (очная)', year: 2026, count: 3, fundingType: 'Бюджет', sourceUrl: 'https://rosnou.ru/bak/program/' },
        { program: 'Цифровые системы и технологии обмена данными (очная)', year: 2026, count: 7, fundingType: 'Бюджет', sourceUrl: 'https://rosnou.ru/bak/program/' },
        { program: 'Социальная работа с различными группами населения (очная)', year: 2026, count: 1, fundingType: 'Бюджет', sourceUrl: 'https://rosnou.ru/bak/program/' },
        { program: 'Начальное образование (очная)', year: 2026, count: 2, fundingType: 'Бюджет', sourceUrl: 'https://rosnou.ru/bak/program/' },
        { program: 'Редактор средств массовой информации (очная)', year: 2026, count: 1, fundingType: 'Бюджет', sourceUrl: 'https://rosnou.ru/bak/program/' },
        { program: 'Менеджмент туристской индустрии (очная)', year: 2026, count: 2, fundingType: 'Бюджет', sourceUrl: 'https://rosnou.ru/bak/program/' },
        { program: 'Финансы и кредит (очная)', year: 2026, count: 2, fundingType: 'Бюджет', sourceUrl: 'https://rosnou.ru/bak/program/' }
      ],
      tuition: [
        { program: 'Математическое моделирование и вычислительная математика (очная)', year: 2026, annualRub: 230000, monthlyRub: 19166.67, monthlyIsEquivalent: true, paymentPeriod: '2026/2027 учебный год', sourceUrl: 'https://rosnou.ru/bak/price/' },
        { program: 'Технологии программного обеспечения (очная)', year: 2026, annualRub: 230000, monthlyRub: 19166.67, monthlyIsEquivalent: true, paymentPeriod: '2026/2027 учебный год', sourceUrl: 'https://rosnou.ru/bak/price/' },
        { program: 'Кибербезопасность (очная)', year: 2026, annualRub: 280000, monthlyRub: 23333.33, monthlyIsEquivalent: true, paymentPeriod: '2026/2027 учебный год', sourceUrl: 'https://rosnou.ru/bak/price/' },
        { program: 'Цифровые системы и технологии обмена данными (очная)', year: 2026, annualRub: 280000, monthlyRub: 23333.33, monthlyIsEquivalent: true, paymentPeriod: '2026/2027 учебный год', sourceUrl: 'https://rosnou.ru/bak/price/' },
        { program: 'Прикладная информатика в экономике (очная)', year: 2026, annualRub: 220000, monthlyRub: 18333.33, monthlyIsEquivalent: true, paymentPeriod: '2026/2027 учебный год', sourceUrl: 'https://rosnou.ru/bak/price/' },
        { program: 'Психолого-педагогическая профилактика девиантного поведения несовершеннолетних (очная)', year: 2026, annualRub: 190000, monthlyRub: 15833.33, monthlyIsEquivalent: true, paymentPeriod: '2026/2027 учебный год', sourceUrl: 'https://rosnou.ru/bak/price/' },
        { program: 'Психологическое консультирование (очная)', year: 2026, annualRub: 270000, monthlyRub: 22500, monthlyIsEquivalent: true, paymentPeriod: '2026/2027 учебный год', sourceUrl: 'https://rosnou.ru/bak/price/' },
        { program: 'Начальное образование (очная)', year: 2026, annualRub: 220000, monthlyRub: 18333.33, monthlyIsEquivalent: true, paymentPeriod: '2026/2027 учебный год', sourceUrl: 'https://rosnou.ru/bak/price/' },
        { program: 'Педагог-психолог в системе образования (очная)', year: 2026, annualRub: 220000, monthlyRub: 18333.33, monthlyIsEquivalent: true, paymentPeriod: '2026/2027 учебный год', sourceUrl: 'https://rosnou.ru/bak/price/' },
        { program: 'Логопедия (очная)', year: 2026, annualRub: 220000, monthlyRub: 18333.33, monthlyIsEquivalent: true, paymentPeriod: '2026/2027 учебный год', sourceUrl: 'https://rosnou.ru/bak/price/' },
        { program: 'Гражданско-правовая (очная)', year: 2026, annualRub: 270000, monthlyRub: 22500, monthlyIsEquivalent: true, paymentPeriod: '2026/2027 учебный год', sourceUrl: 'https://rosnou.ru/bak/price/' },
        { program: 'Организация и управление бизнесом (очно-заочная)', year: 2026, annualRub: 135000, monthlyRub: 11250, monthlyIsEquivalent: true, paymentPeriod: '2026/2027 учебный год', sourceUrl: 'https://rosnou.ru/bak/price/' },
        { program: 'HR-менеджмент (очно-заочная)', year: 2026, annualRub: 130000, monthlyRub: 10833.33, monthlyIsEquivalent: true, paymentPeriod: '2026/2027 учебный год', sourceUrl: 'https://rosnou.ru/bak/price/' },
        { program: 'Менеджмент туристской индустрии (очная)', year: 2026, annualRub: 240000, monthlyRub: 20000, monthlyIsEquivalent: true, paymentPeriod: '2026/2027 учебный год', sourceUrl: 'https://rosnou.ru/bak/price/' }
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
      sourceUrl: 'https://www.gup.ru/uni/structure/faculties/',
      verifiedAt: '2026-11-28',
      programs: ['Конфликтология', 'Культурология', 'Искусство и творческие направления', 'Экономика и управление', 'Право', 'Журналистика и гуманитарные науки'],
      budgetPlaces: [
        { program: 'Конфликтология — места по линии федеральной субсидии', year: 2026, count: 127, fundingType: 'Государственное финансирование: федеральная субсидия Минтруда РФ', sourceUrl: 'https://www.gup.ru/enroll/help/abits/2026/enrolled/getrating/1111428527/' }
      ]
    },
    'iict-voronezh': {
      ownership: 'private',
      ownershipSource: 'Автономная некоммерческая организация высшего образования',
      sourceUrl: 'https://abiturient.iict.ru/',
      verifiedAt: '2026-11-28',
      programs: ['Информатика и вычислительная техника', 'Инфокоммуникационные технологии и системы связи', 'Информационная безопасность', 'Дизайн'],
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
      programs: [
        'Наладчик аппаратных и программных средств инфокоммуникационных систем (наладчик компьютерных сетей)',
        'Разработка и управление программным обеспечением (программист)',
        'Графический дизайнер'
      ],
      tuition: [
        { program: 'Колледж — очная форма (минимальная опубликованная стоимость)', year: 2026, annualRub: 59900, monthlyRub: 4991.67, monthlyIsEquivalent: true, paymentPeriod: 'Стоимость за 2026/2027 учебный год', sourceUrl: 'https://college.iict.ru/' },
        { program: 'Графический дизайнер (очная форма)', year: 2026, annualRub: 69900, monthlyRub: 5825, monthlyIsEquivalent: true, paymentPeriod: 'Стоимость за 2026/2027 учебный год', sourceUrl: 'https://college.iict.ru/' }
      ]
    },
    'mip-moscow': {
      ownership: 'private',
      ownershipSource: 'Негосударственное образовательное частное учреждение высшего образования',
      sourceUrl: 'https://inpsycho.ru/abitur/bachelor/',
      verifiedAt: '2026-11-28',
      programs: [
        'География и психология человека', 'Вычислительная биология', 'Нейробиология поведения человека и животных',
        'Экология и эволюция человека', 'Аналитика данных и искусственный интеллект в психологии и образовании',
        'Детское и семейное консультирование', 'Клинические основы психологического здоровья человека',
        'Психологическое консультирование и психотерапия качества жизни', 'Организационно-психологическое консультирование', 'Прикладная психология и управление персоналом в цифровой среде', 'Фундаментальные и прикладные исследования в области наук о человеке', 'Управление персоналом',
        'Педагогика и психология начального образования', 'Специальная психология', 'Цифровая антропология и киберпсихология',
        'Культурное производство и когнитивные технологии', 'Педагогика и психология девиантного поведения', 'Клиническая психология'
      ],
      tuition: [
        { program: 'География и психология человека (очная)', year: 2026, annualRub: 200000, monthlyRub: 16666.67, monthlyIsEquivalent: true, paymentPeriod: 'Стоимость за 2026/2027 учебный год', sourceUrl: 'https://inpsycho.ru/abitur/bachelor/' },
        { program: 'Вычислительная биология (очная)', year: 2026, annualRub: 260000, monthlyRub: 21666.67, monthlyIsEquivalent: true, paymentPeriod: 'Стоимость за 2026/2027 учебный год', sourceUrl: 'https://inpsycho.ru/abitur/bachelor/' },
        { program: 'Нейробиология поведения человека и животных (очная)', year: 2026, annualRub: 260000, monthlyRub: 21666.67, monthlyIsEquivalent: true, paymentPeriod: 'Стоимость за 2026/2027 учебный год', sourceUrl: 'https://inpsycho.ru/abitur/bachelor/' },
        { program: 'Нейробиология поведения человека и животных (очно-заочная)', year: 2026, annualRub: 200000, monthlyRub: 16666.67, monthlyIsEquivalent: true, paymentPeriod: 'Стоимость за 2026/2027 учебный год', sourceUrl: 'https://inpsycho.ru/abitur/bachelor/' },
        { program: 'Экология и эволюция человека (очная)', year: 2026, annualRub: 260000, monthlyRub: 21666.67, monthlyIsEquivalent: true, paymentPeriod: 'Стоимость за 2026/2027 учебный год', sourceUrl: 'https://inpsycho.ru/abitur/bachelor/' },
        { program: 'Экология и эволюция человека (очно-заочная)', year: 2026, annualRub: 250000, monthlyRub: 20833.33, monthlyIsEquivalent: true, paymentPeriod: 'Стоимость за 2026/2027 учебный год', sourceUrl: 'https://inpsycho.ru/abitur/bachelor/' },
        { program: 'Аналитика данных и ИИ в психологии и образовании (очная)', year: 2026, annualRub: 200000, monthlyRub: 16666.67, monthlyIsEquivalent: true, paymentPeriod: 'Стоимость за 2026/2027 учебный год', sourceUrl: 'https://inpsycho.ru/abitur/bachelor/' },
        { program: 'Детское и семейное консультирование (очно-заочная)', year: 2026, annualRub: 250000, monthlyRub: 20833.33, monthlyIsEquivalent: true, paymentPeriod: 'Стоимость за 2026/2027 учебный год', sourceUrl: 'https://inpsycho.ru/abitur/bachelor/' },
        { program: 'Клинические основы психологического здоровья человека (очная)', year: 2026, annualRub: 330000, monthlyRub: 27500, monthlyIsEquivalent: true, paymentPeriod: 'Стоимость за 2026/2027 учебный год', sourceUrl: 'https://inpsycho.ru/abitur/bachelor/' },
        { program: 'Психологическое консультирование и психотерапия качества жизни (очная)', year: 2026, annualRub: 330000, monthlyRub: 27500, monthlyIsEquivalent: true, paymentPeriod: 'Стоимость за 2026/2027 учебный год', sourceUrl: 'https://inpsycho.ru/abitur/bachelor/' },
        { program: 'Педагогика и психология девиантного поведения (очная)', year: 2026, annualRub: 240000, monthlyRub: 20000, monthlyIsEquivalent: true, paymentPeriod: 'Стоимость за 2026/2027 учебный год', sourceUrl: 'https://inpsycho.ru/abitur/bachelor/' },
        { program: 'Педагогика и психология девиантного поведения (очно-заочная)', year: 2026, annualRub: 180000, monthlyRub: 15000, monthlyIsEquivalent: true, paymentPeriod: 'Стоимость за 2026/2027 учебный год', sourceUrl: 'https://inpsycho.ru/abitur/bachelor/' },
        { program: 'Клиническая психология (очная)', year: 2026, annualRub: 370000, monthlyRub: 30833.33, monthlyIsEquivalent: true, paymentPeriod: 'Стоимость за 2026/2027 учебный год', sourceUrl: 'https://inpsycho.ru/abitur/bachelor/' },
        { program: 'Организационно-психологическое консультирование (очно-заочная)', year: 2026, annualRub: 250000, monthlyRub: 20833.33, monthlyIsEquivalent: true, paymentPeriod: 'Стоимость за 2026/2027 учебный год', sourceUrl: 'https://inpsycho.ru/abitur/bachelor/' },
        { program: 'Прикладная психология и управление персоналом в цифровой среде (очно-заочная)', year: 2026, annualRub: 350000, monthlyRub: 29166.67, monthlyIsEquivalent: true, paymentPeriod: 'Стоимость за 2026/2027 учебный год', sourceUrl: 'https://inpsycho.ru/abitur/bachelor/' },
        { program: 'Фундаментальные и прикладные исследования в области наук о человеке (очно-заочная)', year: 2026, annualRub: 250000, monthlyRub: 20833.33, monthlyIsEquivalent: true, paymentPeriod: 'Стоимость за 2026/2027 учебный год', sourceUrl: 'https://inpsycho.ru/abitur/bachelor/' }
      ]
    },
    'mmiu-moscow': {
      ownership: 'private',
      ownershipSource: 'Автономная некоммерческая организация высшего образования',
      sourceUrl: 'https://mi.university/postupayushchim/price-list',
      verifiedAt: '2026-11-28',
      programs: [
        'Информационные системы и технологии', 'Психология', 'Экономика', 'Менеджмент',
        'Государственное и муниципальное управление', 'Бизнес-информатика', 'Юриспруденция',
        'Реклама и связи с общественностью', 'Журналистика', 'Медиакоммуникации',
        'Филология', 'Лингвистика', 'Искусства и гуманитарные науки', 'Актёрское искусство'
      ],
      tuition: [
        { program: 'Информационные системы и технологии (бакалавриат, очная)', year: 2026, annualRub: 510000, monthlyRub: 42500, monthlyIsEquivalent: true, paymentPeriod: 'Стоимость за 2026/2027 учебный год, до возможной поддержки/скидки', sourceUrl: 'https://mi.university/sveden/files/signed/Prikaz_stoimosti_2026-2027.pdf' },
        { program: 'Психология (бакалавриат, очная)', year: 2026, annualRub: 478000, monthlyRub: 39833.33, monthlyIsEquivalent: true, paymentPeriod: 'Стоимость за 2026/2027 учебный год, до возможной поддержки/скидки', sourceUrl: 'https://mi.university/sveden/files/signed/Prikaz_stoimosti_2026-2027.pdf' },
        { program: 'Экономика (бакалавриат, очная)', year: 2026, annualRub: 478000, monthlyRub: 39833.33, monthlyIsEquivalent: true, paymentPeriod: 'Стоимость за 2026/2027 учебный год, до возможной поддержки/скидки', sourceUrl: 'https://mi.university/sveden/files/signed/Prikaz_stoimosti_2026-2027.pdf' },
        { program: 'Менеджмент (бакалавриат, очная)', year: 2026, annualRub: 478000, monthlyRub: 39833.33, monthlyIsEquivalent: true, paymentPeriod: 'Стоимость за 2026/2027 учебный год, до возможной поддержки/скидки', sourceUrl: 'https://mi.university/sveden/files/signed/Prikaz_stoimosti_2026-2027.pdf' },
        { program: 'Юриспруденция (бакалавриат, очная)', year: 2026, annualRub: 478000, monthlyRub: 39833.33, monthlyIsEquivalent: true, paymentPeriod: 'Стоимость за 2026/2027 учебный год, до возможной поддержки/скидки', sourceUrl: 'https://mi.university/sveden/files/signed/Prikaz_stoimosti_2026-2027.pdf' },
        { program: 'Реклама и связи с общественностью (бакалавриат, очная)', year: 2026, annualRub: 510000, monthlyRub: 42500, monthlyIsEquivalent: true, paymentPeriod: 'Стоимость за 2026/2027 учебный год, до возможной поддержки/скидки', sourceUrl: 'https://mi.university/sveden/files/signed/Prikaz_stoimosti_2026-2027.pdf' }
      ]
    },
    kfu: {
      ownership: 'public',
      ownershipSource: 'Федеральный государственный университет; форма подтверждается официальным названием и приёмным порталом',
      ownershipConfidence: 'official-name',
      sourceUrl: 'https://admissions.kpfu.ru/dokumenty/bakalavriat-specialitet/itogi-priyoma/',
      verifiedAt: '2026-11-28',
      description: 'Казанский федеральный университет — крупный классический университет с программами в области медицины, биологии, экологии, геологии, математики, компьютерных наук, информационной безопасности, физики, химии, права, международных отношений и гуманитарных дисциплин. В официальных итогах приёма за 2026 год опубликованы минимальные баллы зачисленных отдельно для бюджетного и платного конкурсов; показатели различаются по направлению и форме обучения.',
      descriptionSourceUrl: 'https://admissions.kpfu.ru/wp-content/uploads/2026/10/itogi-priema-kazan.pdf',
      passingScores: [
        { program: 'Биология', year: 2026, form: 'Очная, бакалавриат', basis: 'budget', score: 227, scoreKind: 'minimum-admitted-total', sourceUrl: 'https://admissions.kpfu.ru/wp-content/uploads/2026/10/itogi-priema-kazan.pdf' },
        { program: 'Биология', year: 2026, form: 'Очная, бакалавриат', basis: 'paid', score: 171, scoreKind: 'minimum-admitted-total', sourceUrl: 'https://admissions.kpfu.ru/wp-content/uploads/2026/10/itogi-priema-kazan.pdf' },
        { program: 'Лечебное дело', year: 2026, form: 'Очная, специалитет', basis: 'budget', score: 276, scoreKind: 'minimum-admitted-total', sourceUrl: 'https://admissions.kpfu.ru/wp-content/uploads/2026/10/itogi-priema-kazan.pdf' },
        { program: 'Лечебное дело', year: 2026, form: 'Очная, специалитет', basis: 'paid', score: 172, scoreKind: 'minimum-admitted-total', sourceUrl: 'https://admissions.kpfu.ru/wp-content/uploads/2026/10/itogi-priema-kazan.pdf' },
        { program: 'Стоматология', year: 2026, form: 'Очная, специалитет', basis: 'paid', score: 196, scoreKind: 'minimum-admitted-total', sourceUrl: 'https://admissions.kpfu.ru/wp-content/uploads/2026/10/itogi-priema-kazan.pdf' },
        { program: 'Фармация', year: 2026, form: 'Очная, специалитет', basis: 'budget', score: 217, scoreKind: 'minimum-admitted-total', sourceUrl: 'https://admissions.kpfu.ru/wp-content/uploads/2026/10/itogi-priema-kazan.pdf' },
        { program: 'Фармация', year: 2026, form: 'Очная, специалитет', basis: 'paid', score: 127, scoreKind: 'minimum-admitted-total', sourceUrl: 'https://admissions.kpfu.ru/wp-content/uploads/2026/10/itogi-priema-kazan.pdf' },
        { program: 'Прикладная математика и информатика', year: 2026, form: 'Очная, бакалавриат', basis: 'budget', score: 262, scoreKind: 'minimum-admitted-total', sourceUrl: 'https://admissions.kpfu.ru/wp-content/uploads/2026/10/itogi-priema-kazan.pdf' },
        { program: 'Прикладная математика и информатика', year: 2026, form: 'Очная, бакалавриат', basis: 'paid', score: 178, scoreKind: 'minimum-admitted-total', sourceUrl: 'https://admissions.kpfu.ru/wp-content/uploads/2026/10/itogi-priema-kazan.pdf' },
        { program: 'Информационные системы и технологии', year: 2026, form: 'Очная, бакалавриат', basis: 'budget', score: 257, scoreKind: 'minimum-admitted-total', sourceUrl: 'https://admissions.kpfu.ru/wp-content/uploads/2026/10/itogi-priema-kazan.pdf' },
        { program: 'Информационные системы и технологии', year: 2026, form: 'Очная, бакалавриат', basis: 'paid', score: 140, scoreKind: 'minimum-admitted-total', sourceUrl: 'https://admissions.kpfu.ru/wp-content/uploads/2026/10/itogi-priema-kazan.pdf' },
        { program: 'Прикладная информатика', year: 2026, form: 'Очная, бакалавриат', basis: 'budget', score: 253, scoreKind: 'minimum-admitted-total', sourceUrl: 'https://admissions.kpfu.ru/wp-content/uploads/2026/10/itogi-priema-kazan.pdf' },
        { program: 'Прикладная информатика', year: 2026, form: 'Очная, бакалавриат', basis: 'paid', score: 140, scoreKind: 'minimum-admitted-total', sourceUrl: 'https://admissions.kpfu.ru/wp-content/uploads/2026/10/itogi-priema-kazan.pdf' },
        { program: 'Информационная безопасность', year: 2026, form: 'Очная, бакалавриат', basis: 'budget', score: 263, scoreKind: 'minimum-admitted-total', sourceUrl: 'https://admissions.kpfu.ru/wp-content/uploads/2026/10/itogi-priema-kazan.pdf' },
        { program: 'Информационная безопасность', year: 2026, form: 'Очная, бакалавриат', basis: 'paid', score: 177, scoreKind: 'minimum-admitted-total', sourceUrl: 'https://admissions.kpfu.ru/wp-content/uploads/2026/10/itogi-priema-kazan.pdf' },
        { program: 'Юриспруденция', year: 2026, form: 'Очная, бакалавриат', basis: 'budget', score: 256, scoreKind: 'minimum-admitted-total', sourceUrl: 'https://admissions.kpfu.ru/wp-content/uploads/2026/10/itogi-priema-kazan.pdf' },
        { program: 'Юриспруденция', year: 2026, form: 'Очная, бакалавриат', basis: 'paid', score: 149, scoreKind: 'minimum-admitted-total', sourceUrl: 'https://admissions.kpfu.ru/wp-content/uploads/2026/10/itogi-priema-kazan.pdf' }
      ]
    }
  }
};

function mergeVerifiedRows(staticRows, liveRows) {
  const merged = new Map();
  const keyOf = row => [
    row.program || '',
    row.year || '',
    row.subject || '',
    row.basis || '',
    row.form || ''
  ].join('|');
  for (const row of Array.isArray(staticRows) ? staticRows : []) {
    merged.set(keyOf(row), { ...row });
  }
  for (const row of Array.isArray(liveRows) ? liveRows : []) {
    const key = keyOf(row);
    merged.set(key, { ...(merged.get(key) || {}), ...row });
  }
  return [...merged.values()].sort((a, b) =>
    String(a.program || '').localeCompare(String(b.program || ''), 'ru') ||
    Number(b.year || 0) - Number(a.year || 0)
  );
}

function getCatalogDetails(school) {
  const specific = CATALOG_DETAILS.schools[school.id] || {};
  const liveDetails = typeof CATALOG_LIVE_DETAILS !== 'undefined' && CATALOG_LIVE_DETAILS.schools
    ? CATALOG_LIVE_DETAILS.schools[school.id] || {}
    : {};
  return {
    ...CATALOG_DETAILS.defaults,
    ...specific,
    ...liveDetails,
    programs: Array.isArray(liveDetails.programs) && liveDetails.programs.length
      ? liveDetails.programs
      : (specific.programs || []),
    budgetPlaces: mergeVerifiedRows(specific.budgetPlaces, liveDetails.budgetPlaces),
    tuition: mergeVerifiedRows(specific.tuition, liveDetails.tuition),
    minimumScores: mergeVerifiedRows(specific.minimumScores, liveDetails.minimumScores),
    passingScores: mergeVerifiedRows(specific.passingScores, liveDetails.passingScores),
    description: liveDetails.description || specific.description || '',
    descriptionSourceUrl: liveDetails.descriptionSourceUrl || specific.descriptionSourceUrl || null,
    ownershipSource: liveDetails.ownershipSource || specific.ownershipSource || '',
    ownershipConfidence: liveDetails.ownershipConfidence || specific.ownershipConfidence || 'unknown',
    sourceUrl: liveDetails.sourceUrl || specific.sourceUrl || (school.u ? 'https://' + school.u : null)
  };
}
