/* ─────────────────────────────────────────────
   Інтерактивний 3D-блокнот «PEEPING».
   Пружина зверху, рожева обкладинка з віконцями-літерами,
   чотири сторінки, які гортаються скролом.
   Остання сторінка — «500₴ / придбати».
   ───────────────────────────────────────────── */

import * as THREE from 'three';

/* ── пропорції та палітра ───────────────────── */
const AR     = 827 / 1165;       // формат сторінки зіну
const H      = 2.0;              // висота блокнота в юнітах сцени (A6 → 1 юніт ≈ 74 мм)
const W      = H * AR;
const SHEET  = 0.0037;           // аркуш ≈ 0.27 мм
const COVER_T = 0.012;           // обкладинка 270+270 г/м² з ламінацією ≈ 0.89 мм
const BASE_Z = 7.6;              // відстань камери в спокої
const RINGS  = 19;
const RING_R = 0.09;             // радіус кільця пружини
const HOLE_Y = 0.041;            // глибина перфорації від верхнього краю, частка висоти
const HOLE_X0 = 0.045;           // перший отвір, частка ширини
const HOLE_DX = 0.91;            // на скільки ширини розтягнута перфорація
const WRAP_R = 0.042;            // радіус, по якому аркуш огинає корінець

const C_CARD   = 0xd0788d;       // картон обкладинки
const C_INK    = 0x17161a;
const C_PAPER  = 0xf4efe8;
const C_WIRE   = 0xf6ece5;
const C_BOARD  = 0xc16e87;       // зворот обкладинки / задня палітурка
const C_BUY    = '#f2b8ce';      // фон останньої сторінки

/* шляхи рахуємо від модуля, а не від документа — інакше /en/ їх не знайде */
const ASSETS = new URL('../assets/', import.meta.url).href;

/* Друк односторонній: зображення лише на лицях аркушів,
   звороти лишаються чистим папером. */
const LEAF_FACES = [
  null,                           // 0 · обкладинка з висічкою
  null,                           // 1 · титул: розкидані літери під висічкою
  ASSETS + 'pages_tex/pg-05.jpg',
  ASSETS + 'pages_tex/pg-14.jpg',
  null,                           // 4 · «придбати»
];
/* Решта блоку — глухі аркуші: вони не гортаються й не мають текстур,
   потрібні лише щоб корінець виглядав на всі 40 сторінок. */
const FILLER = 15;
const LEAVES = LEAF_FACES.length + FILLER;
export const FLIPS = LEAF_FACES.length - 1;   // сторінка «придбати» лишається

/* Сім кругів фігурної висічки на обкладинці (частки від картону).
   Ті самі координати задають літери на першій сторінці — тому в закритому
   вигляді кожна літера рівно посередині свого вирізу. */
const HOLES = [
  ['P', 0.196, 0.139], ['E', 0.316, 0.310], ['E', 0.843, 0.352],
  ['P', 0.562, 0.497], ['I', 0.205, 0.561], ['N', 0.537, 0.687],
  ['G', 0.646, 0.855],
];
const HOLE_R  = 0.085;             // радіус висічки, частка ширини
const HOLE_FS = 0.1513;            // кегль літери під висічкою, частка ширини

/* рядок «придбати» на останній сторінці: BUY_LINE_Y — у координатах
   полотна (від верху), BUY_HIT — зона кліку в UV (там вісь знизу вгору) */
const BUY_LINE_Y = 0.575;
const BUY_HIT = { x0: 0.18, x1: 0.82, y0: 1 - (BUY_LINE_Y + 0.06), y1: 1 - (BUY_LINE_Y - 0.05) };
export const BUY_URL = 'https://www.instagram.com/idinahui.art/';

/* напис на останній сторінці — тією ж мовою, що й сторінка */
const EN = document.documentElement.lang.startsWith('en');
const T = EN
  ? { spec: 'A6, 40 pages', buy: 'buy' }
  : { spec: 'A6, 40 сторінок', buy: 'придбати' };

/* довжина аркуша, яку з'їдає обхід корінця: півколо радіусом WRAP_R */
const WRAP_LEN = Math.PI * WRAP_R;

