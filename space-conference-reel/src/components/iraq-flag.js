/*
 * Iraqi flag — used small and sparingly (stage flag, HUD chip, hairline).
 *
 * REEL.iraqFlag.build(id, {w}) -> SVG string of a flag that can wave:
 *   REEL.iraqFlag.wave(svgEl, id, t, amp) bends the cloth deterministically.
 * REEL.iraqFlag.hairline(width) -> HTML for the thin red/white/black accent line.
 *
 * The takbir is set in the project font (the official flag uses Kufic
 * calligraphy; at these sizes the font rendering reads correctly).
 */
(function () {
  window.REEL = window.REEL || {};

  function build(id, opts) {
    opts = opts || {};
    const W = 300, H = 200;
    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" overflow="visible" id="${id}">
      <defs>
        <clipPath id="${id}-clip"><path id="${id}-clipPath" d="M0 0 H${W} V${H} H0 Z"/></clipPath>
        <linearGradient id="${id}-shade" x1="0" y1="0" x2="1" y2="0">
          ${[0, 0.2, 0.4, 0.6, 0.8, 1].map((o) => `<stop id="${id}-s${Math.round(o * 5)}" offset="${o}" stop-color="#000" stop-opacity="0"/>`).join("")}
        </linearGradient>
      </defs>
      <g clip-path="url(#${id}-clip)">
        <rect x="-20" y="-20" width="${W + 40}" height="${H / 3 + 20}" fill="#CE1126"/>
        <rect x="-20" y="${H / 3}" width="${W + 40}" height="${H / 3}" fill="#FFFFFF"/>
        <rect x="-20" y="${(2 * H) / 3}" width="${W + 40}" height="${H / 3 + 20}" fill="#111111"/>
        <text x="${W / 2}" y="${H / 2 + 14}" text-anchor="middle" font-family="DIN Next LT Arabic, sans-serif" font-size="40" fill="#007A3D" direction="rtl">الله أكبر</text>
        <rect x="-20" y="-20" width="${W + 40}" height="${H + 40}" fill="url(#${id}-shade)"/>
      </g>
    </svg>`;
  }

  // Deterministic cloth wave: deform the clip outline and modulate shading.
  function wave(svg, id, t, amp) {
    const W = 300, H = 200, N = 12;
    amp = amp === undefined ? 1 : amp;
    const yOff = (x) => Math.sin(x / W * Math.PI * 2.2 - t * 5.2) * 7 * amp * (x / W);
    let top = "", bot = "";
    for (let i = 0; i <= N; i++) {
      const x = (i / N) * W;
      top += `${i ? "L" : "M"}${x.toFixed(1)} ${yOff(x).toFixed(2)} `;
    }
    for (let i = N; i >= 0; i--) {
      const x = (i / N) * W;
      bot += `L${x.toFixed(1)} ${(H + yOff(x)).toFixed(2)} `;
    }
    svg.querySelector("#" + id + "-clipPath").setAttribute("d", top + bot + "Z");
    for (let k = 0; k <= 5; k++) {
      const x = (k / 5) * W;
      const s = Math.cos(x / W * Math.PI * 2.2 - t * 5.2) * (x / W) * amp;
      const stop = svg.querySelector("#" + id + "-s" + k);
      stop.setAttribute("stop-color", s > 0 ? "#ffffff" : "#000000");
      stop.setAttribute("stop-opacity", Math.min(0.28, Math.abs(s) * 0.3).toFixed(3));
    }
  }

  function hairline(width) {
    const w = width || 120;
    return `<div class="iq-hairline" style="display:flex;width:${w}px;height:5px;border-radius:3px;overflow:hidden;box-shadow:0 0 12px rgba(255,255,255,0.18)">
      <span style="flex:1;background:#CE1126"></span><span style="flex:1;background:#FFFFFF"></span><span style="flex:1;background:#111111;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.25)"></span>
    </div>`;
  }

  window.REEL.iraqFlag = { build, wave, hairline };
})();
