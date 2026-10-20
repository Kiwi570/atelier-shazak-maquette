/* Atelier Shazak, maquette « Le Tressage ». Script principal, sans etape de construction. */
(function () {
  'use strict';

  var d = document;
  var racine = d.documentElement;
  var page = (d.querySelector('main') || {}).dataset ? d.querySelector('main').dataset.page : '';
  var stock = {
    lire: function (k, s) { try { return (s ? sessionStorage : localStorage).getItem(k); } catch (e) { return null; } },
    ecrire: function (k, v, s) { try { (s ? sessionStorage : localStorage).setItem(k, v); } catch (e) { } },
    effacer: function (k, s) { try { (s ? sessionStorage : localStorage).removeItem(k); } catch (e) { } }
  };
  var reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var calme = reduit || racine.classList.contains('calme');
  var fin = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var G = window.gsap;
  var ST = window.ScrollTrigger;
  var avecGsap = !!(G && ST);
  var large = function () { return window.innerWidth > 960; };
  var lenis = null;
  var COUL = { cognac: '#8A4B22', encre: '#1B1714', lin: '#CFC2A8', ivoire: '#F3EDE3', cognacBord: '#5E3115', encreBord: '#000000', linBord: '#A99C82' };

  function lancer(nom, fn) { try { fn(); } catch (e) { if (window.console) console.warn('[shazak] ' + nom, e); } }
  function $(s, c) { return (c || d).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); }
  function svgEl(nom, attrs) { var el = d.createElementNS('http://www.w3.org/2000/svg', nom); for (var k in attrs) el.setAttribute(k, attrs[k]); return el; }
  function antiRebond(fn, t) { var id; return function () { clearTimeout(id); id = setTimeout(fn, t || 150); }; }

  if (avecGsap) { G.registerPlugin(ST); if (window.SplitText) G.registerPlugin(window.SplitText); }
  if (calme || !avecGsap) racine.classList.add('sans-ouverture');

  /* ---------------------------------------------------------------- */
  /* Grain de cuir genere en code                                      */
  /* ---------------------------------------------------------------- */
  var grainURL = (function () {
    try {
      var c = d.createElement('canvas'); c.width = c.height = 256;
      var x = c.getContext('2d'); var im = x.createImageData(256, 256); var p = im.data;
      for (var i = 0; i < p.length; i += 4) { var v = 200 + Math.random() * 55; p[i] = v; p[i + 1] = v * 0.97; p[i + 2] = v * 0.92; p[i + 3] = 255; }
      x.putImageData(im, 0, 0);
      x.globalAlpha = 0.18; x.fillStyle = '#7a5a3c';
      for (var j = 0; j < 900; j++) { x.beginPath(); x.arc(Math.random() * 256, Math.random() * 256, Math.random() * 1.3 + 0.3, 0, 6.283); x.fill(); }
      x.globalAlpha = 0.07; x.strokeStyle = '#6b4a2e';
      for (var k = 0; k < 40; k++) { x.beginPath(); var sx = Math.random() * 256, sy = Math.random() * 256; x.moveTo(sx, sy); x.bezierCurveTo(sx + 20, sy + Math.random() * 20 - 10, sx + 40, sy + Math.random() * 20 - 10, sx + 60, sy + Math.random() * 10 - 5); x.stroke(); }
      return c.toDataURL('image/png');
    } catch (e) { return ''; }
  })();
  lancer('grain', function () {
    if (!grainURL) return;
    $$('[data-grain]').forEach(function (el) { el.style.backgroundImage = 'url(' + grainURL + ')'; });
    racine.style.setProperty('--grain', 'url(' + grainURL + ')');
  });

  /* ---------------------------------------------------------------- */
  /* Tresse a trois brins en SVG (dessus / dessous calcules)           */
  /* ---------------------------------------------------------------- */
  var uid = 0;
  function tresse(svg, o) {
    o = o || {};
    var vertical = o.orient === 'v';
    var vb = svg.viewBox.baseVal;
    var L = vertical ? vb.height : vb.width;
    var T = vertical ? vb.width : vb.height;
    var c = T / 2;
    var amp = o.amp != null ? o.amp : T * 0.28;
    var w = o.w != null ? o.w : T * 0.18;
    var lambda = o.lambda || T * 1.8;
    var k = 2 * Math.PI / lambda;
    var phases = [0, 2 * Math.PI / 3, 4 * Math.PI / 3];
    var couleurs = o.couleurs || [COUL.cognac, COUL.encre, COUL.lin];
    var bords = o.bords || [COUL.cognacBord, COUL.encreBord, COUL.linBord];
    var points = o.points !== false && w >= 6;
    var pas = Math.max(1, L / 900);
    var bord = Math.max(1, w * 0.12);
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var id = 'tr' + (++uid);
    var defs = svgEl('defs', {});
    var clip = svgEl('clipPath', { id: id });
    var rect = vertical ? svgEl('rect', { x: -T, y: 0, width: T * 3, height: 0 }) : svgEl('rect', { x: 0, y: -T, width: 0, height: T * 3 });
    clip.appendChild(rect); defs.appendChild(clip); svg.appendChild(defs);
    var g = svgEl('g', { 'clip-path': 'url(#' + id + ')' }); svg.appendChild(g);

    function y(i, s) { return c + amp * Math.sin(k * s + phases[i]); }
    function dy(i, s) { return amp * k * Math.cos(k * s + phases[i]); }
    function chemin(i, s0, s1) {
      var out = '';
      for (var s = s0; s <= s1 + 0.001; s += pas) {
        var a = Math.min(s, s1), b = y(i, a);
        out += (out ? 'L' : 'M') + (vertical ? b.toFixed(2) + ' ' + a.toFixed(2) : a.toFixed(2) + ' ' + b.toFixed(2));
      }
      return out;
    }
    function lanière(i, dd) {
      var gg = svgEl('g', { fill: 'none', 'stroke-linecap': 'butt', 'stroke-linejoin': 'round' });
      gg.appendChild(svgEl('path', { d: dd, stroke: bords[i], 'stroke-width': w + bord * 2 }));
      gg.appendChild(svgEl('path', { d: dd, stroke: couleurs[i], 'stroke-width': w }));
      if (points) gg.appendChild(svgEl('path', { d: dd, stroke: i === 2 ? COUL.cognac : COUL.ivoire, 'stroke-width': Math.max(0.8, w * 0.07), 'stroke-dasharray': (w * 0.22).toFixed(1) + ' ' + (w * 0.3).toFixed(1), opacity: 0.85 }));
      return gg;
    }
    for (var i = 0; i < 3; i++) g.appendChild(lanière(i, chemin(i, -lambda * 0.1, L + lambda * 0.1)));
    var croisements = [];
    for (var a = 0; a < 3; a++) for (var b = a + 1; b < 3; b++) {
      var prev = y(a, 0) - y(b, 0);
      for (var s = pas; s <= L; s += pas) {
        var cur = y(a, s) - y(b, s);
        if ((prev < 0) !== (cur < 0)) {
          var sc = s - pas * cur / (cur - prev);
          var dessus = dy(a, sc) > dy(b, sc) ? a : b;
          var diff = Math.abs(dy(a, sc) - dy(b, sc)) || 0.5;
          var demi = (w + bord * 2 + 2) / diff + 2;
          croisements.push({ s: sc, i: dessus, demi: demi });
        }
        prev = cur;
      }
    }
    croisements.sort(function (p, q) { return p.s - q.s; });
    croisements.forEach(function (cr) { g.appendChild(lanière(cr.i, chemin(cr.i, Math.max(-lambda * 0.1, cr.s - cr.demi), Math.min(L + lambda * 0.1, cr.s + cr.demi)))); });
    var api = {
      L: L, croisements: croisements,
      regler: function (p) { var v = Math.max(0, Math.min(1, p)) * (L + lambda * 0.1); rect.setAttribute(vertical ? 'height' : 'width', v); },
      compte: function (p) { var lim = p * L; var n = 0; for (var q = 0; q < croisements.length; q++) if (croisements[q].s <= lim) n++; return n; }
    };
    api.regler(o.depart != null ? o.depart : 0);
    return api;
  }
  function viewBoxSelon(svg, axe, epaisseur) {
    var r = svg.getBoundingClientRect();
    var long = Math.max(40, Math.round(axe === 'v' ? r.height : r.width));
    svg.setAttribute('viewBox', axe === 'v' ? '0 0 ' + epaisseur + ' ' + long : '0 0 ' + long + ' ' + epaisseur);
    svg.setAttribute('preserveAspectRatio', 'none');
  }

  /* ---------------------------------------------------------------- */
  /* Son d'atelier synthetise (demarre seulement apres un clic)        */
  /* ---------------------------------------------------------------- */
  var son = (function () {
    var ctx = null, maitre = null, bruit = null, actif = false, minuterie = null;
    function tampon() {
      var n = ctx.sampleRate * 2, b = ctx.createBuffer(1, n, ctx.sampleRate), dd = b.getChannelData(0), last = 0;
      for (var i = 0; i < n; i++) { var wv = Math.random() * 2 - 1; last = (last + 0.02 * wv) / 1.02; dd[i] = last * 3.5; }
      return b;
    }
    function blanc(duree) {
      var n = Math.ceil(ctx.sampleRate * duree), b = ctx.createBuffer(1, n, ctx.sampleRate), dd = b.getChannelData(0);
      for (var i = 0; i < n; i++) dd[i] = Math.random() * 2 - 1;
      var s = ctx.createBufferSource(); s.buffer = b; return s;
    }
    function env(g, t, a, pic, rel) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(pic, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + rel); }
    function maillet(t, v) {
      v = v || 1;
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.14);
      env(g, t, 0.004, 0.42 * v, 0.2); o.connect(g).connect(maitre); o.start(t); o.stop(t + 0.3);
      var n = blanc(0.05), f = ctx.createBiquadFilter(), g2 = ctx.createGain();
      f.type = 'bandpass'; f.frequency.value = 1700; f.Q.value = 1.2; env(g2, t, 0.002, 0.18 * v, 0.04);
      n.connect(f).connect(g2).connect(maitre); n.start(t);
    }
    function point(t, v) {
      v = v || 1;
      var n = blanc(0.03), f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = 'bandpass'; f.frequency.value = 3400; f.Q.value = 3; env(g, t, 0.002, 0.16 * v, 0.025);
      n.connect(f).connect(g).connect(maitre); n.start(t);
    }
    function tirer(t, v) {
      v = v || 1;
      var n = blanc(0.45), f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = 'bandpass'; f.Q.value = 2.4; f.frequency.setValueAtTime(800, t); f.frequency.exponentialRampToValueAtTime(2600, t + 0.36);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06 * v, t + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
      n.connect(f).connect(g).connect(maitre); n.start(t);
    }
    function cire(t) {
      var n = blanc(0.8), f = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      f.type = 'lowpass'; f.frequency.value = 1300; lfo.frequency.value = 8; lg.gain.value = 0.02;
      lfo.connect(lg).connect(g.gain); g.gain.setValueAtTime(0.03, t); g.gain.linearRampToValueAtTime(0.0001, t + 0.78);
      n.connect(f).connect(g).connect(maitre); n.start(t); lfo.start(t); lfo.stop(t + 0.8);
    }
    function ambiance() {
      if (!actif) return;
      var t = ctx.currentTime + 0.05, r = Math.random();
      if (r < 0.4) { maillet(t, 0.8); maillet(t + 0.34, 0.7); maillet(t + 0.66, 0.9); }
      else if (r < 0.8) { for (var i = 0; i < 3; i++) { point(t + i * 0.7, 0.8); tirer(t + i * 0.7 + 0.12, 0.8); } }
      else cire(t);
      minuterie = setTimeout(ambiance, 3800 + Math.random() * 4200);
    }
    function demarrer() {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
        ctx = new AC(); maitre = ctx.createGain(); maitre.gain.value = 0.7; maitre.connect(ctx.destination);
        bruit = ctx.createBufferSource(); bruit.buffer = tampon(); bruit.loop = true;
        var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380; var g = ctx.createGain(); g.gain.value = 0.035;
        bruit.connect(f).connect(g).connect(maitre); bruit.start();
      }
      ctx.resume(); actif = true; clearTimeout(minuterie); minuterie = setTimeout(ambiance, 900); return true;
    }
    function arreter() { actif = false; clearTimeout(minuterie); if (ctx) ctx.suspend(); }
    return {
      actif: function () { return actif; },
      basculer: function () { if (actif) { arreter(); return false; } return demarrer(); },
      demarrer: demarrer,
      point: function (v) { if (actif) point(ctx.currentTime + 0.01, v); },
      tirer: function (v) { if (actif) tirer(ctx.currentTime + 0.01, v); },
      maillet: function (v) { if (actif) maillet(ctx.currentTime + 0.01, v); }
    };
  })();
  lancer('son', function () {
    var boutons = $$('[data-son]');
    function maj(on) { boutons.forEach(function (b) { b.setAttribute('aria-pressed', on ? 'true' : 'false'); }); }
    boutons.forEach(function (b) {
      b.addEventListener('click', function () { var on = son.basculer(); maj(on); stock.ecrire('shazak-son', on ? '1' : '0', true); if (on) son.maillet(0.8); });
    });
    if (stock.lire('shazak-son', true) === '1') {
      var reprise = function () { if (son.demarrer()) maj(true); d.removeEventListener('pointerdown', reprise); d.removeEventListener('keydown', reprise); };
      d.addEventListener('pointerdown', reprise); d.addEventListener('keydown', reprise);
    }
    d.addEventListener('pointerover', function (e) { if (e.target.closest && e.target.closest('a, button')) son.point(0.35); });
  });

  /* ---------------------------------------------------------------- */
  /* Defilement fluide                                                 */
  /* ---------------------------------------------------------------- */
  lancer('lenis', function () {
    if (calme || !avecGsap || !window.Lenis) return;
    lenis = new window.Lenis({ lerp: 0.11, smoothWheel: true, anchors: false });
    lenis.on('scroll', ST.update);
    G.ticker.add(function (t) { lenis.raf(t * 1000); });
    G.ticker.lagSmoothing(0);
  });
  function allerA(cible, immediat) {
    var el = typeof cible === 'string' ? d.getElementById(cible.replace('#', '')) : cible;
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: -70, immediate: !!immediat, duration: 1.4 });
    else el.scrollIntoView({ behavior: calme ? 'auto' : 'smooth', block: 'start' });
  }

  /* ---------------------------------------------------------------- */
  /* En-tete, menu mobile, liens internes, transitions de page         */
  /* ---------------------------------------------------------------- */
  lancer('entete', function () {
    var ent = $('#entete'); if (!ent) return;
    var dernier = 0;
    function maj(y) {
      ent.classList.toggle('est-solide', y > 30);
      if (!$('.menu-mobile:not([hidden])')) ent.classList.toggle('est-cache', y > 420 && y > dernier + 2);
      if (y < dernier - 2) ent.classList.remove('est-cache');
      dernier = y;
    }
    if (lenis) lenis.on('scroll', function (e) { maj(e.scroll); }); else window.addEventListener('scroll', function () { maj(window.scrollY); }, { passive: true });
    maj(window.scrollY);
    ent.addEventListener('focusin', function () { ent.classList.remove('est-cache'); });
  });
  lancer('menu', function () {
    var bouton = $('.bouton-menu'), menu = $('#menu-mobile'); if (!bouton || !menu) return;
    function fermer() { menu.hidden = true; bouton.setAttribute('aria-expanded', 'false'); bouton.setAttribute('aria-label', 'Ouvrir le menu'); if (lenis) lenis.start(); }
    bouton.addEventListener('click', function () {
      var ouvrir = menu.hidden; menu.hidden = !ouvrir;
      bouton.setAttribute('aria-expanded', ouvrir ? 'true' : 'false'); bouton.setAttribute('aria-label', ouvrir ? 'Fermer le menu' : 'Ouvrir le menu');
      if (ouvrir) { if (lenis) lenis.stop(); if (avecGsap && !calme) G.from($$('a', menu), { yPercent: 40, opacity: 0, stagger: 0.05, duration: 0.6, ease: 'power3.out' }); }
      else if (lenis) lenis.start();
    });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) fermer(); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { fermer(); bouton.focus(); } });
  });

  function nomFichier(chemin) { var f = chemin.split('/').pop() || 'index.html'; return f === '' ? 'index.html' : f; }
  var ici = nomFichier(location.pathname);
  if (ici.indexOf('.') === -1) ici = ici + '.html';
  if (ici === '.html') ici = 'index.html';
  function couvrir(fini) {
    var o = $('.ouverture'); if (!o || calme || !avecGsap) { fini(); return; }
    racine.classList.remove('sans-ouverture'); o.classList.remove('est-finie'); o.style.display = 'grid'; o.style.animation = 'none'; o.style.visibility = 'visible';
    G.set($('.ouverture__coeur', o), { opacity: 0 });
    G.fromTo($$('.ouverture__lanieres i', o), { yPercent: function (i) { return i % 2 ? -101 : 101; } }, { yPercent: 0, duration: 0.55, stagger: 0.04, ease: 'power3.inOut', onComplete: fini });
  }
  lancer('liens', function () {
    d.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]'); if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;
      if (a.target === '_blank') return;
      var pre = a.getAttribute('data-prefill'); if (pre) stock.ecrire('shazak-prefill', pre, true);
      var href = a.getAttribute('href');
      if (/^(https?:|mailto:|tel:)/.test(href)) return;
      var parts = href.split('#'), fichier = parts[0] ? nomFichier(parts[0]) : ici, ancre = parts[1];
      if (fichier === ici) {
        if (ancre) { e.preventDefault(); if (ancre === 'projet') prefillProjet(); allerA(ancre); var cible = d.getElementById(ancre); if (cible) { cible.setAttribute('tabindex', '-1'); setTimeout(function () { cible.focus({ preventScroll: true }); }, 900); } }
        return;
      }
      e.preventDefault();
      couvrir(function () { location.href = href; });
    });
    window.addEventListener('pageshow', function (ev) { if (ev.persisted) { var o = $('.ouverture'); if (o) o.classList.add('est-finie'); } });
  });

  /* ---------------------------------------------------------------- */
  /* Ouverture orchestree (moins de 3 secondes)                        */
  /* ---------------------------------------------------------------- */
  var apresOuverture = [];
  function quandOuvert(fn) { apresOuverture.push(fn); }
  lancer('ouverture', function () {
    var o = $('.ouverture');
    var deja = racine.classList.contains('deja-vu');
    stock.ecrire('shazak-vu', '1', true);
    function finir() { if (o) o.classList.add('est-finie'); apresOuverture.forEach(function (fn) { lancer('apres', fn); }); apresOuverture = []; }
    if (!o || calme || !avecGsap) { finir(); return; }
    var lanieres = $$('.ouverture__lanieres i', o);
    if (deja) {
      G.set($('.ouverture__coeur', o), { opacity: 0 });
      G.to(lanieres, { yPercent: function (i) { return i % 2 ? 101 : -101; }, duration: 0.7, stagger: 0.04, ease: 'power3.inOut', delay: 0.05, onStart: function () { setTimeout(finir, 220); }, onComplete: function () { o.classList.add('est-finie'); } });
      return;
    }
    var svg = $('[data-tresse="ouverture"]', o);
    var tr = tresse(svg, { amp: 26, w: 18, lambda: 170 });
    var etat = { p: 0 };
    var tl = G.timeline({ defaults: { ease: 'power3.inOut' } });
    tl.from([$('.ouverture__chouette', o), $('.ouverture__mot', o)], { opacity: 0, y: 12, duration: 0.5, stagger: 0.1 }, 0.25)
      .to(etat, { p: 1, duration: 1.15, ease: 'power2.inOut', onUpdate: function () { tr.regler(etat.p); } }, 0.05)
      .to($('.ouverture__coeur', o), { opacity: 0, y: -16, duration: 0.4, ease: 'power2.in' }, 1.35)
      .to(lanieres, { yPercent: function (i) { return i % 2 ? 101 : -101; }, duration: 0.8, stagger: 0.05 }, 1.5)
      .add(finir, 1.62)
      .add(function () { o.classList.add('est-finie'); });
    son.maillet(0.6);
  });

  /* ---------------------------------------------------------------- */
  /* Fil de progression (tresse verticale)                             */
  /* ---------------------------------------------------------------- */
  lancer('fil', function () {
    var svg = $('[data-tresse="fil"]'); if (!svg || !large()) return;
    var api;
    function construire() { viewBoxSelon(svg, 'v', 22); api = tresse(svg, { orient: 'v', amp: 5.2, w: 4.6, lambda: 30, points: false }); maj(); }
    function maj() { var h = d.documentElement.scrollHeight - window.innerHeight; api.regler(h > 0 ? window.scrollY / h : 0); }
    construire();
    if (lenis) lenis.on('scroll', maj); else window.addEventListener('scroll', maj, { passive: true });
    window.addEventListener('resize', antiRebond(construire, 200));
  });

  /* ---------------------------------------------------------------- */
  /* Heros : tresse, titre, images                                      */
  /* ---------------------------------------------------------------- */
  lancer('heros', function () {
    var svg = $('[data-tresse="heros"]');
    var api = null;
    if (svg) {
      var construire = function (p) { viewBoxSelon(svg, 'h', 90); api = tresse(svg, { amp: 20, w: 15, lambda: 150 }); api.regler(p); };
      construire(calme || !avecGsap ? 1 : 0);
      window.addEventListener('resize', antiRebond(function () { construire(1); }, 200));
    }
    var titre = $('[data-heros-titre]');
    if (calme || !avecGsap) { if (api) api.regler(1); return; }
    var lignes = titre ? $$('.ligne', titre) : [];
    var chars = [];
    if (window.SplitText && lignes.length) lignes.forEach(function (l) { var s = window.SplitText.create(l, { type: 'chars', mask: 'chars' }); chars = chars.concat(s.chars); });
    var cadre = $('.heros__cadre') || $('.heros-page__decor');
    var second = $('[data-heros-second]');
    var textes = $$('.heros__texte > *, .heros-page__texte > *');
    if (chars.length) G.set(chars, { yPercent: 110 });
    G.set(textes, { opacity: 0, y: 18 });
    if (cadre) G.set(cadre, { clipPath: 'inset(100% 0% 0% 0%)' });
    if (second) G.set(second, { opacity: 0, x: 30 });
    quandOuvert(function () {
      var tl = G.timeline({ defaults: { ease: 'expo.out' } });
      if (chars.length) tl.to(chars, { yPercent: 0, duration: 1.1, stagger: 0.025 }, 0);
      if (cadre) tl.to(cadre, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'expo.inOut' }, 0.05).from($('img', cadre), { scale: 1.25, duration: 1.8 }, 0.05);
      if (second) tl.to(second, { opacity: 1, x: 0, duration: 1 }, 0.55);
      tl.to(textes, { opacity: 1, y: 0, duration: 0.9, stagger: 0.08, ease: 'power3.out' }, 0.35);
      if (api) { var e = { p: 0 }; tl.to(e, { p: 1, duration: 1.6, ease: 'power2.inOut', onUpdate: function () { api.regler(e.p); } }, 0.3); }
    });
    if (svg && api) {
      G.to(svg, { xPercent: -3, ease: 'none', scrollTrigger: { trigger: svg, start: 'top bottom', end: 'bottom top', scrub: true } });
    }
  });

  /* ---------------------------------------------------------------- */
  /* Revelations au defilement                                          */
  /* ---------------------------------------------------------------- */
  var horizontal = null;
  var attentesSalles = {};
  function salleIndex(el) {
    if (!horizontal) return 0;
    var s = el.closest('[data-salle]'); if (!s) return 0;
    return $$('[data-salle]').indexOf(s);
  }
  function declencheur(el, opts) {
    var o = { trigger: el, start: 'top 97%', once: true };
    for (var k in opts) o[k] = opts[k];
    return o;
  }
  function animerOuAttendre(el, construire) {
    var i = salleIndex(el);
    if (i > 0) { var tl = construire(null); tl.pause(0); (attentesSalles[i] = attentesSalles[i] || []).push(tl); return; }
    construire(declencheur(el));
  }
  function libererSalles(f) {
    Object.keys(attentesSalles).forEach(function (i) {
      if (f >= i - 0.55) { attentesSalles[i].forEach(function (tl) { tl.play(); }); delete attentesSalles[i]; son.point(0.5); }
    });
  }
  function revelations() {
    if (calme || !avecGsap) return;
    $$('[data-revele]').forEach(function (el) {
      if (!window.SplitText) { animerOuAttendre(el, function (st) { return G.from(el, { opacity: 0, y: 30, duration: 1, ease: 'power3.out', scrollTrigger: st || undefined }); }); return; }
      var s = window.SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'ligne-revele' });
      animerOuAttendre(el, function (st) { return G.from(s.lines, { yPercent: 105, duration: 1.15, stagger: 0.09, ease: 'expo.out', scrollTrigger: st || undefined }); });
    });
    $$('[data-salle]').forEach(function (salle, i) {
      if (!i || !horizontal) return;
      var nom = $('.salle__nom', salle), txt = $$('.salle__texte > :not(.salle__nom)', salle);
      animerOuAttendre(salle, function () { return G.timeline().from(nom, { xPercent: 18, opacity: 0, duration: 1.1, ease: 'expo.out' }).from(txt, { opacity: 0, y: 16, stagger: 0.08, duration: 0.7, ease: 'power3.out' }, 0.2); });
    });
    $$('[data-tissage]').forEach(function (cadre) {
      if (cadre.closest('.heros')) return;
      var t = d.createElement('div'); t.className = 'tissage'; t.setAttribute('aria-hidden', 'true');
      var v = d.createElement('div'); v.className = 'tissage__v'; var h = d.createElement('div'); h.className = 'tissage__h';
      for (var i = 0; i < 5; i++) v.appendChild(d.createElement('i'));
      for (var j = 0; j < 4; j++) h.appendChild(d.createElement('i'));
      t.appendChild(v); t.appendChild(h); cadre.appendChild(t);
      var img = $('img', cadre);
      animerOuAttendre(cadre, function (st) {
        var o = { onComplete: function () { t.remove(); } };
        if (st) { st.onEnter = function () { son.point(0.5); }; o.scrollTrigger = st; }
        var tl = G.timeline(o);
        tl.to($$('i', h), { xPercent: function (n) { return n % 2 ? 102 : -102; }, duration: 0.45, stagger: 0.03, ease: 'power3.inOut' }, 0)
          .to($$('i', v), { yPercent: function (n) { return n % 2 ? 102 : -102; }, duration: 0.5, stagger: 0.03, ease: 'power3.inOut' }, 0.12);
        if (img) tl.from(img, { scale: 1.1, duration: 1.2, ease: 'expo.out' }, 0.12);
        return tl;
      });
    });
    $$('[data-parallaxe] img').forEach(function (img) {
      G.fromTo(img, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: img.parentNode, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }

  /* Coutures : trous a la griffe, puis point sellier qui avance */
  function coutures() {
    $$('[data-couture]').forEach(function (el) {
      var r = el.getBoundingClientRect(); var W = Math.max(60, Math.round(r.width)); var H = 14;
      var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'none', 'aria-hidden': 'true' });
      var id = 'cou' + (++uid);
      var clip = svgEl('clipPath', { id: id }); var rect = svgEl('rect', { x: 0, y: -4, width: calme || !avecGsap ? W : 0, height: H + 8 }); clip.appendChild(rect);
      var defs = svgEl('defs', {}); defs.appendChild(clip); svg.appendChild(defs);
      var trous = '', points = '';
      for (var x = 4; x < W - 4; x += 9) { trous += 'M' + x + ' 7h.01'; points += 'M' + (x - 2.5) + ' 10.5L' + (x + 3.5) + ' 3.5'; }
      svg.appendChild(svgEl('path', { d: trous, stroke: 'currentColor', 'stroke-width': 2.2, 'stroke-linecap': 'round', opacity: 0.28 }));
      var gp = svgEl('g', { 'clip-path': 'url(#' + id + ')' });
      gp.appendChild(svgEl('path', { d: points, stroke: 'currentColor', 'stroke-width': 1.7, 'stroke-linecap': 'round', fill: 'none' }));
      svg.appendChild(gp);
      var aiguille = svgEl('path', { d: 'M0 7h18', stroke: 'currentColor', 'stroke-width': 1.2, opacity: calme || !avecGsap ? 0 : 0.8 });
      svg.appendChild(aiguille);
      el.appendChild(svg);
      if (calme || !avecGsap) return;
      var e = { p: 0 };
      G.to(e, {
        p: 1, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 92%', end: 'top 55%', scrub: 0.6, onLeave: function () { son.tirer(0.7); } },
        onUpdate: function () { rect.setAttribute('width', e.p * W); aiguille.setAttribute('transform', 'translate(' + (e.p * W) + ' 0)'); aiguille.setAttribute('opacity', e.p > 0.995 ? 0 : 0.8); }
      });
    });
  }

  function compteurs() {
    $$('[data-compte]').forEach(function (el) {
      var fin_ = parseFloat(el.getAttribute('data-compte')); var dep = parseFloat(el.getAttribute('data-depart') || '0');
      if (calme || !avecGsap) { el.textContent = fin_; return; }
      var e = { v: dep }; el.textContent = dep;
      G.to(e, { v: fin_, duration: 1.8, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true }, onUpdate: function () { el.textContent = Math.round(e.v); } });
    });
  }

  function plaques() {
    $$('[data-grave]').forEach(function (el) {
      if (calme || !avecGsap) return;
      var cible = $('a', el) || el;
      var texte = cible.textContent; cible.textContent = '';
      cible.setAttribute('aria-label', texte);
      var spans = [];
      texte.split(' ').forEach(function (mot, mi, mots) {
        var m = d.createElement('span'); m.style.whiteSpace = 'nowrap'; m.setAttribute('aria-hidden', 'true');
        for (var i = 0; i < mot.length; i++) { var s = d.createElement('span'); s.className = 'c'; s.textContent = mot[i]; m.appendChild(s); spans.push(s); }
        cible.appendChild(m); if (mi < mots.length - 1) cible.appendChild(d.createTextNode(' '));
      });
      G.set(spans, { opacity: 0 });
      G.to(spans, {
        opacity: 1, duration: 0.05, stagger: 0.028, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        onStart: function () { son.point(0.4); }
      });
      G.fromTo(spans, { textShadow: '0 0 8px rgba(255,170,90,.95), 0 0 2px rgba(255,120,40,1)' }, { textShadow: '0 1px 0 rgba(255,255,255,.55), 0 -1px 0 rgba(60,40,20,.35)', duration: 0.5, stagger: 0.028, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });
  }

  /* ---------------------------------------------------------------- */
  /* Salles horizontales (accueil)                                      */
  /* ---------------------------------------------------------------- */
  function salles() {
    var sec = $('[data-salles]'); if (!sec) return;
    var piste = $('[data-salles-piste]', sec); var lesSalles = $$('[data-salle]', sec);
    var ivoire = [243, 237, 227];
    function hex(h) { h = h.replace('#', ''); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; }
    function melange(c, t) { return 'rgb(' + c.map(function (v, i) { return Math.round(ivoire[i] + (v - ivoire[i]) * t); }).join(',') + ')'; }
    var teintes = lesSalles.map(function (s) { return hex(s.getAttribute('data-teinte') || '#F3EDE3'); });
    function teinter(f) { var i = Math.min(teintes.length - 1, Math.max(0, f)); var a = Math.floor(i), b = Math.min(teintes.length - 1, a + 1), t = i - a; var c = teintes[a].map(function (v, k) { return v + (teintes[b][k] - v) * t; }); sec.style.setProperty('--teinte', melange(c, 0.16)); }
    teinter(0);
    if (ST) ST.create({ trigger: sec, start: 'top bottom+=1200', once: true, onEnter: function () { $$('img', sec).forEach(function (im) { im.loading = 'eager'; }); } });
    if (calme || !avecGsap) return;
    var mm = G.matchMedia();
    mm.add('(min-width: 961px)', function () {
      sec.classList.add('est-horizontal');
      var dist = function () { return piste.scrollWidth - window.innerWidth; };
      horizontal = G.to(piste, {
        x: function () { return -dist(); }, ease: 'none',
        scrollTrigger: { trigger: piste, start: 'top top', end: function () { return '+=' + dist(); }, pin: sec, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1, onUpdate: function (self) { var f = self.progress * (lesSalles.length - 1); teinter(f); libererSalles(f); } }
      });
      return function () { sec.classList.remove('est-horizontal'); horizontal = null; };
    });
    mm.add('(max-width: 960px)', function () {
      lesSalles.forEach(function (s, i) { ST.create({ trigger: s, start: 'top 60%', end: 'bottom 40%', onToggle: function (self) { if (self.isActive) teinter(i); } }); });
    });
  }

  /* ---------------------------------------------------------------- */
  /* Methode epinglee                                                   */
  /* ---------------------------------------------------------------- */
  function methode() {
    var sec = $('[data-methode]'); if (!sec) return;
    var etapes = $$('[data-etape]', sec), visuels = $$('[data-etape-visuel]', sec), leg = $('[data-methode-legende]', sec);
    var cartels = []; try { cartels = JSON.parse($('[data-methode-cartels]', sec).textContent); } catch (e) { }
    var svg = $('[data-tresse="methode"]', sec); var api = null;
    function construire(p) { if (!svg) return; viewBoxSelon(svg, 'v', 22); api = tresse(svg, { orient: 'v', amp: 6, w: 5.5, lambda: 38, points: false }); api.regler(p); }
    var actuel = -1;
    function activer(i) {
      if (i === actuel) return;
      var ancien = actuel; actuel = i;
      etapes.forEach(function (e, k) { e.classList.toggle('est-active', k === i); });
      if (leg) leg.innerHTML = cartels[i] || '';
      visuels.forEach(function (v, k) {
        if (calme || !avecGsap) { v.style.opacity = k === i ? 1 : 0; return; }
        if (k === i) { G.fromTo(v, { opacity: 1, clipPath: ancien < i ? 'inset(100% 0 0 0)' : 'inset(0 0 100% 0)' }, { clipPath: 'inset(0% 0 0% 0)', duration: 0.9, ease: 'expo.inOut', overwrite: true }); v.style.zIndex = 2; G.fromTo($('img', v), { scale: 1.15 }, { scale: 1, duration: 1.4, ease: 'expo.out' }); }
        else { v.style.zIndex = k === ancien ? 1 : 0; if (k !== ancien) G.set(v, { opacity: 0 }); }
      });
      son.point(0.6);
    }
    construire(calme || !avecGsap ? 1 : 0);
    var charger = function () { visuels.forEach(function (v) { var im = $('img', v); if (im) im.loading = 'eager'; }); };
    if (ST) ST.create({ trigger: sec, start: 'top bottom+=900', once: true, onEnter: charger }); else charger();
    activer(0);
    window.addEventListener('resize', antiRebond(function () { construire(api ? 1 : 0); }, 200));
    if (calme || !avecGsap) {
      etapes.forEach(function (e, i) { if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) activer(i); }); }, { rootMargin: '-45% 0px -45% 0px' }).observe(e); });
      return;
    }
    var mm = G.matchMedia();
    mm.add('(min-width: 961px)', function () {
      sec.classList.add('est-epingle');
      var grille = $('.methode__grille', sec);
      ST.create({
        trigger: grille, start: 'top top+=90', end: '+=' + (etapes.length * 70) + '%', pin: grille, scrub: true,
        onUpdate: function (self) { if (api) api.regler(self.progress); activer(Math.min(etapes.length - 1, Math.floor(self.progress * etapes.length * 0.999))); }
      });
      return function () { sec.classList.remove('est-epingle'); };
    });
    mm.add('(max-width: 960px)', function () {
      etapes.forEach(function (e, i) { ST.create({ trigger: e, start: 'top 62%', end: 'bottom 62%', onToggle: function (s) { if (s.isActive) activer(i); } }); });
      ST.create({ trigger: $('.methode__etapes', sec), start: 'top 70%', end: 'bottom 50%', scrub: true, onUpdate: function (s) { if (api) api.regler(s.progress); } });
    });
  }

  /* ---------------------------------------------------------------- */
  /* Voir au mur                                                        */
  /* ---------------------------------------------------------------- */
  function voirAuMur() {
    var zone = $('[data-mur]'); if (!zone) return;
    var decor = $('[data-mur-decor]', zone), piece = $('[data-mur-piece]', zone), imgP = $('img', piece), sil = $('[data-mur-silhouette]', zone), ech = $('[data-mur-echelle]', zone);
    var largeur = $('#mur-largeur'), sortie = $('#mur-largeur-valeur'), cartel = $('[data-mur-cartel]');
    var DECORS = { galerie: { cm: 420, sol: 0.115 }, interieur: { cm: 560, sol: 0.12 } };
    var NOMS = { 'shallang/ornements-cognac-paire': 'Ornements en Shallang', 'harnachement/soleil-sangles-boucles': 'Soleil de sangles', 'shallang/motif-noir': 'Bandes de Shallang noir' };
    function choix(n) { var r = $('input[name="' + n + '"]:checked', zone); return r ? r.value : null; }
    function placer(anime) {
      var dec = DECORS[choix('mur-decor')] || DECORS.galerie;
      var W = decor.clientWidth, H = decor.clientHeight; if (!W) return;
      var ppc = W / dec.cm, cm = parseInt(largeur.value, 10);
      sortie.textContent = cm + ' cm';
      var pw = cm * ppc; var ratio = (imgP.naturalHeight && imgP.naturalWidth) ? imgP.naturalHeight / imgP.naturalWidth : 1.2;
      var ph = pw * ratio; var sol = dec.sol * H; var centre = sol + 150 * ppc;
      var bas = Math.max(sol + 10, centre - ph / 2);
      if (bas + ph > H - 8) bas = Math.max(8, H - 8 - ph);
      var props = { width: pw, bottom: bas };
      if (anime && avecGsap && !calme) G.to(piece, { width: pw, bottom: bas, duration: 0.6, ease: 'power3.out' }); else { piece.style.width = pw + 'px'; piece.style.bottom = bas + 'px'; }
      sil.style.height = (170 * ppc) + 'px'; sil.style.bottom = (sol * 0.55) + 'px';
      while (ech.firstChild) ech.removeChild(ech.firstChild);
      var ew = ech.clientWidth || W * 0.94; ech.setAttribute('viewBox', '0 0 ' + ew + ' 18');
      ech.appendChild(svgEl('line', { x1: 0, y1: 4, x2: ew, y2: 4, stroke: 'currentColor', 'stroke-width': 1, opacity: 0.5 }));
      for (var c = 0; c * ppc <= ew; c += 50) {
        var x = c * ppc; ech.appendChild(svgEl('line', { x1: x, y1: 0, x2: x, y2: c % 100 ? 5 : 8, stroke: 'currentColor', 'stroke-width': 1 }));
        if (!(c % 100)) { var t = svgEl('text', { x: x + 3, y: 17, fill: 'currentColor', 'font-size': 10, 'font-family': 'Inter Tight, sans-serif' }); t.textContent = c ? (c / 100) + ' m' : '0'; ech.appendChild(t); }
      }
      return props;
    }
    function changerPiece() {
      var cle = choix('mur-piece'); if (!cle) return;
      var nouvelle = 'assets/img/' + cle + '-1280.webp';
      var applique = function () {
        imgP.srcset = 'assets/img/' + cle + '-640.webp 640w, assets/img/' + cle + '-1280.webp 1280w';
        imgP.src = nouvelle; imgP.alt = NOMS[cle] || '';
        if (cartel) $('.cartel__titre', cartel).textContent = NOMS[cle] || '';
        var fini = function () { placer(false); if (avecGsap && !calme) G.fromTo(piece, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }); };
        if (imgP.complete) fini(); else imgP.onload = fini;
      };
      if (avecGsap && !calme) G.to(piece, { opacity: 0, duration: 0.25, onComplete: applique }); else applique();
      son.maillet(0.5);
    }
    $$('input[name="mur-piece"]', zone).forEach(function (r) { r.addEventListener('change', changerPiece); });
    $$('input[name="mur-decor"]', zone).forEach(function (r) {
      r.addEventListener('change', function () {
        $$('[data-mur-fond]', zone).forEach(function (im) { im.hidden = im.getAttribute('data-mur-fond') !== r.value; });
        placer(true);
      });
    });
    largeur.addEventListener('input', function () { placer(false); });
    if (imgP.complete) placer(false); else imgP.addEventListener('load', function () { placer(false); });
    window.addEventListener('resize', antiRebond(function () { placer(false); }, 120));
    if ('ResizeObserver' in window) new ResizeObserver(antiRebond(function () { placer(false); }, 80)).observe(decor);
  }

  /* ---------------------------------------------------------------- */
  /* Boutons magnetiques, curseur alene, loupe, trace de couture        */
  /* ---------------------------------------------------------------- */
  function magnetiques() {
    if (!fin || calme || !avecGsap) return;
    $$('[data-magnetique]').forEach(function (b) {
      var qx = G.quickTo(b, 'x', { duration: 0.5, ease: 'power3.out' }), qy = G.quickTo(b, 'y', { duration: 0.5, ease: 'power3.out' });
      b.addEventListener('pointermove', function (e) { var r = b.getBoundingClientRect(); qx((e.clientX - r.left - r.width / 2) * 0.28); qy((e.clientY - r.top - r.height / 2) * 0.35); });
      b.addEventListener('pointerleave', function () { G.to(b, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, .45)' }); });
    });
  }
  function curseur() {
    if (!fin) return;
    var cu = $('.curseur'), lo = $('.loupe'), tr = $('.trace'); if (!cu || !lo) return;
    racine.classList.add('avec-curseur');
    var mx = -100, my = -100, cx = -100, cy = -100, cible = null, pts = [], ctx = tr ? tr.getContext('2d') : null;
    function taille() { if (!tr) return; var r = window.devicePixelRatio || 1; tr.width = innerWidth * r; tr.height = innerHeight * r; ctx.setTransform(r, 0, 0, r, 0, 0); }
    taille(); window.addEventListener('resize', taille);
    d.addEventListener('pointermove', function (e) {
      mx = e.clientX; my = e.clientY;
      var t = e.target.closest ? e.target : null;
      var lien = t && t.closest('a, button, label, input[type="range"], [role="slider"]');
      cu.classList.toggle('est-lien', !!lien);
      if (lien && !calme) pts.push({ x: mx, y: my, t: performance.now() });
      var im = t && t.closest('[data-loupe]');
      if (im && im.tagName === 'IMG' && !calme) {
        if (cible !== im) { cible = im; lo.style.backgroundImage = 'url("' + (im.getAttribute('data-grand') || im.currentSrc) + '")'; }
        var r = im.getBoundingClientRect(), z = 2.6;
        var fx = (mx - r.left) / r.width, fy = (my - r.top) / r.height;
        var nw = im.naturalWidth || r.width, nh = im.naturalHeight || r.height;
        var echelle = Math.max(r.width / nw, r.height / nh), dw = nw * echelle * z, dh = nh * echelle * z;
        var ox = (r.width - nw * echelle) / 2, oy = (r.height - nh * echelle) / 2;
        var px = ((mx - r.left - ox) / (nw * echelle));
        var py = ((my - r.top - oy) / (nh * echelle));
        lo.style.backgroundSize = dw + 'px ' + dh + 'px';
        lo.style.backgroundPosition = (90 - px * dw) + 'px ' + (90 - py * dh) + 'px';
        lo.classList.add('est-visible'); cu.style.opacity = 0;
        void fx; void fy;
      } else if (cible || lo.classList.contains('est-visible')) { cible = null; lo.classList.remove('est-visible'); cu.style.opacity = 1; }
    }, { passive: true });
    d.addEventListener('pointerleave', function () { lo.classList.remove('est-visible'); });
    function boucle() {
      cx += (mx - cx) * 0.25; cy += (my - cy) * 0.25;
      cu.style.transform = 'translate(' + cx + 'px,' + cy + 'px) rotate(45deg)';
      lo.style.left = mx + 'px'; lo.style.top = my + 'px';
      if (ctx) {
        var now = performance.now(); pts = pts.filter(function (p) { return now - p.t < 520; });
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        if (pts.length > 1) {
          ctx.lineWidth = 1.4; ctx.setLineDash([5, 5]); ctx.lineCap = 'round';
          for (var i = 1; i < pts.length; i++) { var a = 1 - (now - pts[i].t) / 520; ctx.strokeStyle = 'rgba(138,75,34,' + (a * 0.85).toFixed(3) + ')'; ctx.beginPath(); ctx.moveTo(pts[i - 1].x, pts[i - 1].y); ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke(); }
        }
      }
      requestAnimationFrame(boucle);
    }
    requestAnimationFrame(boucle);
  }

  /* ---------------------------------------------------------------- */
  /* Carte schematique de Sevres                                        */
  /* ---------------------------------------------------------------- */
  function carte() {
    var el = $('[data-carte]'); if (!el) return;
    el.innerHTML = '<svg viewBox="0 0 520 300" aria-hidden="true">' +
      '<path d="M520 70 C440 60 400 96 352 92 C300 88 280 50 236 62 C182 78 196 150 160 190 C130 224 76 214 60 250 C50 272 70 296 90 300" fill="none" stroke="#CFC2A8" stroke-width="22" stroke-linecap="round"/>' +
      '<path d="M520 70 C440 60 400 96 352 92 C300 88 280 50 236 62 C182 78 196 150 160 190 C130 224 76 214 60 250 C50 272 70 296 90 300" fill="none" stroke="#F3EDE3" stroke-width="1" stroke-dasharray="3 6" opacity=".9"/>' +
      '<text x="372" y="70" fill="#1B1714" font-family="Cormorant Garamond, serif" font-size="30">Paris</text>' +
      '<text x="250" y="96" fill="#4A403A" font-family="Inter Tight, sans-serif" font-size="11">la Seine</text>' +
      '<path data-trajet d="M392 82 C340 130 260 170 132 222" fill="none" stroke="#8A4B22" stroke-width="2" stroke-dasharray="6 6" stroke-linecap="round"/>' +
      '<circle cx="392" cy="82" r="5" fill="#1B1714"/>' +
      '<g transform="translate(118 206)"><circle r="16" fill="#1B1714"/><circle r="16" fill="none" stroke="#8A4B22" stroke-width="2" data-pouls/><rect x="-5" y="-7" width="10" height="14" rx="2" fill="#F3EDE3"/></g>' +
      '<text x="148" y="250" fill="#1B1714" font-family="Cormorant Garamond, serif" font-size="26">Sèvres</text>' +
      '<text x="148" y="268" fill="#4A403A" font-family="Inter Tight, sans-serif" font-size="11">Jardin des Métiers d’Art et du Design</text>' +
      '<text x="0" y="296" fill="#4A403A" font-family="Inter Tight, sans-serif" font-size="10" opacity=".8">Plan schématique, sans échelle</text>' +
      '</svg>';
    var tj = $('[data-trajet]', el);
    if (!calme && avecGsap && tj) {
      var len = tj.getTotalLength(); tj.style.strokeDasharray = '6 6';
      var masque = svgEl('path', { d: tj.getAttribute('d'), fill: 'none', stroke: '#F3EDE3', 'stroke-width': 4, 'stroke-dasharray': len + ' ' + len, 'stroke-dashoffset': 0 });
      tj.parentNode.insertBefore(masque, tj.nextSibling);
      G.to(masque, { attr: { 'stroke-dashoffset': -len }, ease: 'none', scrollTrigger: { trigger: el, start: 'top 85%', end: 'top 40%', scrub: true } });
    }
  }
  function heure() {
    var el = $('[data-heure]'); if (!el) return;
    function maj() {
      try { var f = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date()); var h = '', m = ''; f.forEach(function (p) { if (p.type === 'hour') h = p.value; if (p.type === 'minute') m = p.value; }); el.textContent = 'Il est ' + parseInt(h, 10) + ' h ' + m + ' à Sèvres'; } catch (e) { }
    }
    maj(); setInterval(maj, 30000);
  }

  /* ---------------------------------------------------------------- */
  /* Fiche de projet (envoi simule)                                     */
  /* ---------------------------------------------------------------- */
  function prefillProjet() {
    var v = stock.lire('shazak-prefill', true); if (!v) return;
    stock.effacer('shazak-prefill', true);
    var val = v === 'oeuvre' ? 'Une œuvre sur commande' : v;
    var r = $$('input[name="sujet"]').filter(function (x) { return x.value === val; })[0];
    if (r) r.checked = true;
  }
  function projet() {
    var f = $('[data-projet]'); if (!f) return;
    var etapes = $$('[data-etape-form]', f), barres = $$('.fiche__progression i', f), txt = $('[data-etape-texte]', f), err = $('[data-erreur]', f);
    var prec = $('[data-precedent]', f), suiv = $('[data-suivant]', f), env = $('[data-envoyer]', f), res = $('[data-resultat]'), resume = $('[data-resume]');
    var i = 0;
    function montrer(n, dir) {
      etapes.forEach(function (e, k) { e.hidden = k !== n; });
      barres.forEach(function (b, k) { b.classList.toggle('est-fait', k <= n); });
      txt.textContent = 'Étape ' + (n + 1) + ' sur ' + etapes.length;
      prec.hidden = n === 0; suiv.hidden = n === etapes.length - 1; env.hidden = n !== etapes.length - 1; err.hidden = true;
      if (avecGsap && !calme && dir) G.from(etapes[n], { x: dir * 24, opacity: 0, duration: 0.45, ease: 'power3.out' });
      i = n;
    }
    function valide(n) {
      var e = etapes[n];
      var radios = $$('input[type="radio"]', e);
      if (radios.length && !radios.some(function (r) { return r.checked; })) return 'Choisissez une réponse pour continuer.';
      if (n === etapes.length - 1) {
        var em = $('#email', f).value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) return 'Indiquez une adresse e-mail valide, par exemple nom@domaine.fr.';
        if (!$('#accord', f).checked) return "Cochez la case pour accepter l'utilisation de vos informations.";
      }
      return '';
    }
    function erreur(m) { err.textContent = m; err.hidden = !m; if (m) son.point(0.9); }
    suiv.addEventListener('click', function () { var m = valide(i); if (m) { erreur(m); return; } son.tirer(0.6); montrer(i + 1, 1); var p = $('input', etapes[i]); if (p) p.focus({ preventScroll: true }); });
    prec.addEventListener('click', function () { montrer(i - 1, -1); });
    $$('input[name="avancement"]', f).forEach(function (r) { r.addEventListener('change', function () { $('[data-piece-existante]', f).hidden = r.value !== 'Une pièce existante'; }); });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var m = valide(i); if (m) { erreur(m); return; }
      var dv = new FormData(f);
      var lignes = [['Profil', dv.get('profil')], ['Projet', dv.get('sujet')], ['Avancement', dv.get('avancement')], ['Nom', ((dv.get('prenom') || '') + ' ' + (dv.get('nom') || '')).trim() || 'Non renseigné'], ['E-mail', dv.get('email')], ['Message', dv.get('message') || 'Aucun message']];
      resume.innerHTML = '';
      lignes.forEach(function (l) { var dt = d.createElement('dt'); dt.textContent = l[0]; var dd = d.createElement('dd'); dd.textContent = l[1]; resume.appendChild(dt); resume.appendChild(dd); });
      f.hidden = true; res.hidden = false; res.focus();
      son.maillet(0.9);
      if (avecGsap && !calme) G.from(res.children, { y: 16, opacity: 0, stagger: 0.07, duration: 0.6, ease: 'power3.out' });
    });
    $('[data-recommencer]').addEventListener('click', function () { f.reset(); f.hidden = false; res.hidden = true; montrer(0); });
    prefillProjet();
    montrer(0);
    if (location.hash === '#projet') setTimeout(function () { allerA('projet', true); }, 60);
  }
  function copier() {
    $$('[data-copier]').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-copier'), lib = b.textContent;
        var ok = function () { b.classList.add('est-copie'); b.textContent = 'Copié'; setTimeout(function () { b.classList.remove('est-copie'); b.textContent = lib; }, 1800); };
        var repli = function () { var s = b.previousElementSibling; if (!s) return; var r = d.createRange(); r.selectNodeContents(s); var sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); b.textContent = 'Sélectionné, copiez avec ⌘C'; setTimeout(function () { b.textContent = lib; }, 2400); };
        try { navigator.clipboard.writeText(v).then(ok, repli); } catch (e) { repli(); }
      });
    });
  }
  function lettre() {
    var f = $('[data-lettre]'); if (!f) return;
    var msg = $('[data-lettre-message]');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = $('input', f).value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { msg.textContent = 'Indiquez une adresse e-mail valide, par exemple nom@domaine.fr.'; return; }
      msg.textContent = "C'est noté pour la démonstration. Inscription simulée : aucune adresse n'est enregistrée dans cette maquette.";
      f.reset(); son.tirer(0.6);
    });
  }
  function dialogues() {
    var legal = $('#legal');
    $$('[data-ouvrir-legal]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!legal) return;
        if (legal.showModal) legal.showModal(); else legal.setAttribute('open', '');
        if (lenis) lenis.stop();
        var ancre = b.getAttribute('data-ouvrir-legal');
        var cible = ancre ? $('#' + ancre, legal) : null; legal.scrollTop = cible ? cible.offsetTop - 20 : 0;
      });
    });
    $$('dialog').forEach(function (dl) {
      $$('[data-fermer]', dl).forEach(function (b) { b.addEventListener('click', function () { dl.close(); }); });
      dl.addEventListener('close', function () { if (lenis) lenis.start(); });
      dl.addEventListener('click', function (e) { if (e.target === dl && dl.classList.contains('legal')) dl.close(); });
    });
  }
  function calmeBascule() {
    $$('[data-calme]').forEach(function (b) {
      b.setAttribute('aria-pressed', racine.classList.contains('calme') ? 'true' : 'false');
      if (reduit) { b.setAttribute('aria-pressed', 'true'); b.title = 'Votre appareil demande déjà moins d’animations.'; }
      b.addEventListener('click', function () {
        var on = !racine.classList.contains('calme');
        stock.ecrire('shazak-calme', on ? '1' : '0');
        location.reload();
      });
    });
  }

  /* ---------------------------------------------------------------- */
  /* Visionneuse des galeries (transition WebGL si disponible)          */
  /* ---------------------------------------------------------------- */
  function visionneuse() {
    var dl = $('#visionneuse'); if (!dl) return;
    var imgV = $('[data-v-img]', dl), cnv = $('[data-v-gl]', dl), cartelV = $('[data-v-cartel]', dl), cpt = $('[data-v-compteur]', dl);
    var liste = [], n = 0, occupe = false;
    function remplir(i) {
      var fig = liste[i], im = $('img', fig);
      imgV.src = im.getAttribute('data-grand') || im.currentSrc || im.src; imgV.alt = im.alt;
      cartelV.innerHTML = $('figcaption', fig) ? $('figcaption', fig).outerHTML.replace('<figcaption', '<div').replace('</figcaption>', '</div>') : '';
      cpt.textContent = 'Pièce ' + (i + 1) + ' sur ' + liste.length;
    }
    function aller(dir) {
      if (occupe || liste.length < 2) return;
      var suivant = (n + dir + liste.length) % liste.length;
      var url = $('img', liste[suivant]).getAttribute('data-grand');
      var gl = window.ShazakGL && window.ShazakGL.pret && !calme;
      occupe = true; son.tirer(0.5);
      var pre = new Image(); pre.src = url;
      var finir = function () { n = suivant; remplir(n); occupe = false; };
      var lancerT = function () {
        if (gl) {
          window.ShazakGL.transition(cnv, imgV.src, url, dir).then(function () { finir(); requestAnimationFrame(function () { window.ShazakGL.effacer(cnv); }); }, function () { finir(); });
        } else if (avecGsap && !calme) {
          G.to(imgV, { opacity: 0, x: -30 * dir, duration: 0.3, ease: 'power2.in', onComplete: function () { finir(); G.fromTo(imgV, { opacity: 0, x: 30 * dir }, { opacity: 1, x: 0, duration: 0.45, ease: 'power3.out' }); } });
        } else finir();
      };
      if (pre.complete) lancerT(); else { pre.onload = lancerT; pre.onerror = finir; }
    }
    $$('[data-galerie]').forEach(function (gal) {
      var figs = $$('.piece', gal);
      figs.forEach(function (fig, i) {
        var b = $('button.ouvrir', fig); if (!b) return;
        b.addEventListener('click', function () {
          liste = figs; n = i; remplir(n);
          if (dl.showModal) dl.showModal(); else dl.setAttribute('open', '');
          if (lenis) lenis.stop();
          if (avecGsap && !calme) G.from(imgV, { opacity: 0, scale: 0.96, duration: 0.5, ease: 'power3.out' });
        });
      });
    });
    $('[data-v-prec]', dl).addEventListener('click', function () { aller(-1); });
    $('[data-v-suiv]', dl).addEventListener('click', function () { aller(1); });
    dl.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') aller(1); if (e.key === 'ArrowLeft') aller(-1); });
    var x0 = null;
    dl.addEventListener('pointerdown', function (e) { x0 = e.clientX; });
    dl.addEventListener('pointerup', function (e) { if (x0 != null && Math.abs(e.clientX - x0) > 50 && e.pointerType !== 'mouse') aller(e.clientX < x0 ? 1 : -1); x0 = null; });
  }

  /* ---------------------------------------------------------------- */
  /* Mini-atelier : croisez les brins                                   */
  /* ---------------------------------------------------------------- */
  function tressage() {
    var z = $('[data-tressage]'); if (!z) return;
    var svg = $('svg', z), cpt = $('[data-tressage-compte]'), raz = $('[data-tressage-raz]');
    var api = tresse(svg, { amp: 40, w: 30, lambda: 230 });
    var p = 0, dernier = 0;
    function regler(v) {
      p = Math.max(0, Math.min(1, v)); api.regler(p);
      var c = api.compte(p); cpt.textContent = c;
      if (c > dernier) { son.point(0.9); if (c % 3 === 0) son.tirer(0.5); }
      dernier = c;
      z.setAttribute('aria-valuenow', Math.round(p * 100)); z.setAttribute('aria-valuetext', c + ' croisements');
    }
    var actif = false;
    function depuis(e) { var r = svg.getBoundingClientRect(); return (e.clientX - r.left) / r.width; }
    z.addEventListener('pointerdown', function (e) { actif = true; z.setPointerCapture(e.pointerId); regler(Math.max(p, depuis(e))); });
    z.addEventListener('pointermove', function (e) { if (actif || e.pointerType === 'mouse') { var v = depuis(e); if (actif || v > p) regler(actif ? v : Math.max(p, v)); } });
    z.addEventListener('pointerup', function () { actif = false; });
    z.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { regler(p + 0.05); e.preventDefault(); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { regler(p - 0.05); e.preventDefault(); }
      if (e.key === 'Home') { regler(0); e.preventDefault(); } if (e.key === 'End') { regler(1); e.preventDefault(); }
    });
    raz.addEventListener('click', function () { dernier = 0; if (avecGsap && !calme) { var e = { v: p }; G.to(e, { v: 0, duration: 0.6, ease: 'power2.inOut', onUpdate: function () { api.regler(e.v); cpt.textContent = api.compte(e.v); }, onComplete: function () { regler(0); } }); } else regler(0); });
    if (calme || !avecGsap) regler(0.35);
    else { var e0 = { v: 0 }; G.to(e0, { v: 0.22, duration: 1.4, ease: 'power2.out', scrollTrigger: { trigger: z, start: 'top 80%', once: true }, onUpdate: function () { api.regler(e0.v); p = e0.v; cpt.textContent = api.compte(e0.v); dernier = api.compte(e0.v); } }); }
  }

  /* ---------------------------------------------------------------- */
  /* Presse : filtres, sommaire actif                                   */
  /* ---------------------------------------------------------------- */
  function filtres() {
    var zone = $('[data-filtres]'); if (!zone) return;
    $$('input[name="filtre"]', zone).forEach(function (r) {
      r.addEventListener('change', function () {
        var v = r.value;
        $$('[data-presse] .article').forEach(function (a) { a.hidden = !(v === 'tout' || a.getAttribute('data-type') === v); });
        $$('[data-annee]').forEach(function (bl) { bl.hidden = !$$('.article', bl).some(function (a) { return !a.hidden; }); });
        if (avecGsap && !calme) G.from($$('[data-presse] .article:not([hidden])'), { opacity: 0, y: 8, stagger: 0.02, duration: 0.35 });
        if (ST) ST.refresh();
      });
    });
  }
  function sommaire() {
    var liens = $$('.sommaire a'); if (!liens.length) return;
    function activer(id) { liens.forEach(function (l) { l.classList.toggle('est-actif', l.getAttribute('href') === '#' + id); }); }
    liens.forEach(function (l) {
      var sec = d.getElementById(l.getAttribute('href').slice(1)); if (!sec) return;
      if (ST) ST.create({ trigger: sec, start: 'top 45%', end: 'bottom 45%', onToggle: function (s) { if (s.isActive) activer(sec.id); } });
    });
  }

  /* ---------------------------------------------------------------- */
  /* Parcours : sangle a trous numerotes, boucle qui avance             */
  /* ---------------------------------------------------------------- */
  function parcours() {
    var sec = $('[data-parcours]'); if (!sec) return;
    var piste = $('[data-parcours-piste]', sec), svg = $('[data-sangle]', sec), ans = $$('.an', sec), boucle = $('.parcours__boucle', sec);
    function dessinerSangle() {
      var vertical = sec.classList.contains('est-vertical');
      var r = svg.getBoundingClientRect(); var W = Math.max(10, Math.round(r.width)), H = Math.max(10, Math.round(r.height));
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.appendChild(svgEl('rect', { x: 0, y: 0, width: W, height: H, rx: vertical ? W / 2 : H / 2, fill: '#8A4B22' }));
      svg.appendChild(svgEl('rect', { x: 1, y: 1, width: W - 2, height: H - 2, rx: vertical ? W / 2 : H / 2, fill: 'none', stroke: '#5E3115', 'stroke-width': 2 }));
      if (vertical) {
        svg.appendChild(svgEl('line', { x1: 6, y1: 10, x2: 6, y2: H - 10, stroke: '#F3EDE3', 'stroke-width': 1.2, 'stroke-dasharray': '5 5', opacity: 0.8 }));
        svg.appendChild(svgEl('line', { x1: W - 6, y1: 10, x2: W - 6, y2: H - 10, stroke: '#F3EDE3', 'stroke-width': 1.2, 'stroke-dasharray': '5 5', opacity: 0.8 }));
      } else {
        svg.appendChild(svgEl('line', { x1: 14, y1: 7, x2: W - 14, y2: 7, stroke: '#F3EDE3', 'stroke-width': 1.2, 'stroke-dasharray': '5 5', opacity: 0.8 }));
        svg.appendChild(svgEl('line', { x1: 14, y1: H - 7, x2: W - 14, y2: H - 7, stroke: '#F3EDE3', 'stroke-width': 1.2, 'stroke-dasharray': '5 5', opacity: 0.8 }));
      }
    }
    function actif(x) {
      var meilleur = null, dist = 1e9;
      ans.forEach(function (a) { var t = $('.an__trou', a).getBoundingClientRect(); var dd = Math.abs(t.left + t.width / 2 - x); if (dd < dist) { dist = dd; meilleur = a; } });
      ans.forEach(function (a) { a.classList.toggle('est-actif', a === meilleur); });
      return meilleur;
    }
    var dernierAn = null;
    if (calme || !avecGsap) { sec.classList.add('est-vertical'); dessinerSangle(); window.addEventListener('resize', antiRebond(dessinerSangle, 150)); return; }
    var mm = G.matchMedia();
    mm.add('(min-width: 961px)', function () {
      sec.classList.remove('est-vertical'); dessinerSangle();
      var fen = $('[data-parcours-fenetre]', sec);
      var dist = function () { return piste.scrollWidth - window.innerWidth + 80; };
      G.to(piste, {
        x: function () { return -dist(); }, ease: 'none',
        scrollTrigger: {
          trigger: fen, start: 'top top+=70', end: function () { return '+=' + dist(); }, pin: sec, scrub: 0.7, invalidateOnRefresh: true, anticipatePin: 1,
          onRefresh: dessinerSangle,
          onUpdate: function () { var b = boucle.getBoundingClientRect(); var a = actif(b.left + b.width / 2); if (a !== dernierAn) { dernierAn = a; son.point(0.6); if (a) G.fromTo($('.an__trou', a), { scale: 1.6 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' }); } }
        }
      });
    });
    mm.add('(max-width: 960px)', function () {
      sec.classList.add('est-vertical'); dessinerSangle();
      return function () { sec.classList.remove('est-vertical'); };
    });
    window.addEventListener('resize', antiRebond(dessinerSangle, 150));
  }

  /* ---------------------------------------------------------------- */
  /* Demarrage                                                          */
  /* ---------------------------------------------------------------- */
  lancer('salles', salles);
  lancer('methode', methode);
  lancer('parcours', parcours);
  lancer('revelations', revelations);
  lancer('coutures', coutures);
  lancer('compteurs', compteurs);
  lancer('plaques', plaques);
  lancer('voirAuMur', voirAuMur);
  lancer('magnetiques', magnetiques);
  lancer('curseur', curseur);
  lancer('carte', carte);
  lancer('heure', heure);
  lancer('projet', projet);
  lancer('copier', copier);
  lancer('lettre', lettre);
  lancer('dialogues', dialogues);
  lancer('calme', calmeBascule);
  lancer('visionneuse', visionneuse);
  lancer('tressage', tressage);
  lancer('filtres', filtres);
  lancer('sommaire', sommaire);

  if (avecGsap) {
    var rafraichir = antiRebond(function () { ST.refresh(); }, 120);
    window.addEventListener('load', rafraichir);
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(rafraichir);
    $$('img').forEach(function (im) { if (!im.complete) im.addEventListener('load', rafraichir, { once: true }); });
  }
  if (location.hash && location.hash.length > 1 && page) {
    var h = location.hash;
    setTimeout(function () { allerA(h, true); }, 80);
  }
  window.ShazakSon = son;
})();
