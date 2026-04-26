/* ===== Сердце Леса — уровни (упрощённая версия) =====

   Поле: 20×15 тайлов, тайл = 32×32 пикселя, итого 640×480.

   Тайлы карты:
     '.' трава (проход)        ',' тропа (проход)
     'S' каменный пол (проход) 'M' мшистый пол (проход)
     'T' дерево (стена)        'b' куст (стена)
     'W' стена (стена)         '~' вода (стена)
     'm' гриб (стена-декор)
     '>' выход на восток (проход)

   Сущности (entity):
     altar  — оба рядом + Enter → диалог с вопросом
     vine   — стена, рубится Игроком 1 пробелом, если стоит вплотную
     plate  — плита; когда ВСЕ плиты уровня прижаты → ВСЕ двери открыты
     door   — стена, пока не открыта плитами
     totem  — финал; оба рядом + Enter → концовка
*/

const LEVELS = [

  // ===== 1: Опушка пробуждения =====
  // Знакомство с управлением. Алтарь по центру, выход справа.
  {
    name: 'Опушка пробуждения',
    hint: 'Подойдите оба к Алтарю и нажмите Enter.',
    theme: 'forest',
    tiles: [
      "TTTTTTTTTTTTTTTTTTTT",
      "T..b....m.........bT",
      "T..................T",
      "T...m..............T",
      "T..................T",
      "T..................T",
      "T..................T",
      "T..................>",
      "T..................T",
      "T..................T",
      "T..................T",
      "T..............m..bT",
      "T...b...........m..T",
      "T..........b.......T",
      "TTTTTTTTTTTTTTTTTTTT"
    ],
    spawnP1: [3, 7],
    spawnP2: [3, 8],
    entities: [
      { type: 'altar', x: 10, y: 7, qLevel: 1, qIndex: 0 },
      { type: 'altar', x: 14, y: 5, qLevel: 1, qIndex: 1 },
      // Странник (опциональный) — гриб с дополнительным вопросом
      { type: 'wanderer', x: 6, y: 11 },
      // Первый осколок Тотема
      { type: 'shard', x: 16, y: 11 }
    ]
  },

  // ===== 2: Тёмная чаща =====
  // Лоза перегораживает рощу — рубит только Солис (Пробел).
  {
    name: 'Тёмная чаща',
    hint: 'Лозы рубит Солис: подойдите вплотную и нажмите Пробел.',
    theme: 'darkforest',
    tiles: [
      "TTTTTTTTTTTTTTTTTTTT",
      "T..b...........b...T",
      "T..................T",
      "T....m.............T",
      "T..................T",
      "T..................T",
      "T..................T",
      "T..................>",
      "T..................T",
      "T..................T",
      "T..................T",
      "T..............m..bT",
      "T...b..............T",
      "T..........b.......T",
      "TTTTTTTTTTTTTTTTTTTT"
    ],
    spawnP1: [2, 7],
    spawnP2: [2, 8],
    entities: [
      { type: 'altar', x: 5, y: 5, qLevel: 2, qIndex: 0 },
      { type: 'vine', x: 9, y: 4 },
      { type: 'vine', x: 9, y: 5 },
      { type: 'vine', x: 9, y: 6 },
      { type: 'vine', x: 9, y: 7 },
      { type: 'vine', x: 9, y: 8 },
      { type: 'vine', x: 9, y: 9 },
      { type: 'vine', x: 9, y: 10 },
      // Руны: Луна должна на них наступить, чтобы зажечь.
      // В темноте они дают свет — чтобы показать путь.
      { type: 'rune', x: 4, y: 11 },
      { type: 'rune', x: 14, y: 4 },
      // Слизни в чаще
      { type: 'slime', x: 12, y: 11 },
      { type: 'slime', x: 16, y: 7 },
      { type: 'altar', x: 14, y: 9, qLevel: 2, qIndex: 1 },
      // Осколок Тотема — за лозами, в темноте
      { type: 'shard', x: 16, y: 4 }
    ]
  },

  // ===== 3: Каменный круг =====
  // Две плиты — обе должны быть прижаты, чтобы открылись двери.
  {
    name: 'Каменный круг',
    hint: 'Двери открываются, когда обе плиты прижаты одновременно.',
    theme: 'stone',
    tiles: [
      "WWWWWWWWWWWWWWWWWWWW",
      "WSSSSSSSSSSSSSSSSSSW",
      "WSSSSSSSSSSSSSSSSSSW",
      "WSSSSSSSSSSSSSSSSSSW",
      "WSSSSSSSSSSSSSSSSSSW",
      "WSSSSSSSSSSSSSSSSSSW",
      "WSSSSSSSSSSSSSSSSSSW",
      "WSSSSSSSSSSSSSSSSSS>",
      "WSSSSSSSSSSSSSSSSSSW",
      "WSSSSSSSSSSSSSSSSSSW",
      "WSSSSSSSSSSSSSSSSSSW",
      "WSSSSSSSSSSSSSSSSSSW",
      "WSSSSSSSSSSSSSSSSSSW",
      "WSSSSSSSSSSSSSSSSSSW",
      "WWWWWWWWWWWWWWWWWWWW"
    ],
    spawnP1: [2, 7],
    spawnP2: [2, 8],
    entities: [
      { type: 'altar', x: 5, y: 4, qLevel: 3, qIndex: 0 },
      { type: 'altar', x: 5, y: 11, qLevel: 3, qIndex: 1 },
      { type: 'plate', x: 8, y: 5 },
      { type: 'plate', x: 8, y: 10 },
      { type: 'door', x: 12, y: 6 },
      { type: 'door', x: 12, y: 7 },
      { type: 'door', x: 12, y: 8 },
      // Слизни появляются после прохода через двери
      { type: 'slime', x: 14, y: 6 },
      { type: 'slime', x: 14, y: 9 },
      { type: 'altar', x: 16, y: 7, qLevel: 3, qIndex: 2 },
      // Странник у выхода
      { type: 'wanderer', x: 17, y: 4 },
      // Осколок за дверьми
      { type: 'shard', x: 17, y: 11 }
    ]
  },

  // ===== 4: Древнее святилище =====
  // Все механики разом: лозы, плита (P2), толкание ящика (P1), руна (P2),
  // три алтаря с самым честным разговором.
  {
    name: 'Древнее святилище',
    hint: 'Самый честный разговор. Не торопитесь.',
    theme: 'moss',
    tiles: [
      "WWWWWWWWWWWWWWWWWWWW",
      "WMMMMMMMMMMMMMMMMMMW",
      "WMMMMMMMMMMMMMMMMMMW",
      "WMMMMMMMMMMMMMMMMMMW",
      "WMMMMMMMMMMMMMMMMMMW",
      "WMMMMMMMMMMMMMMMMMMW",
      "WMMMMMMMMMMMMMMMMMMW",
      "WMMMMMMMMMMMMMMMMMM>",
      "WMMMMMMMMMMMMMMMMMMW",
      "WMMMMMMMMMMMMMMMMMMW",
      "WMMMMMMMMMMMMMMMMMMW",
      "WMMMMMMMMMMMMMMMMMMW",
      "WMMMMMMMMMMMMMMMMMMW",
      "WMMMMMMMMMMMMMMMMMMW",
      "WWWWWWWWWWWWWWWWWWWW"
    ],
    spawnP1: [2, 7],
    spawnP2: [2, 8],
    entities: [
      { type: 'altar', x: 4, y: 5, qLevel: 4, qIndex: 0 },
      { type: 'vine', x: 6, y: 6 },
      { type: 'vine', x: 6, y: 7 },
      { type: 'vine', x: 6, y: 8 },
      // Плита для Луны
      { type: 'plate', x: 9, y: 4 },
      // Ящик и цель для Солиса (толкание): ящик в (7,11), цель в (10,11) — толкать вправо
      { type: 'crate', x: 7, y: 11 },
      { type: 'target', x: 10, y: 11 },
      // Руна для Луны (зажигается, когда она на ней — навсегда)
      { type: 'rune', x: 4, y: 10 },
      // Двери открываются, когда И плита прижата, И цель накрыта, И руна горит
      { type: 'door', x: 12, y: 6 },
      { type: 'door', x: 12, y: 7 },
      { type: 'door', x: 12, y: 8 },
      { type: 'altar', x: 15, y: 5, qLevel: 4, qIndex: 1 },
      { type: 'altar', x: 15, y: 10, qLevel: 4, qIndex: 2 },
      // Слизни в святилище — три штуки, главный экзамен Солиса
      { type: 'slime', x: 8, y: 4 },
      { type: 'slime', x: 14, y: 7 },
      { type: 'slime', x: 16, y: 12 },
      // Четвёртый осколок — за всеми механиками
      { type: 'shard', x: 17, y: 5 }
    ]
  },

  // ===== 5: Сердце Леса =====
  // Финал: один Тотем и два последних алтаря по бокам.
  {
    name: 'Сердце Леса',
    hint: 'Сначала пройдите по обоим алтарям. Затем — к Тотему вдвоём.',
    theme: 'heart',
    tiles: [
      "TTTTTTTTTTTTTTTTTTTT",
      "T..................T",
      "T...m..........m...T",
      "T..................T",
      "T..................T",
      "T..................T",
      "T..................T",
      "T..................T",
      "T..................T",
      "T..................T",
      "T..................T",
      "T...m..........m...T",
      "T..................T",
      "T..................T",
      "TTTTTTTTTTTTTTTTTTTT"
    ],
    spawnP1: [3, 12],
    spawnP2: [4, 12],
    entities: [
      { type: 'altar', x: 5, y: 7, qLevel: 5, qIndex: 0 },
      { type: 'altar', x: 14, y: 7, qLevel: 5, qIndex: 1 },
      { type: 'totem', x: 10, y: 5 }
    ]
  }
];

// ===== Хелперы по тайлам =====

function isWalkableTile(ch) {
  // тайл, по которому игрок может идти (без учёта сущностей)
  return ch === '.' || ch === ',' || ch === 'S' || ch === 'M' || ch === '>';
}

function isExitTile(ch) {
  return ch === '>';
}
