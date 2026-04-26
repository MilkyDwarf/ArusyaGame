/* ===== Сердце Леса — игровой движок =====
   Архитектура:
     - Tile-based 2D игра, поле 20×15, тайл TS=32 пикселя
     - Два игрока двигаются попиксельно с проверкой коллизий по тайлу
     - Сущности (entities) — алтари, лозы, плиты, двери, тотем
     - Простое сохранение в localStorage
*/

const TS = 32;          // размер тайла в пикселях
const MAP_W = 20;
const MAP_H = 15;
const CANVAS_W = MAP_W * TS;  // 640
const CANVAS_H = MAP_H * TS;  // 480

const PLAYER_HALF = 10; // полу-размер хитбокса (20×20 в центре тайла)
const PLAYER_SPEED = 1.6; // пикселей за тик (60 fps)
const NEAR_DIST = 1.6 * TS; // дистанция «рядом» для алтарей

const SAVE_KEY = 'serdce-lesa-save-v1';

// ===== Глобальное состояние =====
const State = {
  scene: 'title',        // title | game | dialog | pause | ending
  level: null,           // текущий уровень runtime: { tiles, entities, ... }
  levelIndex: 0,
  p1: null,              // { x, y } координаты в пикселях (центр)
  p2: null,
  hintTimer: 0,
  hintText: '',
  // Диалог
  dialog: {
    active: false,
    question: null,
    answered: { 1: false, 2: false },
    onClose: null
  },
  // прогресс по алтарям, чтобы один алтарь не спамил повторно
  visitedAltars: new Set(),  // ключи "lvl:x:y"
  // ввод
  keys: {},              // удерживаемые клавиши
  edge: {},              // одноразовые «нажалось в этом кадре»
  // прочее
  totemPath: { p1: false, p2: false }, // оба алтаря посещены на 5 уровне
  endTriggered: false,
  collectedShards: 0   // прогресс сбора осколков сквозь все уровни
};

// ===== DOM-ссылки =====
const DOM = {};
function lookupDOM() {
  const ids = [
    'title-screen', 'howto-screen', 'game-screen', 'pause-screen',
    'dialog-screen', 'end-screen',
    'btn-start-new', 'btn-continue', 'btn-how-to', 'btn-howto-back',
    'btn-pause', 'btn-resume', 'btn-restart-level', 'btn-to-title',
    'btn-dialog-continue', 'btn-restart',
    'level-name', 'level-hint', 'progress-text',
    'p1-hearts', 'p2-hearts',
    'game-canvas', 'title-canvas', 'end-canvas',
    'hint-toast',
    'dialog-tag', 'dialog-question', 'dialog-hint', 'dialog-source'
  ];
  ids.forEach(id => { DOM[id] = document.getElementById(id); });
}

// Переключатель «экранов» — просто меняет class active.
function showScreen(name) {
  // name in: title | howto | game | pause | dialog | end
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  const map = {
    title: 'title-screen',
    howto: 'howto-screen',
    game: 'game-screen',
    pause: 'pause-screen',
    dialog: 'dialog-screen',
    end: 'end-screen'
  };
  if (map[name] && DOM[map[name]]) {
    DOM[map[name]].classList.add('active');
  }
  // game-screen всегда виден под оверлеями (pause/dialog),
  // потому что paused/dialog имеют класс overlay.
  if (name === 'pause' || name === 'dialog') {
    DOM['game-screen'].classList.add('active');
  }
}

function setHint(text, ms = 2200) {
  State.hintText = text;
  State.hintTimer = ms / 1000;
  if (DOM['hint-toast']) {
    DOM['hint-toast'].textContent = text;
    DOM['hint-toast'].classList.add('show');
  }
}
function clearHint() {
  if (DOM['hint-toast']) DOM['hint-toast'].classList.remove('show');
}

// ===== Ввод =====
const KEY_P1_UP = ['KeyW'];
const KEY_P1_DOWN = ['KeyS'];
const KEY_P1_LEFT = ['KeyA'];
const KEY_P1_RIGHT = ['KeyD'];
const KEY_P1_ACTION = ['Space'];

const KEY_P2_UP = ['ArrowUp'];
const KEY_P2_DOWN = ['ArrowDown'];
const KEY_P2_LEFT = ['ArrowLeft'];
const KEY_P2_RIGHT = ['ArrowRight'];
const KEY_P2_ACTION = ['Enter'];

function isKey(set) {
  return set.some(k => State.keys[k]);
}
function isEdge(set) {
  // одноразовое нажатие в этом кадре
  return set.some(k => State.edge[k]);
}

function attachInput() {
  window.addEventListener('keydown', e => {
    // не съедаем нажатия в полях ввода — у нас их нет, но Enter в кнопках мог бы.
    if (e.repeat) { return; }
    if (!State.keys[e.code]) {
      State.keys[e.code] = true;
      State.edge[e.code] = true;
    }
    // системные клавиши: Esc — пауза
    if (e.code === 'Escape' && (State.scene === 'game' || State.scene === 'pause')) {
      togglePause();
    }
    // блокируем прокрутку стрелок и пробела
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) {
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', e => {
    State.keys[e.code] = false;
  });
  // потеря фокуса — сбрасываем удержание
  window.addEventListener('blur', () => {
    State.keys = {};
  });
}

function consumeEdges() {
  // вызывать в конце каждого кадра
  State.edge = {};
}

