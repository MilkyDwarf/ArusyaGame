/* ===== Сердце Леса — спрайты =====
   Все спрайты — пиксель-арт, нарисованный из строк.
   Палитра ниже. Каждый сппрайт пред-рендерится в свой offscreen canvas
   и затем рисуется через drawImage с imageSmoothingEnabled=false.
*/

const PAL = {
  '.': null,        // прозрачный
  'X': '#0d0a17',   // контур (почти чёрный)
  '0': '#000000',   // глаза, чистый чёрный
  '1': '#1a1228',   // глубокая тень

  // зелень
  'g': '#2d5016',   // тёмно-зелёный
  'G': '#4a7c1a',   // трава
  'M': '#7bc043',   // мох / светлая зелень
  'T': '#5a8c2f',   // средний лист
  't': '#1f3a0f',   // самый тёмный лист
  'V': '#3a7d5a',   // лоза
  'v': '#1e4d2e',   // тёмная лоза

  // дерево / земля
  'b': '#3d2817',
  'B': '#6b3410',
  'n': '#8b5a2b',
  'e': '#2a1d10',
  'E': '#4d3520',

  // камень
  's': '#555',
  'S': '#888',
  'L': '#aaa',
  'd': '#333',

  // P1 — оранжевый
  'o': '#f4a261',
  'O': '#ffd194',
  'D': '#a25728',
  'r': '#5a2a0a',

  // P2 — голубой
  'c': '#69d2e7',
  'C': '#a8e6f0',
  'i': '#2f8ba1',
  'I': '#1e5063',

  // лицо
  'f': '#ffe6c0',
  'F': '#fff3d6',

  // свет / руны / магия
  'y': '#ffe066',
  'Y': '#fff3b0',
  'p': '#cdb4db',
  'P': '#6a4c93',
  'W': '#ffffff',

  // вода
  'w': '#264d6e',
  'q': '#3a6e8e',
  'Q': '#7fa8c4',

  // прочее
  'h': '#e94560',  // сердце
  'H': '#ff7a86',
  'k': '#222',     // тёмная заглушка
  'K': '#0a0c18',
};

function makeSprite(rows, scale = 2) {
  const w = rows[0].length;
  const h = rows.length;
  const c = document.createElement('canvas');
  c.width = w * scale;
  c.height = h * scale;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const color = PAL[rows[y][x]];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }
  return c;
}

function flipH(canvas) {
  const c = document.createElement('canvas');
  c.width = canvas.width;
  c.height = canvas.height;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(canvas, 0, 0);
  return c;
}

const SPRITES = {};

/* ========== ИГРОКИ ========== */

SPRITES.p1 = makeSprite([
  "................",
  "................",
  ".....XXXXXX.....",
  "....XOoooooX....",
  "....XoFFFFfX....",
  "....XF0FF0FX....",
  "....XFFFFFFX....",
  "....XDDDDDDX....",
  "...XXOoooooXX...",
  "...XoOOOOOOoX...",
  "...XoOOOOOOoX...",
  "...XobbbbbboX...",
  "...XoDDDDDDoX...",
  "....XX0..0XX....",
  "....XX0..0XX....",
  "....XX....XX...."
]);

SPRITES.p2 = makeSprite([
  "................",
  "................",
  ".....XXXXXX.....",
  "....XCccccCX....",
  "....XcFFFFfX....",
  "....XF0FF0FX....",
  "....XFFFFFFX....",
  "....XiiiiiiX....",
  "...XXCccccCXX...",
  "...XcCCCCCCcX...",
  "...XcCCCCCCcX...",
  "...XciiiiiicX...",
  "...XcCCCCCCcX...",
  "....XX0..0XX....",
  "....XX0..0XX....",
  "....XX....XX...."
]);

// "тусклый" вариант — игрок без сознания / получил урон. Тёмная палитра поверх.
SPRITES.p1_down = makeSprite([
  "................",
  "................",
  ".....XXXXXX.....",
  "....XbDDDDbX....",
  "....XDddddDX....",
  "....XdkddkdX....",
  "....XddddddX....",
  "....XbbbbbbX....",
  "...XXbDDDDbXX...",
  "...XbDDDDDDbX...",
  "...XbDDDDDDbX...",
  "...XbeeeeeebX...",
  "...XbbbbbbbbX...",
  "....XX....XX....",
  "....XX....XX....",
  "................"
]);
SPRITES.p2_down = makeSprite([
  "................",
  "................",
  ".....XXXXXX.....",
  "....XiIIIIiX....",
  "....XiddddiX....",
  "....XdkddkdX....",
  "....XddddddX....",
  "....XIIIIIIX....",
  "...XXiIIIIiXX...",
  "...XiIIIIIIiX...",
  "...XiIIIIIIiX...",
  "...XiKKKKKKiX...",
  "...XiIIIIIIiX...",
  "....XX....XX....",
  "....XX....XX....",
  "................"
]);

