/*
 * Space Engineer character — ONE design, reused in every scene.
 *
 * REEL.astronaut.build(id, opts) returns an SVG string (viewBox 0 0 600 1500,
 * feet at the bottom centre). REEL.astronaut.rig(svgEl, id) returns a rig whose
 * set(pose) writes joint transforms, so GSAP can tween a plain pose object and
 * the character stays identical across scenes (only the pose changes).
 *
 * Pose (all optional, degrees unless noted):
 *   headYaw   -1..1  turns the visor/face sideways (2.5D)
 *   headTilt  deg    nod / tilt
 *   bodyYaw   -1..1  shifts chest details + backpack for a 3/4 read
 *   armR.sh / armR.el  character's RIGHT arm (viewer's left): shoulder, elbow
 *   armL.sh / armL.el  character's LEFT arm (viewer's right)
 *   legR / legL        hip angles
 *   fingerPoint 0..1   right glove index finger extension
 *   lights     0..1    emissive suit lights intensity
 */
(function () {
  window.REEL = window.REEL || {};

  const C = {
    suitHi: "#FFFFFF",
    suitL: "#F1F5FB",
    suitM: "#D3DBE7",
    suitS: "#A2AEC2",
    suitD: "#6B7891",
    navyHi: "#2A4C8C",
    navy: "#14264D",
    navyD: "#0A1531",
    metalHi: "#F4F7FC",
    metal: "#AEB9CB",
    metalD: "#5F6C84",
    glove: "#2B3754",
    gloveD: "#141C31",
    glow: "#3FE0FF",
    glowCore: "#C9F7FF",
    visorTop: "#0B2350",
    visorBot: "#06102A",
    skinL: "#D7A383",
    skin: "#B98161",
    skinD: "#8D5C43",
    cap: "#1B2333",
    capHi: "#2C3850",
  };

  function defs(id, rim) {
    const g = (gid, x1, y1, x2, y2, stops) =>
      `<linearGradient id="${id}-${gid}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops
        .map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${a}"` : ""}/>`)
        .join("")}</linearGradient>`;
    const r = (gid, cx, cy, rr, stops, fx, fy) =>
      `<radialGradient id="${id}-${gid}" cx="${cx}" cy="${cy}" r="${rr}"${fx !== undefined ? ` fx="${fx}" fy="${fy}"` : ""}>${stops
        .map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${a}"` : ""}/>`)
        .join("")}</radialGradient>`;
    return `<defs>
      ${g("suitH", 0, 0, 1, 0, [[0, C.suitL], [0.35, C.suitL], [0.72, C.suitM], [1, C.suitS]])}
      ${g("suitLimb", 0, 0, 1, 0, [[0, C.suitM], [0.28, C.suitL], [0.62, C.suitM], [1, C.suitD]])}
      ${g("suitV", 0, 0, 0, 1, [[0, "#ffffff", 0], [0.65, "#0b1430", 0], [1, "#0b1430", 0.35]])}
      ${g("navy", 0, 0, 1, 1, [[0, C.navyHi], [0.55, C.navy], [1, C.navyD]])}
      ${g("metal", 0, 0, 1, 0, [[0, C.metalD], [0.18, C.metal], [0.4, C.metalHi], [0.62, C.metal], [1, C.metalD]])}
      ${g("glove", 0, 0, 1, 1, [[0, "#3B4A6E"], [0.5, C.glove], [1, C.gloveD]])}
      ${g("rim", 0, 0, 1, 0, [[0, rim, 0], [0.7, rim, 0], [1, rim, 0.85]])}
      ${g("boot", 0, 0, 1, 0, [[0, "#22345F"], [0.45, C.navy], [1, C.navyD]])}
      ${r("helmet", 0.38, 0.32, 0.75, [[0, "#FFFFFF"], [0.45, C.suitL], [0.8, C.suitM], [1, C.suitS]])}
      ${r("visor", 0.42, 0.3, 0.9, [[0, C.visorTop], [0.55, "#081A3F"], [1, C.visorBot]])}
      ${g("visorTint", 0, 0, 0, 1, [[0, "#081B45", 0.58], [0.5, "#0A2252", 0.16], [1, "#06142F", 0.42]])}
      ${g("visorHi", 0, 0, 1, 1, [[0, "#FFFFFF", 0.75], [0.35, "#FFFFFF", 0.12], [0.6, "#FFFFFF", 0]])}
      ${g("visorEarth", 0, 0, 0, 1, [[0, rim, 0], [0.6, rim, 0.18], [1, "#7CF0FF", 0.55]])}
      ${r("skin", 0.42, 0.38, 0.75, [[0, C.skinL], [0.6, C.skin], [1, C.skinD]])}
      ${g("cap", 0, 0, 1, 1, [[0, C.capHi], [1, C.cap]])}
      ${r("ao", 0.5, 0.5, 0.5, [[0, "#0a1228", 0.55], [1, "#0a1228", 0]])}
      ${r("glowDot", 0.5, 0.5, 0.5, [[0, C.glowCore, 1], [0.35, C.glow, 0.9], [1, C.glow, 0]])}
      <filter id="${id}-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
      <filter id="${id}-soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="10"/></filter>
      <clipPath id="${id}-visorClip"><ellipse cx="300" cy="196" rx="103" ry="88"/></clipPath>
    </defs>`;
  }

  // ---- limb pieces (local coords, joint at 0,0, limb points +y) ----
  function upperArm(id, side) {
    // side: "R" (character right, viewer left) or "L"
    const patch =
      side === "L"
        ? // Iraqi flag patch (character's left shoulder) — small and tasteful
          `<g transform="translate(-24,38)">
            <rect x="0" y="0" width="48" height="32" rx="4" fill="#0b1530" opacity="0.35"/>
            <rect x="2" y="2" width="44" height="9.5" fill="#CE1126"/>
            <rect x="2" y="11.5" width="44" height="9" fill="#FFFFFF"/>
            <rect x="2" y="20.5" width="44" height="9.5" fill="#111111"/>
            <path d="M15 16.2 h6 M24 16.2 h9" stroke="#007A3D" stroke-width="2.2" stroke-linecap="round"/>
            <rect x="2" y="2" width="44" height="28" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="1.2"/>
          </g>`
        : // generic mission patch (no official logo)
          `<g transform="translate(0,54)">
            <circle r="21" fill="url(#${id}-navy)" stroke="${C.metalHi}" stroke-width="2.5"/>
            <ellipse rx="14" ry="5.5" fill="none" stroke="${C.glow}" stroke-width="1.6" transform="rotate(-24)"/>
            <circle r="5" fill="#9FD8FF"/>
            <circle cx="11" cy="-6" r="2.2" fill="#ffffff"/>
          </g>`;
    return `
      <path d="M-56 -6 C-60 60,-52 170,-46 236 C-44 252,46 252,46 236 C52 170,60 60,56 -6 C46 -40,-46 -40,-56 -6Z" fill="url(#${id}-suitLimb)"/>
      <path d="M-56 -6 C-60 60,-52 170,-46 236 C-44 252,46 252,46 236 C52 170,60 60,56 -6 C46 -40,-46 -40,-56 -6Z" fill="url(#${id}-rim)" opacity="0.9"/>
      <path d="M-40 120 C-15 128,15 128,40 120" stroke="${C.suitS}" stroke-width="2.5" fill="none" opacity="0.6"/>
      <path d="M-42 206 C-18 216,18 216,42 204" stroke="${C.suitS}" stroke-width="2.5" fill="none" opacity="0.5"/>
      ${patch}`;
  }
  function elbowRing(id) {
    return `<ellipse cx="0" cy="0" rx="50" ry="17" fill="url(#${id}-metal)"/><ellipse cx="0" cy="-3" rx="44" ry="9" fill="${C.metalD}" opacity="0.45"/>`;
  }
  function foreArm(id) {
    return `
      <path d="M-48 -4 C-50 70,-46 150,-42 200 C-40 214,40 214,42 200 C46 150,50 70,48 -4 C40 -18,-40 -18,-48 -4Z" fill="url(#${id}-suitLimb)"/>
      <path d="M-48 -4 C-50 70,-46 150,-42 200 C-40 214,40 214,42 200 C46 150,50 70,48 -4 C40 -18,-40 -18,-48 -4Z" fill="url(#${id}-rim)" opacity="0.9"/>
      <rect x="-40" y="120" width="80" height="26" rx="8" fill="url(#${id}-navy)"/>
      <rect x="-30" y="130" width="34" height="5" rx="2.5" fill="${C.glow}" class="${id}-emit"/>
      <circle cx="18" cy="132.5" r="3.5" fill="${C.glowCore}" class="${id}-emit"/>
      <ellipse cx="0" cy="206" rx="46" ry="15" fill="url(#${id}-metal)"/>
      <ellipse cx="0" cy="206" rx="46" ry="15" fill="none" stroke="${C.glow}" stroke-width="2" opacity="0.65" class="${id}-emit"/>`;
  }
  function glove(id, point) {
    // index finger extension 0..1
    const ix = 26 * point;
    return `
      <path d="M-34 0 C-44 30,-44 64,-34 92 C-26 112,24 114,32 94 C42 66,42 30,34 0 Z" fill="url(#${id}-glove)"/>
      <path d="M-30 0 C-36 22,-38 40,-36 56" stroke="#4A5B84" stroke-width="3" fill="none" opacity="0.7"/>
      <path d="M-36 34 C-58 40,-62 62,-48 74 C-40 80,-30 70,-30 60" fill="url(#${id}-glove)"/>
      <g transform="translate(4,${92 + ix * 0.2})">
        <rect x="-9" y="-6" width="18" height="${18 + ix}" rx="9" fill="url(#${id}-glove)"/>
      </g>
      <path d="M-26 94 C-20 104,20 106,26 96" stroke="#0E1426" stroke-width="3" fill="none" opacity="0.6"/>`;
  }
  function thigh(id) {
    return `
      <path d="M-66 -10 C-70 90,-62 210,-56 300 C-54 318,54 318,56 300 C62 210,70 90,66 -10 C50 -30,-50 -30,-66 -10Z" fill="url(#${id}-suitLimb)"/>
      <path d="M-66 -10 C-70 90,-62 210,-56 300 C-54 318,54 318,56 300 C62 210,70 90,66 -10 C50 -30,-50 -30,-66 -10Z" fill="url(#${id}-rim)" opacity="0.85"/>
      <path d="M44 30 C48 120,46 200,42 260" stroke="${C.glow}" stroke-width="3" fill="none" opacity="0.75" class="${id}-emit"/>
      <path d="M-50 150 C-20 160,20 160,50 150" stroke="${C.suitS}" stroke-width="2.5" fill="none" opacity="0.55"/>
      <path d="M-44 268 C-20 280,24 280,46 266" stroke="${C.suitS}" stroke-width="3" fill="none" opacity="0.6"/>`;
  }
  function shin(id) {
    return `
      <ellipse cx="0" cy="0" rx="58" ry="20" fill="url(#${id}-metal)"/>
      <path d="M-56 4 C-58 90,-54 180,-52 262 L52 262 C54 180,58 90,56 4 Z" fill="url(#${id}-suitLimb)"/>
      <path d="M-56 4 C-58 90,-54 180,-52 262 L52 262 C54 180,58 90,56 4 Z" fill="url(#${id}-rim)" opacity="0.85"/>
      <path d="M-44 -8 C-46 30,46 30,44 -8 C30 -24,-30 -24,-44 -8Z" fill="url(#${id}-navy)"/>
      <path d="M-62 200 C-64 232,-64 262,-62 282 L66 282 C66 262,66 232,62 200 Z" fill="url(#${id}-boot)"/>
      <path d="M-70 276 C-74 296,-70 312,-60 316 L84 316 C96 312,98 296,90 278 Z" fill="${C.navyD}"/>
      <path d="M-56 236 L58 236" stroke="${C.glow}" stroke-width="3.2" opacity="0.8" class="${id}-emit"/>
      <rect x="-70" y="310" width="164" height="8" rx="4" fill="#050a18"/>`;
  }

  function build(id, opts) {
    opts = opts || {};
    const rim = opts.rim || C.glow;
    return `<svg class="astronaut" id="${id}" viewBox="0 0 600 1500" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      ${defs(id, rim)}
      <g id="${id}-body">
        <!-- backpack (life support) -->
        <g id="${id}-pack">
          <rect x="150" y="300" width="300" height="470" rx="56" fill="url(#${id}-suitH)"/>
          <rect x="150" y="300" width="300" height="470" rx="56" fill="url(#${id}-suitV)"/>
          <rect x="174" y="318" width="252" height="40" rx="18" fill="url(#${id}-navy)"/>
          <circle cx="410" cy="338" r="6" fill="${C.glowCore}" class="${id}-emit"/>
        </g>
        <!-- legs -->
        <g transform="translate(250,840)"><g id="${id}-legR">${thigh(id)}<g transform="translate(0,300)"><g id="${id}-shinR">${shin(id)}</g></g></g></g>
        <g transform="translate(350,840)"><g id="${id}-legL"><g transform="scale(-1,1)">${thigh(id)}</g><g transform="translate(0,300)"><g id="${id}-shinL"><g transform="scale(-1,1)">${shin(id)}</g></g></g></g></g>
        <!-- pelvis -->
        <path d="M198 716 C192 776,202 842,236 874 C266 898,334 898,364 874 C398 842,408 776,402 716 Z" fill="url(#${id}-suitH)"/>
        <path d="M198 716 C192 776,202 842,236 874 C266 898,334 898,364 874 C398 842,408 776,402 716 Z" fill="url(#${id}-suitV)" opacity="0.7"/>
        <path d="M198 716 C192 776,202 842,236 874 C266 898,334 898,364 874 C398 842,408 776,402 716 Z" fill="url(#${id}-rim)" opacity="0.8"/>
        <path d="M300 770 L300 880" stroke="${C.suitS}" stroke-width="3" opacity="0.55"/>
        <path d="M236 860 C262 884,338 884,364 860" stroke="${C.suitS}" stroke-width="3" fill="none" opacity="0.5"/>
        <!-- torso -->
        <g id="${id}-torso">
          <path d="M300 318 C246 318,204 328,176 350 C146 374,136 410,138 452 C140 530,160 610,186 690 C192 712,196 724,198 732 L402 732 C404 724,408 712,414 690 C440 610,460 530,462 452 C464 410,454 374,424 350 C396 328,354 318,300 318Z" fill="url(#${id}-suitH)"/>
          <path d="M300 318 C246 318,204 328,176 350 C146 374,136 410,138 452 C140 530,160 610,186 690 C192 712,196 724,198 732 L402 732 C404 724,408 712,414 690 C440 610,460 530,462 452 C464 410,454 374,424 350 C396 328,354 318,300 318Z" fill="url(#${id}-suitV)"/>
          <path d="M300 318 C246 318,204 328,176 350 C146 374,136 410,138 452 C140 530,160 610,186 690 C192 712,196 724,198 732 L402 732 C404 724,408 712,414 690 C440 610,460 530,462 452 C464 410,454 374,424 350 C396 328,354 318,300 318Z" fill="url(#${id}-rim)" opacity="0.9"/>
          <g id="${id}-chest">
            <!-- yoke + glowing seam -->
            <path d="M190 372 C230 414,370 414,410 372" stroke="${C.suitS}" stroke-width="3" fill="none" opacity="0.8"/>
            <path d="M194 386 C234 426,366 426,406 386" stroke="${C.glow}" stroke-width="3" fill="none" opacity="0.8" class="${id}-emit"/>
            <path d="M206 640 C250 652,350 652,394 640" stroke="${C.suitS}" stroke-width="3" fill="none" opacity="0.6"/>
            <!-- chest control module -->
            <rect x="238" y="462" width="124" height="104" rx="16" fill="url(#${id}-navy)"/>
            <rect x="238" y="462" width="124" height="104" rx="16" fill="none" stroke="${C.metal}" stroke-width="3"/>
            <rect x="252" y="478" width="58" height="34" rx="6" fill="#06102A"/>
            <rect x="258" y="486" width="10" height="18" rx="2" fill="${C.glow}" opacity="0.9" class="${id}-emit"/>
            <rect x="272" y="492" width="10" height="12" rx="2" fill="${C.glow}" opacity="0.7" class="${id}-emit"/>
            <rect x="286" y="482" width="10" height="22" rx="2" fill="${C.glow}" opacity="0.95" class="${id}-emit"/>
            <circle cx="334" cy="490" r="9" fill="${C.metal}"/>
            <circle cx="334" cy="490" r="4" fill="${C.navyD}"/>
            <circle cx="260" cy="540" r="5" fill="#7CFFB2" class="${id}-emit"/>
            <circle cx="278" cy="540" r="5" fill="${C.glowCore}" class="${id}-emit"/>
            <rect x="298" y="534" width="48" height="12" rx="6" fill="${C.metalD}"/>
            <!-- hoses -->
            <path d="M238 520 C214 540,212 600,236 640" stroke="${C.metal}" stroke-width="9" fill="none" stroke-linecap="round"/>
            <path d="M362 520 C386 540,388 600,364 640" stroke="${C.metal}" stroke-width="9" fill="none" stroke-linecap="round"/>
          </g>
          <!-- waist ring -->
          <path d="M194 716 C230 744,370 744,406 716 L410 742 C370 772,230 772,190 742 Z" fill="url(#${id}-metal)"/>
          <path d="M196 742 C232 768,368 768,404 742" stroke="${C.glow}" stroke-width="2.5" fill="none" opacity="0.7" class="${id}-emit"/>
        </g>
        <!-- ambient occlusion -->
        <ellipse cx="300" cy="362" rx="132" ry="34" fill="url(#${id}-ao)"/>
        <ellipse cx="186" cy="520" rx="40" ry="150" fill="url(#${id}-ao)" opacity="0.7"/>
        <ellipse cx="414" cy="520" rx="40" ry="150" fill="url(#${id}-ao)" opacity="0.7"/>
        <!-- arms -->
        <g transform="translate(176,396)"><g id="${id}-armR">${upperArm(id, "R")}<g transform="translate(0,236)"><g id="${id}-foreR"><g id="${id}-fsR">${elbowRing(id)}${foreArm(id)}</g><g id="${id}-wristR" transform="translate(0,214)"><g id="${id}-handR">${glove(id, opts.point || 0)}</g></g></g></g></g></g>
        <g transform="translate(424,396)"><g id="${id}-armL"><g transform="scale(-1,1)">${upperArm(id, "L")}</g><g transform="translate(0,236)"><g id="${id}-foreL"><g id="${id}-fsL"><g transform="scale(-1,1)">${elbowRing(id)}${foreArm(id)}</g></g><g id="${id}-wristL" transform="translate(0,214)"><g id="${id}-handL"><g transform="scale(-1,1)">${glove(id, 0)}</g></g></g></g></g></g></g>
        <!-- neck ring -->
        <ellipse cx="300" cy="322" rx="122" ry="30" fill="url(#${id}-metal)"/>
        <ellipse cx="300" cy="316" rx="104" ry="20" fill="${C.metalD}"/>
        <path d="M184 330 C230 356,370 356,416 330" stroke="${C.glow}" stroke-width="2.5" fill="none" opacity="0.6" class="${id}-emit"/>
        <!-- head -->
        <g transform="translate(300,300)"><g id="${id}-head"><g transform="translate(-300,-300)">
          <ellipse cx="300" cy="320" rx="96" ry="18" fill="url(#${id}-ao)"/>
          <circle cx="300" cy="186" r="138" fill="url(#${id}-helmet)"/>
          <circle cx="300" cy="186" r="138" fill="url(#${id}-rim)" opacity="0.75"/>
          <path d="M196 96 C224 64,270 50,312 54 C270 66,232 86,210 118 Z" fill="#FFFFFF" opacity="0.85"/>
          <ellipse cx="226" cy="88" rx="10" ry="5" fill="#FFFFFF" transform="rotate(-38 226 88)"/>
          <path d="M170 250 C182 292,214 318,252 330 C214 312,188 286,176 252 Z" fill="${C.suitD}" opacity="0.35"/>
          <!-- side lamps -->
          <rect x="156" y="150" width="20" height="52" rx="9" fill="url(#${id}-navy)"/>
          <rect x="161" y="160" width="10" height="32" rx="5" fill="${C.glowCore}" class="${id}-emit"/>
          <rect x="424" y="150" width="20" height="52" rx="9" fill="url(#${id}-navy)"/>
          <rect x="429" y="160" width="10" height="32" rx="5" fill="${C.glowCore}" class="${id}-emit"/>
          <!-- visor frame -->
          <g id="${id}-visorGroup">
            <ellipse cx="300" cy="196" rx="112" ry="97" fill="${C.metal}"/>
            <ellipse cx="300" cy="196" rx="112" ry="97" fill="none" stroke="${C.metalHi}" stroke-width="3"/>
            <ellipse cx="300" cy="196" rx="103" ry="88" fill="url(#${id}-visor)"/>
            <!-- face (seen through the tinted visor) -->
            <g clip-path="url(#${id}-visorClip)">
              <g id="${id}-face">
                <!-- head shape: broad forehead, defined cheekbones, narrower chin -->
                <path d="M300 128 C340 128,364 156,364 196 C364 236,350 270,326 290 C314 300,286 300,274 290 C250 270,236 236,236 196 C236 156,260 128,300 128Z" fill="url(#${id}-skin)"/>
                <!-- form shadow on the far cheek + under-chin -->
                <path d="M338 160 C360 186,360 236,330 282 C324 290,318 294,312 296 C340 262,348 214,338 160Z" fill="${C.skinD}" opacity="0.45"/>
                <ellipse cx="300" cy="292" rx="34" ry="8" fill="${C.skinD}" opacity="0.4"/>
                <!-- cheek warmth -->
                <ellipse cx="266" cy="236" rx="14" ry="8" fill="#D9846A" opacity="0.18"/>
                <ellipse cx="334" cy="236" rx="13" ry="8" fill="#D9846A" opacity="0.14"/>
                <!-- cap earcups -->
                <ellipse cx="236" cy="206" rx="15" ry="25" fill="${C.cap}"/>
                <ellipse cx="364" cy="206" rx="15" ry="25" fill="${C.cap}"/>
                <!-- comm cap -->
                <path d="M233 198 C228 126,372 126,367 198 C354 158,246 158,233 198Z" fill="url(#${id}-cap)"/>
                <path d="M300 126 L300 156" stroke="#E8EDF5" stroke-width="6" opacity="0.75"/>
                <!-- brows: thin, softly arched -->
                <path d="M263 184 C271 178,283 177,292 181" stroke="#3A241A" stroke-width="3.2" fill="none" stroke-linecap="round" opacity="0.9"/>
                <path d="M308 181 C317 177,329 178,337 184" stroke="#3A241A" stroke-width="3.2" fill="none" stroke-linecap="round" opacity="0.9"/>
                <!-- eyes: calm almond shapes, lash line, no lower outline -->
                <g id="${id}-eyes">
                  <path d="M267 200 C273 194.5,285 194.5,291 200 C285 203.5,273 203.5,267 200Z" fill="#EFE4DC"/>
                  <circle cx="279.5" cy="199.6" r="4.4" fill="#2A1A10"/>
                  <circle cx="281" cy="198.2" r="1.3" fill="#FFFFFF"/>
                  <path d="M266 199.5 C272.5 193,285.5 193,292 199" stroke="#22140D" stroke-width="2.6" fill="none" stroke-linecap="round"/>
                  <path d="M309 200 C315 194.5,327 194.5,333 200 C327 203.5,315 203.5,309 200Z" fill="#EFE4DC"/>
                  <circle cx="320.5" cy="199.6" r="4.4" fill="#2A1A10"/>
                  <circle cx="322" cy="198.2" r="1.3" fill="#FFFFFF"/>
                  <path d="M308 199 C314.5 193,327.5 193,334 199.5" stroke="#22140D" stroke-width="2.6" fill="none" stroke-linecap="round"/>
                </g>
                <!-- nose: shading, not outline -->
                <path d="M304 204 C306 216,310 226,309 233 C305 236,300 236,297 234 C303 230,304 218,304 204Z" fill="${C.skinD}" opacity="0.38"/>
                <ellipse cx="294" cy="234" rx="3.2" ry="1.8" fill="#5E3A2A" opacity="0.5"/>
                <ellipse cx="306" cy="234" rx="3.2" ry="1.8" fill="#5E3A2A" opacity="0.5"/>
                <path d="M292 214 C294 222,294 228,293 232" stroke="${C.skinL}" stroke-width="2" fill="none" opacity="0.5" stroke-linecap="round"/>
                <!-- mouth: soft, slight confident smile -->
                <path d="M287 254 C294 258.5,306 258.5,313 254 C306 256,294 256,287 254Z" fill="#7A4636" opacity="0.85" stroke="#7A4636" stroke-width="2" stroke-linejoin="round"/>
                <path d="M292 262 C297 264.5,303 264.5,308 262" stroke="${C.skinL}" stroke-width="2.2" fill="none" opacity="0.55" stroke-linecap="round"/>
                <!-- headset mic -->
                <path d="M238 226 C248 256,262 268,280 271" stroke="#0E1424" stroke-width="4.5" fill="none" stroke-linecap="round"/>
                <circle cx="282" cy="271" r="4.5" fill="#0E1424"/>
              </g>
              <!-- tint + reflections -->
              <ellipse cx="300" cy="196" rx="103" ry="88" fill="url(#${id}-visorTint)"/>
              <path d="M210 160 C224 112,280 98,330 104 C290 112,246 130,226 178 Z" fill="url(#${id}-visorHi)"/>
              <path d="M200 236 C240 286,360 286,400 236 C370 270,240 272,200 236Z" fill="url(#${id}-visorEarth)"/>
              <circle cx="368" cy="132" r="2" fill="#ffffff" opacity="0.8"/>
              <circle cx="384" cy="160" r="1.4" fill="#ffffff" opacity="0.7"/>
              <circle cx="356" cy="114" r="1.2" fill="#ffffff" opacity="0.6"/>
            </g>
            <ellipse cx="300" cy="196" rx="103" ry="88" fill="none" stroke="#0a1530" stroke-width="3" opacity="0.6"/>
          </g>
          <!-- helmet top light -->
          <rect x="284" y="44" width="32" height="14" rx="7" fill="url(#${id}-navy)"/>
          <rect x="290" y="47" width="20" height="8" rx="4" fill="${C.glowCore}" class="${id}-emit"/>
        </g></g></g>
      </g>
    </svg>`;
  }

  // Rig: writes joint transforms from a pose object.
  function rig(root, id) {
    const q = (s) => root.querySelector("#" + id + "-" + s);
    const el = {
      armR: q("armR"), foreR: q("foreR"), handR: q("handR"),
      armL: q("armL"), foreL: q("foreL"), handL: q("handL"), fsR: q("fsR"), fsL: q("fsL"),
      wristR: q("wristR"), wristL: q("wristL"),
      legR: q("legR"), legL: q("legL"), shinR: q("shinR"), shinL: q("shinL"),
      head: q("head"), face: q("face"), visor: q("visorGroup"), chest: q("chest"), pack: q("pack"),
    };
    const emit = root.querySelectorAll("." + id + "-emit");
    const glowLayer = [];
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
      el.wristR.setAttribute("transform", `translate(0,${214 * fsR})`);
      el.wristL.setAttribute("transform", `translate(0,${214 * fsL})`);
      el.legR.setAttribute("transform", `rotate(${p.legR || 0})`);
      el.legL.setAttribute("transform", `rotate(${p.legL || 0})`);
      el.shinR.setAttribute("transform", `rotate(${p.kneeR || 0})`);
      el.shinL.setAttribute("transform", `rotate(${p.kneeL || 0})`);
      const yaw = p.headYaw || 0;
      el.head.setAttribute("transform", `rotate(${p.headTilt || 0})`);
      el.visor.setAttribute("transform", `translate(${yaw * 34},0)`);
      el.face.setAttribute("transform", `translate(${yaw * 22},${(p.headNod || 0) * 6})`);
      const by = p.bodyYaw || 0;
      el.chest.setAttribute("transform", `translate(${by * 26},0)`);
      el.pack.setAttribute("transform", `translate(${-by * 60},0)`);
      const L = p.lights === undefined ? 1 : p.lights;
      for (let i = 0; i < emit.length; i++) emit[i].setAttribute("opacity", (0.25 + 0.75 * L).toFixed(3));
    }
    return { set, el };
  }

  window.REEL.astronaut = { build, rig, colors: C };
})();
