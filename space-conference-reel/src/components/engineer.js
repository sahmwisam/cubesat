/*
 * Space Engineer character — ONE design, reused in every scene.
 *
 * An Iraqi woman space engineer: navy hijab, long white engineering coat with a
 * navy belt and cyan light piping, AR glasses, conference badge, and a small
 * Iraqi flag patch on the left sleeve. Premium 2.5D: gradients, cyan rim light,
 * soft ambient occlusion — no outlines, adult proportions.
 *
 * REEL.engineer.build(id, opts) returns an SVG string (viewBox 0 0 600 1500,
 * feet at the bottom centre). REEL.engineer.rig(svgEl, id) returns a rig whose
 * set(pose) writes joint transforms, so GSAP can tween a plain pose object and
 * the character stays identical across scenes (only the pose changes).
 *
 * Pose (all optional, degrees unless noted):
 *   headYaw   -1..1  turns the face sideways (2.5D)
 *   headTilt  deg    tilt;  headNod -1..1 small nod
 *   bodyYaw   -1..1  shifts the chest details for a 3/4 read
 *   armR / armL  { sh, el, wr, fs }  shoulder, elbow, wrist, forearm
 *                foreshortening (1 = full length). armR is the character's
 *                RIGHT arm (viewer's left).
 *   legR / legL, kneeR / kneeL  hip and knee angles
 *   lights    0..1   light-piping intensity
 *   point     0..1   right index finger extension (only if built with opts.point)
 * opts: { rim: rim-light colour, point: 0..1 right index finger extension }
 */