/* ========== ОКРУЖЕНИЕ ========== */

SPRITES.tree = makeSprite([
  "................",
  "......TTTT......",
  ".....TtTTtT.....",
  "....TtMMMMtT....",
  "...TMMtTTTMMT...",
  "...TtMTTTtMMT...",
  "...TMMtTTMtMT...",
  "...TtMMTtMMMT...",
  "....TMMtMMtT....",
  ".....TtMMtT.....",
  "......XbbX......",
  "......XbBX......",
  "......XbbX......",
  ".....XBbbBX.....",
  "....XBbbbbBX....",
  "...XX......XX..."
]);

SPRITES.bush = makeSprite([
  "................",
  "................",
  "................",
  "................",
  "....TTtt........",
  "...TMMTTtt......",
  "..TMMMMTTttt....",
  ".tMMTTMMTTtt....",
  ".TMMMMMMMMTTt...",
  ".TtMMTMMMTMMt...",
  "..TtMMMMMTMt....",
  "...TtTTtTTt.....",
  "................",
  "................",
  "................",
  "................"
]);

SPRITES.rock = makeSprite([
  "................",
  "................",
  "................",
  "................",
  ".....XXXXX......",
  "....XSSSLSX.....",
  "...XSLLSSSLX....",
  "...XSSLSLSSSX...",
  "..XSLSSSLSSdSX..",
  "..XSSdSSSLSdSSX.",
  "..XdSdsssSdsssX.",
  "..XdsssddsssdsX.",
  "...XddsssdsssdX.",
  "....XXXddXXddXX.",
  "................",
  "................"
]);

// Лоза — рубится Игроком 1
SPRITES.vine = makeSprite([
  "vTtVTvtVTvTtVTvT",
  "TtVMtTvMVtTMVtMt",
  "vTtVTtMTvTMtVTvT",
  "tMtVtTvTtMTtMTtV",
  "VtTMVtMTMtVTtVTM",
  "tMtVTtVTvTMTVtMt",
  "vTMtVTvtMTVtMtVT",
  "MtVtMTtVTvTMVtTV",
  "vTtVTtMTvTMtVTvT",
  "tMtVtTvTtMTtMTtV",
  "VtTMVtMTMtVTtVTM",
  "tMtVTtVTvTMTVtMt",
  "vTMtVTvtMTVtMtVT",
  "MtVtMTtVTvTMVtTV",
  "vTtVTtMTvTMtVTvT",
  "tMtVtTvTtMTtMTtV"
]);

SPRITES.mushroom = makeSprite([
  "................",
  "................",
  "................",
  "................",
  "................",
  "....XhhhhhhX....",
  "...XhHHWWHHhX...",
  "..XhHWWHHWWHhX..",
  "..XhHHWWHHHHhX..",
  "...XhhhhhhhX....",
  "....XFFFFFFX....",
  "....XFffFfFX....",
  "....XFfFffFX....",
  ".....XXXXX......",
  "................",
  "................"
]);

/* ========== ИНТЕРАКТИВНЫЕ ОБЪЕКТЫ ========== */

SPRITES.crate = makeSprite([
  "................",
  ".XXXXXXXXXXXXXX.",
  ".XBnnnBnnBnnnBX.",
  ".XnBnnnBnnBnnnX.",
  ".XnnXnnnBnnnXnX.",
  ".XnnXBnnnnnBXnX.",
  ".XnnXnXXXXnnXnX.",
  ".XBBXBnnnXnnXBX.",
  ".XnnXnnnBXnnXnX.",
  ".XnnXBnnnXBnXnX.",
  ".XnnXnnnBXnnXnX.",
  ".XBnXnBnnXnnXBX.",
  ".XnnXnnnnXnnXnX.",
  ".XBnnnBnnnnnnBX.",
  ".XXXXXXXXXXXXXX.",
  "................"
]);

