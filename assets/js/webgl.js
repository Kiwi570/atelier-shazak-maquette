/* Effets WebGL (OGL) : plaque de cuir moule et transition en lanieres de la visionneuse.
   Amelioration progressive : sans WebGL ou en mode calme, rien ne change. */
import { Renderer, Program, Mesh, Triangle, Texture } from './vendor/ogl.min.js';

const racine = document.documentElement;
const calme = racine.classList.contains('calme') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function webglDispo() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
}

const VERT = /* glsl */ `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }
`;

/* ------------------------------------------------------------------ */
/* Plaque de cuir moule                                                */
/* ------------------------------------------------------------------ */
const FRAG_MOULAGE = /* glsl */ `
precision highp float;
uniform sampler2D tGrain;
uniform vec2 uRes;
uniform vec2 uLumiere;
uniform float uProgres;
uniform float uTemps;
uniform float uTexRatio;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float bruit(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
/* ecailles de feuilles en rangs decales, comme le relief moule de l'atelier */
float feuille(vec2 c) {
  vec2 q = vec2(c.x * 1.75, c.y + c.x * c.x * 1.4);
  float e = 1.0 - smoothstep(0.0, 0.5, length(q));
  e = e * e * (3.0 - 2.0 * e);
  float nervure = exp(-abs(c.x) * 38.0) * smoothstep(0.42, 0.0, abs(c.y));
  float laterale = exp(-abs(fract((c.y - abs(c.x) * 0.8) * 6.0) - 0.5) * 9.0) * e * 0.18;
  return e - nervure * 0.22 * e - laterale;
}
float feuillage(vec2 p) {
  vec2 q = p * vec2(3.2, 2.6);
  float rang = floor(q.y);
  vec2 c = vec2(fract(q.x + mod(rang, 2.0) * 0.5) - 0.5, fract(q.y) - 0.42);
  vec2 q2 = q + vec2(0.5, 0.5);
  float rang2 = floor(q2.y);
  vec2 c2 = vec2(fract(q2.x + mod(rang2, 2.0) * 0.5) - 0.5, fract(q2.y) - 0.42);
  return max(feuille(c), feuille(c2) * 0.92);
}
float hauteur(vec2 uv) {
  float ar = uRes.x / uRes.y;
  vec2 p = (uv - 0.5) * vec2(ar, 1.0) * 2.0;
  float d = length(p * vec2(0.62, 0.95));
  float dome = 1.0 - smoothstep(0.0, 1.05, d);
  dome = dome * dome * (3.0 - 2.0 * dome);
  float relief = feuillage(p);
  float pores = bruit(uv * uRes / 2.5) * 0.00035 + bruit(uv * uRes / 9.0) * 0.0008;
  return uProgres * (dome * 0.30 + relief * 0.03 * smoothstep(0.05, 0.6, dome)) + pores;
}
void main() {
  float ar = uRes.x / uRes.y;
  vec2 e = vec2(2.0) / uRes;
  float hx = (hauteur(vUv + vec2(e.x, 0.0)) - hauteur(vUv - vec2(e.x, 0.0))) / (2.0 * e.x * ar);
  float hy = (hauteur(vUv + vec2(0.0, e.y)) - hauteur(vUv - vec2(0.0, e.y))) / (2.0 * e.y);
  float h = hauteur(vUv);
  vec3 n = normalize(vec3(-hx, -hy, 1.0));
  vec2 p = (vUv - 0.5) * vec2(ar, 1.0);
  vec3 L = normalize(vec3(uLumiere - p, 0.34));
  float dif = max(dot(n, L), 0.0);
  vec3 R = reflect(-L, n);
  float spec = pow(max(R.z, 0.0), 22.0) * 0.18;
  vec2 tuv = vec2(vUv.x, 0.5 + (vUv.y - 0.5) * (uTexRatio / ar));
  tuv += n.xy * 0.004;
  vec3 cuir = texture2D(tGrain, tuv).rgb;
  float ao = 0.78 + 0.22 * smoothstep(0.0, 0.25, h);
  vec3 col = cuir * (0.32 + 1.0 * dif) * ao + vec3(1.0, 0.88, 0.72) * spec;
  float vig = smoothstep(1.2, 0.2, length(p * vec2(0.85, 1.25)));
  col *= 0.62 + 0.38 * vig;
  gl_FragColor = vec4(col, 1.0);
}
`;