/* Товщина паперового блоку і положення кільця.
   Центр кільця підняли так, щоб його нижня точка опустилася трохи нижче
   центрів отворів — тоді дротина видимо заходить у перфорацію, а не
   зупиняється над нею. */
/* z-положення аркуша в спокої: обкладинка має власну товщину,
   папір лягає під нею */
const restZ = (j) => (j === 0 ? 0 : -COVER_T / 2 - (j - 0.5) * SHEET);

const BLOCK_D = -restZ(LEAVES - 1);
const RING_Y  = H / 2 - HOLE_Y * H + RING_R * 0.94;
const RING_Z  = -BLOCK_D / 2;

/* горизонтальне положення i-го отвору, частка ширини сторінки */
const holeU = (i) => HOLE_X0 + (HOLE_DX * i) / (RINGS - 1);

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp  = (a, b, t) => a + (b - a) * t;
const ease  = (t) => t * t * t * (t * (t * 6 - 15) + 10);   // smootherstep
const smoothstep = (a, b, t) => {
  const x = clamp((t - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
};

/* ── canvas-текстура, яка перемальовується після завантаження шрифтів ── */
function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  document.fonts?.ready.then(() => { draw(g, w, h); t.needsUpdate = true; });
  return t;
}

/* лице обкладинки: суцільний картон, вирізи роблять alphaMap */
function drawCover(g, w, h) {
  g.fillStyle = '#' + C_CARD.toString(16).padStart(6, '0');
  g.fillRect(0, 0, w, h);

  /* фактура картону */
  const img = g.getImageData(0, 0, w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 16;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);

  /* перфорація під пружину — ті самі координати, що й у кілець */
  g.fillStyle = 'rgba(0,0,0,.34)';
  for (let i = 0; i < RINGS; i++) {
    g.beginPath();
    g.arc(w * holeU(i), h * HOLE_Y, w * 0.0125, 0, Math.PI * 2);
    g.fill();
  }
}

/** маска висічки: біле — картон, чорне — вирізано наскрізь.
 *  mirror — для звороту обкладинки, у якого UV віддзеркалені по X */
function drawHoles(mirror) {
  return (g, w, h) => {
    g.fillStyle = '#fff';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#000';
    for (const [, fx, fy] of HOLES) {
      const x = (mirror ? 1 - fx : fx) * w;
      g.beginPath(); g.arc(x, fy * h, w * HOLE_R, 0, Math.PI * 2); g.fill();
    }
  };
}

/* перша сторінка: літери рівно під вирізами обкладинки */
function drawTitlePage(g, w, h) {
  g.fillStyle = '#fbf7f2';
  g.fillRect(0, 0, w, h);

  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#' + C_INK.toString(16).padStart(6, '0');
  const fs = Math.round(w * HOLE_FS);
  g.font = `${fs}px "Times New Roman", Times, serif`;
  for (const [ch, fx, fy] of HOLES) {
    /* baseline «middle» центрує по em-боксу, для великих літер трохи опускаємо */
    g.fillText(ch, fx * w, fy * h + fs * 0.035);
  }
}

/* остання сторінка повторює блок ціни з першого екрана */
function drawBuyPage(g, w, h) {
  const ink = '#' + C_INK.toString(16).padStart(6, '0');
  g.fillStyle = C_BUY;
  g.fillRect(0, 0, w, h);

  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = ink;
  const fs = Math.round(w * 0.082);       /* найдовший рядок ≈ 78% ширини */
  g.font = `${fs}px "KTF Metro", "Helvetica Neue", sans-serif`;

  g.fillText('500₴', w / 2, h * 0.465);
  g.fillText(T.spec, w / 2, h * 0.520);

  /* підкреслення проходить нижче ніжок «Д» і не розривається */
  const y = h * BUY_LINE_Y;
  const label = T.buy;
  g.fillText(label, w / 2, y);
  const lw = g.measureText(label).width;
  g.fillRect(w / 2 - lw / 2, y + fs * 0.62, lw, Math.max(2, fs * 0.07));
}

/* ── Фактура паперу: дрібний шум → карта нормалей.
   Саме вона розбиває відблиск на м'який матовий, а не дзеркальний. ── */
function makePaperNormal(size = 512) {
  const h = new Float32Array(size * size);
  for (let i = 0; i < h.length; i++) h[i] = Math.random();
  /* легке розмиття, щоб зерно не було піксельним */
  const blur = new Float32Array(h.length);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let s = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          s += h[((y + dy + size) % size) * size + ((x + dx + size) % size)];
        }
      }
      blur[y * size + x] = s / 9;
    }
  }

  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  const at = (x, y) => blur[((y + size) % size) * size + ((x + size) % size)];
  const strength = 2.2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (at(x - 1, y) - at(x + 1, y)) * strength;
      const ny = (at(x, y - 1) - at(x, y + 1)) * strength;
      const len = Math.hypot(nx, ny, 1);
      const i = (y * size + x) * 4;
      img.data[i]     = ((nx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);

  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(5, 7);
  return t;
}

