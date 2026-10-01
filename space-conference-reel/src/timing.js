/*
 * TIMING — single source of truth for the whole reel.
 *
 * Everything is authored in VO time (seconds into assets/audio/voiceover.m4a,
 * measured from the recording: Silero VAD for phrase bounds + Whisper
 * large-v3-turbo prefix/suffix decoding for word onsets). A *variant* maps VO
 * time to video time:
 *
 *   compact  20.00 s exactly (the brief). The VO keeps every word but its
 *            pauses are tightened and it plays at RATE (pitch-preserved,
 *            via HyperFrames data-playback-rate) so it fits.
 *   full     natural pace — the VO is played untouched; the video runs a
 *            little longer than 20 s.
 *
 * Scenes call REEL.timing.get(variant) and only ever ask for cues by name, so
 * retiming the reel means editing the tables below and re-running
 * `npm run build` (which regenerates index.html / index-full.html and audio).
 * The JSON between the markers is also read by scripts/*.py and *.mjs.
 */
(function () {
  window.REEL = window.REEL || {};

  /*JSON-BEGIN*/
  const DATA = {
    vo: {
      file: "assets/audio/voiceover.m4a",
      duration: 24.853,
      phrases: [
        { id: "p1", start: 0.5, end: 2.26, text: "رحلة جديدة تبدأ من هنا" },
        { id: "p2", start: 2.44, end: 5.72, text: "المؤتمر السنوي لتكنولوجيا الفضاء والأقمار الاصطناعية" },
        { id: "p3", start: 6.08, end: 12.52, text: "حدثٌ يجمع نخبة من المهندسين والعلماء والباحثين لبحث أحدث التقنيات ومناقشة مستقبل الفضاء" },
        { id: "p4", start: 12.83, end: 19.66, text: "قبل انطلاق المؤتمر نفتح المجال أمام المبتكرين من خلال تحدٍّ تقني عبر موقع المؤتمر الإلكتروني" },
        { id: "p5", start: 20.0, end: 23.05, text: "قدّم فكرتك واجعل الابتكار جزءًا من هذه الرحلة" },
        { id: "p6", start: 23.13, end: 24.72, text: "نلتقي لنصنع المستقبل" }
      ]
    },
    // word onsets (VO seconds)
    words: {
      "rihla": 0.52, "jadida": 0.8, "tabda": 1.18, "min_huna": 1.58,
      "almutamar": 2.48, "alsanawi": 3.06, "litiknulujya": 3.46, "alfada": 4.06, "walaqmar": 4.36, "alistinaiya": 4.96,
      "hadath": 6.11, "yajmau": 6.28, "nukhba": 6.76, "almuhandisin": 7.3, "walulama": 7.68, "walbahithin": 8.24,
      "libahth": 9.14, "ahdath": 9.68, "altiqniyat": 9.98, "wamunaqasha": 10.46, "mustaqbal": 11.34, "alfada2": 11.84,
      "qabla": 12.86, "intilaq": 13.15, "almutamar2": 13.55, "naftah": 14.18, "almajal": 14.56, "amama": 14.97, "almubtakirin": 15.27,
      "min_khilal": 15.88, "tahaddin": 16.34, "tiqni": 16.68, "abra": 17.08, "mawqi": 17.5, "almutamar3": 17.98, "alilektroni": 18.55,
      "qaddim": 20.03, "fikrataka": 20.3, "wajal": 20.68, "alibtikar": 21.0, "juzan": 21.55, "min_hadhihi": 21.78, "alrihla": 22.25,
      "naltaqi": 23.16, "linasna": 23.55, "almustaqbal": 23.9
    },
    // scene boundaries in VO time (transition centres)
    scenes: [
      { id: "scene-01-intro", from: 0.0, to: 5.9 },
      { id: "scene-02-gathering", from: 5.9, to: 9.08 },
      { id: "scene-03-space-tech", from: 9.08, to: 12.68 },
      { id: "scene-04-challenge", from: 12.68, to: 17.0 },
      { id: "scene-05-website", from: 17.0, to: 19.83 },
      { id: "scene-06-final", from: 19.83, to: 999 }
    ],
    variants: {
      compact: {
        label: "20s",
        duration: 20.0,
        lead: 0.1,         // video time before the first VO word
        gap: 0.07,         // breath kept between VO phrases (video seconds)
        voEnd: 19.8,       // where the last VO word must land (video seconds)
        transition: 0.5,   // scene overlap (video seconds)
        overrides: { lockup: 23.4 }   // lockup shares the closing line (no time left after it)
      },
      full: {
        label: "full-vo",
        duration: 26.0,
        transition: 0.6,
        overrides: { lockup: 24.15 }  // lockup right after «المستقبل»
      }
    }
  };
  /*JSON-END*/

  function build(variantName) {
    const V = DATA.variants[variantName] || DATA.variants.compact;
    const P = DATA.vo.phrases;
    const segs = [];
    let rate = 1;
    if (variantName === "compact") {
      const total = P.reduce((s, p) => s + (p.end - p.start), 0);
      rate = total / (V.voEnd - V.lead - V.gap * (P.length - 1));
      let t = V.lead;
      for (const p of P) {
        const d = (p.end - p.start) / rate;
        segs.push({ id: p.id, voStart: p.start, voEnd: p.end, start: t, duration: d, rate });
        t += d + V.gap;
      }
    } else {
      for (const p of P) segs.push({ id: p.id, voStart: p.start, voEnd: p.end, start: p.start, duration: p.end - p.start, rate: 1 });
    }

    // VO time -> video time (piecewise linear; pauses compress to the gap)
    function v(tv) {
      if (variantName !== "compact") return tv;
      if (tv <= segs[0].voStart) return Math.max(0, segs[0].start - (segs[0].voStart - tv) / rate);
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i];
        if (tv <= s.voEnd) return s.start + (tv - s.voStart) / rate;
        const n = segs[i + 1];
        if (n && tv < n.voStart) {
          const f = (tv - s.voEnd) / (n.voStart - s.voEnd);
          return s.start + s.duration + f * (n.start - (s.start + s.duration));
        }
      }
      const last = segs[segs.length - 1];
      return last.start + last.duration + (tv - last.voEnd) / rate;
    }

    const k = rate; // animation speed factor
    const scenes = {};
    const tr = V.transition;
    DATA.scenes.forEach((s, i) => {
      const a = i === 0 ? 0 : v(s.from);
      const b = s.to >= 999 ? V.duration : v(s.to);
      const hostStart = i === 0 ? 0 : a - tr / 2;
      const hostEnd = s.to >= 999 ? V.duration : b + tr / 2;
      scenes[s.id] = { start: a, end: b, hostStart, hostDuration: hostEnd - hostStart, index: i };
    });

    function cue(name) {
      if (V.overrides && V.overrides[name] !== undefined) return v(V.overrides[name]);
      if (DATA.words[name] !== undefined) return v(DATA.words[name]);
      const ph = P.find((p) => p.id === name);
      if (ph) return v(ph.start);
      throw new Error("unknown cue " + name);
    }

    return {
      variant: variantName,
      duration: V.duration,
      rate,
      k,
      d: (x) => x / k,
      v,
      cue,
      scenes,
      segs,
      transition: tr,
      // cue relative to a scene host's own start (what a sub-composition timeline uses)
      local(sceneId, name) {
        return cue(name) - scenes[sceneId].hostStart;
      },
      localT(sceneId, tVideo) {
        return tVideo - scenes[sceneId].hostStart;
      },
      boundaries: DATA.scenes.slice(1).map((s) => v(s.from))
    };
  }

  window.REEL.TIMING_DATA = DATA;
  window.REEL.timing = {
    get(variant) {
      return build(variant || window.REEL_VARIANT || "compact");
    }
  };
})();