function moulage() {
  const plaque = document.querySelector('[data-moulage]');
  if (!plaque) return;
  const canvas = plaque.querySelector('canvas');
  const renderer = new Renderer({ canvas, dpr: Math.min(window.devicePixelRatio || 1, 1.75), alpha: false, antialias: false });
  const gl = renderer.gl;
  const tex = new Texture(gl, { wrapS: gl.CLAMP_TO_EDGE, wrapT: gl.CLAMP_TO_EDGE, generateMipmaps: false, minFilter: gl.LINEAR });
  const program = new Program(gl, {
    vertex: VERT, fragment: FRAG_MOULAGE,
    uniforms: { tGrain: { value: tex }, uRes: { value: [1, 1] }, uLumiere: { value: [-0.6, 0.4] }, uProgres: { value: 0 }, uTemps: { value: 0 }, uTexRatio: { value: 1168 / 784 } }
  });
  const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
  const img = new Image();
  img.decoding = 'async';
  img.onload = () => { tex.image = img; program.uniforms.uTexRatio.value = img.naturalWidth / img.naturalHeight; plaque.classList.add('avec-gl'); demarrer(); };
  img.onerror = () => { };
  img.src = 'assets/img/ambiance/grain-cuir-1168.webp';

  let visible = false, cible = 0, progres = 0, lum = [-0.6, 0.4], lumCible = [-0.6, 0.4], souris = false, t0 = performance.now();
  function taille() {
    const r = plaque.getBoundingClientRect();
    renderer.setSize(Math.max(2, r.width), Math.max(2, r.height));
    program.uniforms.uRes.value = [gl.canvas.width, gl.canvas.height];
  }
  taille();
  window.addEventListener('resize', taille);
  plaque.addEventListener('pointermove', (e) => {
    const r = plaque.getBoundingClientRect();
    souris = true;
    lumCible = [((e.clientX - r.left) / r.width - 0.5) * (r.width / r.height) * 1.6, -((e.clientY - r.top) / r.height - 0.5) * 1.6];
  });
  plaque.addEventListener('pointerleave', () => { souris = false; });
  if (window.ScrollTrigger) {
    window.ScrollTrigger.create({ trigger: plaque, start: 'top 85%', end: 'bottom 35%', onUpdate: (s) => { cible = s.progress; }, onEnter: () => { visible = true; }, onLeaveBack: () => { cible = 0; } });
  } else cible = 1;
  if ('IntersectionObserver' in window) new IntersectionObserver((en) => en.forEach((x) => { visible = x.isIntersecting; }), { rootMargin: '120px' }).observe(plaque);
  else visible = true;
  let tourne = false;
  function demarrer() {
    if (tourne) return; tourne = true;
    const boucle = (now) => {
      requestAnimationFrame(boucle);
      if (!visible) return;
      const t = (now - t0) / 1000;
      if (!souris) lumCible = [Math.cos(t * 0.4) * 0.9, 0.35 + Math.sin(t * 0.3) * 0.25];
      lum[0] += (lumCible[0] - lum[0]) * 0.08; lum[1] += (lumCible[1] - lum[1]) * 0.08;
      progres += (Math.min(1, cible * 1.25) - progres) * 0.07;
      program.uniforms.uLumiere.value = lum;
      program.uniforms.uProgres.value = progres;
      program.uniforms.uTemps.value = t;
      renderer.render({ scene: mesh });
    };
    requestAnimationFrame(boucle);
  }
}

