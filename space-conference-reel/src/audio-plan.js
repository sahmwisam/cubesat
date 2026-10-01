/*
 * AUDIO PLAN — music + sound-design events, tied to the same VO cues as the
 * picture so both cuts stay in sync. scripts/build_roots.mjs resolves this into
 * build/timeline-<label>.json; scripts/build_audio.py synthesises the stems:
 *   assets/audio/music-<label>.wav   original cinematic space bed (ducked under VO)
 *   assets/audio/sfx-<label>.wav     whooshes, impacts, UI beeps, glitches, shimmer
 * Levels are linear gains used by build_audio.py; `mix` = data-volume in index.html.
 */
(function () {
  window.REEL = window.REEL || {};

  const mix = { music: 1.0, sfx: 1.0, vo: 1.0 };

  // event: { type, at: cue name | "B0".."B4" (scene cuts) | number (video s), off: seconds (scaled), gain }
  const EVENTS = [
    // ---- 01 intro
    { type: "swell", at: 0, off: 0.0, gain: 0.55 },
    { type: "shimmer", at: "rihla", off: -0.05, gain: 0.35 },
    { type: "riser", at: "almutamar", off: 0, gain: 0.45, len: 1.6 },
    { type: "impact", at: "almutamar", off: -0.02, gain: 0.85 },
    { type: "poweron", at: "almutamar", off: 0.05, gain: 0.5 },
    { type: "shimmer", at: "alfada", off: 0.0, gain: 0.42 },
    { type: "whoosh_soft", at: "walaqmar", off: -0.08, gain: 0.45 },
    { type: "beep", at: "walaqmar", off: 0.3, gain: 0.3, f: 1760 },
    { type: "whoosh", at: "B0", off: 0, gain: 0.9 },
    { type: "impact", at: "B0", off: 0.03, gain: 0.55 },
    // ---- 02 gathering
    { type: "crowd", at: "B0", off: 0.1, gain: 0.32, len: 3.0 },
    { type: "pop", at: "almuhandisin", off: -0.04, gain: 0.55, f: 880 },
    { type: "pop", at: "walulama", off: -0.04, gain: 0.55, f: 988 },
    { type: "pop", at: "walbahithin", off: -0.04, gain: 0.55, f: 1175 },
    { type: "shutter", at: "B0", off: 0.9, gain: 0.25 },
    { type: "shutter", at: "B0", off: 1.7, gain: 0.22 },
    { type: "shutter", at: "B0", off: 2.6, gain: 0.2 },
    { type: "dive", at: "B1", off: 0, gain: 0.8 },
    // ---- 03 space tech
    { type: "beep", at: "libahth", off: -0.02, gain: 0.32, f: 1318 },
    { type: "beep", at: "ahdath", off: -0.02, gain: 0.32, f: 1568 },
    { type: "beep", at: "altiqniyat", off: -0.02, gain: 0.32, f: 1760 },
    { type: "beep", at: "wamunaqasha", off: -0.02, gain: 0.32, f: 2093 },
    { type: "telemetry", at: "B1", off: 0.4, gain: 0.22, len: 2.2 },
    { type: "shimmer", at: "alfada2", off: 0.0, gain: 0.5 },
    { type: "impact", at: "alfada2", off: 0.0, gain: 0.4 },
    { type: "scan", at: "B2", off: -0.25, gain: 0.6 },
    // ---- 04 challenge
    { type: "ticks", at: "qabla", off: 0, gain: 0.28, until: "naftah" },
    { type: "typing", at: "qabla", off: 0.1, gain: 0.22, len: 2.8 },
    { type: "click", at: "naftah", off: 0.3, gain: 0.6 },
    { type: "unlock", at: "almajal", off: 0.0, gain: 0.5 },
    { type: "riser", at: "tahaddin", off: 0, gain: 0.5, len: 1.4 },
    { type: "impact", at: "tahaddin", off: -0.04, gain: 0.95 },
    { type: "glitch", at: "tahaddin", off: 0.3, gain: 0.45 },
    { type: "whoosh_soft", at: "B3", off: -0.1, gain: 0.6 },
    // ---- 05 website
    { type: "pop", at: "mawqi", off: 0.08, gain: 0.35, f: 784 },
    { type: "pop", at: "mawqi", off: 0.16, gain: 0.35, f: 988 },
    { type: "pop", at: "mawqi", off: 0.24, gain: 0.35, f: 1175 },
    { type: "click", at: "alilektroni", off: 0.1, gain: 0.7 },
    { type: "confirm", at: "alilektroni", off: 0.28, gain: 0.5 },
    { type: "riser", at: "B4", off: 0, gain: 0.55, len: 1.5 },
    { type: "warp", at: "B4", off: 0, gain: 0.9 },
    // ---- 06 final
    { type: "shimmer", at: "qaddim", off: 0.0, gain: 0.35 },
    { type: "impact", at: "almustaqbal", off: -0.03, gain: 0.9 },
    { type: "shimmer", at: "almustaqbal", off: 0.05, gain: 0.55 },
    { type: "chime", at: "lockup", off: 0.3, gain: 0.45 },
    { type: "sparkle", at: "END", off: -0.95, gain: 0.4 },
  ];

  // music: chord per scene (+ final resolve at the lockup)
  const MUSIC = {
    tempo: 100,
    // chords as MIDI note lists; changes at scene cuts (B0..B4) and at the lockup
    chords: [
      { from: 0, notes: [38, 45, 50, 52, 57] },           // Dm(add9)  intro
      { from: "B0", notes: [34, 46, 50, 53, 60] },        // Bb(add9)  gathering
      { from: "B1", notes: [31, 43, 50, 55, 57] },        // Gm(add9)  space tech
      { from: "B2", notes: [38, 45, 50, 53, 55] },        // Dm(sus4)  challenge, tension
      { from: "B3", notes: [36, 43, 48, 52, 55] },        // C(add9)   website, lift
      { from: "B4", notes: [41, 48, 53, 57, 60] },        // F(add9)   final
      { from: "lockup", notes: [34, 46, 50, 53, 58, 62] } // Bbmaj — warm resolve
    ],
    pulseFrom: "B0",    // soft low pulse joins after the intro
    arpScenes: ["B1", "B3"], // data plucks in space-tech + website
  };

  function resolve(T) {
    const B = T.boundaries;
    const at = (a) => {
      if (typeof a === "number") return a;
      if (/^B\d$/.test(a)) return B[+a.slice(1)];
      if (a === "END") return T.duration;
      return T.cue(a);
    };
    const ev = EVENTS.map((e) => {
      const o = Object.assign({}, e);
      o.t = Math.max(0, at(e.at) + T.d(e.off || 0));
      if (e.until) o.until = at(e.until);
      if (e.len) o.len = T.d(e.len);
      return o;
    });
    const chords = MUSIC.chords.map((c) => ({ t: at(c.from), notes: c.notes }));
    ev.push({ type: "_music", chords, pulseFrom: at(MUSIC.pulseFrom), arp: MUSIC.arpScenes.map(at), tempo: MUSIC.tempo, k: T.k });
    return ev;
  }

  window.REEL.audioPlan = { mix, EVENTS, MUSIC, resolve };
})();