SPRITES.target = makeSprite([
  "................",
  ".pp..........pp.",
  ".pPp........pPp.",
  "..pPp......pPp..",
  "...pPp....pPp...",
  "....pPp..pPp....",
  ".....pPppPp.....",
  "......ppPp......",
  "......pPpp......",
  ".....pPppPp.....",
  "....pPp..pPp....",
  "...pPp....pPp...",
  "..pPp......pPp..",
  ".pPp........pPp.",
  ".pp..........pp.",
  "................"
]);

SPRITES.plateOff = makeSprite([
  "................",
  "................",
  "................",
  "................",
  "................",
  "....XXXXXXXX....",
  "...XSSSSLSSSX...",
  "..XSLSLSLSLSSX..",
  "..XSSSSSSSSLSX..",
  "..XdSSSdSSSSdX..",
  "...XdddddddddX..",
  "....XXXXXXXX....",
  "................",
  "................",
  "................",
  "................"
]);

SPRITES.plateOn = makeSprite([
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "....XXXXXXXX....",
  "...XyYyYyYyYX...",
  "..XYYyYYYyYYYX..",
  "..XyYyYYYyYYyX..",
  "...XYyYYYyYYYX..",
  "....XXXXXXXX....",
  "................",
  "................",
  "................",
  "................"
]);

SPRITES.altar = makeSprite([
  "................",
  ".......YY.......",
  "......YpPY......",
  "......PpPP......",
  "......PpPP......",
  ".....XPpPPX.....",
  ".....XPiPPX.....",
  "....XPPPPPPX....",
  "....XPiiiiPX....",
  "....XPpPpPPX....",
  "....XPiiiiPX....",
  "...XPPPPPPPPX...",
  "..XSSSSSSSSSSX..",
  "..XLSLSSLSSSLX..",
  "..XSSSdSSSdSSX..",
  "..XXXXXXXXXXXX.."
]);

SPRITES.runeOff = makeSprite([
  "................",
  "................",
  "................",
  "................",
  ".....XXXXXX.....",
  "....XPPPPPPX....",
  "...XPPiPPiPPX...",
  "...XPiiPPiiPX...",
  "...XPiPiiPiPX...",
  "...XPiiPPiiPX...",
  "...XPPiPPiPPX...",
  "....XPPPPPPX....",
  ".....XXXXXX.....",
  "................",
  "................",
  "................"
]);

SPRITES.runeOn = makeSprite([
  "................",
  ".......YY.......",
  "......yYYy......",
  ".....yYpPYy.....",
  "....XYpYYpYX....",
  "...XYpyPPypYX...",
  "..XYpyYpPYypYX..",
  "..XYpYypPpYpYX..",
  "..XYpYypPpYpYX..",
  "..XYpyYpPYypYX..",
  "...XYpyPPypYX...",
  "....XYpYYpYX....",
  ".....yYpPYy.....",
  "......yYYy......",
  ".......YY.......",
  "................"
]);

SPRITES.doorClosed = makeSprite([
  "XXXXXXXXXXXXXXXX",
  "XBnBnnBnBnnBnBnX",
  "XnBnnBnnBnBnBnnX",
  "XBnnXXXXXXXXnBnX",
  "XnBnXBnBBnBnXnBX",
  "XBnnXnBnnBBnXBnX",
  "XnBnXBBnBnnBXnBX",
  "XBnnXBnXXBnnXBnX",
  "XBnnXnnXyXBnXnBX",
  "XnBnXBnXXBnnXnBX",
  "XBnnXnBnnBBnXBnX",
  "XnBnXBBnBnnBXnBX",
  "XBnnXXXXXXXXnBnX",
  "XnBnnBnnBnBnBnnX",
  "XBnBnnBnBnnBnBnX",
  "XXXXXXXXXXXXXXXX"
]);

SPRITES.doorOpen = makeSprite([
  "XXXXXXXXXXXXXXXX",
  "XBnBnnBnBnnBnBnX",
  "XnBnXXXXXXXXBnnX",
  "XBnnXYYYYYYXXBnX",
  "XnBnXyYYYYyXXnBX",
  "XBnnXYYyyYYXXBnX",
  "XnBnXyYYYYyXXnBX",
  "XBnnXYYYYYYXXBnX",
  "XBnnXYYYYYYXXnBX",
  "XnBnXyYYYYyXXnBX",
  "XBnnXYYyyYYXXBnX",
  "XnBnXyYYYYyXXBnX",
  "XBnnXYYYYYYXXBnX",
  "XnBnXXXXXXXXBnnX",
  "XBnBnnBnBnnBnBnX",
  "XXXXXXXXXXXXXXXX"
]);