// ===== Загрузка уровня =====
function loadLevel(idx) {
  const def = LEVELS[idx];
  if (!def) {
    // Финал
    triggerEnding();
    return;
  }
  // Глубокая копия тайлов (массив строк -> массив массивов символов для удобства)
  const tiles = def.tiles.map(row => row.split(''));

  // Спавны и список сущностей
  const sp1 = def.spawnP1;
  const sp2 = def.spawnP2;

  // Создаём runtime entities (копия с состоянием)
  const entities = def.entities.map(e => {
    const ent = Object.assign({}, e);
    if (ent.type === 'plate') ent.pressed = false;
    if (ent.type === 'door') ent.open = false;
    if (ent.type === 'vine') ent.cut = false;
    if (ent.type === 'altar') ent.done = false;
    if (ent.type === 'totem') ent.done = false;
    return ent;
  });

  State.level = {
    name: def.name,
    hint: def.hint,
    theme: def.theme,
    tiles,
    entities,
    questionIds: def.questionIds || []
  };
  State.levelIndex = idx;
  State.p1 = { x: sp1[0] * TS + TS/2, y: sp1[1] * TS + TS/2,
               hp: 3, dir: 'down', invulnUntil: 0, lastMoveDir: null };
  State.p2 = { x: sp2[0] * TS + TS/2, y: sp2[1] * TS + TS/2,
               hp: 3, dir: 'down', invulnUntil: 0, lastMoveDir: null };
  State.totemPath = { p1: false, p2: false };

  // Инициализация слизней — пиксельная позиция, hp, мерцание
  for (const ent of entities) {
    if (ent.type === 'slime') {
      ent.px = ent.x * TS + TS/2;
      ent.py = ent.y * TS + TS/2;
      ent.hp = 2;
      ent.flashUntil = 0;
      ent.knockUntil = 0;
    }
  }

  // обновим заголовок
  if (DOM['level-name']) DOM['level-name'].textContent = def.name;
  if (DOM['level-hint']) DOM['level-hint'].textContent = def.hint;
  if (DOM['progress-text']) DOM['progress-text'].textContent =
    `Локация ${idx + 1} из ${LEVELS.length}`;

  setHint(def.hint, 4500);
  saveProgress();
}

function getEntityAt(tx, ty) {
  if (!State.level) return null;
  return State.level.entities.find(e => e.x === tx && e.y === ty) || null;
}

// ===== Коллизия и движение =====
// Возвращает true, если позиция (px, py) — пиксельный хитбокс — свободна.
function isPositionFree(px, py) {
  if (!State.level) return false;
  const half = PLAYER_HALF;
  // 4 угла хитбокса
  const corners = [
    [px - half, py - half],
    [px + half - 1, py - half],
    [px - half, py + half - 1],
    [px + half - 1, py + half - 1]
  ];
  for (const [cx, cy] of corners) {
    if (cx < 0 || cy < 0 || cx >= CANVAS_W || cy >= CANVAS_H) return false;
    const tx = Math.floor(cx / TS);
    const ty = Math.floor(cy / TS);
    const ch = State.level.tiles[ty][tx];
    if (!isWalkableTile(ch)) return false;

    // Проверка сущностей
    const ent = getEntityAt(tx, ty);
    if (ent) {
      if (ent.type === 'altar') return false;
      if (ent.type === 'totem') return false;
      if (ent.type === 'vine' && !ent.cut) return false;
      if (ent.type === 'door' && !ent.open) return false;
      if (ent.type === 'crate') return false;
      // plate, rune, shard, target, cut vine, open door — проходимы
    }
  }
  return true;
}

function moveActor(actor, dx, dy, isP1) {
  // Делаем по одной координате — даёт «скольжение» вдоль стен.
  // Если перед актёром (только Игрок 1) ящик — пытаемся толкнуть.
  if (dx !== 0) {
    if (isP1) tryPushCrateAlong(actor, Math.sign(dx), 0);
    const nx = actor.x + dx;
    if (isPositionFree(nx, actor.y)) actor.x = nx;
  }
  if (dy !== 0) {
    if (isP1) tryPushCrateAlong(actor, 0, Math.sign(dy));
    const ny = actor.y + dy;
    if (isPositionFree(actor.x, ny)) actor.y = ny;
  }
}

function tryPushCrateAlong(actor, sx, sy) {
  // sx,sy ∈ {-1,0,1}. Только одна из них ненулевая.
  const half = PLAYER_HALF;
  const fx = actor.x + sx * (half + 2);
  const fy = actor.y + sy * (half + 2);
  if (fx < 0 || fy < 0 || fx >= CANVAS_W || fy >= CANVAS_H) return;
  const tx = Math.floor(fx / TS);
  const ty = Math.floor(fy / TS);
  const ent = getEntityAt(tx, ty);
  if (!ent || ent.type !== 'crate') return;

  // Если ящик уже стоит на цели — он защёлкнут.
  const onTarget = State.level.entities.some(
    t => t.type === 'target' && t.x === ent.x && t.y === ent.y
  );
  if (onTarget) return;

  // Куда толкать?
  const bx = tx + sx;
  const by = ty + sy;
  if (bx < 0 || by < 0 || bx >= MAP_W || by >= MAP_H) return;
  const beyondCh = State.level.tiles[by][bx];
  if (!isWalkableTile(beyondCh)) return;
  const beyondEnt = getEntityAt(bx, by);
  // позади можно только пустоту или цель (target)
  if (beyondEnt && beyondEnt.type !== 'target') return;

  // Cooldown — чтобы один пиксельный кадр не пушил по 5 раз
  const now = performance.now();
  if (ent.lastPushed && now - ent.lastPushed < 220) return;
  ent.lastPushed = now;

  ent.x = bx;
  ent.y = by;
}

function getActorTile(actor) {
  return {
    tx: Math.floor(actor.x / TS),
    ty: Math.floor(actor.y / TS)
  };
}

function updatePlayers() {
  if (State.dialog.active) return; // не двигаемся в диалоге

  // Игрок 1
  let dx = 0, dy = 0;
  if (isKey(KEY_P1_LEFT))  dx -= 1;
  if (isKey(KEY_P1_RIGHT)) dx += 1;
  if (isKey(KEY_P1_UP))    dy -= 1;
  if (isKey(KEY_P1_DOWN))  dy += 1;
  updateActorDir(State.p1, dx, dy);
  if (dx && dy) { dx *= 0.707; dy *= 0.707; }
  moveActor(State.p1, dx * PLAYER_SPEED, dy * PLAYER_SPEED, true);

  // Игрок 2
  dx = 0; dy = 0;
  if (isKey(KEY_P2_LEFT))  dx -= 1;
  if (isKey(KEY_P2_RIGHT)) dx += 1;
  if (isKey(KEY_P2_UP))    dy -= 1;
  if (isKey(KEY_P2_DOWN))  dy += 1;
  updateActorDir(State.p2, dx, dy);
  if (dx && dy) { dx *= 0.707; dy *= 0.707; }
  moveActor(State.p2, dx * PLAYER_SPEED, dy * PLAYER_SPEED, false);
}