/* ── Оточення: два м'які софтбокси в рожевій кімнаті.
   Без нього матеріали не мають що відбивати й папір виглядає пласким. ── */
function makeEnvTexture() {
  const w = 512, h = 256;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');

  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#fdf6f8');
  sky.addColorStop(0.44, '#f4dbe5');
  sky.addColorStop(0.60, '#e3aabf');
  sky.addColorStop(1, '#b57e93');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);

  const box = (cx, cy, rx, ry, a) => {
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
    gr.addColorStop(0, `rgba(255,255,255,${a})`);
    gr.addColorStop(0.5, `rgba(255,255,255,${a * 0.35})`);
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.save();
    g.translate(cx, cy);
    g.scale(1, ry / rx);
    g.translate(-cx, -cy);
    g.fillStyle = gr;
    g.beginPath(); g.arc(cx, cy, rx, 0, Math.PI * 2); g.fill();
    g.restore();
  };
  box(w * 0.30, h * 0.22, w * 0.20, h * 0.30, 0.85);  // ключове світло
  box(w * 0.78, h * 0.34, w * 0.14, h * 0.22, 0.45);  // заповнювальне

  /* Дрібні яскраві джерела — саме вони дають бліки під час обертання.
     Тримаємо їх біля горизонту (v ≈ 0.45): пласка обкладинка відбиває
     напрямок, близький до горизонтального, тож вище вона їх просто не бачить.
     По азимуту рознесені, щоб при повороті бліки один за одним пробігали. */
  box(w * 0.10, h * 0.44, w * 0.026, h * 0.05, 1);
  box(w * 0.32, h * 0.47, w * 0.020, h * 0.04, 0.95);
  box(w * 0.55, h * 0.42, w * 0.024, h * 0.046, 1);
  box(w * 0.78, h * 0.46, w * 0.018, h * 0.036, 0.9);
  box(w * 0.93, h * 0.43, w * 0.022, h * 0.042, 0.95);

  const t = new THREE.CanvasTexture(c);
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* м'яка тінь під блокнотом */
function makeShadowTexture() {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, 'rgba(150,72,101,.20)');
  grad.addColorStop(0.35, 'rgba(150,72,101,.11)');
  grad.addColorStop(1, 'rgba(150,72,101,0)');
  g.fillStyle = grad; g.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ── Огинання аркуша у вертексному шейдері.
   uBend — на який кут аркуш загинається, uBendLen — на якій довжині.
   Довжина сегмента дає різницю між м'яким прогином у польоті
   (uBendLen ≈ вся сторінка) і щільним обкрученням навколо пружини
   в кінці перегортання (uBendLen = π·радіус кільця). ── */
const BEND_GLSL = `
  float bendAngleAt(float s, float k, float L) {
    return k * min(s, L) / L;
  }`;