SPRITES.totem = makeSprite([
  "................",
  ".......YY.......",
  "......YYYY......",
  ".....YYWWYY.....",
  "....XpPppPpX....",
  "...XPpYYYYpPX...",
  "...XpPYHHYPpX...",
  "...XPpYHHYpPX...",
  "...XpPYYYYPpX...",
  "...XPpcCCCpPX...",
  "...XpPCccCPpX...",
  "...XPpcCCCpPX...",
  "....XoOOOOoX....",
  "....XOoOOoOX....",
  "...XSSSSSSSSX...",
  "..XSSSSSSSSSSX.."
]);

SPRITES.shard = makeSprite([
  "................",
  "................",
  ".......YY.......",
  "......YpPY......",
  ".....YpPpPY.....",
  "....YpPYpPpY....",
  "....pPpYYpPp....",
  "....pPYYYYPp....",
  "....pPYYYYPp....",
  "....pPYYYYPp....",
  "....pPYYYYPp....",
  ".....pPpPpPp....",
  "......pPpP......",
  "................",
  "................",
  "................"
]);

SPRITES.slime = makeSprite([
  "................",
  "................",
  "................",
  "................",
  "....TttTtt......",
  "...TgttgGgT.....",
  "..TGGggMTTGT....",
  ".TGTGgMMMgGTT...",
  ".TGGMM00MM0gGT..",
  ".TGGMMMMMMMMGT..",
  "..TGGMMMMMMGT...",
  "...TGGggGGggT...",
  "....TtTtTtt.....",
  "................",
  "................",
  "................"
]);

SPRITES.heart = makeSprite([
  "................",
  "................",
  "................",
  "..XXX....XXX....",
  ".XHHhX..XHHhX...",
  "XHHHhhXXHHHhhX..",
  "XHHHHhHHHhhhhX..",
  "XHHHhHhhhhhhhX..",
  ".XHHhhhhhhhhX...",
  ".XHHHhhhhhhX....",
  "..XHhhhhhhX.....",
  "...XHhhhhX......",
  "....XhhhX.......",
  ".....XhX........",
  "......X.........",
  "................"
]);

/* ========== ПРОЦЕДУРНЫЕ ТАЙЛЫ ========== */
// Тайлы пола рисуем процедурно — для разнообразия и атмосферы.
// Каждый тайл = 32x32, рисуется на больший атлас и кэшируется.

function makeTile(drawFn, w = 32, h = 32) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  drawFn(ctx, w, h);
  return c;
}

// псевдо-случайный шум по координате
function pnoise(x, y, seed = 0) {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.7) * 43758.5453;
  return n - Math.floor(n);
}

// Трава (несколько вариантов)
SPRITES.tileGrass = [
  makeTile((ctx, w, h) => {
    ctx.fillStyle = '#3d6b1a'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 30; i++) {
      const x = Math.floor(pnoise(i, 1, 1) * w);
      const y = Math.floor(pnoise(i, 2, 1) * h);
      ctx.fillStyle = pnoise(i, 3, 1) > 0.5 ? '#4a7c1a' : '#2d5016';
      ctx.fillRect(x, y, 2, 2);
    }
    for (let i = 0; i < 6; i++) {
      const x = Math.floor(pnoise(i, 4, 2) * w);
      const y = Math.floor(pnoise(i, 5, 2) * h);
      ctx.fillStyle = '#7bc043';
      ctx.fillRect(x, y, 1, 1);
    }
  }),
  makeTile((ctx, w, h) => {
    ctx.fillStyle = '#3d6b1a'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 28; i++) {
      const x = Math.floor(pnoise(i, 7, 3) * w);
      const y = Math.floor(pnoise(i, 8, 3) * h);
      ctx.fillStyle = pnoise(i, 9, 3) > 0.4 ? '#4a7c1a' : '#5a8c2f';
      ctx.fillRect(x, y, 2, 1);
    }
  })
];

// Тропинка
SPRITES.tilePath = makeTile((ctx, w, h) => {
  ctx.fillStyle = '#6b5232'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 30; i++) {
    const x = Math.floor(pnoise(i, 1, 11) * w);
    const y = Math.floor(pnoise(i, 2, 11) * h);
    ctx.fillStyle = pnoise(i, 3, 11) > 0.5 ? '#8b6f47' : '#4d3520';
    ctx.fillRect(x, y, 2, 1);
  }
});