function updateActorDir(actor, dx, dy) {
  // Сохраняем направление взгляда. Приоритет — горизонталь, если оба нажаты.
  if (dx > 0) actor.dir = 'right';
  else if (dx < 0) actor.dir = 'left';
  else if (dy > 0) actor.dir = 'down';
  else if (dy < 0) actor.dir = 'up';
}

// ===== Пазлы: плиты, цели, руны =====
function updatePuzzles() {
  if (!State.level) return;
  const t1 = getActorTile(State.p1);
  const t2 = getActorTile(State.p2);

  // Плиты
  let allPlatesPressed = true;
  let hasPlate = false;
  for (const ent of State.level.entities) {
    if (ent.type !== 'plate') continue;
    hasPlate = true;
    // плита считается прижатой, если на её тайле игрок ИЛИ ящик
    const playerOn =
      (t1.tx === ent.x && t1.ty === ent.y) ||
      (t2.tx === ent.x && t2.ty === ent.y);
    const crateOn = State.level.entities.some(
      c => c.type === 'crate' && c.x === ent.x && c.y === ent.y
    );
    ent.pressed = playerOn || crateOn;
    if (!ent.pressed) allPlatesPressed = false;
  }

  // Цели для ящиков
  let allTargetsCovered = true;
  let hasTarget = false;
  for (const ent of State.level.entities) {
    if (ent.type !== 'target') continue;
    hasTarget = true;
    const covered = State.level.entities.some(
      c => c.type === 'crate' && c.x === ent.x && c.y === ent.y
    );
    ent.covered = covered;
    if (!covered) allTargetsCovered = false;
  }

  // Руны (зажигаются, когда P2 на них; остаются гореть навсегда)
  let allRunesLit = true;
  let hasRune = false;
  for (const ent of State.level.entities) {
    if (ent.type !== 'rune') continue;
    hasRune = true;
    if (!ent.lit && t2.tx === ent.x && t2.ty === ent.y) {
      ent.lit = true;
    }
    if (!ent.lit) allRunesLit = false;
  }

  if (!hasPlate && !hasTarget && !hasRune) return;
  const allOk =
    (hasPlate ? allPlatesPressed : true) &&
    (hasTarget ? allTargetsCovered : true) &&
    (hasRune ? allRunesLit : true);
  for (const ent of State.level.entities) {
    if (ent.type === 'door') ent.open = allOk;
  }
}

// ===== Лозы =====
function tryCutVine() {
  // Только Игрок 1 (Пробел). Рубит ту лозу, что ближе всего и в пределах TS.
  const p1 = State.p1;
  let closest = null, bestDist = Infinity;
  for (const ent of State.level.entities) {
    if (ent.type !== 'vine' || ent.cut) continue;
    const ex = ent.x * TS + TS/2;
    const ey = ent.y * TS + TS/2;
    const dx = ex - p1.x, dy = ey - p1.y;
    const d = Math.sqrt(dx*dx + dy*dy);
    if (d < TS * 1.2 && d < bestDist) {
      bestDist = d;
      closest = ent;
    }
  }
  if (closest) {
    closest.cut = true;
    setHint('Лоза перерублена.');
    return true;
  }
  return false;
}

// ===== Атака Солиса =====
const ATTACK_RANGE = 30;
function tryAttack() {
  const p1 = State.p1;
  const dirOff = {
    up:    [0, -1], down:  [0,  1],
    left:  [-1, 0], right: [1,  0]
  }[p1.dir] || [0, 1];
  // центр атаки: смещение от P1 на ATTACK_RANGE/2
  const ax = p1.x + dirOff[0] * (ATTACK_RANGE / 2 + 6);
  const ay = p1.y + dirOff[1] * (ATTACK_RANGE / 2 + 6);
  let hit = false;
  for (const ent of State.level.entities) {
    if (ent.type !== 'slime' || ent.hp <= 0) continue;
    const dx = ent.px - ax, dy = ent.py - ay;
    if (Math.sqrt(dx*dx + dy*dy) < ATTACK_RANGE) {
      ent.hp -= 1;
      ent.flashUntil = performance.now() + 220;
      // отбрасывание
      ent.knockUntil = performance.now() + 180;
      ent.knockDx = dirOff[0] * 1.6;
      ent.knockDy = dirOff[1] * 1.6;
      hit = true;
    }
  }
  // Визуальный «свайп» меча
  State.swing = { x: ax, y: ay, until: performance.now() + 140, dir: p1.dir };
  return hit;
}