(function () {
  window.REEL = window.REEL || {};

  const C = {
    coatL: "#F3F6FB",
    coatM: "#D6DDE9",
    coatS: "#A6B1C5",
    coatD: "#6E7B94",
    navyHi: "#2A4C8C",
    navy: "#14264D",
    navyD: "#0A1531",
    trouserHi: "#2A3C6E",
    trouser: "#17274D",
    trouserD: "#0B1531",
    hijabHi: "#5B71B4",
    hijab: "#2E3F80",
    hijabD: "#1B2656",
    hijabDD: "#0E1538",
    hijabEdge: "#7186C6",
    metalHi: "#F4F7FC",
    metal: "#AEB9CB",
    metalD: "#5F6C84",
    glow: "#3FE0FF",
    glowCore: "#C9F7FF",
    skinL: "#EBC2A2",
    skin: "#CC9472",
    skinD: "#9C664A",
    brow: "#2E1C13",
    lash: "#1A0F09",
    iris: "#4B2D1B",
    lipU: "#A85E54",
    lipL: "#BC6C61",
    lipD: "#73382F",
    frame: "#2B3654",
  };

  const UA = 200; // upper arm (shoulder -> elbow)
  const FA = 170; // forearm (elbow -> wrist)

  function defs(id, rim) {
    const stops = (s) => s.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${a}"` : ""}/>`).join("");
    const g = (gid, x1, y1, x2, y2, s) => `<linearGradient id="${id}-${gid}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops(s)}</linearGradient>`;
    const r = (gid, cx, cy, rr, s) => `<radialGradient id="${id}-${gid}" cx="${cx}" cy="${cy}" r="${rr}">${stops(s)}</radialGradient>`;
    return `<defs>
      ${g("coatH", 0, 0, 1, 0, [[0, C.coatL], [0.4, C.coatL], [0.76, C.coatM], [1, C.coatS]])}
      ${g("coatLimb", 0, 0, 1, 0, [[0, C.coatM], [0.3, C.coatL], [0.66, C.coatM], [1, C.coatD]])}
      ${g("coatV", 0, 0, 0, 1, [[0, "#ffffff", 0], [0.6, "#0b1430", 0], [1, "#0b1430", 0.26]])}
      ${g("navy", 0, 0, 1, 1, [[0, C.navyHi], [0.55, C.navy], [1, C.navyD]])}
      ${g("trousers", 0, 0, 1, 0, [[0, C.trouserHi], [0.45, C.trouser], [1, C.trouserD]])}
      ${g("shoe", 0, 0, 1, 1, [[0, "#2A3963"], [0.5, "#121B36"], [1, "#070C1C"]])}
      ${g("metal", 0, 0, 1, 0, [[0, C.metalD], [0.18, C.metal], [0.4, C.metalHi], [0.62, C.metal], [1, C.metalD]])}
      ${g("rim", 0, 0, 1, 0, [[0, rim, 0], [0.72, rim, 0], [1, rim, 0.8]])}
      ${g("rimSoft", 0, 0, 1, 0, [[0, rim, 0], [0.8, rim, 0], [1, rim, 0.55]])}
      ${g("hijab", 0, 0, 1, 0.35, [[0, C.hijabHi], [0.3, C.hijab], [0.75, C.hijabD], [1, C.hijabDD]])}
      ${g("drape", 0, 0, 0.6, 1, [[0, C.hijab], [0.45, C.hijabD], [1, C.hijabDD]])}
      ${r("crown", 0.36, 0.18, 0.55, [[0, "#ffffff", 0.12], [1, "#ffffff", 0]])}
      ${r("skin", 0.42, 0.34, 0.74, [[0, C.skinL], [0.62, C.skin], [1, C.skinD]])}
      ${g("hand", 0, 0, 1, 0.6, [[0, C.skinL], [0.5, C.skin], [1, C.skinD]])}
      ${g("lens", 0, 0, 1, 1, [[0, "#BFF6FF", 0.18], [0.5, "#3FE0FF", 0.04], [1, "#0A1838", 0.16]])}
      ${g("badge", 0, 0, 1, 1, [[0, "#FFFFFF"], [1, "#C9D3E3"]])}
      ${g("edge", 0, 0, 1, 0, [[0, C.hijabEdge, 0.6], [0.5, C.hijabEdge, 0.25], [1, C.hijabDD, 0.55]])}
      ${r("ao", 0.5, 0.5, 0.5, [[0, "#0a1228", 0.55], [1, "#0a1228", 0]])}
      ${r("aoSkin", 0.5, 0.5, 0.5, [[0, "#5a2e1c", 0.4], [1, "#5a2e1c", 0]])}
    </defs>`;
  }

  // ---- limb pieces (local coords, joint at 0,0, limb points +y) ----
  function upperArm(id, side) {
    const patch =
      side === "L"
        ? // Iraqi flag patch (character's left sleeve) — small and tasteful
          `<g transform="translate(-16,40)">
            <rect x="0" y="0" width="32" height="23" rx="3.5" fill="#0b1530" opacity="0.28"/>
            <rect x="1.5" y="1.5" width="29" height="6.6" fill="#CE1126"/>
            <rect x="1.5" y="8.1" width="29" height="6.6" fill="#FFFFFF"/>
            <rect x="1.5" y="14.7" width="29" height="6.8" fill="#111111"/>
            <path d="M10 11.4 h4 M16.5 11.4 h6" stroke="#007A3D" stroke-width="1.7" stroke-linecap="round"/>
            <rect x="1.5" y="1.5" width="29" height="20" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="1"/>
          </g>`
        : // generic mission patch (no official logo)
          `<g transform="translate(0,52)">
            <circle r="14" fill="url(#${id}-navy)" stroke="${C.metalHi}" stroke-width="1.8"/>
            <ellipse rx="9.5" ry="3.6" fill="none" stroke="${C.glow}" stroke-width="1.3" transform="rotate(-24)"/>
            <circle r="3.4" fill="#9FD8FF"/>
            <circle cx="7.5" cy="-4" r="1.5" fill="#ffffff"/>
          </g>`;
    const s = "M-33 -12 C-36 50,-31 140,-26 200 C-24 212,24 212,26 200 C31 140,36 50,33 -12 C24 -32,-24 -32,-33 -12Z";
    return `
      <path d="${s}" fill="url(#${id}-coatLimb)"/>
      <path d="${s}" fill="url(#${id}-rim)" opacity="0.7"/>
      <path d="M-24 172 C-10 180,10 180,24 172" stroke="${C.coatS}" stroke-width="2" fill="none" opacity="0.5"/>
      ${patch}`;
  }
  function foreArm(id) {
    const s = "M-27 -6 C-28 50,-25 120,-22 158 L22 158 C25 120,28 50,27 -6 C20 -18,-20 -18,-27 -6Z";
    return `
      <ellipse cx="0" cy="0" rx="26" ry="24" fill="url(#${id}-coatLimb)"/>
      <path d="${s}" fill="url(#${id}-coatLimb)"/>
      <path d="${s}" fill="url(#${id}-rim)" opacity="0.7"/>
      <path d="M-22 28 C-12 33,0 34,10 31" stroke="${C.coatS}" stroke-width="1.8" fill="none" opacity="0.4"/>
      <path d="M-23 146 L23 146 L22.5 172 C10 177,-10 177,-22.5 172Z" fill="url(#${id}-navy)"/>
      <path d="M-19 155 L19 155" stroke="${C.glow}" stroke-width="2.2" stroke-linecap="round" opacity="0.9" class="${id}-emit"/>`;
  }
  function finger(x, y, w, len, rot, id) {
    // one finger: a capsule hanging from (x,y), rotated about its base
    return `<g transform="translate(${x},${y}) rotate(${rot})"><rect x="${-w / 2}" y="0" width="${w}" height="${len}" rx="${w / 2}" fill="url(#${id}-hand)" stroke="${C.skinD}" stroke-opacity="0.35" stroke-width="1"/><ellipse cx="0" cy="${len - w * 0.55}" rx="${w * 0.3}" ry="${w * 0.22}" fill="#F3CDB4" opacity="0.5"/></g>`;
  }
  const relaxed = (id) => finger(-13, 46, 10, 32, 6, id) + finger(-4, 48, 10.5, 38, 2, id) + finger(5.5, 48, 10.5, 39, -1, id) + finger(14, 45, 10, 35, -5, id);
  const pointing = (id, p) => finger(-12, 46, 10, 22, 8, id) + finger(-3, 48, 10.5, 24, 4, id) + finger(6, 48, 10.5, 24, 0, id) + finger(13, 44, 10.5, 40 + 22 * p, -4, id);
  function hand(id, point, side) {
    // wrist at 0,0, fingers toward +y; thumb on the +x side (toward the body).
    // With point > 0 both finger sets are built; pose.point crossfades them.
    const p = Math.max(0, Math.min(1, point || 0));
    const fingers = p > 0.01
      ? `<g id="${id}-fRelax${side}" opacity="0">${relaxed(id)}</g><g id="${id}-fPoint${side}">${pointing(id, p)}</g>`
      : relaxed(id);
    return `
      ${fingers}
      <path d="M-18 -3 C-22 16,-23 34,-19 50 C-16 58,15 59,18 50 C21 34,21 16,17 -3 C8 -9,-9 -9,-18 -3Z" fill="url(#${id}-hand)"/>
      <path d="M-18 -3 C-22 16,-23 34,-19 50 C-17 54,-14 56,-11 57 C-15 40,-15 16,-11 -5 C-14 -5,-16 -4,-18 -3Z" fill="${C.skinD}" opacity="0.25"/>
      <path d="M-14 48 C-6 52,6 52,15 47" stroke="${C.skinD}" stroke-width="1.2" fill="none" opacity="0.35"/>
      <path d="M12 12 C23 19,28 33,25 46 C23 52,17 53,15 47 C15 38,12 28,8 20Z" fill="url(#${id}-hand)" stroke="${C.skinD}" stroke-opacity="0.3" stroke-width="1"/>
      <ellipse cx="20" cy="44" rx="3.2" ry="2.4" fill="#F3CDB4" opacity="0.55"/>`;
  }
  function thigh(id) {
    const s = "M-40 -10 C-44 100,-40 230,-36 340 L36 340 C40 230,44 100,40 -10Z";
    return `<path d="${s}" fill="url(#${id}-trousers)"/>`;
  }
  function shin(id) {
    const s = "M-35 -6 C-36 90,-36 180,-37 262 L37 262 C36 180,36 90,35 -6Z";
    return `
      <path d="M-31 252 C-37 264,-37 280,-29 288 L37 288 C47 286,49 274,43 258 C35 250,-23 248,-31 252Z" fill="url(#${id}-shoe)"/>
      <ellipse cx="4" cy="268" rx="15" ry="4.2" fill="#ffffff" opacity="0.16"/>
      <path d="M-28 288 L38 288" stroke="#03060f" stroke-width="2.2"/>
      <path d="${s}" fill="url(#${id}-trousers)"/>
      <path d="${s}" fill="url(#${id}-rimSoft)" opacity="0.45"/>
      <path d="M-4 6 C-5 90,-6 180,-7 258" stroke="#3B518C" stroke-width="1.8" fill="none" opacity="0.5"/>
      <path d="M-37 262 L37 262" stroke="#070C1C" stroke-width="2.5" opacity="0.55"/>`;
  }

  function head(id) {
    // hijab (back) -> face -> features (yaw group) -> hijab front frame
    const hood = "M300 76 C350 76,386 108,391 160 C396 210,392 250,384 280 C376 300,348 312,300 312 C252 312,224 300,216 280 C208 250,204 210,209 160 C214 108,250 76,300 76Z";
    const face = "M300 102 C344 102,368 132,368 176 C368 206,362 228,350 246 C336 264,318 274,300 274 C282 274,264 264,250 246 C238 228,232 206,232 176 C232 132,256 102,300 102Z";
    // face opening: forehead edge at y=124, follows the cheeks, ends at the jaw corners
    const opening = "M250 241 C238 222,234 196,238 170 C242 140,266 124,300 124 C334 124,358 140,362 170 C366 196,362 222,350 241";
    const frame = `M214 280 C204 250,202 206,208 160 C214 108,250 76,300 76 C350 76,386 108,392 160 C398 206,396 250,386 280 L350 241 C362 222,366 196,362 170 C358 140,334 124,300 124 C266 124,242 140,238 170 C234 196,238 222,250 241Z`;
    return `
      <path d="${hood}" fill="url(#${id}-hijab)"/>
      <path d="${hood}" fill="url(#${id}-rimSoft)" opacity="0.6"/>
      <ellipse cx="300" cy="284" rx="56" ry="20" fill="url(#${id}-ao)" opacity="0.9"/>
      <g id="${id}-faceShape">
        <path d="${face}" fill="url(#${id}-skin)"/>
        <path d="M350 192 C352 220,343 244,325 262 C337 244,344 220,342 196Z" fill="${C.skinD}" opacity="0.26"/>
        <ellipse cx="292" cy="146" rx="26" ry="11" fill="${C.skinL}" opacity="0.3"/>
        <ellipse cx="300" cy="265" rx="10" ry="3.4" fill="${C.skinL}" opacity="0.28"/>
      </g>
      <g id="${id}-feat">
        <!-- cheeks -->
        <ellipse cx="264" cy="222" rx="14" ry="7" fill="#E0857A" opacity="0.15"/>
        <ellipse cx="336" cy="222" rx="13" ry="7" fill="#E0857A" opacity="0.12"/>
        <ellipse cx="263" cy="209" rx="10" ry="3.6" fill="${C.skinL}" opacity="0.26"/>
        <!-- brows: soft natural arch -->
        <path d="M287 177 C280 172.6,270 171,262 171.6 C258 172,255.5 173,253 174.6 C258 173.8,264 173.8,270 174.6 C277 175.6,283 177.4,287 180Z" fill="${C.brow}"/>
        <path d="M313 177 C320 172.6,330 171,338 171.6 C342 172,344.5 173,347 174.6 C342 173.8,336 173.8,330 174.6 C323 175.6,317 177.4,313 180Z" fill="${C.brow}"/>
        <!-- eyes: almond, calm; thin lash line with a small flick -->
        <path d="M259 185.6 C266 180,280 180,287 186.5 M341 185.6 C334 180,320 180,313 186.5" stroke="${C.skinD}" stroke-width="1.2" fill="none" opacity="0.4"/>
        <path d="M258 192 C263 186,281 185,288 193 C282 197.5,265 198,258 192Z" fill="#F2E8E0"/>
        <path d="M342 192 C337 186,319 185,312 193 C318 197.5,335 198,342 192Z" fill="#F2E8E0"/>
        <circle cx="273.5" cy="191.8" r="5.2" fill="${C.iris}"/>
        <circle cx="326.5" cy="191.8" r="5.2" fill="${C.iris}"/>
        <circle cx="273.5" cy="192" r="2.5" fill="#100804"/>
        <circle cx="326.5" cy="192" r="2.5" fill="#100804"/>
        <circle cx="275.4" cy="189.9" r="1.4" fill="#ffffff"/>
        <circle cx="328.4" cy="189.9" r="1.4" fill="#ffffff"/>
        <path d="M256.5 191.5 C262.5 184.5,281.5 183.5,289.5 193.2 M343.5 191.5 C337.5 184.5,318.5 183.5,310.5 193.2" stroke="${C.lash}" stroke-width="2.3" fill="none" stroke-linecap="round"/>
        <path d="M258 190.6 C255.5 189.4,253.5 188.4,251.8 188 M342 190.6 C344.5 189.4,346.5 188.4,348.2 188" stroke="${C.lash}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
        <path d="M260 195 C267 198.4,280 198.4,286.5 195.4 M340 195 C333 198.4,320 198.4,313.5 195.4" stroke="#6A4634" stroke-width="0.9" fill="none" opacity="0.35"/>
        <!-- nose: soft shading only -->
        <path d="M304 200 C305.5 212,308 221,309 227 C306 230.5,302 231.6,298 231 C303 227,304.4 214,304 200Z" fill="${C.skinD}" opacity="0.24"/>
        <ellipse cx="299.5" cy="225" rx="3.6" ry="2.6" fill="${C.skinL}" opacity="0.4"/>
        <path d="M291 231.5 C295 234.5,305 234.5,309 231.5 C305 233.2,295 233.2,291 231.5Z" fill="${C.skinD}" opacity="0.45"/>
        <ellipse cx="294.4" cy="231.2" rx="2.4" ry="1.2" fill="#6A4232" opacity="0.45"/>
        <ellipse cx="305.6" cy="231.2" rx="2.4" ry="1.2" fill="#6A4232" opacity="0.45"/>
        <!-- mouth: calm, slight confident smile -->
        <g transform="translate(300 252) scale(1.1) translate(-300 -252)">
        <path d="M284 249.6 C289.5 246,295 245.4,300 247 C305 245.4,310.5 246,316 249.6 C310.5 251,305 251.4,300 251.2 C295 251.4,289.5 251,284 249.6Z" fill="${C.lipU}"/>
        <path d="M286 250.4 C292 252,308 252,314 250.4 C311.4 256.6,305.8 259,300 259 C294.2 259,288.6 256.6,286 250.4Z" fill="${C.lipL}"/>
        <path d="M284 249.6 C292 251.8,308 251.8,316 249.6" stroke="${C.lipD}" stroke-width="1.4" fill="none" stroke-linecap="round"/>
        <ellipse cx="302" cy="254.8" rx="5.5" ry="1.6" fill="#F0B7A6" opacity="0.45"/>
        <path d="M282.6 248.4 C283.4 249.6,284.4 250.2,285.6 250.2 M317.4 248.4 C316.6 249.6,315.6 250.2,314.4 250.2" stroke="${C.lipD}" stroke-width="1.1" fill="none" opacity="0.5"/>
        </g>
        <!-- AR glasses: slim frame, light tint, a status LED and a faint HUD line -->
        <g id="${id}-glasses">
          <path d="M253 185 L230 182 M347 185 L370 182" stroke="${C.frame}" stroke-width="2" stroke-linecap="round"/>
          <rect x="253" y="180" width="41" height="25" rx="8" fill="url(#${id}-lens)"/>
          <rect x="306" y="180" width="41" height="25" rx="8" fill="url(#${id}-lens)"/>
          <path d="M257 202 L268 182 L274 182 L263 202Z M310 202 L321 182 L327 182 L316 202Z" fill="#ffffff" opacity="0.11"/>
          <path d="M313 199 L326 199 M313 195.6 L320 195.6" stroke="${C.glow}" stroke-width="1.1" stroke-linecap="round" opacity="0.55" class="${id}-emit"/>
          <rect x="253" y="180" width="41" height="25" rx="8" fill="none" stroke="${C.frame}" stroke-width="1.6"/>
          <rect x="306" y="180" width="41" height="25" rx="8" fill="none" stroke="${C.frame}" stroke-width="1.6"/>
          <path d="M294 188.6 C297.5 186.4,302.5 186.4,306 188.6" stroke="${C.frame}" stroke-width="1.9" fill="none"/>
          <circle cx="351" cy="184.4" r="2" fill="${C.glowCore}" class="${id}-emit"/>
        </g>
      </g>
      <!-- hijab front: frames the face -->
      <path d="${frame}" fill="url(#${id}-hijab)"/>
      <path d="${frame}" fill="url(#${id}-rimSoft)" opacity="0.6"/>
      <path d="${frame}" fill="url(#${id}-crown)"/>
      <path d="${opening}" stroke="#4a2516" stroke-width="5" fill="none" opacity="0.14" transform="translate(0,1)"/>
      <path d="${opening}" stroke="url(#${id}-edge)" stroke-width="2.4" fill="none"/>
      <path d="M215 196 C214 228,218 256,228 278" stroke="${C.hijabHi}" stroke-width="6" fill="none" opacity="0.16" stroke-linecap="round"/>
      <path d="M385 196 C386 228,382 256,372 278" stroke="${C.hijabDD}" stroke-width="5" fill="none" opacity="0.3" stroke-linecap="round"/>
`;
  }

  function build(id, opts) {
    opts = opts || {};
    const rim = opts.rim || C.glow;
    const torso = "M300 330 C262 330,236 334,214 344 C196 352,186 364,186 384 C188 430,200 520,214 580 C220 604,224 620,226 640 L374 640 C376 620,380 604,386 580 C400 520,412 430,414 384 C414 364,404 352,386 344 C364 334,338 330,300 330Z";
    const skirt = "M222 626 C208 700,196 800,190 900 C184 1000,180 1110,178 1206 C232 1224,368 1224,422 1206 C420 1110,416 1000,410 900 C404 800,392 700,378 626Z";
    const drape = "M222 262 C214 292,198 322,184 344 C176 358,178 378,190 392 C214 422,256 444,300 448 C344 444,386 422,410 392 C422 378,424 358,416 344 C402 322,386 292,378 262Z";
    return `<svg class="engineer" id="${id}" viewBox="0 0 600 1500" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      ${defs(id, rim)}
      <g id="${id}-body">
        <!-- legs (straight navy trousers, mostly under the coat) -->
        <g transform="translate(264,790)"><g id="${id}-legR">${thigh(id)}<g transform="translate(0,340)"><g id="${id}-shinR">${shin(id)}</g></g></g></g>
        <g transform="translate(336,790)"><g id="${id}-legL"><g transform="scale(-1,1)">${thigh(id)}</g><g transform="translate(0,340)"><g id="${id}-shinL"><g transform="scale(-1,1)">${shin(id)}</g></g></g></g></g>
        <!-- long coat: skirt -->
        <path d="${skirt}" fill="url(#${id}-coatH)"/>
        <path d="${skirt}" fill="url(#${id}-coatV)"/>
        <path d="${skirt}" fill="url(#${id}-rim)" opacity="0.6"/>
        <path d="M181 1196 C232 1214,368 1214,419 1196" stroke="${C.navy}" stroke-width="6" fill="none" opacity="0.85"/>
        <path d="M232 744 L266 738 M334 738 L368 744" stroke="${C.coatS}" stroke-width="2.6" opacity="0.7" stroke-linecap="round"/>
        <path d="M226 700 C214 820,204 1000,196 1190" stroke="${C.coatS}" stroke-width="2" fill="none" opacity="0.35"/>
        <path d="M374 700 C386 820,396 1000,404 1190" stroke="${C.coatD}" stroke-width="2.2" fill="none" opacity="0.3"/>
        <path d="M262 1000 C258 1080,256 1150,254 1210 M346 1000 C350 1080,352 1150,354 1210" stroke="${C.coatS}" stroke-width="1.8" fill="none" opacity="0.28"/>
        <!-- torso -->
        <g id="${id}-torso">
          <path d="${torso}" fill="url(#${id}-coatH)"/>
          <path d="${torso}" fill="url(#${id}-coatV)"/>
          <path d="${torso}" fill="url(#${id}-rim)" opacity="0.6"/>
          <g id="${id}-chest">
            <!-- princess seams -->
            <path d="M240 424 C246 500,244 580,246 628" stroke="${C.coatS}" stroke-width="2.2" fill="none" opacity="0.45"/>
            <path d="M360 424 C354 500,356 580,354 628" stroke="${C.coatS}" stroke-width="2.2" fill="none" opacity="0.45"/>
            <!-- asymmetric front closure with cyan light piping (continues on the skirt) -->
            <path d="M313 430 C317 520,317 600,317 1220" stroke="${C.coatS}" stroke-width="2.4" fill="none" opacity="0.8"/>
            <path d="M319 430 C323 520,323 600,323 1220" stroke="${C.glow}" stroke-width="2.6" fill="none" opacity="0.85" class="${id}-emit"/>
            <!-- belt -->
            <path d="M220 616 C252 628,348 628,380 616 L382 644 C348 656,252 656,218 644Z" fill="url(#${id}-navy)"/>
            <rect x="305" y="620" width="30" height="28" rx="5" fill="url(#${id}-metal)"/>
            <rect x="312" y="631.5" width="16" height="4.5" rx="2.2" fill="${C.glow}" class="${id}-emit"/>
            <!-- conference badge on a lanyard (no text, no logo) -->
            <path d="M282 420 C287 452,293 476,298 498 M318 420 C313 452,307 476,302 498" stroke="${C.navy}" stroke-width="4.5" fill="none" stroke-linecap="round"/>
            <path d="M282 420 C287 452,293 476,298 498 M318 420 C313 452,307 476,302 498" stroke="${C.glow}" stroke-width="1.1" fill="none" opacity="0.55"/>
            <rect x="292" y="493" width="16" height="12" rx="3" fill="url(#${id}-metal)"/>
            <g transform="rotate(-2 300 548)">
              <rect x="270" y="502" width="60" height="84" rx="7" fill="url(#${id}-badge)"/>
              <path d="M270 509 C270 505,273 502,277 502 L323 502 C327 502,330 505,330 509 L330 524 L270 524Z" fill="url(#${id}-navy)"/>
              <circle cx="300" cy="513" r="5" fill="none" stroke="#ffffff" stroke-width="1.3" opacity="0.85"/>
              <ellipse cx="300" cy="513" rx="9" ry="3" fill="none" stroke="${C.glow}" stroke-width="1.1" transform="rotate(-20 300 513)"/>
              <rect x="280" y="534" width="18" height="13" rx="3" fill="${C.glow}" opacity="0.9" class="${id}-emit"/>
              <rect x="280" y="556" width="40" height="3.6" rx="1.8" fill="${C.coatS}"/>
              <rect x="280" y="565" width="27" height="3.6" rx="1.8" fill="${C.coatS}" opacity="0.8"/>
            </g>
          </g>
        </g>
        <!-- ambient occlusion -->
        <ellipse cx="300" cy="442" rx="96" ry="20" fill="url(#${id}-ao)" opacity="0.75"/>
        <ellipse cx="300" cy="660" rx="96" ry="14" fill="url(#${id}-ao)" opacity="0.65"/>
        <ellipse cx="212" cy="520" rx="26" ry="130" fill="url(#${id}-ao)" opacity="0.5"/>
        <ellipse cx="388" cy="520" rx="26" ry="130" fill="url(#${id}-ao)" opacity="0.5"/>
        <!-- arms -->
        <g transform="translate(200,372)"><g id="${id}-armR">${upperArm(id, "R")}<g transform="translate(0,${UA})"><g id="${id}-foreR"><g id="${id}-fsR">${foreArm(id)}</g><g id="${id}-wristR" transform="translate(0,${FA})"><g id="${id}-handR">${hand(id, opts.point || 0, "R")}</g></g></g></g></g></g>
        <g transform="translate(400,372)"><g id="${id}-armL"><g transform="scale(-1,1)">${upperArm(id, "L")}</g><g transform="translate(0,${UA})"><g id="${id}-foreL"><g id="${id}-fsL"><g transform="scale(-1,1)">${foreArm(id)}</g></g><g id="${id}-wristL" transform="translate(0,${FA})"><g id="${id}-handL"><g transform="scale(-1,1)">${hand(id, 0, "L")}</g></g></g></g></g></g></g>
        <!-- hijab drape over the shoulders and chest -->
        <path d="${drape}" fill="url(#${id}-drape)"/>
        <path d="${drape}" fill="url(#${id}-rimSoft)" opacity="0.6"/>
        <path d="M258 304 C262 346,272 396,282 440 M342 304 C338 346,328 396,318 440" stroke="${C.hijabDD}" stroke-width="2.6" fill="none" opacity="0.36"/>
        <path d="M226 300 C218 330,206 356,198 380 M374 300 C382 330,394 356,402 380" stroke="${C.hijabDD}" stroke-width="2.4" fill="none" opacity="0.32"/>
        <path d="M246 300 C250 336,256 370,264 410" stroke="${C.hijabHi}" stroke-width="2.2" fill="none" opacity="0.26"/>
        <path d="M192 392 C216 422,256 442,300 446" stroke="${C.hijabHi}" stroke-width="1.8" fill="none" opacity="0.3"/>
        <!-- head -->
        <g transform="translate(300,300)"><g id="${id}-head"><g transform="translate(-300,-300)">${head(id)}</g></g></g>
      </g>
    </svg>`;
  }

  // Rig: writes joint transforms from a pose object.
  function rig(root, id) {
    const q = (s) => root.querySelector("#" + id + "-" + s);
    const el = {
      armR: q("armR"), foreR: q("foreR"), handR: q("handR"), fsR: q("fsR"), wristR: q("wristR"),
      armL: q("armL"), foreL: q("foreL"), handL: q("handL"), fsL: q("fsL"), wristL: q("wristL"),
      legR: q("legR"), legL: q("legL"), shinR: q("shinR"), shinL: q("shinL"),
      head: q("head"), feat: q("feat"), faceShape: q("faceShape"), chest: q("chest"),
      fRelaxR: q("fRelaxR"), fPointR: q("fPointR"),
    };
    const emit = root.querySelectorAll("." + id + "-emit");
    function set(p) {
      p = p || {};
      const aR = p.armR || {}, aL = p.armL || {};
      el.armR.setAttribute("transform", `rotate(${aR.sh || 0})`);
      el.foreR.setAttribute("transform", `rotate(${aR.el || 0})`);
      el.handR.setAttribute("transform", `rotate(${aR.wr || 0})`);
      el.armL.setAttribute("transform", `rotate(${aL.sh || 0})`);
      el.foreL.setAttribute("transform", `rotate(${aL.el || 0})`);
      el.handL.setAttribute("transform", `rotate(${aL.wr || 0})`);
      const fsR = aR.fs === undefined ? 1 : aR.fs, fsL = aL.fs === undefined ? 1 : aL.fs;
      el.fsR.setAttribute("transform", `scale(1,${fsR})`);
      el.fsL.setAttribute("transform", `scale(1,${fsL})`);
      el.wristR.setAttribute("transform", `translate(0,${FA * fsR})`);
      el.wristL.setAttribute("transform", `translate(0,${FA * fsL})`);
      el.legR.setAttribute("transform", `rotate(${p.legR || 0})`);
      el.legL.setAttribute("transform", `rotate(${p.legL || 0})`);
      el.shinR.setAttribute("transform", `rotate(${p.kneeR || 0})`);
      el.shinL.setAttribute("transform", `rotate(${p.kneeL || 0})`);
      const yaw = p.headYaw || 0;
      el.head.setAttribute("transform", `rotate(${p.headTilt || 0})`);
      el.feat.setAttribute("transform", `translate(${yaw * 12},${(p.headNod || 0) * 5})`);
      el.faceShape.setAttribute("transform", `translate(${yaw * 4},0)`);
      el.chest.setAttribute("transform", `translate(${(p.bodyYaw || 0) * 22},0)`);
      if (el.fPointR && p.point !== undefined) {
        el.fPointR.setAttribute("opacity", p.point.toFixed(3));
        el.fRelaxR.setAttribute("opacity", (1 - p.point).toFixed(3));
      }
      const L = p.lights === undefined ? 1 : p.lights;
      for (let i = 0; i < emit.length; i++) emit[i].setAttribute("opacity", (0.25 + 0.75 * L).toFixed(3));
    }
    return { set, el };
  }

  // glint anchor (viewBox coords): upper-left of the left lens
  const GLINT = { x: 262, y: 184 };

  window.REEL.engineer = { build, rig, colors: C, glint: GLINT };
})();