// Каменный пол (для "Древнего святилища")
SPRITES.tileStone = makeTile((ctx, w, h) => {
  ctx.fillStyle = '#555'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  for (let i = 0; i < 12; i++) {
    const x = Math.floor(pnoise(i, 1, 21) * w);
    const y = Math.floor(pnoise(i, 2, 21) * h);
    ctx.fillStyle = pnoise(i, 3, 21) > 0.5 ? '#888' : '#333';
    ctx.fillRect(x, y, 2, 1);
  }
});

// Тёмный камень (мрачные локации)
SPRITES.tileDark = makeTile((ctx, w, h) => {
  ctx.fillStyle = '#1a1228'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 14; i++) {
    const x = Math.floor(pnoise(i, 1, 31) * w);
    const y = Math.floor(pnoise(i, 2, 31) * h);
    ctx.fillStyle = '#2a1f3a';
    ctx.fillRect(x, y, 2, 1);
  }
  ctx.strokeStyle = '#0a0814';
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
});

// Мшистый камень (древние руины)
SPRITES.tileMoss = makeTile((ctx, w, h) => {
  ctx.fillStyle = '#3a4a2e'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 18; i++) {
    const x = Math.floor(pnoise(i, 1, 41) * w);
    const y = Math.floor(pnoise(i, 2, 41) * h);
    ctx.fillStyle = pnoise(i, 3, 41) > 0.5 ? '#5a8c2f' : '#2d5016';
    ctx.fillRect(x, y, 2, 1);
  }
  ctx.strokeStyle = '#1f2a14';
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
});

// Стена (для уровней с комнатами)
SPRITES.tileWall = makeTile((ctx, w, h) => {
  ctx.fillStyle = '#3d2817'; ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 8) {
    ctx.fillStyle = '#2a1d10';
    ctx.fillRect(0, y, w, 1);
  }
  for (let x = 0; x < w; x += 16) {
    ctx.fillStyle = '#2a1d10';
    ctx.fillRect(x, 0, 1, h);
  }
  for (let i = 0; i < 8; i++) {
    const x = Math.floor(pnoise(i, 1, 51) * w);
    const y = Math.floor(pnoise(i, 2, 51) * h);
    ctx.fillStyle = '#6b3410';
    ctx.fillRect(x, y, 1, 1);
  }
});

// Вода (с лёгкой анимацией позже)
SPRITES.tileWater = [
  makeTile((ctx, w, h) => {
    ctx.fillStyle = '#264d6e'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 14; i++) {
      const x = Math.floor(pnoise(i, 1, 61) * w);
      const y = Math.floor(pnoise(i, 2, 61) * h);
      ctx.fillStyle = pnoise(i, 3, 61) > 0.5 ? '#3a6e8e' : '#7fa8c4';
      ctx.fillRect(x, y, 3, 1);
    }
  }),
  makeTile((ctx, w, h) => {
    ctx.fillStyle = '#264d6e'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 14; i++) {
      const x = Math.floor(pnoise(i, 1, 71) * w);
      const y = Math.floor(pnoise(i, 2, 71) * h);
      ctx.fillStyle = pnoise(i, 3, 71) > 0.5 ? '#3a6e8e' : '#7fa8c4';
      ctx.fillRect(x, y, 3, 1);
    }
  })
];

/* ========== СПЕЦИАЛЬНЫЕ ЭФФЕКТЫ ========== */

// Радиальный градиент света (для фонаря Луны и для тёмных локаций)
SPRITES.lightGradient = (() => {
  const size = 320;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0.0, 'rgba(255,243,176,1)');
  grad.addColorStop(0.4, 'rgba(255,224,102,0.6)');
  grad.addColorStop(0.75, 'rgba(244,162,97,0.15)');
  grad.addColorStop(1.0, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return c;
})();

// Ауры игроков (для подсветки в темноте)
SPRITES.auraP1 = (() => {
  const size = 160;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(244,162,97,0.55)');
  grad.addColorStop(1, 'rgba(244,162,97,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return c;
})();
SPRITES.auraP2 = (() => {
  const size = 160;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(105,210,231,0.55)');
  grad.addColorStop(1, 'rgba(105,210,231,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return c;
})();


