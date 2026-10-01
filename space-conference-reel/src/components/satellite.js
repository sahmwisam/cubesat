/*
 * Satellite — a CubeSat-style bus with deployable solar wings and a dish.
 * REEL.satellite.build(id) -> SVG string, viewBox -260 -130 520 260 (centred).
 * Elements with class `${id}-blink` are status lights a timeline can pulse.
 */
(function () {
  window.REEL = window.REEL || {};

  function wing(id, x0, dir) {
    // dir: -1 left wing, +1 right wing
    const w = 190, h = 74, cols = 6, rows = 2;
    const x = dir < 0 ? x0 - w : x0;
    let cells = "";
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < rows; j++)
        cells += `<rect x="${x + 6 + i * ((w - 12) / cols)}" y="${-h / 2 + 6 + j * ((h - 12) / rows)}" width="${(w - 12) / cols - 3}" height="${(h - 12) / rows - 3}" rx="1.5" fill="url(#${id}-cell)"/>`;
    return `
      <rect x="${x}" y="${-h / 2}" width="${w}" height="${h}" rx="4" fill="#0a1736" stroke="#9fb3d1" stroke-width="2"/>
      ${cells}
      <rect x="${x}" y="${-h / 2}" width="${w}" height="${h}" rx="4" fill="url(#${id}-sheen)"/>`;
  }

  function build(id) {
    return `<svg viewBox="-260 -130 520 260" xmlns="http://www.w3.org/2000/svg" overflow="visible" class="satellite" id="${id}">
      <defs>
        <linearGradient id="${id}-cell" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#2f6fe0"/><stop offset="0.55" stop-color="#173f99"/><stop offset="1" stop-color="#0c2563"/>
        </linearGradient>
        <linearGradient id="${id}-sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#ffffff" stop-opacity="0"/>
          <stop offset="0.42" stop-color="#ffffff" stop-opacity="0"/>
          <stop offset="0.5" stop-color="#dff8ff" stop-opacity="0.38"/>
          <stop offset="0.58" stop-color="#ffffff" stop-opacity="0"/>
          <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="${id}-front" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#f4c86a"/><stop offset="0.5" stop-color="#d19a35"/><stop offset="1" stop-color="#8a5d16"/>
        </linearGradient>
        <linearGradient id="${id}-side" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#c9d3e3"/><stop offset="1" stop-color="#7d8aa3"/>
        </linearGradient>
        <linearGradient id="${id}-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d2dbe8"/>
        </linearGradient>
        <radialGradient id="${id}-dish" cx="0.4" cy="0.35" r="0.8">
          <stop offset="0" stop-color="#ffffff"/><stop offset="0.6" stop-color="#cfd8e6"/><stop offset="1" stop-color="#7f8ca5"/>
        </radialGradient>
        <radialGradient id="${id}-lens" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stop-color="#8ff0ff"/><stop offset="0.5" stop-color="#1c4fa8"/><stop offset="1" stop-color="#050b1f"/>
        </radialGradient>
      </defs>
      <!-- wing arms -->
      <rect x="-82" y="-4" width="40" height="8" fill="#9fb3d1"/>
      <rect x="42" y="-4" width="40" height="8" fill="#9fb3d1"/>
      ${wing(id, -82, -1)}
      ${wing(id, 82, 1)}
      <!-- bus (3/4 view box) -->
      <path d="M-42 -40 L18 -40 L44 -58 L-16 -58 Z" fill="url(#${id}-top)"/>
      <path d="M18 -40 L44 -58 L44 52 L18 70 Z" fill="url(#${id}-side)"/>
      <rect x="-42" y="-40" width="60" height="110" fill="url(#${id}-front)"/>
      <path d="M-42 -12 L18 -12 M-42 20 L18 20 M-42 46 L18 46" stroke="#7a5214" stroke-width="1.6" opacity="0.6"/>
      <path d="M-42 -40 L-42 70 M18 -40 L18 70 M44 -58 L44 52" stroke="#e6edf7" stroke-width="3"/>
      <circle cx="-12" cy="4" r="11" fill="url(#${id}-lens)" stroke="#e6edf7" stroke-width="2"/>
      <!-- dish + whip antenna -->
      <path d="M2 -58 L2 -78" stroke="#c9d3e3" stroke-width="3"/>
      <ellipse cx="2" cy="-86" rx="30" ry="11" fill="url(#${id}-dish)" transform="rotate(-12 2 -86)"/>
      <path d="M2 -86 L14 -104" stroke="#c9d3e3" stroke-width="2"/>
      <circle cx="14" cy="-105" r="3" fill="#ffffff"/>
      <path d="M36 -54 L70 -112" stroke="#c9d3e3" stroke-width="1.6"/>
      <!-- status lights -->
      <circle cx="-30" cy="58" r="4" fill="#3fe0ff" class="${id}-blink"/>
      <circle cx="30" cy="-50" r="3.2" fill="#7cffb2" class="${id}-blink"/>
    </svg>`;
  }

  window.REEL.satellite = { build };
})();