// ===== Слизни =====
const SLIME_SPEED = 0.45;
function updateSlimes() {
  if (!State.level) return;
  const now = performance.now();
  for (const ent of State.level.entities) {
    if (ent.type !== 'slime' || ent.hp <= 0) continue;

    // отбрасывание
    if (ent.knockUntil > now) {
      ent.px += ent.knockDx;
      ent.py += ent.knockDy;
      continue;
    }

    // движение к ближайшему игроку
    const target = nearestPlayer(ent.px, ent.py);
    const dx = target.x - ent.px;
    const dy = target.y - ent.py;
    const d = Math.sqrt(dx*dx + dy*dy);
    if (d > 1) {
      // Маленькая «гуляющая» вариация — слизни покачиваются
      const t = now / 400 + ent.x;
      const wobble = Math.sin(t) * 0.2;
      const nx = ent.px + (dx / d) * SLIME_SPEED;
      const ny = ent.py + (dy / d) * SLIME_SPEED + wobble;
      // Простая проверка — не идти на стену тайла
      const tx = Math.floor(nx / TS);
      const ty = Math.floor(ny / TS);
      if (ty >= 0 && ty < MAP_H && tx >= 0 && tx < MAP_W) {
        const ch = State.level.tiles[ty][tx];
        if (isWalkableTile(ch)) {
          ent.px = nx;
          ent.py = ny;
        }
      }
    }

    // контакт с игроком — урон
    for (const p of [State.p1, State.p2]) {
      if (p.invulnUntil > now || p.hp <= 0) continue;
      const ddx = ent.px - p.x, ddy = ent.py - p.y;
      if (Math.sqrt(ddx*ddx + ddy*ddy) < 18) {
        p.hp = Math.max(0, p.hp - 1);
        p.invulnUntil = now + 1100;
        // лёгкое отталкивание игрока
        const len = Math.sqrt(ddx*ddx + ddy*ddy) || 1;
        p.x -= (ddx / len) * 8;
        p.y -= (ddy / len) * 8;
        if (p.hp === 0) onPlayerFell(p);
      }
    }
  }
}

function nearestPlayer(px, py) {
  const d1 = Math.hypot(State.p1.x - px, State.p1.y - py);
  const d2 = Math.hypot(State.p2.x - px, State.p2.y - py);
  return d1 < d2 ? State.p1 : State.p2;
}

// ===== Сбор осколков Тотема =====
function updateShardPickup() {
  if (!State.level) return;
  for (const ent of State.level.entities) {
    if (ent.type !== 'shard' || ent.collected) continue;
    const ex = ent.x * TS + TS/2;
    const ey = ent.y * TS + TS/2;
    for (const p of [State.p1, State.p2]) {
      if (Math.hypot(ex - p.x, ey - p.y) < 18) {
        ent.collected = true;
        State.collectedShards++;
        setHint(`Осколок собран! (${State.collectedShards}/4)`, 2000);
        return;
      }
    }
  }
}

function onPlayerFell(p) {
  // Простой исход: перезагрузка локации с лёгкой паузой
  setHint('Один из вас пал. Локация перезапускается…', 2200);
  setTimeout(() => {
    if (State.scene === 'game') loadLevel(State.levelIndex);
  }, 1500);
}

// ===== Алтари и Тотем =====
function distActorToEntity(actor, ent) {
  const ex = ent.x * TS + TS/2;
  const ey = ent.y * TS + TS/2;
  const dx = ex - actor.x, dy = ey - actor.y;
  return Math.sqrt(dx*dx + dy*dy);
}

// Возвращает алтарь, рядом с которым ОБА игрока, и который ещё не пройден.
function findReadyAltar() {
  if (!State.level) return null;
  for (const ent of State.level.entities) {
    if ((ent.type !== 'altar' && ent.type !== 'wanderer') || ent.done) continue;
    const d1 = distActorToEntity(State.p1, ent);
    const d2 = distActorToEntity(State.p2, ent);
    if (d1 < NEAR_DIST && d2 < NEAR_DIST) return ent;
  }
  return null;
}

function findReadyTotem() {
  if (!State.level) return null;
  for (const ent of State.level.entities) {
    if (ent.type !== 'totem' || ent.done) continue;
    const d1 = distActorToEntity(State.p1, ent);
    const d2 = distActorToEntity(State.p2, ent);
    if (d1 < NEAR_DIST && d2 < NEAR_DIST) return ent;
  }
  return null;
}

function tryInteract() {
  // Игрок 2 нажал Enter (или любой подходящий момент)
  if (State.dialog.active) return;

  // Алтарь?
  const altar = findReadyAltar();
  if (altar) {
    openAltarDialog(altar);
    return;
  }

  // Тотем (на 5-м уровне)?
  const totem = findReadyTotem();
  if (totem) {
    // Нужны: оба алтаря этого уровня + все 4 осколка
    const altarsLeft = State.level.entities.some(e => e.type === 'altar' && !e.done); // странники опциональны
    if (altarsLeft) {
      setHint('Сначала пройдите оба алтаря этого места.');
      return;
    }
    if (State.collectedShards < 4) {
      setHint(`Не хватает осколков (${State.collectedShards}/4). Вернитесь к локациям.`);
      return;
    }
    totem.done = true;
    triggerEnding();
    return;
  }
}

function openAltarDialog(altar) {
  let q;
  if (altar.type === 'wanderer') {
    // Случайный «странник» — но не повторяемся в рамках сессии
    const used = State.usedWanderers || (State.usedWanderers = new Set());
    const fresh = WANDERING_QUESTIONS.filter((_, i) => !used.has(i));
    const pool = fresh.length ? fresh : WANDERING_QUESTIONS;
    const idx = Math.floor(Math.random() * pool.length);
    q = pool[idx];
    used.add(WANDERING_QUESTIONS.indexOf(q));
  } else {
    const lvlQs = QUESTIONS[altar.qLevel] || [];
    q = lvlQs[altar.qIndex] || lvlQs[0];
  }
  if (!q) return;

  State.dialog.active = true;
  State.dialog.question = q;
  State.dialog.answered = { 1: false, 2: false };
  State.dialog.onClose = () => {
    altar.done = true;
    // Алтарь восстанавливает силы — оба полностью лечатся.
    if (State.p1) State.p1.hp = 3;
    if (State.p2) State.p2.hp = 3;
    saveProgress();
  };

  // Заполнить DOM
  if (DOM['dialog-tag'])     DOM['dialog-tag'].textContent     = q.tag || 'Вопрос';
  if (DOM['dialog-question']) DOM['dialog-question'].textContent = q.text;
  if (DOM['dialog-hint'])    DOM['dialog-hint'].textContent    = q.hint || '';
  if (DOM['dialog-source'])  DOM['dialog-source'].textContent  = q.source || '';

  // Сбросить кнопки «я ответил»
  document.querySelectorAll('.prompt-done').forEach(btn => btn.classList.remove('done'));
  if (DOM['btn-dialog-continue']) DOM['btn-dialog-continue'].disabled = true;

  showScreen('dialog');
}