/* ------------------------------------------------------------------ */
/* Transition en lanieres pour la visionneuse                          */
/* ------------------------------------------------------------------ */
const FRAG_LANIERES = /* glsl */ `
precision highp float;
uniform sampler2D tA;
uniform sampler2D tB;
uniform vec2 uRes;
uniform vec2 uTailleA;
uniform vec2 uTailleB;
uniform float uP;
uniform float uDir;
varying vec2 vUv;
const float N = 7.0;
vec4 contenu(sampler2D t, vec2 taille, vec2 uv) {
  float ca = uRes.x / uRes.y, ia = taille.x / taille.y;
  vec2 ech = ia > ca ? vec2(1.0, ca / ia) : vec2(ia / ca, 1.0);
  vec2 u = (uv - 0.5) / ech + 0.5;
  if (u.x < 0.0 || u.x > 1.0 || u.y < 0.0 || u.y > 1.0) return vec4(0.106, 0.09, 0.078, 1.0);
  return texture2D(t, u);
}
void main() {
  float i = floor(vUv.y * N);
  float sens = mod(i, 2.0) < 1.0 ? uDir : -uDir;
  float retard = (sens > 0.0 ? i : N - 1.0 - i) / N * 0.45;
  float p = clamp((uP - retard) / 0.55, 0.0, 1.0);
  p = p * p * (3.0 - 2.0 * p);
  float x = sens > 0.0 ? vUv.x : 1.0 - vUv.x;
  float bord = 1.0 - p;
  vec2 uvA = vUv + vec2(-sens * p * 0.08, 0.0);
  vec2 uvB = vUv + vec2(sens * (1.0 - p) * 0.12, 0.0);
  vec4 a = contenu(tA, uTailleA, uvA);
  vec4 b = contenu(tB, uTailleB, uvB);
  float m = step(bord, x);
  float ombre = smoothstep(0.0, 0.04, abs(x - bord));
  vec4 col = mix(a, b, m);
  col.rgb *= mix(0.55, 1.0, ombre);
  float jointure = smoothstep(0.0, 0.006, abs(fract(vUv.y * N) - 0.0)) * smoothstep(0.0, 0.006, abs(fract(vUv.y * N) - 1.0));
  col.rgb *= mix(0.82, 1.0, jointure * (1.0 - step(0.001, p) * step(p, 0.999)) + step(p, 0.0) + step(0.999, p));
  gl_FragColor = col;
}
`;

let rt = null;
function initTransition(canvas) {
  if (rt && rt.canvas === canvas) return rt;
  const renderer = new Renderer({ canvas, dpr: Math.min(window.devicePixelRatio || 1, 2), alpha: true });
  const gl = renderer.gl;
  const tA = new Texture(gl, { generateMipmaps: false, minFilter: gl.LINEAR });
  const tB = new Texture(gl, { generateMipmaps: false, minFilter: gl.LINEAR });
  const program = new Program(gl, { vertex: VERT, fragment: FRAG_LANIERES, uniforms: { tA: { value: tA }, tB: { value: tB }, uRes: { value: [1, 1] }, uTailleA: { value: [1, 1] }, uTailleB: { value: [1, 1] }, uP: { value: 0 }, uDir: { value: 1 } } });
  const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
  rt = { canvas, renderer, gl, tA, tB, program, mesh };
  return rt;
}
function charger(url) {
  return new Promise((ok, ko) => { const im = new Image(); im.decoding = 'async'; im.onload = () => ok(im); im.onerror = ko; im.src = url; });
}
async function transition(canvas, urlA, urlB, dir) {
  const r = initTransition(canvas);
  const [a, b] = await Promise.all([charger(urlA), charger(urlB)]);
  const box = canvas.parentElement.getBoundingClientRect();
  r.renderer.setSize(Math.max(2, box.width), Math.max(2, box.height));
  r.tA.image = a; r.tB.image = b;
  r.program.uniforms.uTailleA.value = [a.naturalWidth, a.naturalHeight];
  r.program.uniforms.uTailleB.value = [b.naturalWidth, b.naturalHeight];
  r.program.uniforms.uRes.value = [r.gl.canvas.width, r.gl.canvas.height];
  r.program.uniforms.uDir.value = dir >= 0 ? 1 : -1;
  canvas.style.opacity = '1';
  const duree = 1100, t0 = performance.now();
  return new Promise((ok) => {
    const pas = (now) => {
      const p = Math.min(1, (now - t0) / duree);
      r.program.uniforms.uP.value = p;
      r.renderer.render({ scene: r.mesh });
      if (p < 1) requestAnimationFrame(pas); else ok();
    };
    requestAnimationFrame(pas);
  });
}
function effacer(canvas) { canvas.style.opacity = '0'; }

if (!calme && webglDispo()) {
  try { moulage(); } catch (e) { console.warn('[shazak] moulage', e); }
  window.ShazakGL = { pret: true, transition, effacer };
}
