/* Shared, seek-safe animation helpers used by every scene.
   All of them only ADD tweens to a paused timeline at explicit positions —
   nothing runs on wall-clock time. */
(function () {
  window.REEL = window.REEL || {};
  const U = () => window.REEL.util;

  // Call fn(localTime) on every seek across [0, dur] — for procedural layers
  // (canvas stars, globe rotation, orbit maths). Pure function of time.
  function clock(tl, dur, fn, at) {
    const p = { t: 0 };
    tl.fromTo(p, { t: 0 }, { t: dur, duration: dur, ease: "none", onUpdate: () => fn(p.t), immediateRender: true }, at || 0);
    fn(0);
    return p;
  }

  // Keep an element's own CSS filter (e.g. the glow on .accent words) when we
  // tween blur on it: both ends of the tween carry the same filter list.
  const ACCENT_GLOW = "drop-shadow(0 0 16px rgba(63, 224, 255, 0.45))"; // = .accent in typography.css
  function baseFilter(el) {
    const e = typeof el === "string" ? document.querySelector(el) : el;
    return e && e.classList && e.classList.contains("accent") ? " " + ACCENT_GLOW : "";
  }

  // Word-by-word cinematic reveal (blur + rise + fade). times[i] = local seconds.
  function wordsIn(tl, els, times, o) {
    o = o || {};
    els.forEach((el, i) => {
      const bf = baseFilter(el);
      tl.fromTo(
        el,
        { opacity: 0, y: o.y === undefined ? 34 : o.y, filter: `blur(${o.blur === undefined ? 14 : o.blur}px)${bf}`, scale: o.scale || 1 },
        { opacity: 1, y: 0, filter: `blur(0px)${bf}`, scale: 1, duration: o.duration || 0.55, ease: o.ease || "expo.out" },
        times[i]
      );
    });
  }

  // Exit for a group: rise, blur, fade (faster than entrances).
  function out(tl, el, t, o) {
    o = o || {};
    const bf = baseFilter(el);
    tl.to(el, { opacity: 0, y: o.y === undefined ? -26 : o.y, filter: `blur(${o.blur === undefined ? 10 : o.blur}px)${bf}`, scale: o.scale || 1, duration: o.duration || 0.32, ease: o.ease || "power2.in" }, t);
  }

  // Light sweep: an overlay copy of the text with a moving highlight band.
  // The overlay clones the element's structure (lines / word spans) without
  // classes or inline styles, so its glyphs sit exactly on the real ones.
  function addSweep(el, color) {
    el.style.position = "relative";
    const s = document.createElement("div");
    s.className = "sweep-layer";
    s.setAttribute("aria-hidden", "true");
    s.innerHTML = el.innerHTML;
    s.querySelectorAll(".sweep-layer").forEach((n) => n.remove());
    // child lines repaint the same moving band (inherit + clip to their glyphs)
    s.querySelectorAll("*").forEach((n) => { n.removeAttribute("class"); n.removeAttribute("id"); n.setAttribute("style", "background:inherit;-webkit-background-clip:text;background-clip:text;"); });
    s.style.cssText = `position:absolute;inset:0;color:transparent;-webkit-text-fill-color:transparent;-webkit-text-stroke:0;text-shadow:none;pointer-events:none;
      background:linear-gradient(100deg, transparent 0%, transparent 42%, ${color || "rgba(255,255,255,0.95)"} 50%, transparent 58%, transparent 100%);
      background-size:260% 100%;background-position:var(--sx,130%) 0;-webkit-background-clip:text;background-clip:text;filter:drop-shadow(0 0 10px rgba(143,240,255,0.6));`;
    el.appendChild(s);
    return s;
  }
  function sweep(tl, el, t, dur) {
    tl.fromTo(el, { "--sx": "130%" }, { "--sx": "-30%", duration: dur || 0.9, ease: "power2.inOut" }, t);
  }

  // Deterministic micro-glitch (horizontal jitter + chromatic split) for a beat.
  function glitch(tl, el, t, o) {
    o = o || {};
    const r = U().prng(o.seed || 7);
    const n = o.steps || 6;
    const step = (o.duration || 0.24) / n;
    for (let i = 0; i < n; i++) {
      const dx = (r() - 0.5) * (o.amp || 18);
      const split = 2 + r() * 5;
      tl.set(el, { x: dx, textShadow: `${split}px 0 rgba(255,40,90,0.75), ${-split}px 0 rgba(63,224,255,0.85)` }, t + i * step);
    }
    tl.set(el, { x: 0, textShadow: o.rest || "0 0 22px rgba(63,224,255,0.35)" }, t + n * step);
  }

  // Typewriter into a text node: deterministic character reveal.
  function type(tl, el, text, t, cps) {
    const p = { n: 0 };
    tl.fromTo(p, { n: 0 }, { n: text.length, duration: text.length / (cps || 40), ease: "none", onUpdate: () => (el.textContent = text.slice(0, Math.round(p.n))), immediateRender: true }, t);
    el.textContent = "";
  }

  window.REEL.anim = { clock, wordsIn, out, addSweep, sweep, glitch, type, baseFilter };
})();
