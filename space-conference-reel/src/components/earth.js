/*
 * Earth globe — orthographic projection of Natural Earth land (d3-geo), with a
 * digital graticule, atmosphere, night-side shading, Iraq outlined and a
 * Baghdad marker (the subtle Iraqi touch). Redrawn per frame from rotation
 * values only, so it is fully seekable.
 *
 *   const earth = REEL.earth.create(containerEl, { id: "s3-earth", r: 430 });
 *   earth.update({ lambda: -44, phi: -24, gamma: 0, pulse: 0.5 });
 */
(function () {
  window.REEL = window.REEL || {};
  const NS = "http://www.w3.org/2000/svg";

  function create(container, opts) {
    const id = opts.id;
    const R = opts.r || 420;
    const pad = R * 0.22;
    const S = 2 * (R + pad);
    const c = R + pad;
    const showDots = opts.dots !== false;
    container.innerHTML = `
      <svg viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" xmlns="${NS}" style="overflow:visible;display:block">
        <defs>
          <radialGradient id="${id}-atmo" cx="0.5" cy="0.5" r="0.5">
            <stop offset="${(R / c).toFixed(3)}" stop-color="#3fe0ff" stop-opacity="0.55"/>
            <stop offset="${((R + pad * 0.18) / c).toFixed(3)}" stop-color="#2e7bff" stop-opacity="0.28"/>
            <stop offset="${((R + pad * 0.55) / c).toFixed(3)}" stop-color="#2e7bff" stop-opacity="0.08"/>
            <stop offset="1" stop-color="#2e7bff" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="${id}-ocean" cx="0.36" cy="0.32" r="0.78">
            <stop offset="0" stop-color="#2a6ccc"/>
            <stop offset="0.35" stop-color="#14438f"/>
            <stop offset="0.72" stop-color="#0a2457"/>
            <stop offset="1" stop-color="#040d26"/>
          </radialGradient>
          <linearGradient id="${id}-land" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#3f86d6"/>
            <stop offset="0.5" stop-color="#22579f"/>
            <stop offset="1" stop-color="#0f2f63"/>
          </linearGradient>
          <radialGradient id="${id}-night" cx="0.28" cy="0.24" r="0.95">
            <stop offset="0.38" stop-color="#02040a" stop-opacity="0"/>
            <stop offset="0.78" stop-color="#02040a" stop-opacity="0.55"/>
            <stop offset="1" stop-color="#02040a" stop-opacity="0.88"/>
          </radialGradient>
          <linearGradient id="${id}-rimlit" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#cfffff" stop-opacity="0.95"/>
            <stop offset="0.35" stop-color="#3fe0ff" stop-opacity="0.35"/>
            <stop offset="0.6" stop-color="#3fe0ff" stop-opacity="0"/>
          </linearGradient>
          <pattern id="${id}-dots" width="9" height="9" patternUnits="userSpaceOnUse">
            <circle cx="4.5" cy="4.5" r="1.5" fill="#bff6ff" fill-opacity="0.55"/>
          </pattern>
          <clipPath id="${id}-clip"><circle cx="${c}" cy="${c}" r="${R}"/></clipPath>
          <filter id="${id}-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${(R / 60).toFixed(1)}"/></filter>
        </defs>
        <circle cx="${c}" cy="${c}" r="${c}" fill="url(#${id}-atmo)"/>
        <circle cx="${c}" cy="${c}" r="${R}" fill="url(#${id}-ocean)"/>
        <g clip-path="url(#${id}-clip)">
          <path id="${id}-grat" fill="none" stroke="#7fe9ff" stroke-opacity="0.16" stroke-width="1.1"/>
          <path id="${id}-landp" fill="url(#${id}-land)" stroke="#8ff0ff" stroke-opacity="0.45" stroke-width="1.3"/>
          ${showDots ? `<path id="${id}-landdots" fill="url(#${id}-dots)" opacity="0.5"/>` : ""}
          <path id="${id}-iraqglow" fill="none" stroke="#3fe0ff" stroke-width="${(R / 45).toFixed(1)}" stroke-opacity="0.85" filter="url(#${id}-glow)"/>
          <path id="${id}-iraq" fill="#3fe0ff" fill-opacity="0.22" stroke="#e9fdff" stroke-width="${Math.max(1.6, R / 210).toFixed(1)}"/>
          <circle cx="${c}" cy="${c}" r="${R}" fill="url(#${id}-night)"/>
        </g>
        <g id="${id}-bgd">
          <circle id="${id}-ring2" r="10" fill="none" stroke="#bff6ff" stroke-width="2"/>
          <circle id="${id}-ring1" r="10" fill="none" stroke="#3fe0ff" stroke-width="2.5"/>
          <circle id="${id}-dot" r="${Math.max(4, R / 70).toFixed(1)}" fill="#ffffff"/>
        </g>
        <circle cx="${c}" cy="${c}" r="${R - 1}" fill="none" stroke="url(#${id}-rimlit)" stroke-width="${(R / 55).toFixed(1)}"/>
      </svg>`;

    const svg = container.querySelector("svg");
    const $ = (s) => svg.querySelector("#" + id + "-" + s);
    const P = { grat: $("grat"), land: $("landp"), dots: $("landdots"), iraq: $("iraq"), iraqGlow: $("iraqglow"), bgd: $("bgd"), r1: $("ring1"), r2: $("ring2") };
    const G = window.REEL_GEO;
    const proj = d3.geoOrthographic().scale(R).translate([c, c]).clipAngle(90).precision(0.6);
    const path = d3.geoPath(proj);
    const grat = d3.geoGraticule().step([15, 15])();

    function update(o) {
      proj.rotate([o.lambda || 0, o.phi || 0, o.gamma || 0]);
      P.grat.setAttribute("d", path(grat) || "");
      const ld = path(G.land) || "";
      P.land.setAttribute("d", ld);
      if (P.dots) P.dots.setAttribute("d", ld);
      const iq = path(G.iraq) || "";
      P.iraq.setAttribute("d", iq);
      P.iraqGlow.setAttribute("d", iq);
      const hl = o.iraq === undefined ? 1 : o.iraq;
      P.iraq.setAttribute("opacity", hl.toFixed(3));
      P.iraqGlow.setAttribute("opacity", (hl * (0.55 + 0.45 * (o.pulse || 0))).toFixed(3));
      // Baghdad marker only on the visible hemisphere
      const rot = proj.rotate();
      const centre = [-rot[0], -rot[1]];
      const vis = d3.geoDistance(G.baghdad, centre) < Math.PI / 2 - 0.05;
      const p = proj(G.baghdad);
      const m = o.marker === undefined ? 1 : o.marker;
      if (vis && p && m > 0.001) {
        P.bgd.setAttribute("transform", `translate(${p[0].toFixed(1)},${p[1].toFixed(1)})`);
        P.bgd.setAttribute("opacity", m.toFixed(3));
        const ph = o.pulse || 0; // 0..1 ripple phase
        const k = R / 430;
        P.r1.setAttribute("r", (8 + 34 * ph) * k);
        P.r1.setAttribute("stroke-opacity", (1 - ph).toFixed(3));
        const ph2 = (ph + 0.5) % 1;
        P.r2.setAttribute("r", (8 + 34 * ph2) * k);
        P.r2.setAttribute("stroke-opacity", ((1 - ph2) * 0.7).toFixed(3));
      } else {
        P.bgd.setAttribute("opacity", "0");
      }
      return { baghdad: vis ? p : null };
    }
    return { svg, update, size: S, center: c, radius: R, projection: proj };
  }

  window.REEL.earth = { create };
})();
