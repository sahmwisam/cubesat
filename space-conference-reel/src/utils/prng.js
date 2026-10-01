/* Deterministic helpers. HyperFrames renders frames in parallel and out of
   order, so every visual must be a pure function of time — no Math.random(),
   no Date.now(). */
(function () {
  window.REEL = window.REEL || {};

  // mulberry32 — tiny seeded PRNG
  function prng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => {
    t = clamp(t, 0, 1);
    return t * t * (3 - 2 * t);
  };
  // 0 -> 1 -> 0 window around [a, b] with soft edges of width w
  const windowed = (t, a, b, w) => smooth((t - a) / w) * (1 - smooth((t - b) / w));

  window.REEL.util = { prng, clamp, lerp, smooth, windowed };
})();