function bendable(material) {
  material.userData.uBend = { value: 0 };
  material.userData.uBendLen = { value: H };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uBend = material.userData.uBend;
    shader.uniforms.uBendLen = material.userData.uBendLen;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uBend;
        uniform float uBendLen;
        ${BEND_GLSL}`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        if (abs(uBend) > 0.0005) {
          float a = bendAngleAt(-position.y, uBend, uBendLen);
          float ca = cos(a), sa = sin(a);
          objectNormal = vec3(objectNormal.x,
                              objectNormal.y * ca + objectNormal.z * sa,
                             -objectNormal.y * sa + objectNormal.z * ca);
        }`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        if (abs(uBend) > 0.0005) {
          float s = -transformed.y;
          float k = uBend;
          float L = uBendLen;
          float R = L / k;
          float a = bendAngleAt(s, k, L);
          float y = -R * sin(a);
          float z =  R * (1.0 - cos(a));
          if (s > L) {                       // далі аркуш іде прямо по дотичній
            float t = s - L;
            y -= t * cos(k);
            z += t * sin(k);
          }
          transformed.y = y;
          transformed.z += z;
        }`);
  };
  return material;
}

/* ═══════════════════════════════════════════ */
export class Notepad {
  constructor(canvas, { onPage, onReady } = {}) {
    this.canvas = canvas;
    this.onPage = onPage || (() => {});
    this.onReady = onReady || (() => {});

    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, alpha: true, powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    /* без тонмапінгу — друковані площинні кольори лишаються собою */
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    /* вузький near/far — інакше глибини не вистачає, щоб розрізнити аркуші */
    this.camera = new THREE.PerspectiveCamera(26, 1, 5, 16);
    this.camera.position.set(0, 0, 9);

    this.book = new THREE.Group();
    this.scene.add(this.book);

    this.flow = 0;          // 0..FLIPS — скільки аркушів перегорнуто (дробове)
    this.shown = -1;
    this.tilt = { x: -0.06, y: -0.34 };
    this.drag = { x: 0, y: 0 };
    this.dragT = { x: 0, y: 0 };
    this.hoverX = 0; this.hoverY = 0;
    this.flight = 0;
    this.yBias = 0;
    this.time = 0;

    this.ray = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();

    /* оточення для відблисків + спільна карта зерна паперу */
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const env = makeEnvTexture();
    this.scene.environment = pmrem.fromEquirectangular(env).texture;
    env.dispose();
    pmrem.dispose();
    this.grain = makePaperNormal();

    this._lights();
    this._shadow();
    this._leaves();
    this._spiral();
    this._board();
    this._input();

    this.resize();
    addEventListener('resize', () => this.resize(), { passive: true });
  }

  /* ── світло: основну роботу робить оточення, лампи лише додають форму ── */
  _lights() {
    this.scene.environmentIntensity = 0.85;
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.9));

    const key = new THREE.DirectionalLight(0xfffaf6, 0.95);
    key.position.set(-2.4, 3.4, 4.2);
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0xffe6ef, 0.35);
    fill.position.set(3.4, -1.6, 2.6);
    this.scene.add(fill);

    /* контровий — підсвічує звороти перегорнутих аркушів */
    const rim = new THREE.DirectionalLight(0xffffff, 0.45);
    rim.position.set(1.2, 1.4, -3.6);
    this.scene.add(rim);
  }

  _shadow() {
    const m = new THREE.MeshBasicMaterial({
      map: makeShadowTexture(), transparent: true, depthWrite: false,
    });
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(W * 2.1, H * 1.5), m);
    this.shadow.position.set(0.14, -0.22, -0.6);
    this.scene.add(this.shadow);
  }

  /* ── аркуші ─────────────────────────────── */
  _leaves() {
    const geo = new THREE.PlaneGeometry(W, H, 12, 20);
    geo.translate(0, -H / 2, 0);        // шарнір у точці (0,0)
    this.geo = geo;

    const W2 = 1024, H2 = Math.round(1024 / AR);
    const cover  = canvasTexture(W2, H2, drawCover);
    const title  = canvasTexture(W2, H2, drawTitlePage);
    const buy    = canvasTexture(W2, H2, drawBuyPage);
    /* дві маски висічки: для лиця й для звороту (у нього UV дзеркальні) */
    const holesF = canvasTexture(W2, H2, drawHoles(false));
    const holesB = canvasTexture(W2, H2, drawHoles(true));

    const loader = new THREE.TextureLoader();
    let pending = 0, done = 0;

    const load = (url, mat) => {
      pending++;
      loader.load(url, (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        mat.map = t; mat.color.setHex(0xffffff); mat.needsUpdate = true;
        if (++done >= pending) this.onReady();
      }, undefined, () => { if (++done >= pending) this.onReady(); });
    };

    /* Глухий блок: аркуші дають лінії торця, суцільна коробка під ними
       закриває просвіти між ними. Один спільний матеріал на всіх. */
    const filler = new THREE.MeshStandardMaterial({
      color: C_PAPER, roughness: 0.9, metalness: 0, side: THREE.DoubleSide,
      normalMap: this.grain, envMapIntensity: 0.5,
    });
    const first = LEAF_FACES.length, last = LEAVES - 1;
    for (let j = first; j <= last; j++) {
      const m = new THREE.Mesh(geo, filler);
      m.position.set(0, H / 2, restZ(j));
      this.book.add(m);
    }
    const solid = new THREE.Mesh(
      new THREE.BoxGeometry(W - 0.005, H - 0.004, restZ(first) - restZ(last)),
      new THREE.MeshStandardMaterial({
        color: 0xefe9e0, roughness: 0.92, normalMap: this.grain, envMapIntensity: 0.4,
      })
    );
    solid.position.set(0, 0, (restZ(first) + restZ(last)) / 2);
    this.book.add(solid);

    this.leaves = [];
    for (let j = 0; j < LEAF_FACES.length; j++) {
      const pivot = new THREE.Object3D();
      pivot.position.set(0, H / 2, restZ(j));
      this.book.add(pivot);

      const bendPos = [], bendNeg = [];

      if (j === 0) {
        /* Обкладинка — плита з реальною товщиною, а не площина:
           270+270 г/м² з ламінацією дають видимий торець. */
        const box = new THREE.BoxGeometry(W, H, COVER_T, 8, 20, 1);
        box.translate(0, -H / 2, 0);

        const laminated = (extra) => bendable(new THREE.MeshPhysicalMaterial({
          roughness: 0.62, metalness: 0, normalMap: this.grain,
          normalScale: new THREE.Vector2(0.3, 0.3),
          /* матова ламінація: широкий м'який відблиск плюс дрібні бліки */
          clearcoat: 0.42, clearcoatRoughness: 0.16,
          envMapIntensity: 0.95, ...extra,
        }));
        const face = laminated({ map: cover, alphaMap: holesF, alphaTest: 0.5 });
        const back = laminated({ color: new THREE.Color(C_BOARD), alphaMap: holesB, alphaTest: 0.5 });
        const edge = laminated({ color: new THREE.Color(0xf0e6e2), clearcoat: 0 });

        /* порядок граней BoxGeometry: +x, −x, +y, −y, +z, −z */
        const mats = [edge, edge, edge, edge, face, back];
        pivot.add(new THREE.Mesh(box, mats));
        bendPos.push(face, back, edge);
      } else {
        const paper = (extra) => bendable(new THREE.MeshStandardMaterial({
          color: C_PAPER, roughness: 0.9, metalness: 0, side: THREE.FrontSide,
          normalMap: this.grain, normalScale: new THREE.Vector2(0.45, 0.45),
          envMapIntensity: 0.45, ...extra,
        }));
        const fm = paper(), bm = paper();

        if (j === 1) { fm.map = title; fm.color.setHex(0xffffff); }
        else if (j === FLIPS) { fm.map = buy; fm.color.setHex(0xffffff); }
        else if (LEAF_FACES[j]) load(LEAF_FACES[j], fm);

        const front = new THREE.Mesh(geo, fm);
        front.position.z = 0.0006;
        const back = new THREE.Mesh(geo, bm);
        back.position.z = -0.0006;
        back.rotation.y = Math.PI;
        pivot.add(front, back);

        bendPos.push(fm);
        bendNeg.push(bm);       // зворот повернуто на 180° — згин дзеркальний
        if (j === FLIPS) this.buyMesh = front;
      }

      /* Перегорнутий аркуш звисає позаду блокнота (поворот на 180° плюс
         обкручування навколо пружини — разом це повний оберт на 360°).
         Перший перегорнутий лягає найглибше, кожен наступний — перед ним. */
      this.leaves.push({
        pivot, bendPos, bendNeg,
        restZ: restZ(j),
        flipZ: -COVER_T - 0.004 - (FLIPS - j) * SHEET * 2.5,
        angle: 0, z: restZ(j),
      });
    }
    if (pending === 0) this.onReady();
  }

  /* ── пружина ────────────────────────────── */
  _spiral() {
    const g = new THREE.TorusGeometry(RING_R, 0.0125, 8, 30, Math.PI * 1.82);
    /* дротина найгостріше ловить бліки — тому найнижча шорсткість у сцені */
    const m = new THREE.MeshStandardMaterial({
      color: C_WIRE, roughness: 0.22, metalness: 0.18, envMapIntensity: 1.25,
    });
    this.wire = new THREE.InstancedMesh(g, m, RINGS);

    const dummy = new THREE.Object3D();
    for (let i = 0; i < RINGS; i++) {
      dummy.position.set(-W / 2 + W * holeU(i), RING_Y, RING_Z);
      dummy.rotation.set(0, Math.PI / 2, 0.14);
      dummy.updateMatrix();
      this.wire.setMatrixAt(i, dummy.matrix);
    }
    this.wire.instanceMatrix.needsUpdate = true;
    this.book.add(this.wire);
  }

  _board() {
    this.backBoard = new THREE.Mesh(
      new THREE.BoxGeometry(W, H, COVER_T),
      new THREE.MeshPhysicalMaterial({
        color: C_BOARD, roughness: 0.62, metalness: 0,
        normalMap: this.grain, normalScale: new THREE.Vector2(0.3, 0.3),
        clearcoat: 0.42, clearcoatRoughness: 0.16, envMapIntensity: 0.95,
      })
    );
    this.backBoard.position.set(0, 0, restZ(LEAVES - 1) - COVER_T);
    this.book.add(this.backBoard);
  }

  /* ── керування: тягнути — крутити, тап по кнопці — придбати ── */
  _input() {
    const el = this.canvas;
    let down = false, sx = 0, sy = 0, px = 0, py = 0, moved = 0, t0 = 0;
    let touch = false, sideways = false;

    el.addEventListener('pointerdown', (e) => {
      down = true; moved = 0; t0 = performance.now();
      sx = px = e.clientX; sy = py = e.clientY;
      touch = e.pointerType !== 'mouse';
      sideways = false;
      el.setPointerCapture(e.pointerId);
      el.classList.add('is-grabbing');
    });

    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      if (!down) {
        this.hoverX = ((e.clientX - r.left) / r.width - 0.5) * 2;
        this.hoverY = ((e.clientY - r.top) / r.height - 0.5) * 2;
        el.classList.toggle('is-buy', this._hitBuy(e.clientX, e.clientY));
        return;
      }
      const dx = e.clientX - px, dy = e.clientY - py;
      px = e.clientX; py = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);

      if (touch) {
        /* Палець: крутимо лише на явно горизонтальному жесті й лише по Y.
           Інакше блокнот смикається під час звичайного скролу сторінки. */
        if (!sideways) {
          const tx = Math.abs(e.clientX - sx), ty = Math.abs(e.clientY - sy);
          if (tx < 12 || tx < ty * 1.5) return;
          sideways = true;
        }
        this.dragT.y = clamp(this.dragT.y + dx * 0.0062, -1.25, 1.25);
        return;
      }
      this.dragT.y = clamp(this.dragT.y + dx * 0.0062, -1.25, 1.25);
      this.dragT.x = clamp(this.dragT.x + dy * 0.0042, -0.55, 0.55);
    });

    const up = (e) => {
      if (!down) return;
      down = false;
      el.classList.remove('is-grabbing');
      el.releasePointerCapture?.(e.pointerId);
      if (moved < 8 && performance.now() - t0 < 400 && this._hitBuy(sx, sy)) {
        window.open(BUY_URL, '_blank', 'noopener');
      }
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }

  /** чи влучив курсор у кнопку «придбати» на останній сторінці */
  _hitBuy(cx, cy) {
    if (this.flow < FLIPS - 0.15) return false;
    const r = this.canvas.getBoundingClientRect();
    this.ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(this.ndc, this.camera);
    const hit = this.ray.intersectObject(this.buyMesh, false)[0];
    if (!hit || !hit.uv) return false;
    const { x, y } = hit.uv;
    return x > BUY_HIT.x0 && x < BUY_HIT.x1 && y > BUY_HIT.y0 && y < BUY_HIT.y1;
  }

  /** f ∈ [0, FLIPS] — скільки аркушів перегорнуто; веде скрол */
  setFlow(f) {
    this.flow = clamp(f, 0, FLIPS);
    const n = Math.round(this.flow);
    if (n !== this.shown) { this.shown = n; this.onPage(n); }
  }

  resize() {
    const w = this.canvas.clientWidth || innerWidth;
    const h = this.canvas.clientHeight || innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;

    /* Вписуємо блокнот. У портреті поля вужчі — фонових літер там немає,
       а більший блокнот і зсув униз скорочують порожнечу до тексту. */
    const portrait = this.camera.aspect < 0.8;
    const need = W * (portrait ? 1.2 : 1.45);
    this.yBias = portrait ? -0.22 : 0;
    const visH = 2 * BASE_Z * Math.tan((26 * Math.PI) / 360);
    const visW = visH * this.camera.aspect;
    this.baseZ = visW < need ? BASE_Z * (need / visW) : BASE_Z;
    this.camera.near = Math.max(1, this.baseZ - 4.5);
    this.camera.far = this.baseZ * 1.6 + 5;
    this.camera.updateProjectionMatrix();
  }

  update(dt) {
    this.time += dt;
    const k = 1 - Math.pow(0.001, dt * 3.0);
    let flight = 0;

    for (let j = 0; j < this.leaves.length; j++) {
      const L = this.leaves[j];
      const e = ease(clamp(this.flow - j, 0, 1));

      L.angle = lerp(L.angle, -Math.PI * e, k);
      L.z     = lerp(L.z, lerp(L.restZ, L.flipZ, e), k);
      L.pivot.rotation.x = L.angle;
      L.pivot.position.z = L.z;

      /* Обкручування наростає в другій половині перегортання: спершу
         аркуш м'яко прогинається всім тілом, а в кінці щільно
         обходить пружину й лягає вниз позаду блокнота. */
      const t = clamp(L.angle / -Math.PI, 0, 1);
      const w = smoothstep(0.42, 1, t);
      const bend = Math.PI * w + Math.sin(t * Math.PI) * 0.30 * (1 - w);
      const len = lerp(H, WRAP_LEN, w);
      for (const m of L.bendPos) { m.userData.uBend.value = bend; m.userData.uBendLen.value = len; }
      for (const m of L.bendNeg) { m.userData.uBend.value = -bend; m.userData.uBendLen.value = len; }

      /* наскільки аркуш зараз задертий угору — по цьому підбираємо кадр */
      flight = Math.max(flight, Math.sin(t * Math.PI));
    }
    this.flight = lerp(this.flight, flight, k);

    /* поза: базовий нахил + курсор + повільне дихання */
    this.drag.x = lerp(this.drag.x, this.dragT.x, 1 - Math.pow(0.001, dt * 2.2));
    this.drag.y = lerp(this.drag.y, this.dragT.y, 1 - Math.pow(0.001, dt * 2.2));
    this.dragT.x *= 1 - dt * 0.28;
    this.dragT.y *= 1 - dt * 0.28;

    const p = this.flow / FLIPS;
    const breathe = Math.sin(this.time * 0.55) * 0.03;
    const swing = Math.sin(this.time * 0.37) * 0.045;

    this.book.rotation.x = this.tilt.x + this.drag.x + this.hoverY * 0.06 + breathe + p * 0.14;
    /* трохи розвертаємо в міру гортання, але не в анфас —
       інакше зникає торець і блокнот перестає читатися товстим */
    this.book.rotation.y = this.tilt.y + this.drag.y + this.hoverX * 0.09 + swing + p * 0.15;
    this.book.rotation.z = Math.sin(this.time * 0.29) * 0.016;

    /* Аркуші лягають назад, тож у спокої габарит не росте.
       Задертий у польоті аркуш вилазить угору — на цей час
       опускаємо блокнот і трохи відходимо камерою. */
    this.book.position.y =
      this.yBias + Math.sin(this.time * 0.62) * 0.04 - p * 0.06 - this.flight * 0.62;
    this.camera.position.z = this.baseZ * (1 + this.flight * 0.22);

    this.shadow.position.y = -0.22 + this.book.position.y * 0.6;

    this.renderer.render(this.scene, this.camera);
  }
}