function checkAllAnswered() {
  if (State.dialog.answered[1] && State.dialog.answered[2]) {
    if (DOM['btn-dialog-continue']) DOM['btn-dialog-continue'].disabled = false;
  }
}

function closeDialog() {
  if (State.dialog.onClose) State.dialog.onClose();
  State.dialog.active = false;
  State.dialog.question = null;
  State.dialog.onClose = null;
  // Гасим Enter, чтобы он не сработал ещё раз в следующем кадре и не открыл следующий алтарь сразу.
  State.edge['Enter'] = false;
  State.keys['Enter'] = false;
  showScreen('game');
  if (DOM['game-canvas']) DOM['game-canvas'].focus();
}

// ===== Переход на следующий уровень =====
function checkExit() {
  if (State.dialog.active) return;
  // оба игрока на тайле выхода?
  const t1 = getActorTile(State.p1);
  const t2 = getActorTile(State.p2);
  const ch1 = State.level.tiles[t1.ty][t1.tx];
  const ch2 = State.level.tiles[t2.ty][t2.tx];
  if (isExitTile(ch1) && isExitTile(ch2)) {
    // обязательно сначала пройти все алтари этого уровня
    const altarsLeft = State.level.entities.some(e => e.type === 'altar' && !e.done); // странники опциональны
    if (altarsLeft) {
      setHint('Сначала пройдите все алтари этой локации.');
      return;
    }
    // и зажечь все руны (если есть)
    const runesLeft = State.level.entities.some(e => e.type === 'rune' && !e.lit);
    if (runesLeft) {
      setHint('Луна, зажгите все руны — пройдите по ним.');
      return;
    }
    loadLevel(State.levelIndex + 1);
  }
}

// ===== Рендер =====
let ctx; // контекст игрового канваса

function getTileSprite(ch, tx, ty) {
  // Возвращает offscreen canvas для тайла
  switch (ch) {
    case '.': {
      // вариация травы по координате
      const idx = (tx * 7 + ty * 13) % SPRITES.tileGrass.length;
      return SPRITES.tileGrass[idx];
    }
    case ',': return SPRITES.tilePath;
    case 'S': return SPRITES.tileStone;
    case 'M': return SPRITES.tileMoss;
    case 's': return SPRITES.tileStone;
    case 'k': return SPRITES.tileDark;
    case 'w': case '~': {
      const idx = ((tx + ty) % 2 === 0) ? 0 : 1;
      return SPRITES.tileWater[idx];
    }
    case '#': case 'W': return SPRITES.tileWall;
    case '>': {
      // выход — рисуем пол + золотое свечение поверх
      return SPRITES.tileGrass[0];
    }
    default:
      // Для всех остальных «стен» (T, b, r, m) фон — трава
      return SPRITES.tileGrass[(tx + ty) % SPRITES.tileGrass.length];
  }
}

function drawTilemap() {
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const ch = State.level.tiles[y][x];
      const sprite = getTileSprite(ch, x, y);
      ctx.drawImage(sprite, x * TS, y * TS);
    }
  }
  // Сверху — декоративные тайлы-стены (деревья, кусты, валуны)
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const ch = State.level.tiles[y][x];
      if (ch === 'T') ctx.drawImage(SPRITES.tree, x * TS, y * TS);
      else if (ch === 'b') ctx.drawImage(SPRITES.bush, x * TS, y * TS);
      else if (ch === 'r') ctx.drawImage(SPRITES.rock, x * TS, y * TS);
      else if (ch === 'm') ctx.drawImage(SPRITES.mushroom, x * TS, y * TS);
      else if (ch === '>') {
        // нарисовать золотое мерцание выхода
        const t = (Date.now() / 600);
        ctx.globalAlpha = 0.45 + Math.sin(t) * 0.18;
        ctx.fillStyle = '#ffe066';
        ctx.fillRect(x * TS + 4, y * TS + 4, TS - 8, TS - 8);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#fff3b0';
        ctx.strokeRect(x * TS + 2, y * TS + 2, TS - 4, TS - 4);
      }
    }
  }
}

function drawEntities() {
  // Сперва — «подложки»: цели для ящиков и руны (на полу)
  for (const ent of State.level.entities) {
    const px = ent.x * TS;
    const py = ent.y * TS;
    if (ent.type === 'target') {
      ctx.drawImage(SPRITES.target, px, py);
      if (ent.covered) {
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#7bc043';
        ctx.fillRect(px + 4, py + 4, TS - 8, TS - 8);
        ctx.globalAlpha = 1;
      }
    } else if (ent.type === 'rune') {
      ctx.drawImage(ent.lit ? SPRITES.runeOn : SPRITES.runeOff, px, py);
    }
  }
  // Затем — всё остальное
  for (const ent of State.level.entities) {
    const px = ent.x * TS;
    const py = ent.y * TS;
    switch (ent.type) {
      case 'altar':
        ctx.drawImage(SPRITES.altar, px, py);
        // мягкое свечение, если ещё не пройден
        if (!ent.done) {
          const t = (Date.now() / 700) + ent.x;
          ctx.globalAlpha = 0.35 + Math.sin(t) * 0.15;
          ctx.fillStyle = '#cdb4db';
          ctx.fillRect(px - 4, py - 4, TS + 8, TS + 8);
          ctx.globalAlpha = 1;
        } else {
          ctx.globalAlpha = 0.4;
          ctx.fillStyle = '#7bc043';
          ctx.fillRect(px + 6, py + 6, TS - 12, TS - 12);
          ctx.globalAlpha = 1;
        }
        // повторный рендер спрайта поверх свечения
        ctx.drawImage(SPRITES.altar, px, py);
        break;
      case 'vine':
        if (!ent.cut) ctx.drawImage(SPRITES.vine, px, py);
        break;
      case 'plate':
        ctx.drawImage(ent.pressed ? SPRITES.plateOn : SPRITES.plateOff, px, py);
        break;
      case 'door':
        ctx.drawImage(ent.open ? SPRITES.doorOpen : SPRITES.doorClosed, px, py);
        break;
      case 'totem':
        ctx.drawImage(SPRITES.totem, px, py);
        // постоянное мягкое свечение
        const tt = (Date.now() / 500);
        ctx.globalAlpha = 0.4 + Math.sin(tt) * 0.18;
        ctx.fillStyle = '#fff3b0';
        ctx.fillRect(px - 6, py - 6, TS + 12, TS + 12);
        ctx.globalAlpha = 1;
        ctx.drawImage(SPRITES.totem, px, py);
        break;
      case 'crate':
        ctx.drawImage(SPRITES.crate, px, py);
        break;
      case 'wanderer':
        // мягкое свечение, если ещё не пройден
        if (!ent.done) {
          const t = (Date.now() / 800) + ent.x;
          ctx.globalAlpha = 0.3 + Math.sin(t) * 0.15;
          ctx.fillStyle = '#ff9bb3';
          ctx.fillRect(px - 4, py - 4, TS + 8, TS + 8);
          ctx.globalAlpha = 1;
        }
        ctx.drawImage(SPRITES.mushroom, px, py);
        break;
      case 'shard':
        if (!ent.collected) {
          // парение
          const t = Date.now() / 350 + ent.x;
          const offy = Math.sin(t) * 2;
          ctx.globalAlpha = 0.4;
          ctx.fillStyle = '#fff3b0';
          ctx.fillRect(px - 4, py - 4, TS + 8, TS + 8);
          ctx.globalAlpha = 1;
          ctx.drawImage(SPRITES.shard, px, py + offy);
        }
        break;
    }
  }
}

function drawPlayers() {
  const s = TS;
  drawOnePlayer(State.p1, SPRITES.p1);
  drawOnePlayer(State.p2, SPRITES.p2);

  // Свинг меча Солиса
  if (State.swing && State.swing.until > performance.now()) {
    const sw = State.swing;
    const t = (sw.until - performance.now()) / 140;
    ctx.save();
    ctx.globalAlpha = 0.5 + t * 0.4;
    ctx.fillStyle = '#fff3b0';
    const r = 16 + (1 - t) * 6;
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawOnePlayer(p, sprite) {
  const s = TS;
  // Мерцание во время неуязвимости
  const inv = p.invulnUntil > performance.now();
  if (inv) {
    const blink = Math.floor(performance.now() / 80) % 2 === 0;
    if (blink) return; // пропускаем кадр
  }
  ctx.drawImage(sprite, p.x - s/2, p.y - s/2);
  // Маленькая «искра» в направлении взгляда — показывает, куда атакует/смотрит
  if (p.dir) {
    const off = { up: [0,-1], down: [0,1], left: [-1,0], right: [1,0] }[p.dir];
    const isP1 = (p === State.p1);
    ctx.fillStyle = isP1 ? '#ffe066' : '#a8e6f0';
    ctx.fillRect(p.x + off[0] * 12 - 1, p.y + off[1] * 12 - 1, 2, 2);
  }
}

function drawSlimes() {
  if (!State.level) return;
  const now = performance.now();
  for (const ent of State.level.entities) {
    if (ent.type !== 'slime' || ent.hp <= 0) continue;
    // покачивание
    const bob = Math.sin(now / 250 + ent.x) * 1;
    const px = ent.px - TS/2;
    const py = ent.py - TS/2 + bob;
    if (ent.flashUntil > now) {
      // белая вспышка
      ctx.save();
      ctx.filter = 'brightness(2.4) saturate(0.4)';
      ctx.drawImage(SPRITES.slime, px, py);
      ctx.restore();
    } else {
      ctx.drawImage(SPRITES.slime, px, py);
    }
    // полоска HP
    if (ent.hp < 2) {
      ctx.fillStyle = '#000';
      ctx.fillRect(px + 6, py - 3, 20, 4);
      ctx.fillStyle = '#e94560';
      ctx.fillRect(px + 7, py - 2, (ent.hp / 2) * 18, 2);
    }
  }
}

// Подсказка над интерактивным объектом, если оба рядом
function drawInteractPrompt() {
  const altar = findReadyAltar();
  const totem = findReadyTotem();
  const target = altar || totem;
  if (!target) return;
  const px = target.x * TS + TS/2;
  const py = target.y * TS - 4;
  ctx.save();
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  const text = totem ? 'Enter — завершить' : 'Enter — поговорить';
  // фон
  const w = ctx.measureText(text).width + 12;
  ctx.fillStyle = 'rgba(20,24,46,0.92)';
  ctx.fillRect(px - w/2, py - 14, w, 16);
  ctx.strokeStyle = '#cdb4db';
  ctx.lineWidth = 1;
  ctx.strokeRect(px - w/2 + 0.5, py - 14 + 0.5, w - 1, 16 - 1);
  ctx.fillStyle = '#fff3b0';
  ctx.fillText(text, px, py - 3);
  ctx.restore();
}

// Подсказка для лозы (только если P1 рядом)
function drawVineCutPrompt() {
  const p1 = State.p1;
  for (const ent of State.level.entities) {
    if (ent.type !== 'vine' || ent.cut) continue;
    const ex = ent.x * TS + TS/2;
    const ey = ent.y * TS + TS/2;
    const dx = ex - p1.x, dy = ey - p1.y;
    const d = Math.sqrt(dx*dx + dy*dy);
    if (d < TS * 1.2) {
      ctx.save();
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      const text = 'Пробел — рубить';
      const w = ctx.measureText(text).width + 12;
      ctx.fillStyle = 'rgba(20,24,46,0.92)';
      ctx.fillRect(ex - w/2, ey - TS, w, 16);
      ctx.strokeStyle = '#f4a261';
      ctx.strokeRect(ex - w/2 + 0.5, ey - TS + 0.5, w - 1, 16 - 1);
      ctx.fillStyle = '#fff3b0';
      ctx.fillText(text, ex, ey - TS + 11);
      ctx.restore();
      return;
    }
  }
}

// Лёгкая виньетка по краям + настоящая темнота для тёмных тем
let darkMaskCanvas = null;
function getDarkMask() {
  if (!darkMaskCanvas) {
    darkMaskCanvas = document.createElement('canvas');
    darkMaskCanvas.width = CANVAS_W;
    darkMaskCanvas.height = CANVAS_H;
  }
  return darkMaskCanvas;
}

function paintLightHole(c, x, y, r, alpha = 1) {
  const grad = c.createRadialGradient(x, y, 0, x, y, r);
  grad.addColorStop(0, `rgba(0,0,0,${alpha})`);
  grad.addColorStop(0.55, `rgba(0,0,0,${alpha * 0.7})`);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = grad;
  c.fillRect(x - r, y - r, r * 2, r * 2);
}

function drawVignette() {
  // Мягкая радиальная виньетка для всех уровней
  const grad = ctx.createRadialGradient(
    CANVAS_W/2, CANVAS_H/2, CANVAS_H * 0.25,
    CANVAS_W/2, CANVAS_H/2, CANVAS_H * 0.85
  );
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Настоящая темнота для тёмных уровней
  if (State.level && State.level.theme === 'darkforest') {
    const mask = getDarkMask();
    const mctx = mask.getContext('2d');
    // Перерисовываем маску каждый кадр
    mctx.globalCompositeOperation = 'source-over';
    mctx.fillStyle = 'rgba(4,2,12,0.92)';
    mctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    // Вырезаем «дыры» света
    mctx.globalCompositeOperation = 'destination-out';
    paintLightHole(mctx, State.p1.x, State.p1.y, 78);    // мерцание Солиса
    paintLightHole(mctx, State.p2.x, State.p2.y, 132);   // фонарь Луны (больше)
    // Зажжённые руны тоже светят
    if (State.level.entities) {
      for (const ent of State.level.entities) {
        if (ent.type === 'rune' && ent.lit) {
          paintLightHole(mctx, ent.x * TS + TS/2, ent.y * TS + TS/2, 56, 0.8);
        }
      }
    }
    mctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(mask, 0, 0);

    // тёплый свет от P1, холодный от P2 — лёгкое тонирование
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const aSize = SPRITES.auraP1.width;
    ctx.drawImage(SPRITES.auraP1, State.p1.x - aSize/2, State.p1.y - aSize/2);
    ctx.drawImage(SPRITES.auraP2, State.p2.x - aSize/2, State.p2.y - aSize/2);
    ctx.restore();
  }
}

// HUD — обновляем DOM-сердечки и т.п. Сердечки оставляем символическими (3 неубиваемых).
function updateHUD() {
  if (!DOM['p1-hearts']) return;
  // Создаём по 3 сердца один раз
  if (DOM['p1-hearts'].children.length === 0) {
    for (let i = 0; i < 3; i++) {
      const el = document.createElement('span');
      el.className = 'heart';
      DOM['p1-hearts'].appendChild(el);
    }
    for (let i = 0; i < 3; i++) {
      const el = document.createElement('span');
      el.className = 'heart';
      DOM['p2-hearts'].appendChild(el);
    }
  }
  // Обновляем «полные/пустые» по hp
  if (State.p1 && State.p2) {
    const update = (parent, hp) => {
      Array.from(parent.children).forEach((el, i) => {
        el.classList.toggle('empty', i >= hp);
      });
    };
    update(DOM['p1-hearts'], State.p1.hp);
    update(DOM['p2-hearts'], State.p2.hp);
  }
}

// ===== Концовка =====
function triggerEnding() {
  State.endTriggered = true;
  showScreen('end');
  drawEndingCanvas();
  // обнуляем сейв при дойдинах до финала
  try { localStorage.removeItem(SAVE_KEY); } catch(e) {}
}

// ===== Пауза =====
function togglePause() {
  if (State.scene === 'pause') {
    State.scene = 'game';
    showScreen('game');
  } else {
    State.scene = 'pause';
    showScreen('pause');
  }
}

// ===== Сохранение =====
function saveProgress() {
  try {
    const data = {
      levelIndex: State.levelIndex,
      ts: Date.now()
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    updateContinueButton();
  } catch(e) { /* ignore */ }
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch(e) { return null; }
}

function updateContinueButton() {
  const data = loadProgress();
  if (DOM['btn-continue']) {
    DOM['btn-continue'].disabled = !data;
    if (data) {
      DOM['btn-continue'].textContent =
        `Продолжить (локация ${data.levelIndex + 1}/${LEVELS.length})`;
    }
  }
}

// ===== Декоративные канвасы (титульный экран и финал) =====
function drawTitleCanvas() {
  const c = DOM['title-canvas'];
  if (!c) return;
  const tctx = c.getContext('2d');
  tctx.imageSmoothingEnabled = false;
  // фон
  const grad = tctx.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0, '#1a1f3a');
  grad.addColorStop(1, '#0a0c18');
  tctx.fillStyle = grad;
  tctx.fillRect(0, 0, c.width, c.height);

  // звёзды
  for (let i = 0; i < 60; i++) {
    const x = Math.floor((i * 31 + 7) % c.width);
    const y = Math.floor((i * 17 + 3) % (c.height * 0.6));
    tctx.fillStyle = i % 7 === 0 ? '#fff3b0' : '#cdb4db';
    tctx.fillRect(x, y, 1, 1);
  }

  // силуэты деревьев
  for (let i = 0; i < 8; i++) {
    const tx = i * 40 + 4;
    tctx.drawImage(SPRITES.tree, tx, c.height - 70, 40, 40);
  }

  // герои в центре, рядом
  tctx.drawImage(SPRITES.p1, c.width/2 - 24, c.height - 64, 32, 32);
  tctx.drawImage(SPRITES.p2, c.width/2 - 8,  c.height - 64, 32, 32);

  // Тотем над ними со свечением
  const tx = c.width/2 - 16;
  const ty = c.height/2 - 30;
  const t = Date.now() / 700;
  tctx.globalAlpha = 0.4 + Math.sin(t) * 0.18;
  tctx.fillStyle = '#fff3b0';
  tctx.fillRect(tx - 6, ty - 6, 32 + 12, 32 + 12);
  tctx.globalAlpha = 1;
  tctx.drawImage(SPRITES.totem, tx, ty);
}

function drawEndingCanvas() {
  const c = DOM['end-canvas'];
  if (!c) return;
  const tctx = c.getContext('2d');
  tctx.imageSmoothingEnabled = false;
  const grad = tctx.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0, '#1f1a3a');
  grad.addColorStop(1, '#3d2817');
  tctx.fillStyle = grad;
  tctx.fillRect(0, 0, c.width, c.height);
  // светящийся тотем по центру
  for (let i = 0; i < 40; i++) {
    const x = Math.floor((i * 41 + 11) % c.width);
    const y = Math.floor((i * 29 + 7) % c.height);
    tctx.fillStyle = i % 5 === 0 ? '#fff3b0' : '#ffe066';
    tctx.fillRect(x, y, 1, 1);
  }
  const cx = c.width/2 - 16;
  const cy = c.height/2 - 16;
  tctx.fillStyle = 'rgba(255,243,176,0.25)';
  tctx.fillRect(cx - 12, cy - 12, 32 + 24, 32 + 24);
  tctx.drawImage(SPRITES.totem, cx, cy);
  // фигуры героев по бокам
  tctx.drawImage(SPRITES.p1, cx - 50, cy + 4);
  tctx.drawImage(SPRITES.p2, cx + 50, cy + 4);
}

// иконки в How-To
function drawHowToIcons() {
  const p1 = document.getElementById('p1-icon-howto');
  const p2 = document.getElementById('p2-icon-howto');
  if (p1) {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const cc = c.getContext('2d');
    cc.imageSmoothingEnabled = false;
    cc.fillStyle = '#0a0c18'; cc.fillRect(0, 0, 64, 64);
    cc.drawImage(SPRITES.p1, 16, 16);
    p1.style.background = `url(${c.toDataURL()}) center/contain no-repeat`;
  }
  if (p2) {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const cc = c.getContext('2d');
    cc.imageSmoothingEnabled = false;
    cc.fillStyle = '#0a0c18'; cc.fillRect(0, 0, 64, 64);
    cc.drawImage(SPRITES.p2, 16, 16);
    p2.style.background = `url(${c.toDataURL()}) center/contain no-repeat`;
  }
}

// ===== Главный цикл =====
function frame() {
  // Обновление
  if (State.scene === 'game' && !State.dialog.active) {
    updatePlayers();
    updatePuzzles();
    updateSlimes();
    updateShardPickup();

    // Edge-actions
    if (isEdge(KEY_P1_ACTION)) {
      const cut = tryCutVine();
      if (!cut) tryAttack();
    }
    if (isEdge(KEY_P2_ACTION)) tryInteract();

    checkExit();
  }

  // Рендер игры (всегда, даже под оверлеем — чтобы было видно)
  if (State.level && ctx) {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    drawTilemap();
    drawEntities();
    drawSlimes();
    drawPlayers();
    drawInteractPrompt();
    drawVineCutPrompt();
    drawVignette();
  }

  // hint timer
  if (State.hintTimer > 0) {
    State.hintTimer -= 1/60;
    if (State.hintTimer <= 0) clearHint();
  }
  // обновление HUD сердец
  if (State.scene === 'game' || State.scene === 'pause') {
    updateHUD();
  }

  // Анимация на титульном экране
  if (State.scene === 'title') {
    drawTitleCanvas();
  }

  consumeEdges();
  requestAnimationFrame(frame);
}

// ===== Привязка кнопок =====
function attachButtons() {
  DOM['btn-start-new'].addEventListener('click', e => {
    e.target.blur();
    State.scene = 'game';
    State.visitedAltars = new Set();
    State.collectedShards = 0;
    loadLevel(0);
    showScreen('game');
    if (DOM['game-canvas']) DOM['game-canvas'].focus();
  });

  DOM['btn-continue'].addEventListener('click', e => {
    e.target.blur();
    const data = loadProgress();
    if (!data) return;
    State.scene = 'game';
    loadLevel(Math.min(data.levelIndex, LEVELS.length - 1));
    showScreen('game');
    if (DOM['game-canvas']) DOM['game-canvas'].focus();
  });

  DOM['btn-how-to'].addEventListener('click', () => {
    showScreen('howto');
  });
  DOM['btn-howto-back'].addEventListener('click', () => {
    showScreen('title');
  });

  DOM['btn-pause'].addEventListener('click', togglePause);
  DOM['btn-resume'].addEventListener('click', togglePause);
  DOM['btn-restart-level'].addEventListener('click', () => {
    State.scene = 'game';
    loadLevel(State.levelIndex);
    showScreen('game');
  });
  DOM['btn-to-title'].addEventListener('click', () => {
    State.scene = 'title';
    showScreen('title');
    updateContinueButton();
  });

  // Кнопки «я ответил» в диалоге
  document.querySelectorAll('.prompt-done').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = parseInt(btn.dataset.player, 10);
      State.dialog.answered[p] = true;
      btn.classList.add('done');
      btn.textContent = 'Готово ✓';
      checkAllAnswered();
    });
  });

  DOM['btn-dialog-continue'].addEventListener('click', () => {
    closeDialog();
  });

  DOM['btn-restart'].addEventListener('click', () => {
    try { localStorage.removeItem(SAVE_KEY); } catch(e) {}
    State.endTriggered = false;
    State.scene = 'title';
    showScreen('title');
    updateContinueButton();
  });
}

// ===== Старт =====
function init() {
  lookupDOM();
  ctx = DOM['game-canvas'].getContext('2d');
  ctx.imageSmoothingEnabled = false;

  attachInput();
  attachButtons();
  updateHUD();
  drawHowToIcons();
  updateContinueButton();

  showScreen('title');
  requestAnimationFrame(frame);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
